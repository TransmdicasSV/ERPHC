import { pool } from '../../../config/database.js';

import {
  ESTADO_CANCELADO,
  ESTADO_REPROGRAMADO,
  ESTADO_PROGRAMADO,
  ESTADOS_REPROGRAMABLES,
  ESTADOS_CANCELABLES,
  ESTADOS_PROGRAMABLES
} from './service.js';

// ==========================================
// PROGRAMACION DE MANTENIMIENTO (TI-PR-01)
// SQL contra el modelo 013-016. Parametrizado, columnas explícitas.
// ==========================================
//
// NO SE EXPONEN NI SE ESCRIBEN LAS COLUMNAS QUE RETIRA EL 20261001_900:
// fecha_programada, fecha_reprogramada y nivel_mantenimiento de la cabecera. Las tres
// siguen existiendo hoy y la base las acepta -medido: el UPDATE de nivel_mantenimiento
// pasa sin que ningún trigger lo impida-, pero exponerlas ataría el contrato de la API a
// columnas condenadas. El nivel real de cada equipo vive en
// programacion_mantenimiento_equipos.
//
// quincena_efectiva es GENERATED ALWAYS, así que nunca aparece en un INSERT ni en un SET:
// se lee y se deja que la calcule la base.
//
// NO HAY NINGUN INSERT NI DELETE EN ESTE ARCHIVO. Crear programación es trabajo del
// generador; borrarla no es una operación del negocio -la base la aceptaría, y
// programacion_mantenimiento_equipos tiene ON DELETE CASCADE, así que un DELETE se
// llevaría en silencio la evidencia del alcance materializado-.
//
// Cada función acepta un cliente opcional para poder ejecutarse dentro de una transacción
// de prueba con ROLLBACK.

// Fechas como texto: date -> Date de JavaScript desplaza la zona horaria.
const COLUMNAS = `
  p.id,
  p.programa_id,
  p.programa_unidad_id,
  u.placa,
  p.estado,
  p.quincena_programada::text   AS quincena_programada,
  p.quincena_reprogramada::text AS quincena_reprogramada,
  p.quincena_efectiva::text     AS quincena_efectiva,
  p.fecha_ejecucion::text       AS fecha_ejecucion,
  p.version_programa_id,
  p.observaciones,
  p.created_at,
  p.updated_at`;

// Existencia de OT, no su contenido: es lo único que hace falta para saber si una
// operación está bloqueada. Abrir, detallar y cerrar OT es otra etapa.
const OT = `
  (SELECT count(*)::int FROM ordenes_trabajo o
    WHERE o.programacion_id = p.id) AS ot_total,
  (SELECT count(*)::int FROM ordenes_trabajo o
    WHERE o.programacion_id = p.id AND o.estado = 'ABIERTA') AS ot_abiertas,
  (SELECT count(*)::int FROM ordenes_trabajo o
    WHERE o.programacion_id = p.id AND o.estado = 'CERRADA') AS ot_cerradas,
  (SELECT count(*)::int FROM ordenes_trabajo o
    WHERE o.programacion_id = p.id AND o.estado = 'ANULADA') AS ot_anuladas,
  (SELECT count(*)::int FROM ordenes_trabajo o
    WHERE o.programacion_id = p.id AND o.estado <> 'ANULADA') AS ot_no_anuladas`;

const COLUMNAS_EQUIPO = `
  e.id,
  e.programacion_id,
  e.tipo_equipo,
  e.nivel_mantenimiento,
  e.created_at,
  e.updated_at`;

// Una sola consulta, con la unidad por JOIN y los conteos de OT por subconsulta
// correlacionada. El orden usa quincena_efectiva, que es la columna del índice parcial.
export const obtenerProgramacion = async (
  programaId,
  {
    estado = null,
    placa = null,
    quincena_efectiva = null,
    desde = null,
    hasta = null,
    limite = 500,
    desplazamiento = 0
  } = {},
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS},
            ${OT}
     FROM programacion_mantenimiento p
     JOIN programa_mantenimiento_unidades u ON u.id = p.programa_unidad_id
     WHERE p.programa_id = $1
       AND ($2::text IS NULL OR p.estado = $2)
       AND ($3::text IS NULL OR u.placa = $3)
       AND ($4::date IS NULL OR p.quincena_efectiva = $4::date)
       AND ($5::date IS NULL OR p.quincena_efectiva >= $5::date)
       AND ($6::date IS NULL OR p.quincena_efectiva <= $6::date)
     ORDER BY p.quincena_efectiva ASC, u.placa ASC, p.id ASC
     LIMIT $7 OFFSET $8`,
    [
      programaId,
      estado,
      placa,
      quincena_efectiva,
      desde,
      hasta,
      limite,
      desplazamiento
    ]
  );

  return result.rows;
};

export const contarProgramacion = async (
  programaId,
  {
    estado = null,
    placa = null,
    quincena_efectiva = null,
    desde = null,
    hasta = null
  } = {},
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT count(*)::int AS total
     FROM programacion_mantenimiento p
     JOIN programa_mantenimiento_unidades u ON u.id = p.programa_unidad_id
     WHERE p.programa_id = $1
       AND ($2::text IS NULL OR p.estado = $2)
       AND ($3::text IS NULL OR u.placa = $3)
       AND ($4::date IS NULL OR p.quincena_efectiva = $4::date)
       AND ($5::date IS NULL OR p.quincena_efectiva >= $5::date)
       AND ($6::date IS NULL OR p.quincena_efectiva <= $6::date)`,
    [
      programaId,
      estado,
      placa,
      quincena_efectiva,
      desde,
      hasta
    ]
  );

  return result.rows[0].total;
};

export const obtenerVisitaPorId = async (
  programaId,
  id,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS},
            ${OT}
     FROM programacion_mantenimiento p
     JOIN programa_mantenimiento_unidades u ON u.id = p.programa_unidad_id
     WHERE p.programa_id = $1
       AND p.id = $2`,
    [programaId, id]
  );

  return result.rows[0] ?? null;
};

// SIN N+1: los equipos de TODAS las visitas del listado en una sola consulta, agrupados en
// memoria. programacion_mantenimiento_equipos es la evidencia de qué quedó materializado:
// se devuelve tal cual, nunca recalculado con la frecuencia vigente.
export const obtenerEquiposDeVisitas = async (
  programacionIds,
  cliente = pool
) => {
  if (programacionIds.length === 0) {
    return new Map();
  }

  const result = await cliente.query(
    `SELECT ${COLUMNAS_EQUIPO}
     FROM programacion_mantenimiento_equipos e
     WHERE e.programacion_id = ANY($1::int[])
     ORDER BY e.programacion_id ASC, e.tipo_equipo ASC`,
    [programacionIds]
  );

  const porVisita = new Map(
    programacionIds.map(id => [id, []])
  );

  for (const equipo of result.rows) {
    porVisita
      .get(equipo.programacion_id)
      .push(equipo);
  }

  return porVisita;
};

// El estado permitido va en el propio WHERE, no solo en el service: así la puerta es
// atómica con la escritura y no hay ventana entre comprobar y escribir. Si no entra,
// rowCount es 0 y el controller vuelve a leer para decir por qué.
//
// Solo se escriben quincena_reprogramada y estado. quincena_programada no se menciona
// -la congela R3-, y fecha_reprogramada tampoco: es la columna legacy que retira el 900.
export const reprogramarVisita = async (
  programaId,
  id,
  quincenaReprogramada,
  cliente = pool
) => {
  const result = await cliente.query(
    `UPDATE programacion_mantenimiento p
     SET quincena_reprogramada = $3::date,
         estado = $4
     WHERE p.programa_id = $1
       AND p.id = $2
       AND p.estado = ANY($5::text[])
     RETURNING p.id`,
    [
      programaId,
      id,
      quincenaReprogramada,
      ESTADO_REPROGRAMADO,
      ESTADOS_REPROGRAMABLES
    ]
  );

  return result.rowCount > 0;
};

// Promocion. Igual que cancelar: una sola columna, estado, y la puerta de estado dentro
// del mismo WHERE. No crea nada -ni fila, ni equipos, ni OT- y no toca ninguna quincena: la
// obligacion es la misma, solo pasa a estar confirmada.
//
// ESTADOS_PROGRAMABLES es solo ['PROYECTADO'], asi que un PROGRAMADO que llegue hasta aqui
// devolveria rowCount 0. No llega: el controller resuelve ese caso antes, para no mover
// updated_at en una operacion idempotente.
export const programarVisita = async (
  programaId,
  id,
  cliente = pool
) => {
  const result = await cliente.query(
    `UPDATE programacion_mantenimiento p
     SET estado = $3
     WHERE p.programa_id = $1
       AND p.id = $2
       AND p.estado = ANY($4::text[])
     RETURNING p.id`,
    [
      programaId,
      id,
      ESTADO_PROGRAMADO,
      ESTADOS_PROGRAMABLES
    ]
  );

  return result.rowCount > 0;
};

// No borra la fila ni sus equipos previstos. El índice parcial excluye CANCELADO, así que
// esto libera el slot de la quincena y habilita una sustituta.
export const cancelarVisita = async (
  programaId,
  id,
  cliente = pool
) => {
  const result = await cliente.query(
    `UPDATE programacion_mantenimiento p
     SET estado = $3
     WHERE p.programa_id = $1
       AND p.id = $2
       AND p.estado = ANY($4::text[])
     RETURNING p.id`,
    [
      programaId,
      id,
      ESTADO_CANCELADO,
      ESTADOS_CANCELABLES
    ]
  );

  return result.rowCount > 0;
};
