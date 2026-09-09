import { pool } from '../../config/database.js';

// ==========================================
// CONTEXTO DEL USUARIO
// ==========================================

export const obtenerUsuarioTicket =
  async userId => {
    const result = await pool.query(
      `SELECT
         rol,
         estado,
         operacion
       FROM usuarios
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] || null;
  };

// ==========================================
// OPCIONES DE TICKETS
// ==========================================

export const obtenerVehiculosTickets =
  async (
    operacion,
    operacionesInvalidas
  ) => {
    const result = await pool.query(
      `SELECT
         placa,
         BTRIM(operacion) AS operacion
       FROM vehiculos
       WHERE LOWER(
         BTRIM(
           COALESCE(operacion, '')
         )
       ) <> ALL($2::text[])
         AND (
           $1::text IS NULL
           OR LOWER(BTRIM(operacion)) =
              LOWER(BTRIM($1))
         )
       ORDER BY placa ASC`,
      [
        operacion,
        operacionesInvalidas
      ]
    );

    return result.rows;
  };

export const obtenerOperacionesPulsera =
  async operacionesInvalidas => {
    const result = await pool.query(
      `SELECT
         MIN(BTRIM(operacion)) AS operacion
       FROM vehiculos
       WHERE operacion IS NOT NULL
         AND LOWER(BTRIM(operacion))
           <> ALL($1::text[])
       GROUP BY LOWER(BTRIM(operacion))
       ORDER BY operacion ASC`,
      [operacionesInvalidas]
    );

    return result.rows.map(
      row => row.operacion
    );
  };

export const obtenerPersonalPulsera =
  async () => {
    const result = await pool.query(
      `SELECT
         dni,
         nombre_completo
       FROM personal
       WHERE dni IS NOT NULL
         AND BTRIM(dni) <> ''
         AND nombre_completo IS NOT NULL
         AND BTRIM(nombre_completo) <> ''
         AND (
           estado IS NULL
           OR LOWER(BTRIM(estado)) = 'activo'
         )
       ORDER BY nombre_completo ASC`
    );

    return result.rows;
  };

// ==========================================
// VALIDACIONES DE PULSERA
// ==========================================

export const obtenerPersonaActivaPorDni =
  async dni => {
    const result = await pool.query(
      `SELECT
         dni,
         nombre_completo
       FROM personal
       WHERE dni = $1
         AND (
           estado IS NULL
           OR LOWER(BTRIM(estado)) = 'activo'
         )
       LIMIT 1`,
      [dni]
    );

    return result.rows[0] || null;
  };

export const existeOperacionTicket =
  async (
    operacion,
    operacionesInvalidas
  ) => {
    const result = await pool.query(
      `SELECT 1
       FROM vehiculos
       WHERE LOWER(BTRIM(operacion)) =
             LOWER(BTRIM($1))
         AND LOWER(BTRIM(operacion))
             <> ALL($2::text[])
       LIMIT 1`,
      [
        operacion,
        operacionesInvalidas
      ]
    );

    return result.rows.length > 0;
  };

// ==========================================
// CREACIÓN
// ==========================================

export const insertarTicket =
  async ({
    placa,
    tipoSolicitud,
    descripcion,
    operador,
    categoria,
    prioridad,
    operacionContexto,
    operacionSinPlaca,
    operacionesInvalidas,
    implemento,
    evidenciasIniciales,
    personaPulsera,
    dniPulsera,
    motivoRenovacion,
    esReportePulsera
  }) => {
    const result = await pool.query(
      `WITH destino AS (
         SELECT
           v.placa,
           BTRIM(v.operacion) AS operacion
         FROM vehiculos v
         WHERE v.placa = $1
           AND (
             $7::text IS NULL
             OR LOWER(BTRIM(v.operacion)) =
                LOWER(BTRIM($7))
           )

         UNION ALL

         SELECT
           NULL::varchar,
           $8::text
         WHERE $1::text IS NULL
           AND (
             $15::boolean = TRUE
             OR $7::text IS NOT NULL
             OR EXISTS (
               SELECT 1
               FROM vehiculos
               WHERE LOWER(BTRIM(operacion)) =
                     LOWER(BTRIM($8))
             )
           )
       )

       INSERT INTO incidentes_soporte (
         placa,
         tipo_solicitud,
         descripcion,
         operador,
         categoria,
         prioridad,
         operacion,
         implemento,
         evidencias_iniciales,
         persona_pulsera,
         dni_persona_pulsera,
         motivo_renovacion
       )

       SELECT
         placa,
         $2,
         $3,
         $4,
         $5,
         $6,
         operacion,
         $10,
         $11::jsonb,
         $12,
         $13,
         $14
       FROM destino
       WHERE LOWER(
         BTRIM(
           COALESCE(operacion, '')
         )
       ) <> ALL($9::text[])
       RETURNING *`,
      [
        placa,
        tipoSolicitud,
        descripcion,
        operador,
        categoria,
        prioridad,
        operacionContexto,
        operacionSinPlaca,
        operacionesInvalidas,
        implemento,
        JSON.stringify(
          evidenciasIniciales
        ),
        personaPulsera,
        dniPulsera,
        motivoRenovacion,
        esReportePulsera
      ]
    );

    return result.rows[0] || null;
  };

// ==========================================
// LISTADO
// ==========================================

export const obtenerTickets =
  async operacion => {
    const result = await pool.query(
      `SELECT *
       FROM incidentes_soporte
       WHERE $1::text IS NULL
          OR LOWER(BTRIM(operacion)) =
             LOWER(BTRIM($1))
       ORDER BY id DESC`,
      [operacion]
    );

    return result.rows;
  };

// ==========================================
// ACTUALIZACIÓN
// ==========================================

export const obtenerTicketPorId =
  async id => {
    const result = await pool.query(
      `SELECT *
       FROM incidentes_soporte
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  };

export const actualizarEstadoTicket =
  async ({
    id,
    estado,
    evidencia
  }) => {
    let result;

    if (evidencia) {
      result = await pool.query(
        `UPDATE incidentes_soporte
         SET estado = $1,
             evidencia = $2
         WHERE id = $3
         RETURNING *`,
        [
          estado,
          evidencia,
          id
        ]
      );
    } else {
      result = await pool.query(
        `UPDATE incidentes_soporte
         SET estado = $1
         WHERE id = $2
         RETURNING *`,
        [
          estado,
          id
        ]
      );
    }

    return result.rows[0] || null;
  };

// ==========================================
// INSPECCIÓN RELACIONADA
// ==========================================

export const obtenerUltimaInspeccion =
  async placa => {
    const result = await pool.query(
      `SELECT *,
              fecha::text AS fecha
       FROM inspecciones_flota
       WHERE placa = $1
       ORDER BY id DESC
       LIMIT 1`,
      [placa]
    );

    return result.rows[0] || null;
  };

export const actualizarInspeccionTicket =
  async ({
    id,
    tablet,
    radio,
    camaras,
    observaciones
  }) => {
    const result = await pool.query(
      `UPDATE inspecciones_flota
       SET tablet = $1,
           radio = $2,
           camaras = $3,
           observaciones = $4
       WHERE id = $5
       RETURNING *,
                 fecha::text AS fecha`,
      [
        tablet,
        radio,
        camaras,
        observaciones,
        id
      ]
    );

    return result.rows[0] || null;
  };

// ==========================================
// ELIMINACIÓN
// ==========================================

export const eliminarTicketPorId =
  async id => {
    const result = await pool.query(
      `DELETE FROM incidentes_soporte
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] || null;
  };