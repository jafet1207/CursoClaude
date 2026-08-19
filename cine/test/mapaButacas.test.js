const test = require('node:test');
const assert = require('node:assert/strict');
const { crearDbDePrueba } = require('./helpers');
const { estadoAsiento, reservarAsiento, mapaDeFuncion } = require('../src/mapaButacas');

test('un asiento sin reserva ni compra está disponible', () => {
  const db = crearDbDePrueba();
  const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();

  assert.equal(estadoAsiento(db, 1, butaca.id), 'disponible');
});

test('reservar un asiento disponible lo marca en_espera y guarda la reserva', () => {
  const db = crearDbDePrueba();
  const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();

  reservarAsiento(db, { funcionId: 1, butacaId: butaca.id, clienteEmail: 'ana@example.com' });

  assert.equal(estadoAsiento(db, 1, butaca.id), 'en_espera');
  const reserva = db
    .prepare('SELECT * FROM RESERVA_ASIENTO WHERE funcion_id = 1 AND butaca_id = ?')
    .get(butaca.id);
  assert.equal(reserva.cliente_email, 'ana@example.com');
  assert.ok(reserva.reservado_en);
});

test('reservar un asiento que ya está en espera falla explícitamente', () => {
  const db = crearDbDePrueba();
  const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();
  reservarAsiento(db, { funcionId: 1, butacaId: butaca.id, clienteEmail: 'ana@example.com' });

  assert.throws(
    () => reservarAsiento(db, { funcionId: 1, butacaId: butaca.id, clienteEmail: 'luis@example.com' }),
    /ese asiento ya no está disponible/i
  );
});

test('mapaDeFuncion devuelve todas las butacas de la sala con su estado', () => {
  const db = crearDbDePrueba();
  const butaca1 = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();
  reservarAsiento(db, { funcionId: 1, butacaId: butaca1.id, clienteEmail: 'ana@example.com' });

  const mapa = mapaDeFuncion(db, 1);

  assert.equal(mapa.length, 2);
  const asiento1 = mapa.find((b) => b.fila === 'A' && b.numero === 1);
  const asiento2 = mapa.find((b) => b.fila === 'A' && b.numero === 2);
  assert.equal(asiento1.estado, 'en_espera');
  assert.equal(asiento2.estado, 'disponible');
});
