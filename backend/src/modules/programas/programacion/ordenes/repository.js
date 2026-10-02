import { pool } from '../../../../config/database.js';

// ==========================================
// ORDENES DE TRABAJO (TI-PR-01)
// SQL contra el modelo 013-016. Parametrizado, columnas explícitas.
// ==========================================
//
// Sin lógica de negocio y sin HTTP: aquí solo se consulta y se escribe.
//
// NO SE EXPONE NI SE ESCRIBE NINGUNA COLUMNA QUE RETIREN 20261001_900 NI 901. La OT no
// tiene ninguna; las que se leen de otras tablas son las que sobreviven. En particular
// `nivel_programado` sale de programacion_mantenimiento_equipos.nivel_mantenimiento, que es
// justo donde 900 deja el nivel -«El nivel pasa al detalle por equipo»-, no de la columna
// homónima de la cabecera de la visita, que 900 elimina.
//
// ordenes_trabajo NO tiene programa_id: la pertenencia al programa se comprueba SIEMPRE
// uniendo contra programacion_mantenimiento, nunca confiando en el parámetro de la ruta.
//
// NO HAY NINGUN DELETE EN ESTE ARCHIVO. La regla R1 de 20260928_016 prohíbe borrar una OT
// en cualquier estado, y el borrado de un detalle lo bloquea su trigger: una OT creada por
// error se anula, y eso es trabajo de la etapa 4.3.
//
// Cada función acepta un cliente opcional para poder correr dentro de una transacción.

// Las 14 columnas reales de la cabecera. Fechas con sello horario: se devuelven tal cual.
const COLUMNAS = `
  o.id,
  o.programacion_id,
  o.tecnico_id,
  o.abierta_por_id,
  o.cerrada_por_id,
  o.fecha_apertura,
  o.fecha_cierre,
  o.estado,
  o.motivo_anulacion,
  o.minutos,
  o.evidencias,
  o.observaciones,
  o.created_at,
  o.updated_at`;

// La unidad viaja con la OT porque es lo que un operador necesita para identificarla.
const UNIDAD = `
  p.programa_unidad_id,
  u.placa,
  p.quincena_efectiva::text AS quincena_efectiva`;

// ------------------------------------------------------------------------------------
// APERTURA
// ------------------------------------------------------------------------------------

// FOR UPDATE OF p: bloquea la fila de la VISITA, y solo esa, hasta el final de la
// transacción. No es un adorno. El índice uq_ot_programacion_activa ya serializa dos
// aperturas simultáneas, pero no protege frente a que otra transacción reprograme, cancele
// o promueva la visita entre el momento en que se comprueba su estado y el INSERT de la OT.
// Medido en la etapa 4.0: sin este cerrojo las dos operaciones no se serializan.
//
// `OF p` evita bloquear además la fila de la unidad, que nadie va a cambiar aquí.
export const obtenerProgramacionParaApertura = async (
  programaId,
  programacionId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT p.id,
            p.programa_id,
            p.programa_unidad_id,
            p.estado,
            p.quincena_programada::text   AS quincena_programada,
            p.quincena_reprogramada::text AS quincena_reprogramada,
            p.quincena_efectiva::text     AS quincena_efectiva,
            u.placa
       FROM programacion_mantenimiento p
       JOIN programa_mantenimiento_unidades u ON u.id = p.programa_unidad_id
      WHERE p.programa_id = $1
        AND p.id = $2
      FOR UPDATE OF p`,
    [programaId, programacionId]
  );

  return result.rows[0] ?? null;
};

// El alcance previsto es la fuente de verdad de lo que la OT tendrá que resolver. Una
// visita sin previstos no es ejecutable y su OT no podría cerrarse nunca.
export const contarEquiposPrevistos = async (
  programacionId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT count(*)::int AS total
       FROM programacion_mantenimiento_equipos
      WHERE programacion_id = $1`,
    [programacionId]
  );

  return result.rows[0].total;
};

// Espejo de uq_ot_programacion_activa, para contestar un 409 legible en vez de dejar que la
// base responda con un 23505. El índice sigue siendo la defensa estructural final.
export const contarOrdenesActivas = async (
  programacionId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT count(*)::int AS total
       FROM ordenes_trabajo
      WHERE programacion_id = $1
        AND estado <> 'ANULADA'`,
    [programacionId]
  );

  return result.rows[0].total;
};

// estado no se escribe: nace ABIERTA por defecto y validar_apertura_ot exige que sea así.
// fecha_apertura, evidencias, created_at y updated_at los pone la base.
export const insertarOrden = async (
  programacionId,
  tecnicoId,
  abiertaPorId,
  cliente = pool
) => {
  const result = await cliente.query(
    `INSERT INTO ordenes_trabajo (
       programacion_id,
       tecnico_id,
       abierta_por_id
     )
     VALUES ($1, $2, $3)
     RETURNING id`,
    [programacionId, tecnicoId, abiertaPorId]
  );

  return result.rows[0].id;
};

// UNA sola sentencia, no un bucle: el conjunto de detalles es exactamente el de los equipos
// previstos, y así la correspondencia 1:1 la garantiza la propia consulta.
//
// nivel_completado va NULL y estado PENDIENTE porque nada se ha ejecutado todavía:
// chk_otd_presencia exige justamente esa combinación. evidencias no se menciona para que
// aplique su DEFAULT '[]'::jsonb y no haya dos sitios que definan el valor inicial.
//
// programacion_id se copia del previsto, no del parámetro: así las dos FK compuestas de la
// tabla quedan pinchadas por el mismo valor y un detalle no puede apuntar al equipo
// previsto de otra visita.
export const materializarDetalles = async (
  otId,
  programacionId,
  cliente = pool
) => {
  const result = await cliente.query(
    `INSERT INTO ordenes_trabajo_detalle (
       orden_trabajo_id,
       programacion_id,
       programacion_equipo_id,
       nivel_completado,
       estado
     )
     SELECT $1,
            e.programacion_id,
            e.id,
            NULL,
            'PENDIENTE'
       FROM programacion_mantenimiento_equipos e
      WHERE e.programacion_id = $2`,
    [otId, programacionId]
  );

  return result.rowCount;
};

// ------------------------------------------------------------------------------------
// LECTURA
// ------------------------------------------------------------------------------------

// Solo para distinguir un 404 de un listado vacío: si la visita no existe en ese programa
// es 404; si existe y no tiene ninguna OT, es un listado vacío. No toma cerrojo, porque no
// decide nada: la apertura usa obtenerProgramacionParaApertura, que sí bloquea.
export const existeVisitaEnPrograma = async (
  programaId,
  programacionId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT 1 AS existe
       FROM programacion_mantenimiento p
      WHERE p.programa_id = $1
        AND p.id = $2`,
    [programaId, programacionId]
  );

  return result.rowCount > 0;
};

// Histórico completo, anuladas incluidas. El orden pone primero la más reciente; el id
// desempata para que dos aperturas del mismo instante tengan un orden estable.
export const obtenerOrdenes = async (
  programaId,
  programacionId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS},
            ${UNIDAD}
       FROM ordenes_trabajo o
       JOIN programacion_mantenimiento p
         ON p.id = o.programacion_id
       JOIN programa_mantenimiento_unidades u
         ON u.id = p.programa_unidad_id
      WHERE p.programa_id = $1
        AND o.programacion_id = $2
      ORDER BY o.fecha_apertura DESC, o.id DESC`,
    [programaId, programacionId]
  );

  return result.rows;
};

// Las tres condiciones van juntas en el WHERE: una OT de otro programa o de otra visita no
// se filtra, simplemente no existe para esta ruta.
export const obtenerOrdenPorId = async (
  programaId,
  programacionId,
  otId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS},
            ${UNIDAD}
       FROM ordenes_trabajo o
       JOIN programacion_mantenimiento p
         ON p.id = o.programacion_id
       JOIN programa_mantenimiento_unidades u
         ON u.id = p.programa_unidad_id
      WHERE p.programa_id = $1
        AND o.programacion_id = $2
        AND o.id = $3`,
    [programaId, programacionId, otId]
  );

  return result.rows[0] ?? null;
};

// ------------------------------------------------------------------------------------
// ESCRITURA (etapa 4.2)
// ------------------------------------------------------------------------------------

// EL CERROJO DE TODA OPERACION DE ESCRITURA SOBRE LA OT Y SUS DETALLES.
//
// Se bloquea la CABECERA, y se bloquea PRIMERO. cerrar_orden_trabajo() hace exactamente lo
// mismo -SELECT ... FROM ordenes_trabajo WHERE id = ... FOR UPDATE como su paso 1-, asi que
// los dos flujos adquieren los cerrojos en el MISMO orden: cabecera y despues detalle.
// Invertirlo -tomar el detalle primero- crearia ordenes de bloqueo opuestos y con ellos la
// posibilidad de un interbloqueo.
//
// Y cierra el hueco medido en la etapa 4.0: sin este cerrojo, un detalle podia modificarse
// mientras otra transaccion estaba cerrando la OT, porque el trigger del detalle lee la
// cabecera SIN bloquearla.
//
// Las tres condiciones van juntas: una OT de otra visita o de otro programa no existe para
// esta ruta.
export const obtenerOrdenParaEscritura = async (
  programaId,
  programacionId,
  otId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT ${COLUMNAS},
            ${UNIDAD}
       FROM ordenes_trabajo o
       JOIN programacion_mantenimiento p
         ON p.id = o.programacion_id
       JOIN programa_mantenimiento_unidades u
         ON u.id = p.programa_unidad_id
      WHERE p.programa_id = $1
        AND o.programacion_id = $2
        AND o.id = $3
      FOR UPDATE OF o`,
    [programaId, programacionId, otId]
  );

  return result.rows[0] ?? null;
};

// Un detalle concreto de una OT concreta, con lo previsto por JOIN. tipo_equipo y
// nivel_programado son del equipo previsto: el detalle no los duplica.
export const obtenerDetalleDeOrden = async (
  otId,
  detalleId,
  cliente = pool
) => {
  const result = await cliente.query(
    `SELECT d.id,
            d.orden_trabajo_id,
            d.programacion_id,
            d.programacion_equipo_id,
            e.tipo_equipo,
            e.nivel_mantenimiento AS nivel_programado,
            d.estado,
            d.nivel_completado,
            d.observaciones,
            d.evidencias,
            d.created_at,
            d.updated_at
       FROM ordenes_trabajo_detalle d
       JOIN programacion_mantenimiento_equipos e
         ON e.id = d.programacion_equipo_id
      WHERE d.orden_trabajo_id = $1
        AND d.id = $2`,
    [otId, detalleId]
  );

  return result.rows[0] ?? null;
};

// La comparacion de evidencias la hace PostgreSQL, no JavaScript: jsonb normaliza el orden
// de las claves y la forma de los numeros, asi que es la unica manera exacta de saber si el
// payload es realmente igual a lo guardado. Un JSON.stringify daria falsos negativos.
const sonIgualesLasEvidencias = async (
  tabla,
  id,
  evidencias,
  cliente
) => {
  const result = await cliente.query(
    `SELECT (t.evidencias = $2::jsonb) AS iguales
       FROM ${tabla} t
      WHERE t.id = $1`,
    [id, JSON.stringify(evidencias)]
  );

  return result.rows[0]?.iguales === true;
};

// Dos funciones y no una con el nombre de tabla por parametro: el identificador nunca sale
// de este archivo, asi que no hay forma de que llegue uno de fuera.
export const evidenciasIgualesEnOrden = (
  otId,
  evidencias,
  cliente = pool
) => sonIgualesLasEvidencias(
  'ordenes_trabajo',
  otId,
  evidencias,
  cliente
);

export const evidenciasIgualesEnDetalle = (
  detalleId,
  evidencias,
  cliente = pool
) => sonIgualesLasEvidencias(
  'ordenes_trabajo_detalle',
  detalleId,
  evidencias,
  cliente
);

// Lista blanca con su cast, igual que actualizarUnidad: campos ya viene filtrada por el
// service y aqui se vuelve a restringir, de modo que ningun nombre llega a la sentencia sin
// pasar por ella. estado de la OT, fechas y usuarios no estan: no son editables.
const asignacionesDe = (
  campos,
  data,
  permitidos
) => {
  const asignaciones = [];
  const valores = [];

  for (const campo of campos) {
    const permitido = permitidos[campo];

    if (!permitido) {
      continue;
    }

    valores.push(
      permitido.cast === '::jsonb'
        ? JSON.stringify(data[campo])
        : data[campo]
    );

    asignaciones.push(
      `${campo} = $${valores.length}${permitido.cast}`
    );
  }

  return { asignaciones, valores };
};

const PERMITIDOS_CABECERA = {
  tecnico_id: { cast: '::int' },
  minutos: { cast: '::int' },
  observaciones: { cast: '' },
  evidencias: { cast: '::jsonb' }
};

const PERMITIDOS_DETALLE = {
  estado: { cast: '' },
  nivel_completado: { cast: '' },
  observaciones: { cast: '' },
  evidencias: { cast: '::jsonb' }
};

// La guarda de estado va en el propio WHERE: con el cerrojo de la cabecera ya tomado no
// deberia poder cambiar, pero asi la escritura y su permiso son la misma operacion.
export const actualizarOrden = async (
  otId,
  campos,
  data,
  cliente = pool
) => {
  const {
    asignaciones,
    valores
  } = asignacionesDe(campos, data, PERMITIDOS_CABECERA);

  if (asignaciones.length === 0) {
    return 0;
  }

  const result = await cliente.query(
    `UPDATE ordenes_trabajo
        SET ${asignaciones.join(', ')}
      WHERE id = $${valores.length + 1}
        AND estado = 'ABIERTA'
      RETURNING id`,
    [...valores, otId]
  );

  return result.rowCount;
};

export const actualizarDetalle = async (
  detalleId,
  campos,
  data,
  cliente = pool
) => {
  const {
    asignaciones,
    valores
  } = asignacionesDe(campos, data, PERMITIDOS_DETALLE);

  if (asignaciones.length === 0) {
    return 0;
  }

  const result = await cliente.query(
    `UPDATE ordenes_trabajo_detalle d
        SET ${asignaciones.join(', ')}
      WHERE d.id = $${valores.length + 1}
        AND EXISTS (
          SELECT 1
            FROM ordenes_trabajo o
           WHERE o.id = d.orden_trabajo_id
             AND o.estado = 'ABIERTA'
        )
      RETURNING d.id`,
    [...valores, detalleId]
  );

  return result.rowCount;
};

// SIN N+1: los detalles de TODAS las OT pedidas en una sola consulta, agrupados en memoria.
//
// tipo_equipo y nivel_programado se obtienen por JOIN contra el equipo previsto, que es la
// única fuente de verdad de lo previsto. ordenes_trabajo_detalle no los duplica a propósito.
export const obtenerDetallesDeOrdenes = async (
  otIds,
  cliente = pool
) => {
  if (otIds.length === 0) {
    return new Map();
  }

  const result = await cliente.query(
    `SELECT d.id,
            d.orden_trabajo_id,
            d.programacion_equipo_id,
            e.tipo_equipo,
            e.nivel_mantenimiento AS nivel_programado,
            d.estado,
            d.nivel_completado,
            d.observaciones,
            d.evidencias,
            d.created_at,
            d.updated_at
       FROM ordenes_trabajo_detalle d
       JOIN programacion_mantenimiento_equipos e
         ON e.id = d.programacion_equipo_id
      WHERE d.orden_trabajo_id = ANY($1::int[])
      ORDER BY d.orden_trabajo_id ASC, e.tipo_equipo ASC`,
    [otIds]
  );

  const porOrden = new Map(
    otIds.map(id => [id, []])
  );

  for (const detalle of result.rows) {
    porOrden
      .get(detalle.orden_trabajo_id)
      .push(detalle);
  }

  return porOrden;
};
