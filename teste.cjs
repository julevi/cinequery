const Database = require("better-sqlite3");
const db = new Database("lib/db/filmes.sqlite", { readonly: true });
const r = db.prepare("SELECT * FROM movies WHERE title LIKE '%Dragonball%'").all();
console.log(r);
