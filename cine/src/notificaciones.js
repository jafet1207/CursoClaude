const fs = require('node:fs');

function registrarConfirmacion(logPath, { codigo, clienteNombre, clienteEmail, asiento, funcion, monto }) {
  const linea = `[${new Date().toISOString()}] Confirmación ${codigo} — ${clienteNombre} <${clienteEmail}> — asiento ${asiento} — ${funcion} — ₡${monto}\n`;
  fs.appendFileSync(logPath, linea, 'utf8');
}

module.exports = { registrarConfirmacion };
