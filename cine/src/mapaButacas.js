function estadoAsiento(db, funcionId, butacaId) {
  const vendido = db
    .prepare('SELECT 1 FROM COMPRA WHERE funcion_id = ? AND butaca_id = ? AND refundado = 0')
    .get(funcionId, butacaId);
  if (vendido) return 'vendido';

  const enEspera = db
    .prepare('SELECT 1 FROM RESERVA_ASIENTO WHERE funcion_id = ? AND butaca_id = ?')
    .get(funcionId, butacaId);
  if (enEspera) return 'en_espera';

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

module.exports = { estadoAsiento, reservarAsiento, mapaDeFuncion };
