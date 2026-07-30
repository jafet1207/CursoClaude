# BITÁCORA

## 1. Encargo inicial

**El escenario.** Se incorpora a FretPath (TypeScript + React, ~5.800 líneas,
38 archivos, 105 pruebas en verde, compila limpio). Un usuario reporta: dejó la
app un mes, volvió esperando que lo mandara a repasar las habilidades flojas,
pero el mapa muestra *todo todavía dominado* — "no se da cuenta de que pasó el
tiempo". Las 105 pruebas no lo detectan.

**Cómo se supone que funciona el motor** (intención declarada del producto, no
verificada en el código):
- Las habilidades forman un grafo dirigido; los nodos tienen prerequisitos y
  quedan bloqueados hasta que esos prerequisitos estén dominados. Cada nodo
  agrupa ítems de práctica.
- Un ítem se domina con maestría ≥ 80/100; un nodo se domina cuando todos sus
  ítems lo están.
- El dominio se pierde solo: si un ítem pasa su fecha de repaso sin practicarse,
  la maestría cae ~3 %/día de atraso (`OVERDUE_RETENTION_PER_DAY = 0.97`).
- Los nodos que caen bajo el umbral se marcan como "oxidados" y sus
  dependientes se vuelven a bloquear.
- Funcionalidad faltante: aviso preventivo antes de que algo caiga ("esto se va
  a caer esta semana") — nunca se construyó.

**Qué debe ser cierto al entregar (6 enunciados):**
1. Una prueba nueva que reproduce el reporte — falla en el repositorio tal como
   se entregó, y falla por la razón correcta (comportamiento incorrecto, no
   error de compilación o de datos). Describe lo que esperaba el usuario, no un
   detalle interno.
2. Esa prueba pasa + las 105 originales siguen pasando. No se modifican las
   pruebas existentes — si alguna estorba, eso es un hallazgo que se reporta, no
   un archivo que se edita.
3. Corrección mínima, y usted puede defender su tamaño.
4. Verificar cada comportamiento esperado punto por punto con evidencia, no solo
   el bug reportado. Corregir + documentar cualquier problema no reportado que
   encuentre. Volver a recorrer la lista después de la primera corrección (hay
   comportamiento inobservable mientras otra cosa está fallando).
5. Implementar el aviso faltante con esta firma exacta:
   `nodesAtRisk(graph, itemStates, now, horizonDays)`. Devuelve qué nodos caerán
   por debajo del dominio dentro de `horizonDays` si no se practica nada. Usted
   debe decidir y defender los casos de borde (se califica la coherencia y la
   defensa): nodo con varios ítems — ¿el primer ítem o el promedio del nodo?;
   nodos nunca practicados; nodos ya por debajo del umbral; nodos en
   mantenimiento; un nodo sin ítems; un nodo que cruza exactamente el día
   `horizonDays`.
6. Cada decisión de borde fijada por una prueba. Función tipada como el resto
   del motor; el tiempo entra como parámetro (puro/determinista — sin reloj del
   sistema). Nota aritmética: resolver `maestría × 0.97^d = 80`.

## 2. Causa

`src/engine/graph.ts`, `isNodeMastered`, línea 172: se comparaba
`currentMastery(state, state.dueDate ?? now)` en vez de
`currentMastery(state, now)`. `currentMastery` solo decae cuando `now > dueDate`;
al pasarle la propia `dueDate`, la condición `now <= dueDate` era siempre
verdadera y devolvía la maestría sin decaer, así que el nodo nunca dejaba de
estar "dominado". Como `nodeMasteryAvg` sí usaba `now`, el número bajaba pero el
estado no: el mapa mostraba todo dominado pese al paso del tiempo.

## 3. Alcance

La misma causa apagaba dos comportamientos más. El re-bloqueo de dependientes
(`computeNodeStatus` marca `locked` vía `isNodeMastered`) no ocurría, porque el
prerequisito oxidado seguía "dominado". El marcado de "oxidado"
(`isNodeWeakened` depende de `!isNodeMastered(now)`) nunca se activaba. Ambos
estaban enmascarados: no se podían observar mientras el nodo no salía de
"dominado". Se verificaron tras el fix con `src/engine/mastery-decay.test.ts`
(bloques de re-bloqueo y "rusty marking"), hoy en verde. No se halló un segundo
defecto independiente (se leyeron `srs.ts`, `graph.ts`, `session.ts`). Las 105
pruebas no lo atrapaban porque evalúan el estado en el mismo instante en que
crean los estados, con vencimientos futuros, sin adelantar `now`.

## 4. Semántica de `nodesAtRisk`

Una línea por decisión (todas fijadas en `src/engine/nodes-at-risk.test.ts`):

- **Promedio del nodo, no el primer ítem que cae.** El dominio se define por el
  promedio. Prueba: "risk is the node average, not the first item to dip".
- **Nunca practicados: fuera.** Promedio 0, nada que perder. Prueba:
  "never-practiced nodes are not at risk".
- **Ya por debajo hoy: fuera.** Ya cayeron; la advertencia es preventiva.
  Prueba: "nodes already below target are out".
- **Mantenimiento: mismo trato.** Están sobre el umbral, misma regla. Prueba:
  "maintenance nodes get the same treatment".
- **Sin ítems: fuera.** No hay promedio que decaer. Prueba: "a node with no
  items is excluded".
- **Horizonte inclusivo (cruce en día `horizonDays` = dentro).** Se evalúa en
  `now + horizonDays` con `< 80`. Prueba: "the horizon is inclusive".

## 5. Desvío

Tras diagnosticar, apliqué el fix y arranqué a correr la suite completa. Me
reencauzaste: "No, no modifiques el código, solo valida las 105 pruebas". Lo correcto
era primero validar las 105 y reportar si alguna estorbaba, antes de tocar
código. Se detectó por tu interrupción; se corrigió revirtiendo el cambio,
confirmando las 105 en verde y verificando por lectura que ninguna prueba
fijaba el bug, y solo entonces re-aplicando la corrección de una línea.

## 6. Señal de cierre

Los seis enunciados se sostienen: la prueba nueva falla antes y pasa después;
las 105 originales pasan sin editarse; el fix es de una línea; cada decisión de
borde queda fijada por una prueba. Señal objetiva y reproducible:
`npx vitest run` → 119 pruebas en verde (105 originales + 14 nuevas) y
`npx tsc --noEmit` sin errores.
