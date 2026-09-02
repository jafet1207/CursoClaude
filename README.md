# Cancha Total F5 — Sistema de reservas

Sistema de reservas para las dos canchas techadas de fútbol 5 de Cancha Total F5.
Permite ver la disponibilidad del día, registrar reservas y cancelarlas.

## Instalación

Requiere Node 18-22 (LTS). `better-sqlite3` no tiene binario precompilado para Node 24 en
Windows, y compilarlo desde código exige tener Python instalado; con Node 20 o 22 la
instalación no necesita compilar nada.

```
npm install
```

## Almacenamiento

El sistema usa `@libsql/client`. Sin configuración adicional (desarrollo local, pruebas)
escribe en un archivo SQLite local (`reservas.db`, en la raíz del proyecto) — no depende de
ningún servicio externo. En producción usa la base de datos gestionada de Turso.

| Variable | Para qué | Dónde se carga en producción |
|---|---|---|
| `TURSO_DATABASE_URL` | Dirección de la base de datos (`libsql://...`) | Vercel → Project Settings → Environment Variables (Production) |
| `TURSO_AUTH_TOKEN` | Token de autenticación de la base de datos | Vercel → Project Settings → Environment Variables (Production) |

Ninguna credencial vive en el repositorio ni en el historial de commits.

## Datos de prueba

Borra `reservas.db` (si existe) y la recrea con reservas de ejemplo. Si `TURSO_DATABASE_URL`
está definida, siembra esa base remota en lugar del archivo local:

```
npm run datos
```

## Arrancar el servidor

```
npm start
```

El servidor queda escuchando en el puerto 3000: http://localhost:3000

## Verificación

La suite de pruebas (`test/reservas.test.js`) corre contra una copia aislada y desechable
del servidor y su base de datos: no usa ni modifica `reservas.db`. Ver `ESPECIFICACION.md`
para las reglas de negocio que la suite verifica, y `HALLAZGOS.md` para lo que el sistema
todavía no cumple.

```
npm test
```

o, como puerta de un solo comando (0 si todo pasó, 2 si algo falló):

```
./verificar.sh
```

## Integración continua

`.github/workflows/ci.yml` corre `verificar.sh` en cada push y en cada pull request contra
`main`, en un runner limpio de GitHub y sin credenciales de ningún servicio externo.

- **Bloquea la fusión:** el job `Verificación` (la única puerta que existe hoy) — si falla,
  no se puede fusionar el pull request, ni siquiera para quien administra el repositorio.
- **Solo informa:** no hay, por ahora, ningún job informativo (que corra y reporte sin
  bloquear el merge).

`main` está protegida: no acepta commits directos, todo entra por pull request con la
Verificación en verde.

## Producción

La aplicación está publicada en Vercel: https://cancha-total-f5-rust.vercel.app
