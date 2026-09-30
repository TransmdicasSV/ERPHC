import { pool } from '../../config/database.js';

// ==========================================
// PROGRAMAS DE MANTENIMIENTO (TI-PR-01)
// SQL contra el modelo 013-016. Siempre parametrizado, columnas siempre explicitas.
// ==========================================
//
// EL ENCABEZADO SOLO DEVUELVE LO QUE SOBREVIVE AL CLEANUP.
// programas_mantenimiento tiene hoy 7 columnas condenadas: version, fecha_documento,
// periodo_inicio y periodo_fin las retira 20261001_901; frecuencia_m1/m2/m3_dias las
// retira 20261001_900. Exponerlas en la respuesta ataria el contrato de la API a columnas
// que van a desaparecer, asi que NO se seleccionan.
//
// Los mismos datos, ya normalizados, se leen de programas_mantenimiento_versiones, que es
// donde el 901 dice que viven. Hoy ambas copias coinciden, asi que la API no pierde
// informacion y no cambiara de forma el dia del cleanup.
//
// SIN N+1: las versiones de TODOS los programas del listado se traen en UNA consulta y se
// agrupan en memoria. La fecha de negocio viaja en la misma consulta, asi que el listado
// completo cuesta 2 viajes contra el pooler, sea uno o cien programas.
//
// Cada funcion acepta un cliente opcional para poder ejecutarse dentro de una transaccion
// de prueba con ROLLBACK. Por defecto usa el pool, igual que el resto de los modulos.

const COLUMNAS_PROGRAMA = `
  p.id,
  p.codigo,
  p.nombre,
  p.estado,
  p.created_at,
  p.updated_at`;

// Fechas como texto: date -> Date de JavaScript desplaza la zona horaria.
const COLUMNAS_VERSION = `
  v.id,
  v.programa_id,
  v.version,
  v.fecha_documento::text  AS fecha_documento,
  v.vigencia_desde::text   AS vigencia_desde,
  v.vigencia_hasta::text   AS vigencia_hasta,
  v.periodo_inicio::text   AS periodo_inicio,
  v.periodo_fin::text      AS periodo_fin,
  v.estado,
  v.observaciones,
  v.created_at,
  v.updated_at`;

// La fecha de negocio se calcula en la base con America/Lima, nunca con CURRENT_DATE: la
// sesion puede estar en UTC. Es la misma fecha que usa el generador.
const FECHA_NEGOCIO =
  `((now() AT TIME ZONE 'America/Lima')::date)::text AS fecha_negocio`;

// Devuelve { fecha_negocio, programas }: la fecha sale UNA vez, no repetida en cada fila.
// Asi el contrato no depende de que el controller se acuerde de quitarla de cada programa.
export const obtenerProgramas = async (
  { estado = null } = {},
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS_PROGRAMA},
            ${FECHA_NEGOCIO},
            (SELECT count(*)::int
               FROM programas_mantenimiento_versiones v
              WHERE v.programa_id = p.id) AS total_versiones,
            (SELECT count(*)::int
               FROM programa_mantenimiento_unidades u
              WHERE u.programa_id = p.id) AS total_unidades
     FROM programas_mantenimiento p
     WHERE ($1::text IS NULL OR p.estado = $1)
     ORDER BY p.codigo ASC`,
    [estado]
  );

  return {
    fecha_negocio: result.rows.length > 0
      ? result.rows[0].fecha_negocio
      : null,
    programas: result.rows.map(
      ({ fecha_negocio, ...programa }) => programa
    )
  };
};

// Devuelve { fecha_negocio, programa }, por la misma razon. programa es null si no existe.
export const obtenerProgramaPorId = async (
  id,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS_PROGRAMA},
            ${FECHA_NEGOCIO},
            (SELECT count(*)::int
               FROM programa_mantenimiento_unidades u
              WHERE u.programa_id = p.id) AS total_unidades
     FROM programas_mantenimiento p
     WHERE p.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return { fecha_negocio: null, programa: null };
  }

  const {
    fecha_negocio,
    ...programa
  } = result.rows[0];

  return { fecha_negocio, programa };
};

// Una sola consulta para N programas. Orden por vigencia descendente: es el que ya sirve
// idx_versiones_programa_vigencia.
export const obtenerVersionesDeProgramas = async (
  programaIds,
  cliente = pool
) => {
  if (programaIds.length === 0) {
    return new Map();
  }

  const result = await cliente.query(
    `SELECT ${COLUMNAS_VERSION}
     FROM programas_mantenimiento_versiones v
     WHERE v.programa_id = ANY($1::int[])
     ORDER BY v.programa_id ASC, v.vigencia_desde DESC, v.id DESC`,
    [programaIds]
  );

  const porPrograma = new Map(
    programaIds.map(id => [id, []])
  );

  for (const version of result.rows) {
    porPrograma
      .get(version.programa_id)
      .push(version);
  }

  return porPrograma;
};

export const actualizarPrograma = async (
  id,
  campos,
  data,
  cliente = pool
) => {
  // Lista blanca: campos ya viene filtrada por CAMPOS_EDITABLES en el service, y aqui se
  // vuelve a restringir para que ningun nombre llegue a la sentencia sin pasar por ella.
  const permitidos = {
    nombre: 'nombre'
  };

  const asignaciones = [];
  const valores = [];

  for (const campo of campos) {
    const columna = permitidos[campo];

    if (!columna) {
      continue;
    }

    valores.push(data[campo]);
    asignaciones.push(
      `${columna} = $${valores.length}`
    );
  }

  // Inalcanzable con el service actual, que exige al menos un campo. Se devuelve la fila
  // tal cual, no la forma { fecha_negocio, programa }, para que el tipo de retorno de esta
  // funcion sea uno solo.
  if (asignaciones.length === 0) {
    const {
      programa
    } = await obtenerProgramaPorId(
      id,
      cliente
    );

    return programa;
  }

  valores.push(id);

  const result = await cliente.query(
    `UPDATE programas_mantenimiento p
     SET ${asignaciones.join(', ')}
     WHERE p.id = $${valores.length}
     RETURNING ${COLUMNAS_PROGRAMA}`,
    valores
  );

  return result.rows[0] ?? null;
};

export const actualizarEstadoPrograma = async (
  id,
  estado,
  cliente = pool
) => {
  const result = await cliente.query(
    `UPDATE programas_mantenimiento p
     SET estado = $2
     WHERE p.id = $1
     RETURNING ${COLUMNAS_PROGRAMA}`,
    [id, estado]
  );

  return result.rows[0] ?? null;
};

export const existePrograma = async (
  id,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT 1 AS existe
     FROM programas_mantenimiento
     WHERE id = $1`,
    [id]
  );

  return result.rowCount > 0;
};
