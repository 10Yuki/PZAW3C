import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path);

console.log("Inicjalizacja tabel bazy danych...");

db.exec(`
  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE
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
    `INSERT INTO games (title, genre, platform_id) 
     VALUES (?, ?, ?) RETURNING id, title, genre, platform_id;`
  ),
  delete_game: db.prepare(`DELETE FROM games WHERE id = ?`),
  check_game_exists: db.prepare(`SELECT 1 FROM games WHERE title = ? AND platform_id = ?`)
};

if (process.env.POPULATE_DB) {
  console.log("Populating db...");
  const platforms_data = [
    { name: "PC" },
    { name: "PlayStation" },
    { name: "Xbox" }
  ];

  platforms_data.forEach((p_data) => {
    const p = db_ops.insert_platform.get(p_data.name);
    console.log("Created platform:", p);

    if (p.name === "PC") db_ops.insert_game.get("The Witcher 3", "RPG", p.id);
    if (p.name === "PlayStation") db_ops.insert_game.get("God of War", "Action", p.id);
    if (p.name === "Xbox") db_ops.insert_game.get("Halo Infinite", "Shooter", p.id);
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


app.get("/", (req, res) => {
  const platforms = db_ops.get_platforms.all();
  res.render("index", { platforms });
});

app.get("/platforms/new", (req, res) => {
  res.render("new_platform", { errors: [] });
});

app.post("/platforms/new", (req, res) => {
  const { name } = req.body;
  const errors = [];

  if (!name) errors.push("Nazwa platformy jest wymagana.");

  if (errors.length > 0) return res.render("new_platform", { errors });

  try {
    db_ops.insert_platform.get(name);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("new_platform", { errors: ["Błąd bazy danych."] });
  }
});

app.get("/platforms/:platform_id", (req, res) => {
  const { platform_id } = req.params;
  
  const platform = db_ops.get_platform_by_id.get(Number(platform_id));

  if (!platform) return res.redirect("/");

  const games = db_ops.get_games_by_platform.all(Number(platform_id));
  
  res.render("platform", { platform, games, errors: [] });
});

app.post("/platforms/:platform_id/new", (req, res) => {
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
    return res.render("platform", { platform, games, errors });
  }

  db_ops.insert_game.get(title, genre, pid);
  res.redirect(`/platforms/${pid}`);
});

app.post("/platforms/:platform_id/delete", (req, res) => {
  const { platform_id } = req.params;
  const { game_id } = req.body;

  if (game_id) {
    db_ops.delete_game.run(Number(game_id));
  }

  res.redirect(`/platforms/${platform_id}`);
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});