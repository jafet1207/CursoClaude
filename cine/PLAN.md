# Plan de construcción: Sistema de Venta de Entradas en Línea — Cine Variedades

**Objetivo:** Un prototipo funcional donde un cliente compra una entrada eligiendo asiento (online o en taquilla), con integridad real de asientos, descuentos, refunds y reportes, sobre una base de datos real.

**Arquitectura:** Tres capas — Presentación (web responsive, un solo frontend para cliente y taquillero), Dominio (Gestor de Cartelera, Mapa de Butacas y Transacciones, Gestor de Compras, Gestor de Tarifas, Gestor de Refunds, Histórico de Compras, Generador de Reportes, Gestor de Notificaciones) y Persistencia (base de datos compartida, única fuente de verdad del mapa de butacas).

**Stack:** Node.js + Express (backend), SQLite (persistencia), vistas server-side con EJS/HTML simple.

**Restricciones globales:**
- Un solo cine con sus dos salas (120 y 60 asientos), cartelera de una semana fija.
- Pago simulado; sin integración con medios de pago reales.
- Sin boletos impresos ni códigos de barra.
- Sin cuentas de usuario persistentes; cada compra se identifica por email + código de confirmación.
- Sin entradas con caducidad ni transferencia entre usuarios.

## Cómo usar este plan
- Una pieza por conversación. Al cerrar la pieza, cerrar también la conversación: el contexto arranca limpio y barato en la siguiente.
- El encargo de cada pieza referencia ESPECIFICACION.md y DISENO.md; no los repite.
- Una pieza queda cerrada cuando su comprobación se corrió y el resultado quedó anotado en su Evidencia.
- Lo que la construcción revele que falta en la especificación o el diseño se corrige primero en ese documento, y después en el código.

## Piezas

| # | Pieza | Depende de | Estado |
|---|---|---|---|
| 1 | Compra online — recorrido base | — | cerrada |
| 2 | Integridad de asientos | 1 | pendiente |
| 3 | Descuentos automáticos | 1 | pendiente |
| 4 | Compra en taquilla | 1 | pendiente |
| 5 | Consulta y refund individual | 1, 4 | pendiente |
| 6 | Refund por función | 1 | pendiente |
| 7 | Reporte mensual del distribuidor | 1, 5, 6 | pendiente |
| 8 | Reportes operativos | 1, 3, 4 | pendiente |

## Detalle

### Pieza 1: Compra online — recorrido base

**Qué tiene que ser cierto**
- El repositorio arranca (`npm start` o equivalente) contra una base SQLite real (no en memoria) con datos de prueba: 2 salas (120 y 60 asientos, filas A–M), al menos 3 funciones de la cartelera semanal con película, sala, fecha/hora y precio base.
- Un cliente ve la cartelera, elige una función, y ve el mapa de butacas con todos los asientos en estado "disponible".
- Al hacer clic en un asiento disponible, el sistema crea una reserva real (fila en `RESERVA_ASIENTO` con `reservado_en`) y el asiento pasa a "en_espera" en el mapa — este es el mismo mecanismo que la Pieza 2 someterá a concurrencia y expiración; no es un estado simulado en memoria.
- El cliente llena nombre y email, se le muestra el precio (tarifa base únicamente en esta pieza), confirma, el sistema simula el pago y genera un código de confirmación único de 12+ caracteres alfanuméricos (CA-4).
- La compra queda registrada en `COMPRA` (canal `online`, `monto_final` = precio base de la función) y el asiento pasa a "vendido".
- Queda una entrada en el log de notificaciones con código, nombre, asiento, función y precio.

**Con qué se comprueba**
- Arrancar la app y verificar que la cartelera muestra las funciones de prueba.
- Elegir una función: el mapa de butacas muestra todos los asientos "disponible".
- Clic en un asiento: pasa a "en_espera"; consultar directamente la tabla `RESERVA_ASIENTO` y confirmar que existe la fila con `reservado_en` poblado.
- Completar el formulario (nombre, email, tarifa base) y confirmar: el sistema devuelve un código de 12+ caracteres alfanuméricos; el asiento pasa a "vendido" en el mapa.
- Consultar la tabla `COMPRA`: existe una fila con ese código, canal `online`, `monto_final` igual al precio base de la función.
- Detener y volver a levantar el proceso de la app: el asiento sigue "vendido" y la compra sigue en la base (persistencia real, no en memoria).
- Revisar el log de notificaciones: contiene la entrada esperada para esa compra.

**Toca**: Gestor de Cartelera, Mapa de Butacas y Transacciones, Gestor de Compras, Gestor de Tarifas (tarifa base únicamente), Histórico de Compras, Gestor de Notificaciones.

**Interfaces**
- Consume: — (primera pieza).
- Produce:
  - Estado de un asiento por función: consulta que dado `(funcion_id, butaca_id)` devuelve `"disponible" | "en_espera" | "vendido"`, derivado de `RESERVA_ASIENTO` vigente y `COMPRA` no refundada.
  - `reservarAsiento(funcion_id, butaca_id, cliente_email)` → crea la fila en `RESERVA_ASIENTO` o falla si el asiento no está disponible. Usada por Piezas 2, 3, 4.
  - `confirmarCompra(funcion_id, butaca_id, tarifa, cliente_nombre, cliente_email, canal)` → valida que existe una reserva vigente para ese asiento/función, calcula el precio (en esta pieza, solo tarifa base — la Pieza 3 reemplaza este cálculo por la regla completa), inserta en `COMPRA`, retorna el código de confirmación. Usada por Piezas 3, 4.
  - `listarComprasPorFuncion(funcion_id)` → todas las compras (refundadas o no) de una función. Usada por Pieza 6.
  - Formato del código de confirmación: 12+ caracteres alfanuméricos, generado en esta pieza y reutilizado sin cambios por el resto.

**Evidencia** *(cerrada 2026-08-18)*
- Suite de pruebas (`npm test`, Node test runner): 13 casos, todos en verde — cubren `estadoAsiento`, `reservarAsiento`, `mapaDeFuncion`, `calcularPrecio` (tarifa base), `registrarConfirmacion`, `confirmarCompra`, `listarComprasPorFuncion`, `listarFunciones`/`obtenerFuncion`, y el recorrido HTTP completo (cartelera → mapa → reservar → comprar → confirmar).
- TDD detectó y corrigió un defecto real antes de cerrar la pieza: el generador de código usaba `base64url`, que incluye `-` y `_` (no alfanumérico, viola CA-4); se reemplazó por un generador con alfabeto estrictamente A-Za-z0-9.
- Comprobación manual sobre la app real (`npm start`, datos sembrados con `npm run seed`):
  - Cartelera muestra las 3 funciones de prueba.
  - Mapa de butacas de una función muestra todos los asientos "disponible".
  - Clic en un asiento (vía formulario) crea la reserva real; verificado directamente contra `RESERVA_ASIENTO` en `data/cine.db`.
  - Confirmar la compra devuelve código de 12 caracteres alfanuméricos (ej. `vc8JyU7p9UZR`); el asiento pasa a "vendido"; fila en `COMPRA` con `canal='online'` y `monto_final=3000` (precio base de la función).
  - **Persistencia real**: se detuvo el proceso (`taskkill`) y se volvió a levantar (`node src/server.js`) sin volver a sembrar — el asiento seguía "vendido" y la compra seguía en `COMPRA`.
  - `data/notificaciones.log` contenía la línea con código, nombre, asiento, función y precio de esa compra.

---

### Pieza 2: Integridad de asientos

**Qué tiene que ser cierto**
- Dos solicitudes de compra sobre el mismo asiento y función, ocurriendo al mismo tiempo, no pueden resultar ambas en una venta: una tiene éxito y la otra recibe un rechazo explícito.
- Una reserva no completada dentro de los 10 minutos se libera automáticamente: el asiento vuelve a "disponible" sin que nadie lo libere a mano.
- Confirmar una compra sobre una reserva ya expirada es rechazado explícitamente, y el asiento queda "disponible" (no "en_espera" fantasma).

**Con qué se comprueba**
- Disparar dos solicitudes de `reservarAsiento`/`confirmarCompra` casi simultáneas (script de prueba con dos llamadas concurrentes) sobre el mismo asiento y función: verificar que solo una fila de `COMPRA` existe para ese asiento/función, y que la solicitud perdedora recibió un mensaje de rechazo explícito (no un error genérico ni un segundo "vendido").
- Reservar un asiento y, usando un tiempo de expiración configurable para pruebas (p.ej. una variable de entorno que reduce el umbral de 10 min a unos segundos), esperar a que expire: consultar el estado del asiento y confirmar que volvió a "disponible" sin intervención manual.
- Con una reserva expirada (mismo mecanismo anterior), intentar `confirmarCompra` sobre ella: el sistema la rechaza con el mensaje "Ese asiento ya no está reservado. Selecciona otro." y el asiento permanece "disponible".

**Toca**: Mapa de Butacas y Transacciones (atomicidad de reserva/venta, mecanismo de expiración).

**Interfaces**
- Consume: estado de asiento, `reservarAsiento`, `confirmarCompra` (Pieza 1).
- Produce:
  - Garantía de atomicidad: `reservarAsiento` y `confirmarCompra` son seguras bajo llamadas concurrentes sobre el mismo asiento — comportamiento del que dependen todas las piezas siguientes, sin una función nueva expuesta.
  - Mecanismo de expiración automática de reservas vencidas, activo en background o verificado de forma perezosa en cada lectura de estado — las piezas siguientes lo dan por hecho al leer el estado de un asiento.

**Evidencia**

---

### Pieza 3: Descuentos automáticos

**Qué tiene que ser cierto**
- Al comprar (online o, cuando exista, en taquilla) una entrada de tarifa base para una función programada en miércoles, el precio final es 50% del precio base.
- Al comprar con tarifa estudiante para una función que no cae en miércoles, el precio final es 75% del precio base (25% de descuento).
- Al comprar con tarifa estudiante para una función de miércoles, se aplica el mejor descuento (50%, no la suma de ambos): el precio final es 50% del precio base.
- `COMPRA.descuento_aplicado` refleja el porcentaje efectivamente aplicado en cada caso.

**Con qué se comprueba**
- Con una función de prueba programada en miércoles: comprar con tarifa "base" y verificar que `monto_final` = 50% del `precio_base` de la función, y `descuento_aplicado` = 50.
- Con una función de prueba que no cae en miércoles: comprar con tarifa "estudiante" y verificar `monto_final` = 75% del precio base, `descuento_aplicado` = 25.
- Con una función de prueba en miércoles: comprar con tarifa "estudiante" y verificar que `monto_final` = 50% del precio base (el descuento de miércoles, no la suma), `descuento_aplicado` = 50.

**Toca**: Gestor de Tarifas.

**Interfaces**
- Consume: `confirmarCompra` (Pieza 1), fecha de la función (Gestor de Cartelera).
- Produce:
  - `calcularPrecio(funcion, tarifaSolicitada)` → `{precio_base, descuento_aplicado, monto_final}`, aplicando la regla de mejor descuento. Reemplaza el cálculo simplificado de tarifa base de la Pieza 1 dentro de `confirmarCompra`. Usada por Piezas 4 y 8.

**Evidencia**

---

### Pieza 4: Compra en taquilla

**Qué tiene que ser cierto**
- El personal de taquilla ve el mismo mapa de butacas que un cliente online, para la misma función, sin inventarios separados: un asiento vendido en un canal aparece vendido en el otro.
- El taquillero puede marcar un asiento como "en_espera", elegir tarifa (incluida "estudiante" con validación visual de carné fuera del sistema, según RN-10), completar el pago simulado y generar un código de confirmación con `canal = 'taquilla'`.
- Se muestra o imprime un recibo con código, nombre, asiento, función y precio.

**Con qué se comprueba**
- Desde la vista de cliente, comprar un asiento de una función. Abrir la vista de taquilla para la misma función: el asiento comprado aparece "vendido" (recargando la vista de taquilla, sin reiniciar el proceso).
- Desde la vista de taquilla, marcar un asiento distinto como "en_espera", completar con tarifa "estudiante" y confirmar: se genera un código de confirmación, `COMPRA.canal = 'taquilla'`, el asiento pasa a "vendido".
- Abrir la vista de cliente para esa misma función: el asiento vendido en taquilla aparece "vendido" también ahí.
- La pantalla de taquilla muestra el recibo con código, nombre, asiento, función y precio tras confirmar.

**Toca**: Gestor de Compras (canal taquilla), Mapa de Butacas y Transacciones.

**Interfaces**
- Consume: `reservarAsiento`, `confirmarCompra` (Pieza 1), `calcularPrecio` (Pieza 3), estado de asiento (Pieza 1/2).
- Produce: — (reutiliza las operaciones existentes con `canal = 'taquilla'`; no agrega funciones de dominio nuevas).

**Evidencia**

---

### Pieza 5: Consulta y refund individual

**Qué tiene que ser cierto**
- Se puede buscar una compra existente por su código de confirmación exacto, o por nombre + email, y ver sus datos (nombre, asiento, función, monto, canal).
- Buscar un código inexistente responde explícitamente "Código de confirmación no encontrado."
- El personal de taquilla puede iniciar un refund individual sobre una compra encontrada: la compra queda marcada como refundada con fecha, y el asiento correspondiente vuelve a "disponible" de inmediato.
- Intentar refundar la misma compra una segunda vez es rechazado explícitamente, sin crear un segundo refund.

**Con qué se comprueba**
- Buscar una compra de prueba por su código exacto: el sistema muestra nombre, asiento, función, monto y canal correctos.
- Buscar la misma compra por nombre + email: mismo resultado.
- Buscar un código que no existe: el sistema responde "Código de confirmación no encontrado."
- Iniciar un refund sobre la compra encontrada: verificar en `COMPRA` que `refundado = true` y `refundado_en` tiene fecha; verificar que el asiento de esa compra aparece "disponible" en el mapa de butacas sin recargar el proceso.
- Repetir el refund sobre la misma compra: el sistema responde "Ese boleto ya fue reembolsado." y `COMPRA` conserva el `refundado_en` original (no se sobreescribe).

**Toca**: Histórico de Compras, Gestor de Refunds, Mapa de Butacas y Transacciones.

**Interfaces**
- Consume: `COMPRA` (Pieza 1), estado de asiento (Pieza 1/2).
- Produce:
  - `buscarCompra(codigo)` y `buscarCompra(nombre, email)` → compra encontrada o "no encontrado".
  - `refundarCompra(codigo)` → valida que no esté ya refundada, marca `refundado = true` con `refundado_en`, libera el asiento (vuelve a "disponible"), o rechaza si ya estaba refundada. Reutilizada por Pieza 6 para el refund masivo.

**Evidencia**

---

### Pieza 6: Refund por función

**Qué tiene que ser cierto**
- El personal autorizado puede cancelar una función (p.ej. por falla del proyector); al hacerlo, todas las compras activas (no refundadas) de esa función quedan refundadas automáticamente y sus asientos vuelven a "disponible".
- Una compra que ya estaba refundada individualmente antes de la cancelación no se refunda dos veces (conserva su `refundado_en` original).
- Una función cancelada no admite nuevas reservas de asiento.

**Con qué se comprueba**
- Con una función de prueba que tiene 3 o más compras activas (mezclando canal online y taquilla) y una ya refundada individualmente: ejecutar la cancelación de la función.
- Verificar en `COMPRA` que las compras que estaban activas ahora tienen `refundado = true` con `refundado_en`, y que la que ya estaba refundada conserva su fecha original (no se sobreescribió).
- Verificar en el mapa de butacas que los asientos de las compras recién refundadas volvieron a "disponible".
- Verificar que `FUNCION.cancelada = true`.
- Intentar `reservarAsiento` sobre esa función cancelada: el sistema lo rechaza explícitamente (función no disponible para venta).

**Toca**: Gestor de Refunds, Gestor de Cartelera (marcar cancelada), Histórico de Compras, Mapa de Butacas y Transacciones.

**Interfaces**
- Consume: `listarComprasPorFuncion` (Pieza 1), `refundarCompra` (Pieza 5), estado de asiento y `reservarAsiento` (Pieza 1/2).
- Produce:
  - `cancelarFuncion(funcion_id)` → marca `FUNCION.cancelada = true`, refunda cada compra activa de la función usando `refundarCompra`, libera los asientos correspondientes.

**Evidencia**

---

### Pieza 7: Reporte mensual del distribuidor

**Qué tiene que ser cierto**
- Se puede generar, bajo demanda, un reporte por película con el conteo de boletos vendidos (brutos), refundados, y neto (vendidos - refundados), exportable a CSV.
- Un boleto refundado no se cuenta como parte del neto de "vendidos", pero sí aparece contado en la columna de refundados (CA-6).

**Con qué se comprueba**
- Con datos de prueba que incluyan compras y refunds de al menos 2 películas distintas dentro de un mismo mes: generar el reporte y exportarlo a CSV.
- Contar manualmente en los datos de prueba, por película: total de filas en `COMPRA` (vendidos brutos), total con `refundado = true` (refundados), y neto = vendidos - refundados.
- Verificar que el CSV generado coincide exactamente con ese conteo manual, columna por columna, para cada película.

**Toca**: Generador de Reportes, Histórico de Compras.

**Interfaces**
- Consume: `COMPRA` (Pieza 1), refunds (Piezas 5 y 6).
- Produce: `reporteDistribuidor(mes_ano)` → CSV con película, vendidos, refundados, neto.

**Evidencia**

---

### Pieza 8: Reportes operativos

**Qué tiene que ser cierto**
- Se puede ver, por función, cuántos asientos se vendieron contra la capacidad de la sala (ocupación).
- Se puede ver el ingreso total por período, desglosado por tarifa (base, miércoles, estudiante) y por canal (online, taquilla).
- Se puede ver cuántos boletos se vendieron por canal (online vs. taquilla).
- Se puede ver cuántos boletos se vendieron con tarifa miércoles y cuántos con tarifa estudiante.

**Con qué se comprueba**
- Con una función de prueba de capacidad 60 y 24 asientos vendidos: el reporte de ocupación muestra 24/60.
- Con datos de prueba de un día conocido: sumar manualmente `monto_final` de las compras no refundadas de ese día, por tarifa y canal; comparar contra lo que muestra el reporte de ingresos — deben coincidir exactamente.
- Contar manualmente, en los datos de prueba, boletos por canal (online/taquilla) y comparar contra el reporte de canal de venta.
- Contar manualmente boletos con tarifa miércoles y con tarifa estudiante, comparar contra el reporte de uso de descuentos.

**Toca**: Generador de Reportes, Histórico de Compras.

**Interfaces**
- Consume: `COMPRA` (Pieza 1), `calcularPrecio`/tarifas persistidas (Pieza 3), canal (Pieza 4).
- Produce: `reporteOcupacion(funcion_id)`, `reporteIngresos(periodo)`, `reporteCanal(periodo)`, `reporteDescuentos(periodo)`.

**Evidencia**

## Cobertura

| Requisito o recorrido | Pieza |
|---|---|
| RF-1 Gestión de cartelera | 1 |
| RF-2 Mapa de butacas | 1, 2 |
| RF-3 Selección y retención de asiento | 1, 2 |
| RF-4 Cálculo de precio | 1 (base), 3 (regla completa) |
| RF-5 Compra online | 1 |
| RF-6 Compra en taquilla | 4 |
| RF-7 Generación de confirmación | 1 |
| RF-8 Refund por función | 6 |
| RF-9 Refund individual | 5 |
| RF-10 Registro de refunds | 5, 6 |
| RF-11 Reporte mensual distribuidor | 7 |
| RF-12 Histórico de ventas | 1 (registro base), 3, 4 (canal y tarifa completos) |
| RF-13 Consulta de compra | 5 |
| RN-1 Precio base por función | 1 |
| RN-2 Descuento miércoles | 3 |
| RN-3 Descuento estudiante | 3 |
| RN-4 Mejor descuento | 3 |
| RN-5 Refund por falla del proyector | 6 |
| RN-6 Refunds individuales | 5 |
| RN-7 Liberación de asiento tras refund | 5, 6 |
| RN-8 Retención de asiento durante compra | 1 (mecanismo), 2 (expiración e integridad reales) |
| RN-9 Única fuente de butacas | 1, 2, 4 |
| RN-10 Carné obligatorio en taquilla | Fuera del plan |
| REG-1 Ocupación por función | 8 |
| REG-2 Ingresos por período | 8 |
| REG-3 Canal de venta | 8 |
| REG-4 Uso de descuentos | 8 |
| REG-5 Refunds | 7, 8 |
| REG-6 Tickets devueltos por película | 7 |
| Recorrido: Compra online | 1, 3 |
| Recorrido: Compra en taquilla | 4 |
| Recorrido fallido: Asiento ya comprado | 2 |
| Recorrido fallido: Asiento no disponible al entrar | Fuera del plan |
| Recorrido: Refund por falla | 6 |
| Recorrido: Refund individual | 5 |
| CA-1 Mapa en tiempo real | 1, 2 |
| CA-2 Asiento en espera no vendible a otro | 2 |
| CA-3 Expiración a los 10 minutos | 2 |
| CA-4 Código de confirmación único, 12+ caracteres | 1 |
| CA-5 No doble refund | 5 |
| CA-6 Reporte cuenta correctamente vendidos/refundados/neto | 7 |

## Fuera del plan

- **RN-10 / Recorrido "Asiento no disponible al entrar" (validación de carné de estudiante en taquilla):** DISENO.md lo marca explícitamente como decisión de personal en el momento, fuera del alcance del sistema. El sistema solo registra que la compra se hizo con tarifa estudiante; no automatiza la verificación ni el cobro de diferencia.
- **Autenticación de personal de taquilla (login):** DISENO.md la deja como decisión abierta de implementación, sin resolver. No se construye en este plan; la interfaz de taquilla queda de acceso directo, sin login.
- **Despliegue (cloud vs. on-premise):** DISENO.md la deja como decisión de operación/dueña, fuera del alcance de este plan de construcción.
- **Cambio de idioma (PA-2 de ESPECIFICACION.md):** se asume español únicamente, sin selector de idioma.
- **Notificación por SMS/WhatsApp (PA-5 de ESPECIFICACION.md):** se asume email únicamente (registrado en log, sin envío real — PA-4).
