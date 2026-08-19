/**
 * Pieza 1: solo tarifa base. RN-2 (miércoles), RN-3 (estudiante) y RN-4 (mejor
 * descuento) se implementan en la Pieza 3 sin cambiar esta firma.
 */
function calcularPrecio({ precioBase, tarifa, fechaHoraFuncion }) {
  if (tarifa !== 'base') {
    throw new Error(`Tarifa "${tarifa}" aún no soportada (llega en la Pieza 3).`);
  }

  return { precio_base: precioBase, descuento_aplicado: 0, monto_final: precioBase };
}

module.exports = { calcularPrecio };
