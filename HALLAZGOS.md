# Hallazgos

Lo que la suite descubrió y esta habilidad no corrige. Cada uno tiene su prueba escrita,
marcada como fallo esperado (`todo`) en `test/reservas.test.js`. Se cierran en el turno de
refactorización, quitando la marca.

| # | Condición (de la especificación) | Qué hace hoy | Clase | Prueba |
|---|---|---|---|---|
| 1 | [2.2](ESPECIFICACION.md) — Teléfono obligatorio y de 8 dígitos exactos | El campo `telefono` no se valida: acepta vacío, longitudes distintas de 8 y texto no numérico | Comportamiento | `test/reservas.test.js::2.2 — no acepta una reserva sin teléfono`, `test/reservas.test.js::2.2 — no acepta un teléfono que no tenga exactamente 8 dígitos` |
| 2 | [4.2](ESPECIFICACION.md) — Tarifa nocturna (₡20.000) desde las 17:00 | La tarifa nocturna se aplica recién desde las 18:00; el bloque de las 17:00 se cobra como diurno (₡15.000) | Comportamiento | `test/reservas.test.js::4.2 — cobra ₡20.000 por el bloque de las 17:00 (ya es horario con luz)` |
| 3 | [5.1](ESPECIFICACION.md) — Cliente frecuente cuenta solo reservas no canceladas | El conteo mensual de reservas por teléfono incluye las canceladas, por lo que puede otorgar el 10% de descuento a alguien con menos de 4 reservas jugadas en el mes | Comportamiento | `test/reservas.test.js::5.1 — no cuenta reservas canceladas para el descuento de cliente frecuente` |
| 4 | [6.1](ESPECIFICACION.md) — Cancelación permitida solo si faltan ≥24h exactas para el bloque | **Cerrado** — `puedeCancelarse()` ahora compara el instante exacto de inicio del bloque contra el momento actual. Antes comparaba solo la fecha del día, sin la hora | Comportamiento | `test/reservas.test.js::6.1 — no permite cancelar si faltan menos de 24 horas exactas para el bloque` — en verde desde el commit `e1881c7` |
| 5 | — (no corresponde a una condición de negocio) | `server.js` no exporta ninguna función (`module.exports`) y arranca su servidor HTTP + abre su base de datos apenas se `require`; ninguna regla de negocio vive en una función invocable por separado. Por eso las 15 condiciones de la especificación se probaron a nivel de Integración (HTTP real contra un servidor real) en vez de Unidad — no hay forma de probar la lógica aislada sin tocar el código de producción | Estructura | No aplica (afecta el diseño de toda la suite, ver `test/reservas.test.js`, cabecera del archivo) |

## Notas de cierre

- Los hallazgos 1 a 4 son de **comportamiento**: el código contradice una regla explícita de
  la administradora. Se cierran haciendo pasar su prueba, sin modificarla.
- El hallazgo 5 es de **estructura**: no hay un defecto de negocio que corregir, sino una
  deuda de diseño (lógica inline en manejadores de ruta, sin `module.exports`) que hace cara
  cualquier prueba aislada y que conviene pagar en el camino de cerrar los hallazgos 1-4,
  extrayendo a funciones puras solo la lógica que se toque para cerrarlos.
- **Hallazgo 4, cerrado.** Se pagó la porción de la deuda de estructura que estaba en su
  camino: la regla de cancelación, antes en línea dentro del manejador de la ruta, ahora es
  la función pura `puedeCancelarse(fechaReserva, horaReserva, ahora)` (commit `46cc3e3`,
  solo extracción, sin cambio de comportamiento; commit `e1881c7`, el arreglo). El resto del
  hallazgo 5 —tarifa, teléfono y cliente frecuente siguen en línea— continúa abierto, para el
  camino de los hallazgos 1 a 3.
- Código muerto identificado pero **fuera de alcance** (no es un hallazgo, no forma parte de
  reglas de negocio activas — ver [ESPECIFICACION.md § 8](ESPECIFICACION.md)): la función
  `esFeriado()` y las constantes/función de temporada alta comentadas
  (`PRECIO_TEMPORADA_ALTA_*`, `esTemporadaAlta`) en `server.js`.
