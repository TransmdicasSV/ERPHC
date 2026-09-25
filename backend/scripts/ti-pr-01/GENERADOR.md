# TI-PR-01 · Regla del generador de programación

Cómo se forma una visita programada. Regla de negocio aprobada el 2026-09-24.

> **El generador todavía no está implementado.** Este documento es la especificación
> congelada, y `auditar-generador.mjs` la verifica en solo lectura contra los datos reales.

## Vocabulario

| término | significado |
|---|---|
**familias regulares** | `DVR`, `CAMARAS`, `COPILOTO`, `RADIO_BASE` — M1 = 1, M2 = 6, M3 = 12 quincenas |
**familias anuales** | `GPS`, `ADAS` — **solo M3**, 24 quincenas |
**visita** | una unidad intervenida en una quincena. Se materializa como una fila de `programacion_mantenimiento` |
**obligación bruta** | término de la serie de cadencia de un `(unidad, familia, nivel)` concreto |
**`nivel_regular`** | el nivel consolidado de la intervención regular de la unidad en esa quincena |

## El algoritmo, en seis pasos

### Paso 1 · Obligación bruta

Grano `(unidad, familia, nivel)`. Para cada combinación con referencia de fase:

```
referencia = programa_mantenimiento_unidad_ciclos.ultima_quincena  del nivel, si existe
             programa_mantenimiento_unidad_anclas.quincena_ancla   del nivel, si no

serie      = referencia + k × frecuencia_quincenas,  k = 1, 2, 3, …
```

El ciclo real **siempre** tiene precedencia sobre el ancla. El horizonte es un **filtro de
materialización**: se itera la serie completa y se conserva lo que cae dentro. Los términos
anteriores al horizonte son **backlog calculado** y no se materializan (ver `CUTOVER.md`).

### Paso 2 · Separar regulares de anuales

Las anuales **no entran** en el cálculo del paso 3. Se tratan aparte en el paso 5.

### Paso 3 · Consolidación regular

```
nivel_regular(unidad, quincena) = MAX(M3 > M2 > M1) de las obligaciones brutas
                                  de las familias REGULARES en esa quincena
```

Si la unidad no tiene ninguna obligación regular en esa quincena, la visita **no tiene
componente regular** y `nivel_regular` es nulo.

### Paso 4 · Elevación

**Toda** familia regular de la unidad cuyo estado sea `APLICA` entra como detalle con
`nivel_mantenimiento = nivel_regular`, **incluso si a esa familia no le tocaba nada** en esa
quincena.

```
brutas:                          programado:
  CAMARAS     M2                   CAMARAS     M2
  DVR         M1        ------>    DVR         M2
  COPILOTO    M1                   COPILOTO    M2
  RADIO_BASE  M1                   RADIO_BASE  M2
```

Una visita. Una futura OT. El nivel M1/M2/M3 representa el **alcance de la intervención de
la unidad**, no el estado individual de cada equipo.

La aplicabilidad sale de la proyección de tres estados sobre `vehiculo_equipos`:

| resultado | condición |
|---|---|
`APLICA` | algún componente físico de la familia está `INSTALADO` |
`NO_APLICA` | todos sus componentes están `NO_APLICA` |
`PENDIENTE` | cualquier otra combinación, es decir hay `POR_VALIDAR` sin ningún `INSTALADO` |

`POR_VALIDAR` **nunca** se interpreta como «sí». Solo `APLICA` se programa. `NO_APLICA` no
cuenta como incumplimiento.

#### Una familia sin fase sí participa de una visita que ya existe

Esto es una regla aparte y conviene no confundirla: **no tener fase impide *originar* una
obligación, pero no impide *participar* de una visita ya generada.**

Una familia sin ciclo ni ancla no tiene serie de la que derivar un término, así que no
aparece en el paso 1 y por sí sola nunca produce una visita. Pero si otra familia sí generó
la visita, esa familia entra como detalle con el `nivel_regular`, porque el técnico va a
intervenir la unidad y el equipo está instalado.

```
CAMARAS      tiene fase                      CAMARAS     M3
DVR          tiene fase          ------>     DVR         M3
COPILOTO     tiene fase                      COPILOTO    M3
RADIO_BASE   recién instalado,               RADIO_BASE  M3   <- sin fase previa
             APLICA, sin histórico
```

**No se inventa ningún histórico previo.** El detalle se marca como *sin fase previa* y su
primera referencia real **nace del cierre** de esa OT: al completarse M3 se crean los ciclos
M3, M2 y M1 con la `quincena_efectiva` de la visita, por la regla acumulativa. Antes del
cierre no existe ningún ciclo para esa familia.

#### Los tres casos, diferenciados

| caso | situación | resultado |
|---|---|---|
**A** | familia regular sin fase **y ya existe** visita regular por otra familia | **entra** a la visita con `nivel_regular`, marcada sin fase previa. Sin ciclo hasta el cierre |
**B** | familia regular sin fase **y ninguna** obligación genera visita | **no** se inventa obligación. Aparece en el reporte como `SIN_REFERENCIA_REGULAR` |
**C** | `GPS`/`ADAS` instalado sin referencia anual M3 | **no** se inventa obligación ni fecha. Aparece como `SIN_REFERENCIA_M3` |

#### Reporte de excepciones operativas

Un equipo instalado sin referencia no genera obligación, pero **no puede desaparecer del
control**. El generador expone una salida con `unidad`, `tipo_equipo`, `estado_inventario` y
`motivo`, para que TI ingrese después una referencia real cuando exista evidencia válida:

```
unidad     tipo_equipo  estado_inventario  motivo
B6Z714     GPS          INSTALADO          SIN_REFERENCIA_M3
...
```

Motivos: `SIN_REFERENCIA_M3` para las anuales, `SIN_REFERENCIA_REGULAR` para las regulares.
**Esa condición por sí sola nunca materializa una programación ni una OT.**

Medido el 2026-09-24, por familia:

| familia | APLICA | sin referencia de fase |
|---|---|---|
`DVR` | 145 | **0** |
`CAMARAS` | 145 | **0** |
`COPILOTO` | 122 | **0** |
`RADIO_BASE` | 119 | **0** |
`ADAS` | 1 | **0** |
`GPS` | 170 | **14** |

Las cuatro regulares están hoy a 0, así que el caso **A** no se da todavía con datos reales;
aparecerá en cuanto se instale un equipo en una unidad ya programada, y la regla está
preparada para ello.

Los **14 GPS** son el caso **C**, conocido y aceptado: instalados pero sin histórico M3 en
`HISTORICO_GPS`, y por tanto sin ancla —las anclas se derivan de un M1 y GPS no tiene M1—.
Son `B6Z714, B8D793, CJQ858, CJR734, CJR910, CJS849, CJT845, V6V850, V9T961, VAS917, VEW740,
VEW763, VEW776, VEZ930`. No generan obligación y **no se les inventa fecha**, pero sí
aparecen en el reporte de excepciones con motivo `SIN_REFERENCIA_M3`. Los otros 156 GPS, que
sí tienen referencia, se programan con normalidad.

### Paso 5 · Excepción de las familias anuales

`GPS` y `ADAS` entran **solo** cuando su propia obligación anual M3 cae en esa quincena
exacta, siempre con `nivel_mantenimiento = 'M3'`.

- **no** participan en el cálculo de `nivel_regular`;
- **no** elevan a las familias regulares;
- **no** son elevadas por las familias regulares.

`ADAS` además exige la regla positiva de proveedor: `estado_inventario = 'INSTALADO'` **y**
`marca ILIKE '%TRACKLOG%'`. Nunca por exclusión de otros proveedores.

### Paso 6 · Una visita por unidad y quincena

Todos los detalles de los pasos 4 y 5 cuelgan de **una sola** `programacion_mantenimiento`
por `(programa_unidad_id, quincena)`, y de ella una sola OT.

La base ya lo garantiza con independencia del generador:

```sql
uq_programacion_unidad_quincena_efectiva
  ON programacion_mantenimiento (programa_unidad_id, quincena_efectiva)
  WHERE estado <> 'CANCELADO'

uq_programacion_equipo
  ON programacion_mantenimiento_equipos (programacion_id, tipo_equipo)
```

El generador debe usar `INSERT … ON CONFLICT DO NOTHING` y escribir **siempre**
`quincena_programada`, para no apoyarse en la semántica de múltiples `NULL` de un índice
único.

## PROHIBIDO: `nivel_visita = MAX(todos los detalles)`

Un máximo global sobre **todos** los detalles mezcla las dos periodicidades y miente.
Contraejemplo real, unidad V7Z928, quincena 2026-11-16:

```
nivel_regular = M2
GPS           = M3  (su anual propia)

detalles:  CAMARAS M2 · DVR M2 · RADIO_BASE M2 · GPS M3
```

El máximo global sería `M3`, y eso **afirmaría que el mantenimiento regular de la unidad fue
M3**, que es falso: fue M2 y coincidió con el anual del GPS.

Por tanto:

- **la fuente de verdad es `programacion_mantenimiento_equipos.nivel_mantenimiento`, por
  familia.** Ahí queda el nivel ya elevado de cada detalle;
- `nivel_regular` es la única variable de consolidación, y solo aplica a las regulares;
- un máximo global puede calcularse **derivado, para UI o resumen**, y jamás usarse para
  propagación de ciclos ni para ninguna decisión de negocio.

## Propagación al cerrar la OT

**Detalle por detalle.** Nunca a partir de un supuesto «nivel general de la OT».

| detalle | avanza |
|---|---|
regular, `nivel_completado = M1` | M1 |
regular, `nivel_completado = M2` | M2 + M1 |
regular, `nivel_completado = M3` | M3 + M2 + M1 |
`GPS` o `ADAS`, `nivel_completado = M3` | **solo M3** — nunca crea M1 ni M2 |
cualquiera, `nivel_completado IS NULL` | nada |

Cada fila de ciclo escrita recibe:

```
ultima_quincena          = programacion_mantenimiento.quincena_efectiva
ultima_fecha_real        = programacion_mantenimiento.fecha_ejecucion
fuente                   = 'ORDENES_TRABAJO'
orden_trabajo_detalle_id = el detalle que produjo la cobertura
```

Las filas de nivel inferior creadas por propagación llevan el **mismo**
`orden_trabajo_detalle_id` que el detalle superior que las cubrió: no son OTs ficticias,
son la constancia de que esa intervención cubrió también ese alcance.

`chk_ciclo_anual_solo_m3` impide físicamente un `GPS/M1` o un `ADAS/M2`, así que la regla
anual está respaldada por la base y no solo por el código.

## Pendientes

Si una familia se programó a un nivel y no se completó (`nivel_completado IS NULL`):

- no avanza M1, ni M2, ni M3;
- conserva su fase anterior;
- queda la trazabilidad del pendiente en el detalle de la OT.

La obligación **no se desplaza**. Como el ciclo no avanzó, la referencia no cambia y la
serie **no genera un término nuevo en la quincena siguiente**: el mismo término sigue
debido, atrasado, hasta que se ejecute o se reprograme formalmente
(`quincena_reprogramada`, conservando `quincena_programada`).

**No se crea automáticamente ninguna OT de recuperación.** Ese tratamiento es una decisión
de negocio separada, todavía sin tomar.

## Divergencia futura de fases

Tras los primeros cierres parciales, `CAMARAS`, `DVR`, `COPILOTO` y `RADIO_BASE` de una misma
unidad pueden quedar en fases distintas. **Eso no es un error: es el estado técnico
correcto.** Es lo que permite saber qué equipo se atendió y cuál quedó pendiente.

Los ciclos y las anclas conservan su grano `(unidad, familia, nivel)`. El generador
**vuelve a consolidar** al formar cada visita. **No se sincronizan artificialmente las
fases.**

Medido el 2026-09-24: 0 unidades divergen todavía, porque la siembra B4 derivó las cuatro
familias de la misma inspección.

## Caso crítico

```
brutas:                          programado:
  CAMARAS     M3                   CAMARAS     M3
  DVR         M1        ------>    DVR         M3
  COPILOTO    M2                   COPILOTO    M3
  RADIO_BASE  M1                   RADIO_BASE  M3

  GPS no vence esta quincena  ->  GPS NO entra
  GPS sí vence esta quincena  ->  GPS M3 entra como detalle adicional,
                                  por su obligación anual propia
```

## Verificación

`auditar-generador.mjs` implementa esta especificación y la contrasta contra los datos
reales en una transacción `READ ONLY`. No escribe nada.

```bash
node backend/scripts/ti-pr-01/auditar-generador.mjs
```
