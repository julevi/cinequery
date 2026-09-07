import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

db.exec(`
  DROP TABLE IF EXISTS produtos;
  DROP TABLE IF EXISTS pedidos;

  CREATE TABLE produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    preco REAL NOT NULL
  );

  CREATE TABLE pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
  );
`);

const insertProduto = db.prepare(
  'INSERT INTO produtos (nome, categoria, preco) VALUES (?, ?, ?)'
);

const produtos = [
  ['Notebook Gamer', 'Eletrônicos', 4500.00],
  ['Mouse sem fio', 'Eletrônicos', 89.90],
  ['Cadeira Ergonômica', 'Móveis', 1200.00],
  ['Monitor 27"', 'Eletrônicos', 1350.00],
  ['Teclado Mecânico', 'Eletrônicos', 350.00],
];

produtos.forEach((p) => insertProduto.run(...p));

const insertPedido = db.prepare(
  'INSERT INTO pedidos (produto_id, quantidade, data) VALUES (?, ?, ?)'
);

const pedidos = [
  [1, 2, '2024-01-15'],
  [2, 5, '2024-02-10'],
  [3, 1, '2024-03-20'],
  [1, 1, '2024-04-05'],
  [4, 3, '2024-05-12'],
  [5, 4, '2024-06-01'],
  [2, 10, '2024-07-15'],
];

insertPedido; // já usado abaixo
pedidos.forEach((p) => insertPedido.run(...p));

console.log('Banco populado com sucesso!');