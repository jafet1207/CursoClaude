const MIERCOLES = 3; // Date.prototype.getDay()
const DESCUENTO_MIERCOLES = 50;
const DESCUENTO_ESTUDIANTE = 25;
const TARIFAS_VALIDAS = ['base', 'estudiante'];

function esMiercoles(fechaHoraFuncion) {
  return new Date(fechaHoraFuncion).getDay() === MIERCOLES;
}

/**
 * RN-2 (miércoles), RN-3 (estudiante) y RN-4 (mejor descuento, no se combinan).
 */
function calcularPrecio({ precioBase, tarifa, fechaHoraFuncion }) {
  if (!TARIFAS_VALIDAS.includes(tarifa)) {
    throw new Error(`Tarifa "${tarifa}" no reconocida.`);
  }

  const descuentosAplicables = [0];
  if (esMiercoles(fechaHoraFuncion)) descuentosAplicables.push(DESCUENTO_MIERCOLES);
  if (tarifa === 'estudiante') descuentosAplicables.push(DESCUENTO_ESTUDIANTE);

  const descuentoAplicado = Math.max(...descuentosAplicables);
  const montoFinal = precioBase * (1 - descuentoAplicado / 100);

  return { precio_base: precioBase, descuento_aplicado: descuentoAplicado, monto_final: montoFinal };
}

module.exports = { calcularPrecio };
