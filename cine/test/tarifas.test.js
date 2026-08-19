const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularPrecio } = require('../src/tarifas');

test('tarifa base cobra el precio base completo, sin descuento', () => {
  const resultado = calcularPrecio({ precioBase: 3000, tarifa: 'base', fechaHoraFuncion: '2026-08-20T18:00:00' });

  assert.deepEqual(resultado, { precio_base: 3000, descuento_aplicado: 0, monto_final: 3000 });
});

test('RN-2: tarifa base en una función de miércoles cobra el 50% del precio base', () => {
  const resultado = calcularPrecio({ precioBase: 3000, tarifa: 'base', fechaHoraFuncion: '2026-08-19T18:00:00' });

  assert.deepEqual(resultado, { precio_base: 3000, descuento_aplicado: 50, monto_final: 1500 });
});

test('RN-3: tarifa estudiante en un día que no es miércoles cobra 25% de descuento', () => {
  const resultado = calcularPrecio({ precioBase: 3000, tarifa: 'estudiante', fechaHoraFuncion: '2026-08-20T18:00:00' });

  assert.deepEqual(resultado, { precio_base: 3000, descuento_aplicado: 25, monto_final: 2250 });
});

test('RN-4: tarifa estudiante en función de miércoles aplica el mejor descuento (50%, no se suman)', () => {
  const resultado = calcularPrecio({ precioBase: 3000, tarifa: 'estudiante', fechaHoraFuncion: '2026-08-19T18:00:00' });

  assert.deepEqual(resultado, { precio_base: 3000, descuento_aplicado: 50, monto_final: 1500 });
});

test('una tarifa desconocida es rechazada explícitamente', () => {
  assert.throws(
    () => calcularPrecio({ precioBase: 3000, tarifa: 'vip', fechaHoraFuncion: '2026-08-20T18:00:00' }),
    /tarifa/i
  );
});
