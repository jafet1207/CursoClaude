# NOTAS.md — Registro de colaboración con Claude Code

Este documento registra el proceso de trabajo con el asistente (Claude Code) para
diagnosticar y corregir el bug de descuento por mayoreo y para implementar el
cálculo del IVA en la Ferretería El Tornillo Feliz.

## Contexto entregado al asistente

Al asistente se le explicó lo siguiente:

> Existe una ferretería que es un pequeño negocio familiar que utiliza un script en
> Node.js para calcular el total de sus ventas en caja. Un desarrollador junior
> construyó una primera versión, pero desde hace unas semanas varios clientes han
> reclamado que el total en pantalla "no cuadra" cuando compran grandes cantidades
> de un mismo producto. Por separado, la dueña del negocio pidió que el sistema
> calcule también el Impuesto al Valor Agregado (IVA, 13%) sobre el monto de la
> venta, algo que el script todavía no hace.

A partir de ese contexto se creó un archivo `CLAUDE.md` en la raíz del proyecto con:
- El propósito del ejercicio.
- El contexto del negocio.
- Las reglas de negocio esperadas (descuento por mayoreo e IVA).
- Convenciones de código a seguir.
- Una sección explícita de límites: **"El asistente NO debe"** (no modificar tests
  sin autorización, no asumir requerimientos no especificados, no refactorizar
  código no relacionado con la solicitud, entre otras).

Ese archivo quedó como referencia permanente para todas las solicitudes
posteriores al asistente.

## Prompts utilizados (en orden)

| # | Prompt (resumen) | Resultado |
|---|---|---|
| 1 | `npm run test` | El asistente corrió las pruebas y reportó que fallaba el Caso 2 (descuento por mayoreo), evidenciando el bug reportado por los clientes. |
| 2 | *(sin prompt explícito, exploración del asistente)* | El asistente diagnosticó el bug (`carrito.length > 10` en vez de revisar la cantidad por producto) y, sin que se le pidiera aún de forma explícita a través del CLAUDE.md, corrigió también el IVA en el mismo cambio. |
| 3 | "Deshaga los cambios, necesito la versión original de mi código" | Se revirtió `src/carrito.js` a la versión original con `git checkout` para retomar el proceso de forma ordenada y documentada, en vez de dejar un arreglo hecho de una sola vez sin registro del razonamiento. |
| 4 | "Necesito crear un CLAUDE.md, con este contexto..." | Se creó `CLAUDE.md` con propósito, contexto de negocio, tareas del ejercicio, estructura del proyecto y reglas de negocio esperadas, en español. |
| 5 | "Valide que el CLAUDE.md se encuentre en la raíz del proyecto" | Se confirmó la ubicación del archivo. |
| 6 | "Agregue las convenciones de código..." (bloque completo de convenciones) | Se agregó la sección **Convenciones de Código** al `CLAUDE.md`. |
| 7 | "Agregue también esto, como una regla que la IA no debe hacer..." (bloque "El asistente NO debe") | Se agregó la sección de límites al `CLAUDE.md`. |
| 8 | "Corrija el error de descuentos con base en el MD" | Se corrigió **únicamente** el bug del descuento (`carrito.some((item) => item.cantidad > 10)`), sin tocar el IVA, siguiendo la regla de "no asumir requerimientos no especificados". Las pruebas de descuento pasaron; la prueba de IVA siguió fallando como se esperaba. |
| 9 | "Adelante, realice el cálculo del IVA" | Se implementó el cálculo de IVA (constante `TASA_IVA = 0.13`) sobre el subtotal con descuento aplicado. Las 3 pruebas pasaron. |
| 10 | "Cuál es el diagnóstico? Qué estaba mal y qué se corrigió?" | Se documentó la causa raíz del bug y la solución del IVA. |
| 11 | "Verifique que las 3 pruebas finalicen correctamente" | Se corrió `npm run test` nuevamente, confirmando los 3 casos en verde. |
| 12 | "Deme esos resultados pero con valores reales" | Se generó una tabla con los valores reales de entrada/salida de cada caso de prueba. |
| 13 | "No entendí lo del iva/total que menciona..." | Se aclaró que no había ningún error: los Casos 1 y 2 del archivo de pruebas simplemente no verifican `iva`/`total` porque cada caso se enfoca en un aspecto distinto del cálculo. |

## Qué funcionó bien

- Definir el `CLAUDE.md` **antes** de pedir la corrección del bug permitió que el
  asistente aplicara cambios acotados y no intentara "arreglar todo de una vez"
  (por ejemplo, corrigió el descuento sin tocar el IVA hasta que se le pidió
  explícitamente).
- Pedir la corrección del descuento y del IVA como **dos solicitudes separadas**
  hizo más fácil verificar cada cambio de forma aislada con `npm run test`.
- Pedir los valores reales de las pruebas ayudó a documentar el comportamiento
  esperado del sistema más allá de "las pruebas pasan".

## Qué se tuvo que corregir o reintentar

- **Primer intento descartado**: el asistente corrigió el descuento y el IVA en
  un solo cambio antes de que existiera el `CLAUDE.md`. Se descartó (`git
  checkout`) para reiniciar el proceso de forma más controlada y documentada,
  ajustada a las reglas que luego se definieron.
- **Conflicto de convenciones**: al agregar las convenciones de código se detectó
  una contradicción entre una regla anterior del `CLAUDE.md` ("mantener el
  código en español") y la nueva regla general ("escribir todo el código en
  inglés"). El asistente señaló el conflicto en vez de decidir por su cuenta, y
  quedó pendiente de definir si se renombran las variables existentes
  (`carrito`, `precio`, `cantidad`, `descuento`, `iva`) o si se mantienen como
  excepción de dominio de negocio.
- **Aclaración sobre cobertura de pruebas**: hubo que aclarar que los Casos 1 y 2
  del archivo de pruebas no verifican `iva`/`total` por diseño (cada caso prueba
  un aspecto puntual), no porque existiera un error en el archivo de pruebas.

## Resultado final

```
Caso 1 OK: compra pequeña sin descuento
Caso 2 OK: descuento por mayoreo en un solo producto
Caso 3 OK: cálculo de IVA (nuevo requerimiento)

Todas las pruebas pasaron.
```
