const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registrarConfirmacion } = require('../src/notificaciones');

test('registra una línea en el log con los datos de la confirmación', () => {
  const logPath = path.join(os.tmpdir(), `notificaciones-${Date.now()}.log`);

  registrarConfirmacion(logPath, {
    codigo: 'ABC123XYZ789',
    clienteNombre: 'Ana Pérez',
    clienteEmail: 'ana@example.com',
    asiento: 'A1',
    funcion: 'Película de prueba — 2026-08-20T18:00:00',
    monto: 3000,
  });

  const contenido = fs.readFileSync(logPath, 'utf8');
  assert.match(contenido, /ABC123XYZ789/);
  assert.match(contenido, /Ana Pérez/);
  assert.match(contenido, /ana@example\.com/);
  assert.match(contenido, /A1/);
  assert.match(contenido, /3000/);

  fs.unlinkSync(logPath);
});
