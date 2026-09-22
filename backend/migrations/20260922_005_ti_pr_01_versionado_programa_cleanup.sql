-- ============================================================
-- TI-PR-01  FASE V-G - LIMPIEZA DEL VERSIONADO
--
--   *** ARCHIVO DESTRUCTIVO E IRREVERSIBLE ***
--
-- Elimina 5 columnas. DROP COLUMN borra los datos de forma
-- definitiva: revertir la migracion NO los recupera. Solo se
-- recuperan desde un respaldo o desde una branch de Neon anterior.
--
-- Las cuatro columnas de programas_mantenimiento que se retiran
-- aqui (version, fecha_documento, periodo_inicio, periodo_fin)
-- contienen informacion documental del programa. ANTES de ejecutar
-- este archivo esa informacion debe estar ya migrada a
-- programas_mantenimiento_versiones; si no, se pierde.
--
-- NO EJECUTAR hasta completar, en este orden:
--
--   1. FASE V-A   20260922_003_..._versionado_programa_expand.sql
--                 aplicada.
--   2. FASE V-B   Datos creados:
--                   - el programa TI-PR-01 (una sola fila)
--                   - su version V01, con fecha_documento,
--                     vigencia_desde y, si aplica, periodo_inicio
--                     y periodo_fin
--                   - las 13 frecuencias, con version_id
--   3. FASE V-E   BACKEND ADAPTADO Y DESPLEGADO:
--                   - modulo programas sin version, fecha_documento
--                     ni periodo_inicio/periodo_fin
--                   - modulo nuevo de versiones
--                   - modulo de frecuencias por version_id
--                   - generador que rellena version_programa_id
--                   - contrato de initDb.js actualizado
--                 Sin esto, al ejecutar este archivo initDb()
--                 fallara y EL SERVIDOR NO ARRANCARA.
--   4. FASE V-F   Validacion:
--                 20260922_003_..._versionado_programa_validation.sql
--                 sin bloqueos.
--   5. Autorizacion humana explicita.
--
-- RELACION CON 20260922_004_..._normalizacion_equipos_cleanup.sql
--   Los dos archivos son INDEPENDIENTES: no comparten ni una sola
--   columna ni un solo constraint.
--     004 toca de programas_mantenimiento: frecuencia_m1_dias,
--         frecuencia_m2_dias, frecuencia_m3_dias.
--     005 toca de programas_mantenimiento: version, fecha_documento,
--         periodo_inicio, periodo_fin.
--   Pueden ejecutarse en cualquier orden, pero NINGUNO de los dos
--   antes de que el backend este adaptado. Se recomienda el orden
--   numerico 004 -> 005 por convencion, no por dependencia.
--
-- SIN CASCADE. Ningun DROP de este archivo usa CASCADE: cada objeto
-- dependiente se retira explicitamente antes, para que nada
-- desaparezca de forma implicita y silenciosa.
--
-- Se recomienda respaldo previo o ejecucion sobre una branch de Neon.
-- ============================================================


-- ------------------------------------------------------------
-- 1. FRECUENCIAS: CERRAR EL MODELO FINAL
--
--    Estado de partida (tras la FASE V-A):
--      version_id   integer NOT NULL
--      programa_id  integer NOT NULL   <- legacy, se retira aqui
--      fk_frecuencia_version_programa (version_id, programa_id)
--          -> versiones(id, programa_id)        <- temporal
--      fk_frecuencia_programa (programa_id)
--          -> programas_mantenimiento(id)       <- legacy
--      uq_frecuencia_version_equipo_nivel       <- clave definitiva
-- ------------------------------------------------------------

-- 1.a  SUSTITUTO PRIMERO.
--      Se crea la FK definitiva ANTES de retirar la temporal, para
--      que version_id no quede ni un instante sin referencia.
--      Depende de: programas_mantenimiento_versiones_pkey (id),
--      que no se toca en ningun momento.
ALTER TABLE programa_mantenimiento_frecuencias
    ADD CONSTRAINT fk_frecuencia_version
        FOREIGN KEY (version_id)
        REFERENCES programas_mantenimiento_versiones (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

-- 1.b  Retirar la FK compuesta temporal.
--      Que depende de ella: nada. Una FK no es objetivo de otros
--      objetos.
--      Que garantia queda: fk_frecuencia_version (1.a) sigue
--      exigiendo que version_id exista. Se pierde la comprobacion
--      de que frecuencia.programa_id = version.programa_id, pero
--      esa comprobacion deja de tener sentido en la sentencia 1.d,
--      cuando programa_id desaparece: el programa de una frecuencia
--      pasa a deducirse de su version, sin posibilidad de
--      contradiccion.
--      Por que es seguro: la informacion no se pierde, se deja de
--      duplicar.
ALTER TABLE programa_mantenimiento_frecuencias
    DROP CONSTRAINT fk_frecuencia_version_programa;

-- 1.c  Retirar la FK legacy hacia el programa.
--      Que depende de ella: nada.
--      Por que va ANTES del DROP COLUMN: si se dejara viva,
--      PostgreSQL la eliminaria de forma implicita al retirar la
--      columna. Se retira explicitamente para que no desaparezca
--      nada en silencio.
--      Que garantia queda: ninguna sobre programa_id, porque la
--      columna deja de existir en 1.d.
ALTER TABLE programa_mantenimiento_frecuencias
    DROP CONSTRAINT fk_frecuencia_programa;

-- 1.d  DESTRUCTIVO: retirar la columna legacy.
--      Comprobado que ya no queda ningun constraint ni indice que
--      la use: sus dos FK se retiraron en 1.b y 1.c, y la clave
--      uq_frecuencia_programa_equipo_nivel se retiro en la FASE V-A.
ALTER TABLE programa_mantenimiento_frecuencias
    DROP COLUMN programa_id;


-- ------------------------------------------------------------
-- 2. PROGRAMAS_MANTENIMIENTO: RETIRAR LO DOCUMENTAL
--
--    Estas cuatro columnas describen UN DOCUMENTO, no la identidad
--    permanente del programa. Su sitio es la tabla de versiones.
-- ------------------------------------------------------------

-- 2.a  Retirar la clave natural antigua.
--        uq_programas_mantenimiento_codigo_periodo_version
--        UNIQUE (codigo, periodo_inicio, version)
--      Que depende de ella: nada; ninguna FK la referencia.
--      Que garantia queda: uq_programas_mantenimiento_codigo
--      UNIQUE (codigo), creada en la FASE V-A. Es ESTRICTAMENTE
--      MAS FUERTE: la clave antigua permitia varias filas del mismo
--      codigo -una por version y periodo-, que es precisamente el
--      error de modelo que corrige todo este trabajo.
--      *** COMPROBAR ANTES DE EJECUTAR: la validacion V2 debe
--          devolver la fila de uq_programas_mantenimiento_codigo.
--          Si no existe, esta sentencia dejaria la tabla sin
--          ninguna unicidad de codigo. ***
--      Por que va ANTES del DROP COLUMN: involucra periodo_inicio y
--      version; dejarla viva provocaria su eliminacion implicita.
ALTER TABLE programas_mantenimiento
    DROP CONSTRAINT uq_programas_mantenimiento_codigo_periodo_version;

-- 2.b  Retirar el CHECK de coherencia del periodo.
--        chk_programas_mantenimiento_periodo
--        CHECK (periodo_fin >= periodo_inicio)
--      Que depende de el: nada.
--      Que garantia queda: chk_version_periodo, en la tabla de
--      versiones, que ademas exige que ambas fechas esten o falten
--      a la vez.
--      Por que va ANTES del DROP COLUMN: mismo motivo que 2.a.
ALTER TABLE programas_mantenimiento
    DROP CONSTRAINT chk_programas_mantenimiento_periodo;

-- 2.c  DESTRUCTIVO: retirar las cuatro columnas documentales.
--      version           -> versiones.version
--      fecha_documento   -> versiones.fecha_documento
--      periodo_inicio    -> versiones.periodo_inicio  (nullable)
--      periodo_fin       -> versiones.periodo_fin     (nullable)
--      Ningun constraint ni indice las usa ya: los dos que las
--      usaban se retiraron en 2.a y 2.b.
--      NO se retira estado: pertenece al programa, no al documento.
ALTER TABLE programas_mantenimiento
    DROP COLUMN version,
    DROP COLUMN fecha_documento,
    DROP COLUMN periodo_inicio,
    DROP COLUMN periodo_fin;


-- ------------------------------------------------------------
-- 3. CONSOLIDAR LA TRAZABILIDAD DE VERSION EN LA PROGRAMACION
--
--    *** SOLO SI LA FASE V-B Y EL BACKFILL ESTAN COMPLETOS ***
--
--    Estas dos sentencias FALLAN si queda una sola fila sin
--    version_programa_id. Ese fallo es deseable: es la red de
--    seguridad que impide consolidar un backfill incompleto.
--    Si fallan, DETENERSE y revisar con la validacion V22.b.
--
--    A diferencia de frecuencias.version_id -que nace NOT NULL en
--    la FASE V-A porque su tabla estaba vacia-, estas dos columnas
--    necesitan que exista programacion real generada por el backend
--    adaptado antes de poder exigirse.
-- ------------------------------------------------------------
ALTER TABLE programacion_mantenimiento
    ALTER COLUMN version_programa_id SET NOT NULL;

ALTER TABLE programacion_mantenimiento_equipos
    ALTER COLUMN version_programa_id SET NOT NULL;


-- ------------------------------------------------------------
-- 4. LO QUE ESTE ARCHIVO NO TOCA, DELIBERADAMENTE
--
--    programa_mantenimiento_unidad_ciclos
--        Ni la tabla ni ninguna de sus columnas de continuidad
--        (ultima_quincena, ultima_fecha_real, fuente). El ciclo es
--        ajeno a la version por diseno: una unidad no reinicia su
--        historial porque cambie la revision documental.
--
--    programas_mantenimiento_versiones
--        No se borra ninguna version historica. V01 sigue existiendo
--        aunque V02 este vigente; es lo que permite leer un registro
--        antiguo y saber con que reglas se calculo.
--
--    programa_mantenimiento_frecuencias
--        No se borra ninguna frecuencia de versiones anteriores.
--        Las 13 filas de V01 conviven con las 13 de V02.
--
--    programacion_mantenimiento
--        No se borra ni se modifica ninguna visita ejecutada. El
--        histórico cerrado no se reescribe.
--
--    programas_mantenimiento.estado, .codigo, .nombre
--        Son la identidad permanente del programa.
--
--    Todo lo relativo a la normalizacion por equipos y quincenas
--        (fecha_programada, nivel_mantenimiento, fecha_base_m1/m2/m3,
--         quincena_arranque, frecuencia_m1/m2/m3_dias y sus
--         constraints) pertenece a
--         20260922_004_..._normalizacion_equipos_cleanup.sql.
--         Aqui no se repite ni una sola de esas sentencias.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- 5. DESPUES DE ESTE ARCHIVO
--      - volver a ejecutar la validacion completa. V9 dejara de ser
--        ejecutable (42703: programa_id ya no existe) y eso es lo
--        esperado; el resto debe seguir en cero filas;
--      - initDb() debe seguir pasando CON EL CONTRATO YA ACTUALIZADO;
--      - regenerar schema_actual.sql desde la base real.
--
--    Modelo resultante de frecuencias:
--      id, version_id NOT NULL, tipo_equipo, nivel_mantenimiento,
--      frecuencia_quincenas, created_at, updated_at
--      FK      fk_frecuencia_version (version_id) -> versiones(id)
--      UNIQUE  uq_frecuencia_version_equipo_nivel
--      CHECK   tipo_equipo, nivel, gps_solo_m3, quincenas > 0
--
--    Modelo resultante de programas_mantenimiento:
--      id, codigo UNIQUE, nombre, estado, created_at, updated_at
-- ------------------------------------------------------------
