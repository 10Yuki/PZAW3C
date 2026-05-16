import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import argon2 from "argon2";
import cookieParser from "cookie-parser";
import { db_ops } from "./db.js";
import { createSession, getSession, seedAdmin } from "./auth.js";

const SESSION_COOKIE = "__Host-fisz-id";

await seedAdmin();

if (process.env.POPULATE_DB) {
  console.log("Populating db...");

  const adminExists = db_ops.check_login_exist.get("admin");
  if (!adminExists) {
    const adminHash = await argon2.hash("admin123");
    db_ops.insert_user.run("admin", adminHash, 1);
    console.log("Utworzono konto administratora: admin / admin123");
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

app.get("/", getSession, (req, res) => {
  if (res.locals.session) {
    return res.redirect("/platforms");
  }
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { Username, Password } = req.body;

  if (!Username || !Password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let zwrot2 = db_ops.check_login_exist.get(Username);
  if (zwrot2 != undefined) {
    let auth_data = db_ops.get_auth_data.get(Username);
    if (await argon2.verify(auth_data.password, Password)) {
      createSession(db_ops.check_user_exist.get(Username).id, res);
      res.redirect("/platforms");
    }
  } else {
    return res.status(400).json({ error: "no user available" });
  }
});

app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const { Username, Password, PasswordConfirm } = req.body;

  if (!Username || !Password || !PasswordConfirm) {
    return res.render("register", { error: "Wszystkie pola są wymagane." });
  }

  if (Password !== PasswordConfirm) {
    return res.render("register", { error: "Hasła nie są zgodne." });
  }

  const existingUser = db_ops.check_login_exist.get(Username);
  if (existingUser) {
    return res.render("register", { error: "Użytkownik o tej nazwie już istnieje." });
  }

  const hash = await argon2.hash(Password);
  db_ops.insert_user.run(Username, hash, 0);

  const user = db_ops.check_user_exist.get(Username);
  createSession(user.id, res);

  res.redirect("/platforms");
});

app.get("/platforms", getSession, (req, res) => {
  console.log(res.locals.session);
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

app.post("/platforms/:platform_id/new", getSession, (req, res) => {
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

app.post("/logout", (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    db_ops.delete_session.run(sessionId);
  }
  res.clearCookie(SESSION_COOKIE);
  res.locals.session = null;
  res.redirect("/login");
});

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

app.post("/platforms/:platform_id/delete", getSession, (req, res) => {
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
