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

## Datos de prueba

Borra `reservas.db` (si existe) y la recrea con reservas de ejemplo:

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
