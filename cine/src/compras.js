const crypto = require('node:crypto');
const { calcularPrecio } = require('./tarifas');
const { registrarConfirmacion } = require('./notificaciones');
const { estaVencida } = require('./mapaButacas');

const ALFABETO_CODIGO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generarCodigoConfirmacion(longitud = 12) {
  const bytes = crypto.randomBytes(longitud);
  let codigo = '';
  for (let i = 0; i < longitud; i += 1) {
    codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
  }
  return codigo;
}

function confirmarCompra(db, { funcionId, butacaId, tarifa, clienteNombre, clienteEmail, canal, logPath }) {
  const reserva = db
    .prepare(
      'SELECT * FROM RESERVA_ASIENTO WHERE funcion_id = ? AND butaca_id = ? AND cliente_email = ? ORDER BY reservado_en DESC LIMIT 1'
    )
    .get(funcionId, butacaId, clienteEmail);
  if (!reserva) {
    throw new Error('No hay una reserva vigente para este asiento.');
  }
  if (estaVencida(reserva)) {
    throw new Error('Ese asiento ya no está reservado. Selecciona otro.');
  }

  const funcion = db.prepare('SELECT * FROM FUNCION WHERE id = ?').get(funcionId);
  if (!funcion) {
    throw new Error('Esa función no está disponible.');
  }

  const precio = calcularPrecio({
    precioBase: funcion.precio_base,
    tarifa,
    fechaHoraFuncion: funcion.fecha_hora,
  });

  const codigo = generarCodigoConfirmacion();
  const compradoEn = new Date().toISOString();

  db.prepare(
    `INSERT INTO COMPRA
      (id, funcion_id, butaca_id, cliente_nombre, cliente_email, tarifa, precio_base, descuento_aplicado, monto_final, canal, comprado_en, refundado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    codigo,
    funcionId,
    butacaId,
    clienteNombre,
    clienteEmail,
    tarifa,
    precio.precio_base,
    precio.descuento_aplicado,
    precio.monto_final,
    canal,
    compradoEn
  );

  db.prepare('DELETE FROM RESERVA_ASIENTO WHERE funcion_id = ? AND butaca_id = ?').run(funcionId, butacaId);

  const butaca = db.prepare('SELECT * FROM BUTACA WHERE id = ?').get(butacaId);
  registrarConfirmacion(logPath, {
    codigo,
    clienteNombre,
    clienteEmail,
    asiento: `${butaca.fila}${butaca.numero}`,
    funcion: `${funcion.pelicula_nombre} — ${funcion.fecha_hora}`,
    monto: precio.monto_final,
  });

  return { codigo, ...precio, canal, compradoEn };
}

function listarComprasPorFuncion(db, funcionId) {
  return db.prepare('SELECT * FROM COMPRA WHERE funcion_id = ?').all(funcionId);
}

module.exports = { confirmarCompra, listarComprasPorFuncion, generarCodigoConfirmacion };
