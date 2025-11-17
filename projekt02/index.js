import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

let platforms = [
  { id: "pc", name: "PC" },
  { id: "ps", name: "PlayStation" },
  { id: "xbox", name: "Xbox" }
];

let games = [
  { title: "The Witcher 3", genre: "RPG", platform_id: "pc" },
  { title: "God of War", genre: "Action", platform_id: "ps" },
  { title: "Halo Infinite", genre: "Shooter", platform_id: "xbox" }
];

app.get("/", (req, res) => {
  res.render("index", { platforms });
});

app.get("/platforms/new", (req, res) => {
  res.render("new_platform", { errors: [] });
});

app.post("/platforms/new", (req, res) => {
  const { id, name } = req.body;
  const errors = [];

  if (!id || !name) errors.push("Wszystkie pola są wymagane.");
  if (platforms.find(p => p.id === id)) errors.push("Platforma o takim ID już istnieje.");

  if (errors.length > 0) return res.render("new_platform", { errors });

  platforms.push({ id, name });
  res.redirect("/");
});

app.get("/platforms/:platform_id", (req, res) => {
  const { platform_id } = req.params;
  const platform = platforms.find(p => p.id === platform_id);

  if (!platform) return res.redirect("/");

  const filtered = games.filter(g => g.platform_id === platform_id);
  res.render("platform", { platform, games: filtered, errors: [] });
});

app.post("/platforms/:platform_id/new", (req, res) => {
  const { platform_id } = req.params;
  const { title, genre } = req.body;

  const platform = platforms.find(p => p.id === platform_id);
  const filtered = games.filter(g => g.platform_id === platform_id);
  const errors = [];

  if (!title || !genre) errors.push("Wszystkie pola są wymagane.");

  if (games.find(g => g.platform_id === platform_id && g.title.toLowerCase() === title.toLowerCase()))
    errors.push("Ta gra już istnieje na tej platformie.");

  if (errors.length > 0)
    return res.render("platform", { platform, games: filtered, errors });

  games.push({ title, genre, platform_id });
  res.redirect(`/platforms/${platform_id}`);
});

app.post("/platforms/:platform_id/delete", (req, res) => {
  const { platform_id } = req.params;
  const { title } = req.body;

  games = games.filter(g => !(g.platform_id === platform_id && g.title === title));

  res.redirect(`/platforms/${platform_id}`);
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
