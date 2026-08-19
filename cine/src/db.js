const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS SALA (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  capacidad INTEGER NOT NULL,
  filas INTEGER NOT NULL,
  asientos_por_fila INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS BUTACA (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id INTEGER NOT NULL REFERENCES SALA(id),
  fila TEXT NOT NULL,
  numero INTEGER NOT NULL,
  UNIQUE (sala_id, fila, numero)
);

CREATE TABLE IF NOT EXISTS FUNCION (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pelicula_nombre TEXT NOT NULL,
  sala_id INTEGER NOT NULL REFERENCES SALA(id),
  fecha_hora TEXT NOT NULL,
  precio_base REAL NOT NULL,
  cancelada INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS RESERVA_ASIENTO (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funcion_id INTEGER NOT NULL REFERENCES FUNCION(id),
  butaca_id INTEGER NOT NULL REFERENCES BUTACA(id),
  cliente_email TEXT NOT NULL,
  reservado_en TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'en_espera'
);

CREATE TABLE IF NOT EXISTS COMPRA (
  id TEXT PRIMARY KEY,
  funcion_id INTEGER NOT NULL REFERENCES FUNCION(id),
  butaca_id INTEGER NOT NULL REFERENCES BUTACA(id),
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  tarifa TEXT NOT NULL,
  precio_base REAL NOT NULL,
  descuento_aplicado REAL NOT NULL,
  monto_final REAL NOT NULL,
  canal TEXT NOT NULL,
  comprado_en TEXT NOT NULL,
  refundado INTEGER NOT NULL DEFAULT 0,
  refundado_en TEXT
);
`;

function openDb(path) {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDb };
