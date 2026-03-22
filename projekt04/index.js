import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import cookieParser from "cookie-parser";
const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path);
console.log("Inicjalizacja tabel bazy danych...");
const SESSION_COOKIE = "__Host-fisz-id";

db.exec(`
  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id)
  ) STRICT;
   CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    is_admin INTEGER DEFAULT 0
  ) STRICT;
    CREATE TABLE IF NOT EXISTS session (
    id              TEXT PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    created_at      INTEGER
  ) STRICT;
`);



const db_ops = {
  get_platforms: db.prepare(`SELECT * FROM platforms`),
  get_platform_by_id: db.prepare(`SELECT * FROM platforms WHERE id = ?`),
  insert_platform: db.prepare(
    `INSERT INTO platforms (name) VALUES (?) RETURNING id, name;`
  ),
  get_games_by_platform: db.prepare(`SELECT * FROM games WHERE platform_id = ?`),
  insert_game: db.prepare(
    `INSERT INTO games (title, genre, platform_id, user_id) 
     VALUES (?, ?, ?, ?) RETURNING id, title, genre, platform_id, user_id;`
  ),
  delete_game: db.prepare(`DELETE FROM games WHERE id = ?`),
  delete_platform: db.prepare(`DELETE FROM platforms WHERE id = ?`),
  check_game_exists: db.prepare(`SELECT 1 FROM games WHERE title = ? AND platform_id = ?`),
  get_game_by_id: db.prepare(`SELECT * FROM games WHERE id = ?`),
  check_login_exist: db.prepare(`SELECT username FROM users WHERE username = ?`),
  check_user_exist: db.prepare(`SELECT id FROM users WHERE username = ?`),
  insert_user: db.prepare(`INSERT INTO users (username,password,is_admin) VALUES(?,?,? ) RETURNING id,username,password,is_admin `),
  create_session: db.prepare(
    `INSERT INTO session (id, user_id, created_at)
            VALUES (?, ?, ?) RETURNING id, user_id, created_at;`
  ),
  get_session: db.prepare(
    "SELECT id, user_id, created_at from session WHERE id = ?;"
  ),
  get_auth_data: db.prepare(
    "SELECT password FROM users WHERE username = ?;",
  ),
  check_if_admin: db.prepare(
    "SELECT is_admin from users WHERE id = ?;"
  ),
  delete_session: db.prepare("DELETE FROM session WHERE id = ?"),

};
function createSession(user, res) {
  let sessionId = randomBytes(32).toString("hex");
  let createdAt = Date.now();

  let session = db_ops.create_session.get(sessionId, user, createdAt);
  res.locals.session = session;
  res.cookie(SESSION_COOKIE, session.id.toString(), {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
  });
  return session;
}
function getSession(req, res, next) {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  console.log("getsession",sessionId)
  if (!sessionId) {
    res.locals.session = null;
    return next();
  }

  const session = db_ops.get_session.get(sessionId);

  if (!session) {
    res.locals.session = null;
    res.clearCookie(SESSION_COOKIE);
    return next();
  }

  res.locals.session = session;
  next();
}
function logout(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE];

  if (sessionId) {
    db_ops.delete_session.run(sessionId);
  }

  res.clearCookie(SESSION_COOKIE);

  res.locals.session = null;

  return res.json({ message: "Logged out" });
}
const adminExists = db_ops.check_login_exist.get("admin");
if (!adminExists) {
  const adminHash = await argon2.hash("admin123");
  db_ops.insert_user.run("admin", adminHash, 1);
  console.log("Utworzono konto administratora: admin / admin123");
}

if (process.env.POPULATE_DB) {
  console.log("Populating db...");

  const adminExists = db_ops.check_login_exist.get("admin");
  if (!adminExists) {
    const adminHash = await argon2.hash("admin123");
    db_ops.insert_user.run("admin", adminHash, 1);
    console.log("Created admin account: admin / admin123");
  }

  const platforms_data = [
    { name: "PC" },
    { name: "PlayStation" },
    { name: "Xbox" }
  ];

  const adminUser = db_ops.check_user_exist.get("admin");

  platforms_data.forEach((p_data) => {
    const p = db_ops.insert_platform.get(p_data.name);
    console.log("Created platform:", p);

    if (p.name === "PC") db_ops.insert_game.get("The Witcher 3", "RPG", p.id, adminUser.id);
    if (p.name === "PlayStation") db_ops.insert_game.get("God of War", "Action", p.id, adminUser.id);
    if (p.name === "Xbox") db_ops.insert_game.get("Halo Infinite", "Shooter", p.id, adminUser.id);
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); 
app.use(express.static(path.join(__dirname, "public"))); 
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); 
app.use(express.json());
app.use(cookieParser());
app.get("/", (req, res) => {
  res.redirect("/login")
});

app.get("/login", (req, res) => {
  res.render("login")
});
app.post("/login", async(req, res) => {
const { Username, Password } = req.body;

    if (!Username || !Password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    let zwrot2 = db_ops.check_login_exist.get(Username)
    if (zwrot2 != undefined){
      let auth_data = db_ops.get_auth_data.get(Username);
    if (await argon2.verify(auth_data.password, Password)) {
      createSession(db_ops.check_user_exist.get(Username).id,res)
      res.redirect("/platforms")
    }
    }else{
      return res.status(400).json({ error: "no user available" });
    }
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.post("/register", async (req, res) => {
  const { Username, Password } = req.body;

  if (!Username || !Password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existingUser = db_ops.check_login_exist.get(Username);

  if (existingUser) {
    return res.status(409).json({ error: "User exists" });
  }

  const hash = await argon2.hash(Password);

  db_ops.insert_user.run(Username, hash);

  const user = db_ops.check_user_exist.get(Username);
  createSession(user.id, res);

  res.redirect("/platforms");
});
app.get("/platforms", getSession, (req, res) => {
  console.log(res.locals.session)
   if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const platforms = db_ops.get_platforms.all();
  const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
  const isAdmin = adminCheck && adminCheck.is_admin === 1;
  res.render("index", { platforms, isAdmin });
});

app.get("/platforms/new", getSession, (req, res) => {
  if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
  const isAdmin = adminCheck && adminCheck.is_admin === 1;
  if (!isAdmin) {
    return res.status(403).json({ error: "Tylko administrator może dodawać platformy." });
  }
  res.render("new_platform", { errors: [] });
});

app.post("/platforms/new", getSession, (req, res) => {
  if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
  const isAdmin = adminCheck && adminCheck.is_admin === 1;
  if (!isAdmin) {
    return res.status(403).json({ error: "Tylko administrator może dodawać platformy." });
  }
  const { name } = req.body;
  const errors = [];

  if (!name) errors.push("Nazwa platformy jest wymagana.");

  if (errors.length > 0) return res.render("new_platform", { errors });

  try {
    db_ops.insert_platform.get(name);
    res.redirect("/platforms");
  } catch (err) {
    console.error(err);
    res.render("new_platform", { errors: ["Błąd bazy danych."] });
  }
});

app.get("/platforms/:platform_id", getSession, (req, res) => {
         if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const { platform_id } = req.params;
  
  const platform = db_ops.get_platform_by_id.get(Number(platform_id));

  if (!platform) return res.redirect("/");

  const games = db_ops.get_games_by_platform.all(Number(platform_id));
  const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
  const isAdmin = adminCheck && adminCheck.is_admin === 1;
  const currentUserId = res.locals.session.user_id;
  
  res.render("platform", { platform, games, errors: [], isAdmin, currentUserId });
});

app.post("/platforms/:platform_id/new",getSession, (req, res) => {
           if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const { platform_id } = req.params;
  const { title, genre } = req.body;
  const pid = Number(platform_id);

  const errors = [];
  if (!title || !genre) errors.push("Wszystkie pola są wymagane.");

  const exists = db_ops.check_game_exists.get(title, pid);
  if (exists) errors.push("Ta gra już istnieje na tej platformie.");

  if (errors.length > 0) {
    const platform = db_ops.get_platform_by_id.get(pid);
    const games = db_ops.get_games_by_platform.all(pid);
    const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
    const isAdmin = adminCheck && adminCheck.is_admin === 1;
    const currentUserId = res.locals.session.user_id;
    return res.render("platform", { platform, games, errors, isAdmin, currentUserId });
  }

  db_ops.insert_game.get(title, genre, pid, res.locals.session.user_id);
  res.redirect(`/platforms/${pid}`);
});
app.post("/logout", (req,res)=>{
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    db_ops.delete_session.run(sessionId);
  }
  res.clearCookie(SESSION_COOKIE);
  res.locals.session = null;
  res.redirect("/login")
})
app.post("/platforms/:platform_id/delete-platform", getSession, (req, res) => {
  if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
  const isAdmin = adminCheck && adminCheck.is_admin === 1;
  if (!isAdmin) {
    return res.status(403).json({ error: "Tylko administrator może usuwać platformy." });
  }
  const { platform_id } = req.params;
  db_ops.delete_platform.run(Number(platform_id));
  res.redirect("/platforms");
});

app.post("/platforms/:platform_id/delete", getSession,(req, res) => {
           if (!res.locals.session) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const { platform_id } = req.params;
  const { game_id } = req.body;

  if (game_id) {
    const adminCheck = db_ops.check_if_admin.get(res.locals.session.user_id);
    const isAdmin = adminCheck && adminCheck.is_admin === 1;

    if (!isAdmin) {
      const game = db_ops.get_game_by_id.get(Number(game_id));
      if (!game || game.user_id !== res.locals.session.user_id) {
        return res.status(403).json({ error: "Brak uprawnień do usunięcia tej gry." });
      }
    }

    db_ops.delete_game.run(Number(game_id));
  }

  res.redirect(`/platforms/${platform_id}`);
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});