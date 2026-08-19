const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularPrecio } = require('../src/tarifas');

test('tarifa base cobra el precio base completo, sin descuento', () => {
  const resultado = calcularPrecio({ precioBase: 3000, tarifa: 'base', fechaHoraFuncion: '2026-08-20T18:00:00' });

  assert.deepEqual(resultado, { precio_base: 3000, descuento_aplicado: 0, monto_final: 3000 });
});
