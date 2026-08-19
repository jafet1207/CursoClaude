const DIEZ_MINUTOS_MS = 10 * 60 * 1000;

// Configurable por RESERVA_EXPIRACION_MS para poder demostrar la expiración
// manualmente sin esperar 10 minutos reales (ver README.md).
function expiracionMs() {
  return Number(process.env.RESERVA_EXPIRACION_MS) || DIEZ_MINUTOS_MS;
}

function estaVencida(reserva) {
  return Date.now() - new Date(reserva.reservado_en).getTime() > expiracionMs();
}

function reservaVigente(db, funcionId, butacaId) {
  const reserva = db
    .prepare(
      'SELECT * FROM RESERVA_ASIENTO WHERE funcion_id = ? AND butaca_id = ? ORDER BY reservado_en DESC LIMIT 1'
    )
    .get(funcionId, butacaId);
  if (!reserva) return null;

  return estaVencida(reserva) ? null : reserva;
}

function estadoAsiento(db, funcionId, butacaId) {
  const vendido = db
    .prepare('SELECT 1 FROM COMPRA WHERE funcion_id = ? AND butaca_id = ? AND refundado = 0')
    .get(funcionId, butacaId);
  if (vendido) return 'vendido';

  if (reservaVigente(db, funcionId, butacaId)) return 'en_espera';

  return 'disponible';
}

function reservarAsiento(db, { funcionId, butacaId, clienteEmail }) {
  if (estadoAsiento(db, funcionId, butacaId) !== 'disponible') {
    throw new Error('Ese asiento ya no está disponible.');
  }

  db.prepare(
    'INSERT INTO RESERVA_ASIENTO (funcion_id, butaca_id, cliente_email, reservado_en, estado) VALUES (?, ?, ?, ?, ?)'
  ).run(funcionId, butacaId, clienteEmail, new Date().toISOString(), 'en_espera');
}

function mapaDeFuncion(db, funcionId) {
  const funcion = db.prepare('SELECT sala_id FROM FUNCION WHERE id = ?').get(funcionId);
  const butacas = db
    .prepare('SELECT * FROM BUTACA WHERE sala_id = ? ORDER BY fila, numero')
    .all(funcion.sala_id);

  return butacas.map((butaca) => ({
    ...butaca,
    estado: estadoAsiento(db, funcionId, butaca.id),
  }));
}

module.exports = { estadoAsiento, reservarAsiento, mapaDeFuncion, reservaVigente, estaVencida };
