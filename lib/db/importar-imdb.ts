import Database from 'better-sqlite3';
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import path from 'path';

const RAW_DIR = path.join(__dirname, 'raw-imdb');
const db = new Database(path.join(__dirname, 'filmes.sqlite'));
const MIN_VOTOS = 500;

db.exec(`
  DROP TABLE IF EXISTS movies;
  DROP TABLE IF EXISTS ratings;
  DROP TABLE IF EXISTS people;
  DROP TABLE IF EXISTS movie_directors;

  CREATE TABLE movies (
    tconst TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER,
    genres TEXT
  );

  CREATE TABLE ratings (
    tconst TEXT PRIMARY KEY,
    averageRating REAL,
    numVotes INTEGER
  );

  CREATE TABLE people (
    nconst TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE movie_directors (
    tconst TEXT,
    nconst TEXT
  );
`);

async function lerTSVGz(nomeArquivo: string, onLinha: (campos: string[]) => void) {
  const caminho = path.join(RAW_DIR, nomeArquivo);
  const stream = fs.createReadStream(caminho).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let primeiraLinha = true;
  for await (const linha of rl) {
    if (primeiraLinha) {
      primeiraLinha = false;
      continue;
    }
    onLinha(linha.split('\t'));
  }
}

function processarEmLotes<T>(insertFn: (linhas: T[]) => void, tamanhoLote = 5000) {
  let buffer: T[] = [];
  return {
    add(item: T) {
      buffer.push(item);
      if (buffer.length >= tamanhoLote) insertFn(buffer.splice(0, buffer.length));
    },
    flush() {
      if (buffer.length > 0) insertFn(buffer.splice(0, buffer.length));
    },
  };
}

async function importar() {
  console.log('--- Etapa 1/4: filtrando ratings ---');
  const ratingsValidos = new Map<string, { averageRating: number; numVotes: number }>();
  await lerTSVGz('title.ratings.tsv.gz', ([tconst, averageRating, numVotes]) => {
    const votos = parseInt(numVotes, 10);
    if (votos >= MIN_VOTOS) {
      ratingsValidos.set(tconst, { averageRating: parseFloat(averageRating), numVotes: votos });
    }
  });
  console.log(`Títulos com >= ${MIN_VOTOS} votos: ${ratingsValidos.size}`);

  console.log('--- Etapa 2/4: movies ---');
  const insertMovie = db.prepare('INSERT INTO movies (tconst, title, year, genres) VALUES (?, ?, ?, ?)');
  const insertRating = db.prepare('INSERT INTO ratings (tconst, averageRating, numVotes) VALUES (?, ?, ?)');
  const movieIds = new Set<string>();

  const loteMovies = processarEmLotes<string[]>(
    db.transaction((linhas: string[][]) => {
      for (const campos of linhas) {
        const [tconst, titleType, primaryTitle, , , startYear, , , genres] = campos;
        if (titleType !== 'movie') continue;
        if (!ratingsValidos.has(tconst)) continue;
        if (primaryTitle === '\\N') continue;

        insertMovie.run(tconst, primaryTitle, startYear === '\\N' ? null : parseInt(startYear, 10), genres === '\\N' ? null : genres);
        const r = ratingsValidos.get(tconst)!;
        insertRating.run(tconst, r.averageRating, r.numVotes);
        movieIds.add(tconst);
      }
    })
  );
  await lerTSVGz('title.basics.tsv.gz', (campos) => loteMovies.add(campos));
  loteMovies.flush();
  console.log(`Filmes importados: ${movieIds.size}`);

  console.log('--- Etapa 3/4: diretores (crew) ---');
  const insertDirector = db.prepare('INSERT INTO movie_directors (tconst, nconst) VALUES (?, ?)');
  const diretoresRelevantes = new Set<string>();

  const loteCrew = processarEmLotes<string[]>(
    db.transaction((linhas: string[][]) => {
      for (const [tconst, directors] of linhas) {
        if (!movieIds.has(tconst)) continue;
        if (directors === '\\N') continue;
        for (const n of directors.split(',')) {
          insertDirector.run(tconst, n);
          diretoresRelevantes.add(n);
        }
      }
    })
  );
  await lerTSVGz('title.crew.tsv.gz', (campos) => loteCrew.add(campos));
  loteCrew.flush();
  console.log(`Diretores relevantes: ${diretoresRelevantes.size}`);

  console.log('--- Etapa 4/4: nomes (people) ---');
  const insertPerson = db.prepare('INSERT INTO people (nconst, name) VALUES (?, ?)');
  let totalPessoas = 0;

  const lotePeople = processarEmLotes<string[]>(
    db.transaction((linhas: string[][]) => {
      for (const [nconst, primaryName] of linhas) {
        if (!diretoresRelevantes.has(nconst)) continue;
        insertPerson.run(nconst, primaryName);
        totalPessoas++;
      }
    })
  );
  await lerTSVGz('name.basics.tsv.gz', (campos) => lotePeople.add(campos));
  lotePeople.flush();
  console.log(`Pessoas importadas: ${totalPessoas}`);

  db.exec(`
    CREATE INDEX idx_directors_tconst ON movie_directors(tconst);
    CREATE INDEX idx_directors_nconst ON movie_directors(nconst);
  `);

  const total = db.prepare('SELECT COUNT(*) as t FROM movies').get() as { t: number };
  console.log(`\n✅ Concluído. Total de filmes: ${total.t}`);
}

importar().catch(console.error);