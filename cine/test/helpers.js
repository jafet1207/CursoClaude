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

function insertarReservaVencida(db, { funcionId, butacaId, clienteEmail, minutosAtras }) {
  const reservadoEn = new Date(Date.now() - minutosAtras * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO RESERVA_ASIENTO (funcion_id, butaca_id, cliente_email, reservado_en, estado) VALUES (?, ?, ?, ?, ?)'
  ).run(funcionId, butacaId, clienteEmail, reservadoEn, 'en_espera');
}

module.exports = { crearDbDePrueba, insertarReservaVencida };
