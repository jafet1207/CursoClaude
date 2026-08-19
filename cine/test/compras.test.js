const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearDbDePrueba, insertarReservaVencida } = require('./helpers');
const { reservarAsiento, estadoAsiento } = require('../src/mapaButacas');
const { confirmarCompra, listarComprasPorFuncion } = require('../src/compras');

function logDePrueba() {
  return path.join(os.tmpdir(), `notificaciones-${Date.now()}-${Math.random()}.log`);
}

test('confirmar una compra sobre una reserva vigente la registra y marca el asiento vendido', () => {
  const db = crearDbDePrueba();
  const logPath = logDePrueba();
  const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();
  reservarAsiento(db, { funcionId: 1, butacaId: butaca.id, clienteEmail: 'ana@example.com' });

  const compra = confirmarCompra(db, {
    funcionId: 1,
    butacaId: butaca.id,
    tarifa: 'base',
    clienteNombre: 'Ana Pérez',
    clienteEmail: 'ana@example.com',
    canal: 'online',
    logPath,
  });

  assert.ok(compra.codigo);
  assert.ok(compra.codigo.length >= 12);
  assert.match(compra.codigo, /^[a-zA-Z0-9]+$/);
  assert.equal(estadoAsiento(db, 1, butaca.id), 'vendido');

  const fila = db.prepare('SELECT * FROM COMPRA WHERE id = ?').get(compra.codigo);
  assert.equal(fila.canal, 'online');
  assert.equal(fila.monto_final, 3000);
  assert.equal(fila.cliente_nombre, 'Ana Pérez');
  assert.equal(fila.refundado, 0);

  const log = fs.readFileSync(logPath, 'utf8');
  assert.match(log, new RegExp(compra.codigo));
  fs.unlinkSync(logPath);
});

test('confirmar una compra sin una reserva vigente falla explícitamente', () => {
  const db = crearDbDePrueba();
  const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();

  assert.throws(
    () =>
      confirmarCompra(db, {
        funcionId: 1,
        butacaId: butaca.id,
        tarifa: 'base',
        clienteNombre: 'Ana Pérez',
        clienteEmail: 'ana@example.com',
        canal: 'online',
        logPath: logDePrueba(),
      }),
    /no hay una reserva vigente/i
  );
});

test('confirmar sobre una reserva expirada es rechazado con el mensaje específico y el asiento queda disponible', () => {
  const db = crearDbDePrueba();
  const logPath = logDePrueba();
  const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();
  insertarReservaVencida(db, { funcionId: 1, butacaId: butaca.id, clienteEmail: 'ana@example.com', minutosAtras: 11 });

  assert.throws(
    () =>
      confirmarCompra(db, {
        funcionId: 1,
        butacaId: butaca.id,
        tarifa: 'base',
        clienteNombre: 'Ana Pérez',
        clienteEmail: 'ana@example.com',
        canal: 'online',
        logPath,
      }),
    /ese asiento ya no está reservado\. selecciona otro\./i
  );

  assert.equal(estadoAsiento(db, 1, butaca.id), 'disponible');
});

test('listarComprasPorFuncion devuelve todas las compras de esa función', () => {
  const db = crearDbDePrueba();
  const logPath = logDePrueba();
  const butaca1 = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();
  const butaca2 = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=2").get();

  reservarAsiento(db, { funcionId: 1, butacaId: butaca1.id, clienteEmail: 'ana@example.com' });
  confirmarCompra(db, {
    funcionId: 1,
    butacaId: butaca1.id,
    tarifa: 'base',
    clienteNombre: 'Ana Pérez',
    clienteEmail: 'ana@example.com',
    canal: 'online',
    logPath,
  });
  reservarAsiento(db, { funcionId: 1, butacaId: butaca2.id, clienteEmail: 'luis@example.com' });
  confirmarCompra(db, {
    funcionId: 1,
    butacaId: butaca2.id,
    tarifa: 'base',
    clienteNombre: 'Luis Gómez',
    clienteEmail: 'luis@example.com',
    canal: 'online',
    logPath,
  });

  const compras = listarComprasPorFuncion(db, 1);
  assert.equal(compras.length, 2);
  fs.unlinkSync(logPath);
});
