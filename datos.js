// Borra reservas.db y la recrea con reservas de ejemplo variadas.
// Uso: npm run datos

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const RUTA_DB = path.join(__dirname, 'reservas.db');
const usaArchivoLocal = !process.env.TURSO_DATABASE_URL;

if (usaArchivoLocal && fs.existsSync(RUTA_DB)) {
  fs.unlinkSync(RUTA_DB);
  console.log('Base de datos anterior borrada.');
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${RUTA_DB}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function fechaISO(offsetDias) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const reservas = [
  { cancha: 1, fecha: fechaISO(0), hora: 9, cliente: 'Marco Jiménez', telefono: '88112233', precio: 15000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(0), hora: 19, cliente: 'Sofía Araya', telefono: '87654321', precio: 20000, estado: 'activa' },
  { cancha: 1, fecha: fechaISO(0), hora: 20, cliente: 'Los Tigres FC', telefono: '86001122', precio: 20000, estado: 'cancelada' },
  { cancha: 2, fecha: fechaISO(1), hora: 8, cliente: 'Randall Solano', telefono: '83445566', precio: 15000, estado: 'activa' },
  { cancha: 1, fecha: fechaISO(1), hora: 18, cliente: 'Equipo Amigos del Barrio', telefono: '89998877', precio: 18000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(2), hora: 10, cliente: 'Marco Jiménez', telefono: '88112233', precio: 15000, estado: 'activa' },
  { cancha: 1, fecha: fechaISO(-1), hora: 17, cliente: 'Kevin Mora', telefono: '84223344', precio: 15000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(-2), hora: 21, cliente: 'Grupo Fútbol 5 Escazú', telefono: '87001199', precio: 20000, estado: 'cancelada' },
  { cancha: 1, fecha: fechaISO(3), hora: 16, cliente: 'Marco Jiménez', telefono: '88112233', precio: 15000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(4), hora: 12, cliente: 'Paola Vindas', telefono: '85667788', precio: 15000, estado: 'activa' },
];

async function main() {
  if (!usaArchivoLocal) {
    await db.execute('DROP TABLE IF EXISTS reservas');
  }

  await db.execute(`
    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cancha INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora INTEGER NOT NULL,
      cliente TEXT NOT NULL,
      telefono TEXT,
      precio INTEGER NOT NULL,
      estado TEXT NOT NULL DEFAULT 'activa',
      creada_en TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  for (const r of reservas) {
    await db.execute({
      sql: `INSERT INTO reservas (cancha, fecha, hora, cliente, telefono, precio, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [r.cancha, r.fecha, r.hora, r.cliente, r.telefono, r.precio, r.estado],
    });
  }

  console.log(`Base de datos recreada con ${reservas.length} reservas de ejemplo.`);
}

main();
