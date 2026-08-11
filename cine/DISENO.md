# Sistema de Venta de Entradas en Línea — Diseño

## Panorama de la arquitectura

El sistema está dividido en tres capas: **Presentación** (web para cliente y personal de taquilla), **Dominio** (lógica de negocio: precios, asientos, refunds), y **Persistencia** (base de datos compartida).

El núcleo es el **mapa de butacas**, una fuente única de verdad. Tanto las compras online como las de taquilla escriben en él bajo las mismas reglas. Los asientos tienen tres estados: **disponible**, **en espera** (10 min con un cliente eligiendo), y **vendido**. Una transacción atómica previene race conditions entre canales.

El **flujo de compra** es idéntico online y en taquilla: cliente elige función → selecciona asiento → elige tarifa → completa pago (simulado) → recibe código de confirmación. Las tarifas se calculan en tiempo real (base, miércoles 50%, estudiante 25%, mejor descuento aplica).

Los **refunds** se manejan a dos niveles: masivo (cancelar una función refunda todos sus boletos) e individual. Ambos liberan el asiento y quedan registrados para el reporte del distribuidor.

## Componentes

### Componente 1: Gestor de Cartelera

**Propósito**: Almacenar y servir las funciones programadas para una semana.

**Responsabilidades**:
- Cargar la cartelera semanal (película, sala, hora, fecha, precio base).
- Servir listados de funciones (p.ej. todas las del viernes, o todas de una película).
- Validar que una función existe antes de vender asientos de ella.
- Registrar cambios a la cartelera (cancelación de función).

**Límite con el resto**: Es consulta-puro; otros componentes lo leen pero no lo escriben (salvo cancelaciones de función vía Gestor de Refunds).

**Limitaciones**: La cartelera es fija por semana; no hay cambios dinámicos.

### Componente 2: Mapa de Butacas y Transacciones

**Propósito**: Mantener el estado del inventario de asientos y las transacciones que lo cambian.

**Responsabilidades**:
- Almacenar la topología de butacas por sala (120 en la grande, 60 en la pequeña; filas A–M, números 1–12 o 1–5).
- Guardar el estado actual de cada asiento de cada función: disponible, en espera, vendido.
- Procesar reserva de asiento (marcar en espera 10 min).
- Procesar compra (marcar vendido tras pago).
- Procesar liberación de asiento en espera tras timeout o cancelación.
- Procesar refund (revertir vendido → disponible).
- Evitar doble-venta: garantizar atomicidad de "comprobar disponible + marcar vendido".
- Exponer el mapa actual a la UI (qué ves el cliente / taquillero).

**Límite con el resto**: Es la fuente única de verdad. El Gestor de Compras y el Gestor de Refunds escriben aquí tras validar sus operaciones. La UI lee de aquí en cada refresco.

**Limitaciones**: No hay transacciones distribuidas; se asume que la base de datos es única y en línea.

### Componente 3: Gestor de Compras

**Propósito**: Orquestar una venta: desde selección de asiento hasta confirmación.

**Responsabilidades**:
- Recibir solicitud de compra (función, asiento, tarifa, nombre, email).
- Validar que la función existe y el asiento está disponible.
- Reservar el asiento (marcarlo en espera 10 min).
- Calcular el precio final (aplicar tarifa, mejor descuento).
- Registrar compra en el histórico.
- Marcar asiento como vendido tras pago.
- Generar código de confirmación único.
- Solicitar al Gestor de Notificaciones envío de email de confirmación.
- Retornar código y detalles de compra al cliente.

**Límite con el resto**: Consume el Mapa de Butacas (lectura + escritura bajo transacción), el Gestor de Tarifas (cálculo), y el Gestor de Notificaciones (email). Le devuelve confirmación al cliente.

**Limitaciones**: El pago es simulado; en una versión real, aquí iría la integración con un procesador.

### Componente 4: Gestor de Tarifas

**Propósito**: Calcular el precio final de una compra.

**Responsabilidades**:
- Dado función, tarifa solicitada (base, miércoles, estudiante), calcular el precio.
- Implementar regla "mejor descuento": si aplica miércoles y estudiante, usa el menor.
- Retornar precio base, descuento aplicado, y precio final.

**Límite con el resto**: Componente puro; no mantiene estado. El Gestor de Compras lo invoca antes de marcar vendido.

### Componente 5: Gestor de Refunds

**Propósito**: Procesar devoluciones de dinero y liberación de asientos.

**Responsabilidades**:
- Refund masivo: dado una función, refundar todos sus boletos (uso: cancelación de proyector). Actualizar Mapa de Butacas, registrar cada refund, evitar doble-refund (detectar si ya refundado).
- Refund individual: dado código de confirmación, refundar un boleto único. Validar que existe, que no está ya refundado, actualizar Mapa de Butacas, registrar refund.
- Retornar confirmación de refund (monto, código, fecha).

**Límite con el resto**: Escribe en el Mapa de Butacas (libera asiento) y en el Histórico de Compras (marca boleto refundado). Lee datos de ambos.

**Limitaciones**: No hay reversión de refund; una vez refundado, es definitivo.

### Componente 6: Histórico de Compras

**Propósito**: Guardar cada transacción de venta y refund para auditoría y reportes.

**Responsabilidades**:
- Registrar cada compra con: fecha/hora, función, asiento, tarifa, monto, código de confirmación, canal (online/taquilla), email/nombre.
- Registrar cada refund con: fecha/hora, código de confirmación original, monto refundado, motivo (función cancelada / individual), estado (refundado).
- Exponer consultas: "dame todas las compras de esta función", "dame todas las compras de este cliente", "dame todos los refunds de este mes".
- Alimentar reportes (distribuidor, ocupación, ingresos).

**Límite con el resto**: Es lectura/escritura desde Gestor de Compras y Gestor de Refunds. Es lectura desde Generador de Reportes.

### Componente 7: Generador de Reportes

**Propósito**: Producir reportes para análisis y el distribuidor.

**Responsabilidades**:
- Reporte mensual del distribuidor: por cada película, contar boletos vendidos (brutos), refundados, neto. Exportar a CSV o texto plano.
- Reporte de ocupación: por función, cuántos asientos se vendieron vs capacidad.
- Reporte de ingresos: ingresos totales, por día, por tarifa, por canal (online vs taquilla).
- Reporte de uso de descuentos: cuántos boletos se vendieron con miércoles, cuántos con estudiante.

**Límite con el resto**: Lee únicamente del Histórico de Compras. No escribe nada. Genera reportes bajo demanda.

### Componente 8: Gestor de Notificaciones

**Propósito**: Enviar confirmaciones a clientes.

**Responsabilidades**:
- Enviar email de confirmación de compra (code, nombre, asiento, función, precio).
- Registrar que el email fue "enviado" o capturar en log (para MVP, suficiente log).

**Límite con el resto**: Recibe solicitudes desde el Gestor de Compras. No escribe en base de datos; solo notifica externamente (o simula).

## Modelo de datos

```
FUNCION
  id (PK)
  pelicula_nombre
  sala_id (FK → SALA)
  fecha_hora
  precio_base
  cancelada (bool, default false)

SALA
  id (PK)
  nombre
  capacidad (120 o 60)
  layout (filas, asientos por fila)

BUTACA
  id (PK)
  sala_id (FK → SALA)
  fila (A, B, C, ...)
  numero (1, 2, 3, ...)
  unique (sala_id, fila, numero)

RESERVA_ASIENTO (estado momentáneo, 10 min max)
  id (PK)
  funcion_id (FK → FUNCION)
  butaca_id (FK → BUTACA)
  cliente_email
  reservado_en (timestamp)
  estado (en_espera)

COMPRA
  id (PK) = codigo_confirmacion
  funcion_id (FK → FUNCION)
  butaca_id (FK → BUTACA)
  cliente_nombre
  cliente_email
  tarifa (base / miercoles / estudiante)
  precio_base
  descuento_aplicado (%)
  monto_final
  canal (online / taquilla)
  comprado_en (timestamp)
  refundado (bool, default false)
  refundado_en (timestamp, nullable)

(Nota: REFUND no es tabla aparte; una COMPRA refundada tiene flag refundado = true y timestamp.)

REPORTE_DISTRIBUIDOR (materializado mensualmente)
  mes_ano (202506, 202507, ...)
  pelicula_id
  vendidos (count)
  refundados (count)
  neto (vendidos - refundados)
```

## Flujo de datos

```
Cliente / Taquillero
    ↓
[Gestor de Compras]
    ├→ consulta función (Gestor de Cartelera)
    ├→ reserva asiento 10 min (Mapa de Butacas)
    ├→ calcula precio (Gestor de Tarifas)
    ├→ registra compra (Histórico)
    ├→ marca vendido (Mapa de Butacas)
    ├→ genera código de confirmación
    └→ solicita email (Gestor de Notificaciones)

Cliente recibe: código, confirmación

---

Refund por función:
[Gestor de Refunds]
    ├→ busca todas las compras de la función (Histórico)
    ├→ marca cada una como refundada (Histórico)
    ├→ libera cada asiento (Mapa de Butacas)
    └→ retorna confirmación

---

Refund individual:
[Gestor de Refunds]
    ├→ busca compra por código (Histórico)
    ├→ valida que no está ya refundada
    ├→ marca como refundada (Histórico)
    ├→ libera asiento (Mapa de Butacas)
    └→ retorna confirmación

---

Reporte distribuidor:
[Generador de Reportes]
    └→ agrega Histórico: GROUP BY película, SUM(vendidos), SUM(refundados), calcula neto
       → CSV exportable
```

## Manejo de errores

| Recorrido que termina mal | Qué ocurre |
|---|---|
| **Asiento ya vendido al confirmar compra** | Sistema detecta al escribir: asiento está en estado vendido. Retorna error al cliente: "Lamentablemente, ese asiento fue vendido. Selecciona otro." Cliente elige asiento diferente. |
| **Asiento en espera expiró (10 min)** | Timeout en servidor libera automáticamente el asiento. Si cliente intenta confirmar, el sistema rechaza (asiento no está en espera para él). Mensaje: "Ese asiento ya no está reservado. Selecciona otro." |
| **Cliente intenta refundar un boleto ya refundado** | Sistema valida al procesar refund: busca compra, verifica flag `refundado`. Si es true, rechaza: "Ese boleto ya fue reembolsado." |
| **Estudiante sin carné intenta entrar** | En taquilla, personal verifica carné. Si no lo presenta, se le cobra la diferencia (precio estudiante vs base) o se niega entrada. Fuera del alcance del sistema (decisión de personal). |
| **Refund individual: código no existe** | Sistema busca código en Histórico. Si no encuentra, retorna: "Código de confirmación no encontrado." |
| **Función no existe** | Cliente elige fecha/película; sistema valida que la función existe en Cartelera antes de proceder. Si no, retorna: "Esa función no está disponible." |

## Decisiones mayores

### Decisión: Mapa de butacas compartido entre canales

**Por qué es una decisión mayor:** Elegir entre un mapa compartido o inventarios separados cambiaría la arquitectura, el riesgo operativo (double-booking), y cómo se integra el sistema con la operación existente.

| | Opción A: Mapa compartido | Opción B: Inventarios separados |
|---|---|---|
| **Experiencia de uso** | Cliente online y taquillero ven el mismo mapa en tiempo real. Si uno vende un asiento, el otro lo ve vendido inmediatamente. Transparencia total. | Cada canal tiene su propio bloque de asientos. Cliente online nunca ve asientos vendidos en taquilla. Simple pero desconectado. |
| **Rendimiento** | Requiere transacciones atomicidad en la BD; operaciones más complejas bajo carga. Contención posible durante rush. | Sin contención entre canales; cada uno escribe en su sector. Más rápido localmente. |
| **Recursos** | Una sola base de datos, una sola lógica. Menos infraestructura. | Posible sincronización entre dos bases o dos sectores; más código, más superficies de fallo. |
| **Complejidad** | Requiere manejo cuidadoso de transacciones, timeouts y race conditions. Código de sincronización es crítico. | Más simple de implementar per se, pero requiere particionar asientos o sincronizar manualmente. |
| **Riesgo** | Risk: race condition si dos escrituras suceden simultáneamente. Mitigation: transacción atómica + lock. | Risk: drift entre canales; un asiento se vende en taquilla pero aún aparece online. Cliente desagradable. |

**Elección:** Opción A (mapa compartido) — la meta es "descongestion la fila" manteniendo integridad. Un cliente no puede comprar online un asiento que ya se vendió en taquilla. El risk de race condition es manejable con transacciones. Esto también alinea con RN-9: "una única fuente de butacas."

---

### Decisión: Confirmación sin cuentas: email + código único

**Por qué es una decisión mayor:** Afecta cómo se identifica un comprador, cómo entra a la sala, y cómo el personal procesa refunds.

| | Opción A: Email + código | Opción B: Cuentas de usuario | Opción C: Solo código |
|---|---|---|---|
| **Experiencia de uso** | Cliente da email, recibe código por mail. Simple, no requiere login después. Código se presenta o dice al entrar. | Cliente crea cuenta, inicia sesión, ve historial. Más integración pero fricción de login. | Código único por compra, se da al momento de venta impreso o verbal. Muy simple. |
| **Rendimiento** | Email asincrónico, no bloquea. Búsqueda por código rápida. | Login y sesión requieren verificación. | Sin dependencia de email; búsqueda por código aún más rápida. |
| **Recursos** | Requiere servicio de email (real o simulado). Gestión de email simple. | Gestión de cuentas, contraseñas, recuperación. Más infraestructura. | Nada especial; solo la base de datos. |
| **Complejidad** | Bajo. Cliente recibe confirmación en email; personal busca por código en taquilla. | Moderado. Validación, manejo de sesión, recuperación de cuenta. | Bajo. Pero un cliente que pierde el código no puede recuperar sin papel. |
| **Riesgo** | Risk: cliente no recibe email (spam, etc). Mitigation: permitir consulta por nombre + email. | Risk: cuenta comprometida o no recuerda contraseña. Mitigation: recuperación por email. | Risk: cliente pierde el código. Mitigation: ... poco se puede hacer. |

**Elección:** Opción A (email + código) — alinea con el requisito "sin cuentas de usuario". Cliente da email, recibe confirmación, se la guarda. Si la pierde, taquillero puede buscar por nombre + email. Bajo overhead de infraestructura.

---

### Decisión: Asiento en espera por 10 minutos vs. sesión

**Por qué es una decisión mayor:** Afecta cuánto tiempo tiene un cliente para pagar sin perder el asiento.

| | Opción A: 10 minutos (reloj) | Opción B: Duración de sesión |
|---|---|---|
| **Experiencia de uso** | Cliente tiene 10 min desde selección para pagar. Si se distrae más, pierde el asiento. Justo pero rígido. | Asiento se mantiene todo lo que dure la sesión del cliente. Si cierra browser, se libera. Flexible. |
| **Rendimiento** | Requiere un job que expire timeouts cada 10 min. Overhead bajo. | Requiere gestión de sesión, heartbeat, etc. Overhead moderado. |
| **Recursos** | Mínimo: un scheduler. | Session storage, posiblemente Redis. |
| **Complejidad** | Simple: restar 10 min del timestamp de reserva. | Más complejidad: seguimiento de sesión activa. |
| **Riesgo** | Risk: cliente lento pierde asiento justo. Mitigation: 10 min es razonable para pago simulado. | Risk: sesiones huérfanas si el cliente no cierra browser. Requiere timeout de sesión también. |

**Elección:** Opción A (10 minutos) — el usuario confirmó esto en la entrevista. Simple, predecible. El pago es simulado (rápido), así que 10 min es amplio.

## Otras decisiones

| Decisión | Opciones consideradas | Elección | Razón |
|---|---|---|---|
| Refund de estudiante sin carné en taquilla | (1) Permitir, asumir honor system. (2) Cobrar diferencia. (3) Negar entrada. | (2) Cobrar diferencia o negar entrada. Decisión del personal en el momento. | Alineado con RN-10: validación en taquilla. Sistema no interviene; registra que se vendió con tarifa estudiante. |
| Email de confirmación: real vs. simulado | (1) Integrar SMTP real. (2) Guardar en log/mock. | (2) Log/mock para MVP. | Fuera de alcance la integración con email real. Suficiente registrar que se "envió". |
| Reporte distribuidor: frecuencia | (1) Tiempo real, consulta bajo demanda. (2) Generado una vez al mes. | (1) Generado bajo demanda, sin necesidad de batch mensual. | Más flexible; dueña puede exportar cuando quiera. |
| Botón "Mostrar mapa" en UI: resolución | (1) Mapa interactivo de grid (cliqueable). (2) Lista de asientos (texto). | (1) Mapa visual de grid. | RF-2 especifica "mapa interactivo", mejor UX que lista. |
| Validación de email en compra | (1) Email real (bounce check). (2) Email valido (regex). (3) Email opcional, solo nombre. | (2) Validación regex de formato; suficiente para MVP. | Evita bounces, no requiere API externa. |

## Decisiones dejadas abiertas

| Qué no se decidió | Quién lo decide y cuándo |
|---|---|
| Tecnología: lenguaje, framework, BD (MySQL vs. PostgreSQL vs. SQLite) | Implementación. Debe cumplir: transacciones ACID, acceso concurrente, precio bajo. |
| UI: web responsivo vs. nativa mobile | Implementación. Web responsive es más rápido (no requiere appstore). |
| Despliegue: cloud (AWS, GCP, Heroku) vs. on-premise en máquina del cine | Operación/dueña. Depende de capacidad técnica disponible. |
| Autenticación de personal de taquilla (login) | Implementación. ¿Usuarios con contraseña, tokens, acceso público? Fuera de alcance actual. |

