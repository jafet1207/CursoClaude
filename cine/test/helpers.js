const { openDb } = require('../src/db');

function crearDbDePrueba() {
  const db = openDb(':memory:');
  db.prepare(
    'INSERT INTO SALA (id, nombre, capacidad, filas, asientos_por_fila) VALUES (1, ?, ?, ?, ?)'
  ).run('Sala Grande', 120, 10, 12);
  db.prepare('INSERT INTO BUTACA (sala_id, fila, numero) VALUES (1, ?, ?)').run('A', 1);
  db.prepare('INSERT INTO BUTACA (sala_id, fila, numero) VALUES (1, ?, ?)').run('A', 2);
  db.prepare(
    'INSERT INTO FUNCION (id, pelicula_nombre, sala_id, fecha_hora, precio_base) VALUES (1, ?, 1, ?, ?)'
  ).run('Película de prueba', '2026-08-20T18:00:00', 3000);
  return db;
}

module.exports = { crearDbDePrueba };
