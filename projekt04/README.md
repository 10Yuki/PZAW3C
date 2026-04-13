# Działanie aplikacji

`Aplikacja umożliwia użytkownikom dodawanie i usuwanie platform oraz gier w celu pokazania ich innym użytkownikom`


# Zależności

`npm install`

# Użycie
Startujemy stronę komendą:<br>
`node index.js`

Ewentualnie jeśli chcemy dane testowe od razu na stronie to można wystartować serwer w taki sposób:<br>
`POPULATE_DB=1 node index.js`

**I strona jest gotowa do użytku!**


# Struktura projektu


        projekt04/
        ├── index.js
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


**Default admin login**
* admin
* admin123
