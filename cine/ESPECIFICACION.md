# Especificación: Sistema de Venta de Entradas en Línea — Cine Variedades

## Resumen

Sistema web para que clientes del Cine Variedades compren entradas y seleccionen sus asientos desde el teléfono o computadora. Descongestion la fila de viernes y sábado, reduce la carga en taquilla y genera datos de venta para reportes mensuales al distribuidor de películas.

## Glosario

| Término | Definición |
|---|---|
| **Función** | Una proyección de una película en una sala a una hora específica. |
| **Cartelera** | El conjunto de funciones programadas para una semana. |
| **Butaca** | Un asiento en una sala; tiene una fila y número (p.ej. F-7). |
| **Mapa de butacas** | Representación de los asientos disponibles y vendidos de una función. |
| **Asiento vendido** | Un asiento al que se le asignó una compra pagada. |
| **Asiento en espera** | Un asiento que está retenido mientras un cliente paga; se libera si pasa el tiempo o cancela. |
| **Confirmación** | Código único que identifica una compra sin necesidad de cuenta de usuario. |
| **Distribuidor** | Empresa proveedora de películas que recibe un informe mensual de boletos vendidos por film. |

## Objetivos

- Permitir a clientes comprar entradas y elegir asiento desde un dispositivo conectado a internet.
- Reducir la cola de viernes y sábado desplazando ventas al canal online.
- Centralizar el registro de ventas para generar reportes mensuales del distribuidor.
- Mantener una sola fuente de verdad: un mapa de butacas compartido entre ventas online y taquilla.

## Fuera de alcance

- Emisión de boletos impresos o códigos de barras.
- Cuentas de usuario persistentes; cada compra se identifica por email + código de confirmación.
- Integración con medios de pago reales; el pago se simula.
- Entradas con caducidad o transferencia entre usuarios.
- Funciones o salas futuras; la cartelera es de una semana fija.

## Reglas del negocio

1. **RN-1: Precio base por función.** Cada función tiene un precio base configurado. Todos los asientos de una función parten de ese precio.

2. **RN-2: Descuento miércoles.** Las entradas de funciones que caen en miércoles se venden a mitad del precio base. Aplica a toda compra de ese día, sin excepciones.

3. **RN-3: Descuento estudiante.** Clientes que muestren carné de estudiante reciben 25% de descuento sobre el precio base. Online, seleccionan la tarifa de estudiante; la validación del carné ocurre en taquilla al entrar.

4. **RN-4: Mejor descuento.** Si un cliente aplica para más de un descuento (p.ej. estudiante un miércoles), se le aplica el que le da menor precio; no se combinan.

5. **RN-5: Refund por falla del proyector.** Cuando ocurre una falla técnica (p.ej. proyector) que imposibilita la función, todo comprador de esa función es reembolsado automáticamente.

6. **RN-6: Refunds individuales.** El personal de taquilla puede iniciar un reembolso para un boleto individual, p.ej. por solicitud del cliente. El reembolso es definitivo; un boleto refundado no puede reembolsarse dos veces.

7. **RN-7: Liberación de asiento tras refund.** Un asiento reembolsado queda nuevamente disponible para venta inmediatamente.

8. **RN-8: Retención de asiento durante compra.** Cuando un cliente selecciona un asiento y procede a pagar, ese asiento está retenido por 10 minutos. Si no completa la compra en ese tiempo, el asiento vuelve a estar disponible.

9. **RN-9: Una única fuente de butacas.** Tanto las ventas online como las de taquilla consultan y escriben en el mismo mapa de butacas. No hay inventarios separados.

10. **RN-10: Carné obligatorio en taquilla para tarifa de estudiante.** Si un comprador online pagó con tarifa de estudiante, el personal de taquilla verifica que presente carné al entrar. Si no lo presenta, se efectúa el cobro de la diferencia o se niega la entrada.

## Qué queda registrado

Cada compra, refund y cambio de inventario queda registrado para poder responder estas preguntas:

1. **REG-1: Ocupación por función.** ¿Cuántos asientos se vendieron en cada función? ¿Qué tan llena estuvo?

2. **REG-2: Ingresos por período.** ¿Cuánto dinero se recaudó en un día, semana o mes? ¿Cuánto de cada tarifa (base, miércoles, estudiante)?

3. **REG-3: Canal de venta.** ¿Cuántos boletos se vendieron online vs en taquilla?

4. **REG-4: Uso de descuentos.** ¿Cuántas entradas se vendieron con tarifa de miércoles o estudiante?

5. **REG-5: Refunds.** ¿Cuántos boletos fueron reembolsados? ¿De qué función, fecha y valor?

6. **REG-6: Tickets devueltos por cine por película.** Para cada película, cantidad total vendida, cantidad refundada, y neto (vendida - refundada).

## Salidas que consume alguien más

| Quién | Qué recibe | Formato | Frecuencia |
|---|---|---|---|
| Distribuidor de películas | Conteo de boletos vendidos (vendidos, refundados, neto) por película | Reporte mensual | Una vez al mes |

## Recorridos

### Recorrido exitoso: Compra online

1. Cliente ingresa al sitio.
2. Ve la cartelera de la semana con funciones disponibles.
3. Elige una función.
4. Ve el mapa de butacas con asientos disponibles, vendidos y en espera.
5. Hace clic en un asiento disponible; el sistema lo marca como "en espera" (10 min).
6. Sistema muestra el precio final según la tarifa aplicable (base, miércoles, 25% estudiante).
7. Cliente confirma y elige tarifa (llena nombre, email, marca "estudiante" si aplica).
8. Sistema simula pago; registra la compra como pagada.
9. Sistema genera un código de confirmación único.
10. Cliente recibe confirmación por email con código, nombre, asiento, función y precio.
11. Fin.

### Recorrido: Compra en taquilla (box office)

1. Cliente se presenta en taquilla.
2. Taquillero abre el sistema en taquilla.
3. Taquillero ve la cartelera y la función solicitada.
4. Taquillero ve el mapa de butacas (el mismo que online).
5. Taquillero marca un asiento disponible como "en espera" (10 min).
6. Taquillero solicita al cliente la tarifa: base, miércoles o estudiante (y si es estudiante, pide ver el carné).
7. Taquillero confirma la compra; el sistema simula el pago.
8. Sistema genera un código de confirmación.
9. Taquillero imprime un recibo con código, nombre, asiento, función y precio, o lo muestra en pantalla.
10. Cliente toma el recibo y se retira.
11. Fin.

### Recorrido fallido: Asiento ya comprado

1. Cliente selecciona un asiento disponible.
2. Mientras el cliente paga, otro comprador (online u otra taquilla) completa la compra del mismo asiento.
3. El asiento pasa a "vendido" en la base de datos.
4. El primer cliente intenta confirmar: el sistema detecta que el asiento ya está vendido.
5. Sistema informa al cliente: "Lamentablemente, ese asiento fue vendido. Seleccione otro."
6. Cliente debe elegir un asiento diferente.
7. Fin.

### Recorrido fallido: Asiento no disponible al entrar

1. Cliente compró online un asiento con tarifa de estudiante.
2. Cliente llega a taquilla para entrar.
3. Personal de taquilla le pide carné de estudiante.
4. Cliente no lo presenta.
5. Personal de taquilla calcula la diferencia (precio estudiante vs precio base).
6. Cliente paga la diferencia o se niega la entrada.
7. Fin.

### Recorrido exitoso: Refund por falla

1. Función está en venta.
2. Ocurre una falla técnica (p.ej. proyector no funciona).
3. Personal notifica al sistema: "Cancelar función [ID]".
4. Sistema marca la función como cancelada.
5. Sistema genera automáticamente un refund para cada boleto de esa función (online y taquilla).
6. Asientos quedan disponibles nuevamente.
7. Sistema registra el refund con código de confirmación, monto, fecha y motivo.
8. Cada cliente recibe (o puede consultar) que su compra fue reembolsada.
9. Fin.

### Recorrido exitoso: Refund individual

1. Cliente llama o llega a taquilla pidiendo reembolso.
2. Personal de taquilla solicita código de confirmación o nombre del cliente.
3. Personal busca la compra y la visualiza.
4. Personal inicia un refund sobre ese boleto.
5. Sistema marca el boleto como refundado.
6. Asiento queda disponible para venta nuevamente.
7. Registro de refund se guarda (código, monto, fecha, motivo si aplica).
8. Cliente recibe confirmación de reembolso (email o en taquilla).
9. Fin.

## Requisitos funcionales

1. **RF-1: Gestión de cartelera.** El sistema almacena y muestra funciones programadas con sala, película, hora, fecha y precio base. La cartelera es de una semana.

2. **RF-2: Mapa de butacas.** Para cada función, el sistema muestra un mapa interactivo con el estado de cada asiento (disponible, en espera, vendido). El mapa es compartido entre canales online y taquilla.

3. **RF-3: Selección y retención de asiento.** Cuando un cliente selecciona un asiento, el sistema lo marca como "en espera" por 10 minutos. Si no se completa la compra, el asiento vuelve a disponible.

4. **RF-4: Cálculo de precio.** El sistema calcula el precio final aplicando la tarifa (base, miércoles 50%, estudiante 25%), elige el menor, y muestra el total al cliente.

5. **RF-5: Compra online.** Cliente ingresa nombre, email, selecciona tarifa, confirma asiento y pago. Sistema genera un código de confirmación único y lo envía por email.

6. **RF-6: Compra en taquilla.** Personal de taquilla usa la misma interfaz que online para marcar asientos, aplicar tarifas y completar pagos. Genera un código de confirmación.

7. **RF-7: Generación de confirmación.** Cada compra (online o taquilla) genera un código único. El cliente lo necesita para entrar.

8. **RF-8: Refund por función.** Personal autorizado puede cancelar una función; el sistema refunda automáticamente todos los boletos de esa función y libera los asientos.

9. **RF-9: Refund individual.** Personal autorizado puede reembolsar un boleto individual por código o nombre. El sistema evita doble-refund (un boleto no puede refundarse dos veces).

10. **RF-10: Registro de refunds.** Cada refund queda registrado con código de confirmación, monto, fecha, función y motivo (si aplica).

11. **RF-11: Reporte mensual distribuidor.** El sistema genera un reporte mensual con conteo de boletos por película: vendidos, refundados, neto. Exportable a formato simple (CSV o texto).

12. **RF-12: Histórico de ventas.** El sistema registra cada compra con fecha, hora, función, asiento, tarifa aplicada, monto final, código de confirmación y canal (online o taquilla).

13. **RF-13: Consulta de compra.** Un cliente puede (o personal de taquilla puede) buscar una compra por código de confirmación o nombre + email para verificar su validez o solicitar refund.

## Requisitos no funcionales

1. **RNF-1: Concurrencia en rush.** El sistema debe manejar ~20-50 compradores simultáneos durante el rush de viernes y sábado sin bloqueos o errores de venta.

2. **RNF-2: Integridad de asientos.** Dos clientes nunca deben poder comprar el mismo asiento. La retención de 10 minutos es suficiente para evitar race conditions típicas.

3. **RNF-3: Disponibilidad operativa.** El sistema debe ser confiable durante las horas de venta (especialmente viernes y sábado). Una caída es mala, pero no catastrófica (la taquilla es fallback). No se requiere SLA numérico, pero se espera que sea raro.

## Criterios de aceptación

| ID | Criterio | Requisito asociado |
|---|---|---|
| CA-1 | El mapa de butacas muestra en tiempo real si un asiento está disponible, en espera o vendido; refrescar refleja cambios hechos por otros usuarios. | RF-2 |
| CA-2 | Un asiento en espera no puede ser vendido a otro cliente mientras está retenido. | RF-3 |
| CA-3 | Un asiento en espera vuelve a "disponible" exactamente 10 minutos después de seleccionarse, si no se completó la compra. | RF-3 |
| CA-4 | El código de confirmación es único y suficientemente largo para evitar colisiones (p.ej. 12+ caracteres alphanumeric). | RF-7 |
| CA-5 | Un refund individual no deja refundar el mismo boleto una segunda vez; el sistema lo rechaza explícitamente. | RF-9 |
| CA-6 | El reporte del distribuidor cuenta cada película de forma correcta; un boleto refundado no aparece en "vendidos" si es neto, pero sí aparece si es línea separada. | RF-11 |

## Dependencias

- Ninguna. El sistema es autónomo respecto a integraciones externas (pago simulado, sin APIs de terceros). Email se puede simular o usar un servicio mock.

## Preguntas abiertas

| # | Pregunta | Qué se hace mientras no se resuelva |
|---|---|---|
| PA-1 | ¿Cuál es el porcentaje de descuento exacto para estudiantes? | Se usa 25% como valor provisto en entrevista. |
| PA-2 | ¿El sistema debe soportar cambio de idioma (español/inglés)? | Se asume español únicamente; no hay switch de idioma. |
| PA-3 | ¿Qué sucede si un cliente intenta comprar un asiento luego de que su 10-min de espera expiró pero antes de refrescar la pantalla? | El sistema rechaza la compra al validar en el servidor; se informa al cliente que el asiento ya no está en espera y debe seleccionar otro. |
| PA-4 | ¿El email de confirmación debe ser enviado en tiempo real o es suficiente una simulación/log? | Se asume que se registra en un log de email; el MVP no requiere SMTP real. |
| PA-5 | ¿Existe algún otro medio de contacto (SMS, WhatsApp) además de email? | Se asume email únicamente. |

