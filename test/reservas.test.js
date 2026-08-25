// Suite de integración de Cancha Total F5.
//
// Cada prueba responde a una condición numerada de ESPECIFICACION.md, nunca al código: el
// valor esperado sale del documento, no de correr server.js y ver qué devuelve. El sistema
// no expone las reglas como funciones puras (no hay module.exports, y server.js abre su
// propia base de datos y arranca su propio servidor al importarse) — ver HALLAZGOS.md,
// hallazgo de estructura #5. Por eso todas las condiciones se prueban a nivel de
// integración: un servidor real, con HTTP real, contra una base SQLite real (pero aislada
// y desechable — ver test/support/harness.js).
//
// El reloj queda fijo en 2026-03-10T12:00:00 (mediodía) vía test/support/fixed-clock.js,
// para poder construir los bordes exactos de la regla de cancelación (23h59, 24h, 24h01)
// sin depender de la hora real de la máquina que corre la suite.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Database = require('better-sqlite3');
const { startServer, stopServer } = require('./support/harness');

const MOCK_NOW = '2026-03-10T12:00:00';

let baseUrl;
let db;

test.before(async () => {
  const info = await startServer(MOCK_NOW);
  baseUrl = info.baseUrl;
  db = new Database(info.dbPath, { readonly: true });
});

test.after(async () => {
  if (db) db.close();
  await stopServer();
});

// ---------------------------------------------------------------------------------------
// Helpers de negocio, no de framework: hablan en términos de "crear reserva" y "cancelar",
// no de fetch ni de HTML. Cada helper documenta cómo se lee la respuesta observable.
// ---------------------------------------------------------------------------------------

async function crearReserva({ cancha, fecha, hora, cliente, telefono }) {
  const body = new URLSearchParams();
  if (cancha !== undefined) body.set('cancha', String(cancha));
  if (fecha !== undefined) body.set('fecha', fecha);
  if (hora !== undefined) body.set('hora', String(hora));
  if (cliente !== undefined) body.set('cliente', cliente);
  if (telefono !== undefined) body.set('telefono', telefono);

  const res = await fetch(`${baseUrl}/reservas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const texto = await res.text();
  const ok = texto.includes('class="ok"');
  const match = texto.match(/Reserva #(\d+) creada/);
  return { ok, id: match ? Number(match[1]) : null, texto };
}

async function cancelarReserva(id) {
  const res = await fetch(`${baseUrl}/reservas/${id}/cancelar`, { method: 'POST' });
  const texto = await res.text();
  return { ok: texto.includes('class="ok"'), texto };
}

async function getDia(fecha) {
  const res = await fetch(`${baseUrl}/dia/${fecha}`);
  return res.text();
}

async function getDisponibilidad(cancha, fecha) {
  const res = await fetch(`${baseUrl}/disponibilidad/cancha${cancha}?fecha=${fecha}`);
  return res.text();
}

function filaReserva(id) {
  return db.prepare('SELECT * FROM reservas WHERE id = ?').get(id);
}

// =========================================================================================
// 1.1 — Bloques válidos de 8:00 a 21:00 (14 horas de inicio), ninguno fuera de ese rango.
// Cambio que haría fallar esta prueba: quitar o correr el rango de horas válidas en la
// validación de POST /reservas.
// =========================================================================================
test('1.1 — no acepta una reserva fuera del rango de bloques (8:00 a 21:00)', async () => {
  const antesDelRango = await crearReserva({
    cancha: 1, fecha: '2026-05-01', hora: 7, cliente: 'Cliente Uno', telefono: '80000001',
  });
  assert.equal(antesDelRango.ok, false, 'la hora 7:00 es anterior al primer bloque y debe rechazarse');

  const despuesDelRango = await crearReserva({
    cancha: 1, fecha: '2026-05-01', hora: 22, cliente: 'Cliente Uno', telefono: '80000001',
  });
  assert.equal(despuesDelRango.ok, false, 'la hora 22:00 es posterior al último bloque y debe rechazarse');
});

test('1.1 — acepta los bloques límite del rango (8:00 y 21:00)', async () => {
  const primerBloque = await crearReserva({
    cancha: 1, fecha: '2026-05-01', hora: 8, cliente: 'Cliente Uno', telefono: '80000001',
  });
  assert.equal(primerBloque.ok, true, 'el bloque de las 8:00 es el primero válido del día');

  const ultimoBloque = await crearReserva({
    cancha: 1, fecha: '2026-05-01', hora: 21, cliente: 'Cliente Uno', telefono: '80000001',
  });
  assert.equal(ultimoBloque.ok, true, 'el bloque de las 21:00 es el último válido del día');
});

// =========================================================================================
// 1.2 — Las reservas se hacen en cualquiera de las dos canchas.
// Cambio que haría fallar esta prueba: que la cancha 2 (o la 1) deje de aceptar reservas.
// =========================================================================================
test('1.2 — admite reservas tanto en la cancha 1 como en la cancha 2', async () => {
  const cancha1 = await crearReserva({
    cancha: 1, fecha: '2026-05-02', hora: 9, cliente: 'Cliente Dos', telefono: '80000002',
  });
  const cancha2 = await crearReserva({
    cancha: 2, fecha: '2026-05-02', hora: 9, cliente: 'Cliente Dos', telefono: '80000002',
  });
  assert.equal(cancha1.ok, true, 'la cancha 1 debe aceptar la reserva');
  assert.equal(cancha2.ok, true, 'la cancha 2 debe aceptar la reserva');
});

// =========================================================================================
// 2.1 — Una reserva guarda cancha, fecha, hora, nombre del cliente y teléfono.
// Cambio que haría fallar esta prueba: que alguno de esos datos no se guarde, o se guarde
// distinto de lo que mandó quien reserva.
// =========================================================================================
test('2.1 — guarda cancha, fecha, hora, cliente y teléfono tal como se enviaron', async () => {
  const { ok, id } = await crearReserva({
    cancha: 1, fecha: '2026-05-03', hora: 10, cliente: 'Ana Pérez', telefono: '80000003',
  });
  assert.equal(ok, true);

  const fila = filaReserva(id);
  assert.equal(fila.cancha, 1);
  assert.equal(fila.fecha, '2026-05-03');
  assert.equal(fila.hora, 10);
  assert.equal(fila.cliente, 'Ana Pérez');
  assert.equal(fila.telefono, '80000003');
});

// =========================================================================================
// 2.2 — El teléfono es obligatorio y debe tener exactamente 8 dígitos. [hallazgo esperado]
// Cambio que haría fallar esta prueba (una vez cerrado el hallazgo): quitar la validación
// de teléfono obligatorio o de longitud/formato en POST /reservas.
// =========================================================================================
test('2.2 — no acepta una reserva sin teléfono', { todo: 'HALLAZGO-1: ver HALLAZGOS.md' }, async () => {
  const { ok } = await crearReserva({
    cancha: 1, fecha: '2026-05-04', hora: 11, cliente: 'Cliente Cuatro', telefono: '',
  });
  assert.equal(ok, false, 'el teléfono es obligatorio según la administradora');
});

test('2.2 — no acepta un teléfono que no tenga exactamente 8 dígitos', { todo: 'HALLAZGO-1: ver HALLAZGOS.md' }, async () => {
  const corto = await crearReserva({
    cancha: 1, fecha: '2026-05-04', hora: 11, cliente: 'Cliente Cuatro', telefono: '1234567',
  });
  assert.equal(corto.ok, false, 'un teléfono de 7 dígitos no cumple el formato exigido');

  const conLetras = await crearReserva({
    cancha: 1, fecha: '2026-05-04', hora: 12, cliente: 'Cliente Cuatro', telefono: 'abcdefgh',
  });
  assert.equal(conLetras.ok, false, 'el teléfono debe ser numérico de 8 dígitos, no letras');
});

// =========================================================================================
// 2.3 — El nombre del cliente es obligatorio.
// Cambio que haría fallar esta prueba: quitar la validación de cliente obligatorio.
// =========================================================================================
test('2.3 — no acepta una reserva sin nombre de cliente', async () => {
  const { ok } = await crearReserva({
    cancha: 1, fecha: '2026-05-05', hora: 12, cliente: '', telefono: '80000005',
  });
  assert.equal(ok, false, 'el nombre del cliente es obligatorio');
});

// =========================================================================================
// 3.1 — Un bloque ocupado por una reserva activa no se puede volver a reservar.
// Cambio que haría fallar esta prueba: quitar el chequeo de disponibilidad antes de crear.
// =========================================================================================
test('3.1 — no acepta una segunda reserva para un bloque ya ocupado', async () => {
  const primera = await crearReserva({
    cancha: 1, fecha: '2026-05-06', hora: 13, cliente: 'Cliente Seis', telefono: '80000006',
  });
  assert.equal(primera.ok, true);

  const segunda = await crearReserva({
    cancha: 1, fecha: '2026-05-06', hora: 13, cliente: 'Otro Cliente', telefono: '80000066',
  });
  assert.equal(segunda.ok, false, 'el bloque ya está ocupado por la primera reserva activa');
});

// =========================================================================================
// 3.2 — Cancelar a tiempo libera el bloque para una nueva reserva.
// Cambio que haría fallar esta prueba: que cancelar no libere el bloque, o que el chequeo
// de disponibilidad siga contando reservas canceladas.
// =========================================================================================
test('3.2 — al cancelar una reserva, su bloque vuelve a estar disponible', async () => {
  const primera = await crearReserva({
    cancha: 2, fecha: '2026-03-11', hora: 12, cliente: 'Cliente Siete', telefono: '80000007',
  });
  assert.equal(primera.ok, true);

  const cancelacion = await cancelarReserva(primera.id);
  assert.equal(cancelacion.ok, true, 'faltan exactamente 24h para el bloque, debe poder cancelarse');

  const segunda = await crearReserva({
    cancha: 2, fecha: '2026-03-11', hora: 12, cliente: 'Cliente Siete Bis', telefono: '80000071',
  });
  assert.equal(segunda.ok, true, 'el bloque quedó libre tras la cancelación');
});

// =========================================================================================
// 4.1 — La hora diurna (antes de las 17:00) cuesta ₡15.000.
// Cambio que haría fallar esta prueba: cambiar la tarifa diurna.
// =========================================================================================
test('4.1 — cobra ₡15.000 por un bloque diurno', async () => {
  const { ok, id } = await crearReserva({
    cancha: 1, fecha: '2026-05-08', hora: 9, cliente: 'Cliente Ocho', telefono: '80000008',
  });
  assert.equal(ok, true);
  assert.equal(filaReserva(id).precio, 15000);
});

// =========================================================================================
// 4.2 — Desde las 17:00 (inclusive) la tarifa es ₡20.000. [hallazgo esperado]
// Cambio que haría fallar esta prueba (una vez cerrado el hallazgo): mover el corte de
// tarifa nocturna a una hora distinta de las 17:00.
// =========================================================================================
test('4.2 — cobra ₡20.000 por el bloque de las 17:00 (ya es horario con luz)', { todo: 'HALLAZGO-2: ver HALLAZGOS.md' }, async () => {
  const { ok, id } = await crearReserva({
    cancha: 1, fecha: '2026-05-09', hora: 17, cliente: 'Cliente Nueve', telefono: '80000009',
  });
  assert.equal(ok, true);
  assert.equal(filaReserva(id).precio, 20000, 'el partido de las 5pm ya va con luz, según la administradora');
});

// =========================================================================================
// 5.1 — Cliente frecuente: 4 o más reservas NO canceladas en el mes (contando la actual)
// dan 10% de descuento. [hallazgo esperado en el sub-caso con cancelaciones]
// Cambio que haría fallar la primera prueba: quitar el descuento de cliente frecuente.
// Cambio que haría fallar la segunda (una vez cerrado el hallazgo): volver a contar las
// reservas canceladas en el total del mes.
// =========================================================================================
test('5.1 — aplica 10% de descuento a la cuarta reserva no cancelada del mes', async () => {
  const telefono = '80000010';
  const previas = [
    { fecha: '2026-06-01', hora: 8, cancha: 1 },
    { fecha: '2026-06-02', hora: 9, cancha: 1 },
    { fecha: '2026-06-03', hora: 10, cancha: 1 },
  ];
  for (const p of previas) {
    const r = await crearReserva({ ...p, cliente: 'Cliente Frecuente A', telefono });
    assert.equal(r.ok, true);
  }

  const cuarta = await crearReserva({
    cancha: 2, fecha: '2026-06-04', hora: 8, cliente: 'Cliente Frecuente A', telefono,
  });
  assert.equal(cuarta.ok, true);
  assert.equal(filaReserva(cuarta.id).precio, 13500, '10% de descuento sobre ₡15.000');
});

test('5.1 — no cuenta reservas canceladas para el descuento de cliente frecuente', { todo: 'HALLAZGO-3: ver HALLAZGOS.md' }, async () => {
  const telefono = '80000011';
  await crearReserva({ cancha: 1, fecha: '2026-06-05', hora: 8, cliente: 'Cliente Frecuente B', telefono });
  await crearReserva({ cancha: 1, fecha: '2026-06-06', hora: 9, cliente: 'Cliente Frecuente B', telefono });
  const tercera = await crearReserva({ cancha: 1, fecha: '2026-06-07', hora: 10, cliente: 'Cliente Frecuente B', telefono });
  assert.equal(tercera.ok, true);

  const cancelacion = await cancelarReserva(tercera.id);
  assert.equal(cancelacion.ok, true, 'fecha muy futura respecto al reloj fijo, debe poder cancelarse');

  // Con la cancelada afuera, sólo hay 2 reservas jugadas este mes; ésta sería la 3ra: no
  // debería aplicar descuento.
  const cuarta = await crearReserva({
    cancha: 2, fecha: '2026-06-08', hora: 8, cliente: 'Cliente Frecuente B', telefono,
  });
  assert.equal(cuarta.ok, true);
  assert.equal(
    filaReserva(cuarta.id).precio,
    15000,
    'sin contar la cancelada, todavía no llega a 4 reservas jugadas en el mes'
  );
});

// =========================================================================================
// 6.1 — Cancelación permitida solo si faltan 24h o más para la fecha/hora exacta del
// bloque. [hallazgo esperado en el borde de menos de 24h]
// Reloj fijo en 2026-03-10T12:00:00; "mañana" es 2026-03-11.
// Cambio que haría fallar esta prueba (una vez cerrado el hallazgo): que la cancelación
// vuelva a decidirse comparando solo fechas, sin la hora exacta del bloque.
// =========================================================================================
test('6.1 — no permite cancelar si faltan menos de 24 horas exactas para el bloque', async () => {
  // 2026-03-11 11:00 está a 23h de 2026-03-10 12:00.
  const { ok, id } = await crearReserva({
    cancha: 1, fecha: '2026-03-11', hora: 11, cliente: 'Cliente Doce', telefono: '80000012',
  });
  assert.equal(ok, true);

  const cancelacion = await cancelarReserva(id);
  assert.equal(cancelacion.ok, false, 'faltan solo 23h para el bloque, no se puede cancelar');
});

test('6.1 — permite cancelar cuando faltan exactamente 24 horas o más', async () => {
  // 2026-03-11 12:00 está a exactamente 24h de 2026-03-10 12:00.
  const exacto24h = await crearReserva({
    cancha: 1, fecha: '2026-03-11', hora: 12, cliente: 'Cliente Doce', telefono: '80000012',
  });
  assert.equal(exacto24h.ok, true);
  const cancelExacto = await cancelarReserva(exacto24h.id);
  assert.equal(cancelExacto.ok, true, 'a exactamente 24h el límite es inclusive, debe poder cancelarse');

  // 2026-03-11 13:00 está a 25h de 2026-03-10 12:00.
  const mas24h = await crearReserva({
    cancha: 1, fecha: '2026-03-11', hora: 13, cliente: 'Cliente Doce', telefono: '80000012',
  });
  assert.equal(mas24h.ok, true);
  const cancelMas = await cancelarReserva(mas24h.id);
  assert.equal(cancelMas.ok, true, 'con 25h de margen, debe poder cancelarse');
});

// =========================================================================================
// 6.2 — Una reserva ya cancelada no se puede volver a cancelar.
// Cambio que haría fallar esta prueba: quitar el chequeo de estado antes de cancelar.
// =========================================================================================
test('6.2 — no permite cancelar dos veces la misma reserva', async () => {
  const { id } = await crearReserva({
    cancha: 2, fecha: '2026-03-11', hora: 14, cliente: 'Cliente Trece', telefono: '80000013',
  });

  const primeraCancelacion = await cancelarReserva(id);
  assert.equal(primeraCancelacion.ok, true);

  const segundaCancelacion = await cancelarReserva(id);
  assert.equal(segundaCancelacion.ok, false, 'ya estaba cancelada, no debe volver a cancelarse');
});

// =========================================================================================
// 7.1 — Para cada día se ve qué bloques están libres en cada cancha.
// Cambio que haría fallar esta prueba: que la vista de disponibilidad deje de reflejar las
// reservas activas por cancha.
// =========================================================================================
test('7.1 — la disponibilidad del día distingue bloques libres y ocupados por cancha', async () => {
  const { ok } = await crearReserva({
    cancha: 1, fecha: '2026-05-13', hora: 8, cliente: 'Cliente Catorce', telefono: '80000014',
  });
  assert.equal(ok, true);

  const vistaCancha1 = await getDisponibilidad(1, '2026-05-13');
  const filaOcupada = /<tr><td>8:00<\/td><td class="ocupado">Ocupado<\/td><\/tr>/;
  const filaLibre9 = /<tr><td>9:00<\/td><td class="libre">Libre<\/td><\/tr>/;
  assert.match(vistaCancha1, filaOcupada, 'el bloque de las 8:00 en cancha 1 debe verse ocupado');
  assert.match(vistaCancha1, filaLibre9, 'el bloque de las 9:00 en cancha 1 debe verse libre');

  const vistaCancha2 = await getDisponibilidad(2, '2026-05-13');
  const filaLibre8 = /<tr><td>8:00<\/td><td class="libre">Libre<\/td><\/tr>/;
  assert.match(vistaCancha2, filaLibre8, 'la cancha 2 no tiene reservas ese día, debe verse libre');
});

// =========================================================================================
// 7.2 — Para cada día se ve la lista de reservas con lo que se cobró en cada una.
// Cambio que haría fallar esta prueba: que la vista del día deje de mostrar cliente o
// precio de una reserva.
// =========================================================================================
test('7.2 — la lista del día muestra cada reserva con el cliente y lo cobrado', async () => {
  const { ok } = await crearReserva({
    cancha: 1, fecha: '2026-05-14', hora: 9, cliente: 'Cliente Quince', telefono: '80000015',
  });
  assert.equal(ok, true);

  const vistaDelDia = await getDia('2026-05-14');
  assert.match(vistaDelDia, /Cliente Quince/);
  assert.match(vistaDelDia, /₡15\.000/);
});

// =========================================================================================
// 7.3 — La lista del día incluye tanto reservas activas como canceladas.
// Cambio que haría fallar esta prueba: que la vista del día oculte las reservas canceladas.
// =========================================================================================
test('7.3 — la lista del día incluye reservas activas y canceladas', async () => {
  const activa = await crearReserva({
    cancha: 1, fecha: '2026-05-15', hora: 9, cliente: 'Activo Quince', telefono: '80000016',
  });
  assert.equal(activa.ok, true);

  const cancelada = await crearReserva({
    cancha: 1, fecha: '2026-05-15', hora: 10, cliente: 'Cancelado Quince', telefono: '80000017',
  });
  assert.equal(cancelada.ok, true);
  const cancelacion = await cancelarReserva(cancelada.id);
  assert.equal(cancelacion.ok, true);

  const vistaDelDia = await getDia('2026-05-15');
  assert.match(vistaDelDia, /Activo Quince/);
  assert.match(vistaDelDia, /Cancelado Quince/);
});
