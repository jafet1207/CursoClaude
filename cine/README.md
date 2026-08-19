# Cine Variedades — Sistema de Venta de Entradas en Línea

Prototipo construido según [PLAN.md](PLAN.md), a partir de [ESPECIFICACION.md](ESPECIFICACION.md) y [DISENO.md](DISENO.md).

## Cómo poner a correr la aplicación

Requisitos: Node.js 22+ (usa el módulo integrado `node:sqlite`, sin dependencias externas de base de datos).

```bash
npm install
npm start
```

La app queda escuchando en `http://localhost:3000`. Si no existe todavía `data/cine.db`, se siembra automáticamente con datos de prueba al arrancar.

## Cómo recrear los datos de prueba

```bash
npm run seed
```

Esto borra `data/cine.db` si existe y la vuelve a crear con:
- Sala Grande (120 butacas: filas A–J, 12 asientos por fila).
- Sala Pequeña (60 butacas: filas A–L, 5 asientos por fila).
- 3 funciones de cartelera (hoy, mañana y en 3 días), cada una con su película y precio base.

El log de notificaciones (confirmaciones de compra simuladas) se escribe en `data/notificaciones.log`.

### Probar la expiración de reservas sin esperar 10 minutos reales

La reserva de un asiento (RN-8) expira a los 10 minutos por defecto. Para demostrarlo o probarlo manualmente sin esperar ese tiempo real, arrancá la app con el umbral acortado:

```bash
RESERVA_EXPIRACION_MS=5000 npm start
```

Con eso, una reserva sin confirmar expira a los 5 segundos en lugar de 10 minutos.

## Cómo correr las pruebas

```bash
npm test
```

Corre las pruebas unitarias y de integración con el test runner integrado de Node (`node --test`).

## Dependencias adoptadas

| Dependencia | Para qué | Repositorio oficial |
|---|---|---|
| express | Servidor web y ruteo | https://github.com/expressjs/express |
| ejs | Vistas renderizadas en el servidor | https://github.com/mde/ejs |

La persistencia usa `node:sqlite` (módulo integrado de Node.js desde la versión 22), por lo que no se agregó ninguna dependencia de base de datos.

## Estado de la construcción

Ver [PLAN.md](PLAN.md) para el detalle de piezas, su comprobación y evidencia.
