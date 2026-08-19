const path = require('node:path');
const fs = require('node:fs');
const { openDb } = require('./db');

const DB_PATH = path.join(__dirname, '..', 'data', 'cine.db');

function crearButacas(db, salaId, filas, asientosPorFila) {
  const insert = db.prepare('INSERT INTO BUTACA (sala_id, fila, numero) VALUES (?, ?, ?)');
  for (let f = 0; f < filas; f += 1) {
    const fila = String.fromCharCode('A'.charCodeAt(0) + f);
    for (let numero = 1; numero <= asientosPorFila; numero += 1) {
      insert.run(salaId, fila, numero);
    }
  }
}

function sembrar() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.rmSync(DB_PATH, { force: true });
  const db = openDb(DB_PATH);

  const salaGrande = db
    .prepare('INSERT INTO SALA (nombre, capacidad, filas, asientos_por_fila) VALUES (?, ?, ?, ?)')
    .run('Sala Grande', 120, 10, 12);
  const salaPequena = db
    .prepare('INSERT INTO SALA (nombre, capacidad, filas, asientos_por_fila) VALUES (?, ?, ?, ?)')
    .run('Sala Pequeña', 60, 12, 5);

  crearButacas(db, Number(salaGrande.lastInsertRowid), 10, 12);
  crearButacas(db, Number(salaPequena.lastInsertRowid), 12, 5);

  const hoy = new Date();
  const enDias = (n) => {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + n);
    return fecha;
  };
  const iso = (fecha, hora) => `${fecha.toISOString().slice(0, 10)}T${hora}`;

  const insertFuncion = db.prepare(
    'INSERT INTO FUNCION (pelicula_nombre, sala_id, fecha_hora, precio_base) VALUES (?, ?, ?, ?)'
  );
  insertFuncion.run('Estación Central', salaGrande.lastInsertRowid, iso(enDias(0), '18:00:00'), 3000);
  insertFuncion.run('El Último Vagón', salaPequena.lastInsertRowid, iso(enDias(1), '20:30:00'), 2500);
  insertFuncion.run('Noche en Variedades', salaGrande.lastInsertRowid, iso(enDias(3), '19:00:00'), 3200);

  console.log(`Base de datos sembrada en ${DB_PATH}`);
  db.close();
}

if (require.main === module) {
  sembrar();
}

module.exports = { sembrar, DB_PATH };
