# TI-PR-01 · carga inicial (Fase B)

Carga reproducible del programa **TI-PR-01** a partir del Excel fuente.

## Por qué está aquí y no en `backend/migrations`

`backend/migrations` contiene `20260923_007` y `20260923_008`, que son *cleanup*
destructivos y **todavía no deben ejecutarse**. Un runner que recorriera la carpeta en
orden los arrastraría. Además esta carga es un paso de **datos**, no de esquema.

## Requisitos previos

Estas migraciones deben estar aplicadas, en este orden:

| Migración | Qué aporta |
|---|---|
| `20260918_001_ti_pr_01_programa_mantenimiento.sql` | tablas base del programa |
| `20260918_002_ti_pr_01_normalizacion_equipos_expand.sql` | normalización por equipos y quincenas |
| `20260922_003_ti_pr_01_versionado_programa_expand.sql` | versionado documental |
| `20260923_004_ti_pr_01_versionado_desacople.sql` | desacople del versionado |
| `20260923_005_ti_pr_01_inventario_equipos_expand.sql` | tabla `vehiculo_equipos` |
| `20260923_006_ti_pr_01_reconciliacion_placas.sql` | placas en forma canónica |

El script comprueba las tres últimas por sí mismo y aborta si falta alguna.

## Uso

```bash
# 1 · prueba: hace todo el trabajo y termina en ROLLBACK
node backend/scripts/ti-pr-01/cargar-fase-b.mjs --ensayo

# 2 · carga real: termina en COMMIT, solo si todas las comprobaciones pasan
node backend/scripts/ti-pr-01/cargar-fase-b.mjs --confirmar
```

Sin bandera no hace nada: obliga a declarar la intención.

## Garantías

- **Huella del Excel.** Exige el SHA-256 exacto declarado en `EXCEL_SHA256`. Si el
  fichero cambió, aborta antes de abrir conexión. Si el cambio es legítimo hay que
  revalidar la carga y actualizar la constante a mano, nunca automáticamente.
- **Precondiciones.** Verifica base, esquema, que no es una réplica de solo lectura,
  que 004/005/006 están aplicadas, que las 175 placas existen en `vehiculos` y que las
  8 tablas de destino están vacías.
- **No duplica.** Si `TI-PR-01` ya existe, aborta con un mensaje explícito. No
  sobreescribe ni fusiona: la decisión sobre lo ya cargado es humana.
- **Una sola transacción.** B0, B0-bis, B1, B2 y B3 van juntos. Cualquier fallo revierte
  todo.
- **Conteos antes del COMMIT** y ejecución del fichero de validación completo
  (`migrations/validation/20260923_006_ti_pr_01_modelo_final_validation.sql`, 45
  consultas de solo lectura). Si una sola regla da `FAIL`, hace `ROLLBACK`.
- **No inventa datos.** Cada valor sale del Excel o del cajetín aprobado.

## Qué carga

| Bloque | Contenido |
|---|---|
| **B0** | 1 `programas_mantenimiento`: `TI-PR-01`, nombre leído de `TI-PR-01!D2`, estado `ACTIVO`. Las columnas legacy que aún son `NOT NULL` se rellenan con valores del propio cajetín: periodo `2026-09-01`…`2026-12-31`, versión `01`, fecha `2026-09-25`, y `frecuencia_m1/m2/m3_dias` = `15/90/180` (columna AD del cajetín). |
| **B0-bis** | 1 versión documental: `01`, `fecha_documento` y `vigencia_desde` = `2026-09-25`, `vigencia_hasta` NULL, estado `VIGENTE`, periodo `2026-09-01`…`2026-12-31`. |
| **B1** | 13 periodicidades en quincenas: M1=1, M2=6, M3=12 para DVR, COPILOTO, RADIO_BASE y CAMARAS; GPS solo M3=24. **`version_id = NULL` en las 13**, a propósito. ADAS no lleva periodicidad. |
| **B2** | 174 `programa_mantenimiento_unidades`, las activas de `IMP_UNIDADES`. `V5K756` **no** entra: está vendida y figura en BAJAS. |
| **B3** | 1400 `vehiculo_equipos` = 175 placas de STATUS × 8 tipos físicos. Incluye las 8 filas históricas de `V5K756`. |

## Qué NO carga, y por qué

- `programa_mantenimiento_unidad_ciclos` — faltan las referencias iniciales M1/M2/M3.
  No hay evidencia de ejecución y no se inventa.
- `programacion_mantenimiento` y `programacion_mantenimiento_equipos` — se derivan de
  los ciclos.
- `programa_mantenimiento_frecuencias.version_id` — se carga NULL. La periodicidad
  pertenece al **programa**, no a la revisión documental. La columna es deuda de
  transición y desaparece en el cleanup final.
- Los cinco booleanos legacy de `vehiculos` (`dvr_instalado`, `copiloto_instalado`,
  `radio_base_instalado`, `camaras_instaladas`, `gps_instalado`) — quedan NULL.
  `vehiculo_equipos` es la única fuente de verdad del inventario físico.

## Regla de proyección inventario → mantenimiento

Documentada, **no implementada**: no hay tabla ni vista que la materialice, para no
crear una segunda fuente de verdad. El backend la aplicará cuando se adapte.

| Tipo mantenible | Se deriva de |
|---|---|
| `DVR` | `DVR_INTERNO` OR `DVR_EXTERNO` |
| `CAMARAS` | `CAMARA_INTERNA` OR `CAMARA_EXTERNA` |
| `COPILOTO` | `COPILOTO` (directo) |
| `RADIO_BASE` | `RADIO_BASE` (directo) |
| `GPS` | `GPS` (directo) |
| `ADAS` | **ninguno**: se inventaria, no se mantiene |

Para `DVR` y `CAMARAS`, que agrupan dos equipos físicos, la lógica es de tres estados:

- alguno `INSTALADO` → **aplica**
- ambos `NO_APLICA` → **no aplica**
- cualquier otra combinación con `POR_VALIDAR` → **pendiente de validar**

`POR_VALIDAR` nunca se interpreta como «no».

## Una nota sobre el bloque GPS del Excel

Sus dos columnas están permutadas respecto de sus rótulos y el script lo compensa:

- `AD` se titula «TIPO DE GPS» pero contiene **números de serie** (105 valores distintos,
  casi todos únicos), más cuatro marcadores que no son series y por eso no se importan:
  `TDCTDC` (×34), `SIN COPILOTO` (×6), `0` (×4) y `SIN SERIE` (×2).
- `AE` se titula «MODELO DE GPS» pero contiene la **identidad real del equipo**: solo 8
  valores (`Ruptela_Pro4_3G`, `Ruptela_HCV5`, …).

Por eso la evidencia de instalación y la marca del GPS salen de `AE`, y la serie de `AD`.
La propia hoja derivada del libro, `IMP_EQUIPOS_STATUS`, hace lo mismo. Leer `AD` como
evidencia daría 148 GPS instalados en vez de 171. El script contrasta su derivación
contra esa hoja: 1400 filas, 1400 coincidencias.
