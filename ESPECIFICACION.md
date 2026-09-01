# Especificación — Cancha Total F5

Reconstruida a partir del código heredado (`server.js`, `datos.js`) y de la descripción de la
administradora recogida en la consigna del Caso Práctico 5. Cada condición declara su fuente.
Este documento es la fuente de verdad para la suite de pruebas.

Fuentes posibles:
- **Administradora** — descripción dada en la consigna.
- **Código** — comportamiento actual del sistema, aceptado donde la administradora no se pronunció.
- **Administradora (corrige código)** — la administradora contradijo lo que el código hace hoy; el
  código queda como hallazgo de comportamiento.

---

## 1. Horario y bloques

1.1. Las reservas son por bloques de una hora. El primer bloque posible del día empieza a las
8:00 y el último a las 21:00 (14 horas de inicio válidas: 8, 9, 10, ..., 21). El bloque de las
21:00 termina a las 22:00. — **Fuente: Administradora**, confirmado.

1.2. Las reservas se hacen para cualquiera de las dos canchas (cancha 1 o cancha 2). — **Fuente:
Administradora**.

## 2. Datos de la reserva

2.1. Una reserva registra: cancha, fecha, hora, nombre del cliente y teléfono. —
**Fuente: Administradora**.

2.2. El teléfono es obligatorio y debe tener exactamente 8 dígitos. — **Fuente: Administradora
(corrige código)**. Hoy el campo `telefono` no se valida como requerido ni se valida su formato.

2.3. El nombre del cliente es obligatorio. — **Fuente: Código**, sin objeción de la administradora.

## 3. Disponibilidad

3.1. Un bloque (cancha, fecha, hora) ocupado por una reserva activa no se puede volver a reservar.
— **Fuente: Administradora**, coincide con el código.

3.2. Si una reserva se cancela dentro del plazo permitido, el bloque vuelve a estar disponible
para ser reservado de nuevo. — **Fuente: Administradora**, coincide con el código (una reserva
cancelada no cuenta para el chequeo de disponibilidad).

## 4. Tarifas

4.1. La hora diurna cuesta ₡15.000. — **Fuente: Administradora**, coincide con el código.

4.2. Desde las 17:00 en adelante (bloque de las 17:00 inclusive) la tarifa es ₡20.000, porque
la luz se enciende a las 5 de la tarde y el partido de las 5 ya va con luz. — **Fuente:
Administradora (corrige código)**. Hoy el código aplica la tarifa nocturna solo desde las 18:00,
dejando el bloque de las 17:00 cobrado como diurno.

## 5. Cliente frecuente

5.1. Un cliente es frecuente cuando, contando la reserva que está haciendo, acumula 4 o más
reservas **no canceladas** en el mismo mes calendario, identificadas por su teléfono. Al aplicar,
recibe 10% de descuento sobre el precio del bloque. — **Fuente: Administradora (corrige
código)**. Hoy el conteo del mes incluye reservas canceladas, lo que puede otorgar el descuento a
alguien que no llega a 4 reservas jugadas.

## 6. Cancelación

6.1. Una reserva se puede cancelar solo si faltan 24 horas o más para la fecha y hora exactas de
inicio del bloque. Si faltan menos de 24 horas, no se permite cancelar y la reserva se cobra
completa. — **Fuente: Administradora (corrige código)**. Hoy la regla compara únicamente la
fecha de la reserva contra la fecha actual, sin considerar la hora. Como consecuencia, una
reserva para mañana puede cancelarse aunque falten menos de 24 horas para el inicio del partido.

6.2. Una reserva ya cancelada no se puede volver a cancelar. — **Fuente: Código**, sin objeción
de la administradora.

## 7. Vista del día

7.1. Para cada día se puede ver qué bloques están libres en cada cancha. — **Fuente:
Administradora**, coincide con el código.

7.2. Para cada día se puede ver la lista de reservas del día con lo que se cobró en cada una. —
**Fuente: Administradora**.

7.3. La lista del día incluye tanto reservas activas como canceladas. — **Fuente: Código**,
comportamiento aceptado porque la administradora no indica lo contrario.

## 8. Código inactivo (no forma parte de las reglas activas)

8.1. La función `esFeriado()` y las constantes/función de temporada alta comentadas
(`PRECIO_TEMPORADA_ALTA_*`, `esTemporadaAlta`) no se ejecutan en ningún flujo del sistema. La
administradora no mencionó feriados ni temporada alta. — **Fuente: Código**, sin objeción de la
administradora. No forma parte de las reglas de negocio activas y queda como posible deuda de
estructura (código muerto), no como comportamiento a probar.

## 9. Fuera de alcance (no se prueba ni se cambia)

- No existe edición de una reserva existente (solo crear y cancelar). — **Fuente: Código**.
- No existe autenticación ni control de acceso. — **Fuente: Código**.
- La cancelación no borra físicamente la reserva; solo cambia el estado a `cancelada`. —
  **Fuente: Código**.
