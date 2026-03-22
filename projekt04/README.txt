Instalujemy potrzebne zależności

> npm install

Startujemy stronę komendą 
> node index.js
Ewentualnie jeśli chcemy dane testowe od razu na stronie to można wystartować serwer w taki sposób:
> POPULATE_DB=1 node index.js
Ewentualnie jeśli chcemy zresetować baze danych dla celow testowych to można wystartować serwer w taki sposób:
> RESET_DB=1 node index.js
Ewentualnie jeśli chcemy użyć obie te metody to można można wystartować serwer w taki sposób:
> RESET_DB=1 POPULATE_DB=1 node index.js
I strona jest gotowa do użytku!

default admin login = 
admin
admin123

Struktura   ||     projektu
            ||
            \/
            
        projekt03/
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