# Biblioteka Gier
Aplikacja umożliwia użytkownikom dodawanie i usuwanie platform oraz gier w celu pokazania ich innym użytkownikom.
# Zależności
```
npm install
```
# Użycie
Startujemy stronę komendą:
```
node index.js
```
Ewentualnie jeśli chcemy dane testowe od razu na stronie:
```
POPULATE_DB=1 node index.js
```
**Domyślne dane admina:**
- login: `admin`
- hasło: `admin123`

# Ścieżki

| Metoda | Ścieżka | Opis | Dostęp |
|--------|---------|------|--------|
| GET | `/` | Przekierowanie - zalogowany - `/platforms`, niezalogowany - `/login` | Wszyscy |
| GET | `/login` | Formularz logowania | Wszyscy |
| POST | `/login` | Obsługa logowania, tworzy sesję | Wszyscy |
| GET | `/register` | Formularz rejestracji | Wszyscy |
| POST | `/register` | Obsługa rejestracji, tworzy sesję | Wszyscy |
| POST | `/logout` | Wylogowanie, usuwa sesję | Zalogowani |
| GET | `/platforms` | Lista wszystkich platform | Zalogowani |
| GET | `/platforms/new` | Formularz dodawania platformy | Admin |
| POST | `/platforms/new` | Dodanie nowej platformy | Admin |
| GET | `/platforms/:id` | Szczegóły platformy z listą gier | Zalogowani |
| POST | `/platforms/:id/new` | Dodanie gry do platformy | Zalogowani |
| POST | `/platforms/:id/delete` | Usunięcie gry | Właściciel gry lub Admin |
| POST | `/platforms/:id/delete-platform` | Usunięcie platformy | Admin |

# Struktura projektu

```
projekt04/
├── index.js
├── db.js
├── auth.js
├── db.sqlite
├── package.json
├── README.md
├── public/
│   └── style.css
└── views/
    ├── head.partial.ejs
    ├── foot.partial.ejs
    ├── logout.ejs
    ├── index.ejs
    ├── login.ejs
    ├── register.ejs
    ├── new_platform.ejs
    └── platform.ejs
```
