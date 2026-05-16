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

export const db_ops = {
  get_platforms: db.prepare(`SELECT * FROM platforms`),
  get_platform_by_id: db.prepare(`SELECT * FROM platforms WHERE id = ?`),
  insert_platform: db.prepare(`INSERT INTO platforms (name) VALUES (?) RETURNING id, name;`),
  get_games_by_platform: db.prepare(`SELECT * FROM games WHERE platform_id = ?`),
  insert_game: db.prepare(`INSERT INTO games (title, genre, platform_id, user_id) VALUES (?, ?, ?, ?) RETURNING id, title, genre, platform_id, user_id;`),
  delete_game: db.prepare(`DELETE FROM games WHERE id = ?`),
  delete_platform: db.prepare(`DELETE FROM platforms WHERE id = ?`),
  check_game_exists: db.prepare(`SELECT 1 FROM games WHERE title = ? AND platform_id = ?`),
  get_game_by_id: db.prepare(`SELECT * FROM games WHERE id = ?`),
  check_login_exist: db.prepare(`SELECT username FROM users WHERE username = ?`),
  check_user_exist: db.prepare(`SELECT id FROM users WHERE username = ?`),
  insert_user: db.prepare(`INSERT INTO users (username,password,is_admin) VALUES(?,?,?) RETURNING id,username,password,is_admin`),
  create_session: db.prepare(`INSERT INTO session (id, user_id, created_at) VALUES (?, ?, ?) RETURNING id, user_id, created_at;`),
  get_session: db.prepare("SELECT id, user_id, created_at from session WHERE id = ?;"),
  get_auth_data: db.prepare("SELECT password FROM users WHERE username = ?;"),
  check_if_admin: db.prepare("SELECT is_admin from users WHERE id = ?;"),
  delete_session: db.prepare("DELETE FROM session WHERE id = ?"),
};
