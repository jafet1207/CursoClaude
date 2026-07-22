const TASA_IVA = 0.13;

function calcularTotal(carrito) {
  let subtotal = 0;
  for (const item of carrito) {
    subtotal += item.precio * item.cantidad;
  }

  let descuento = 0;
  if (carrito.some((item) => item.cantidad > 10)) {
    descuento = subtotal * 0.10;
  }

  const subtotalConDescuento = subtotal - descuento;
  const iva = subtotalConDescuento * TASA_IVA;
  const total = subtotalConDescuento + iva;
  return { subtotal, descuento, iva, total };
}

module.exports = { calcularTotal };
