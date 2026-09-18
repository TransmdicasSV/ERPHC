import { pool } from '../../config/database.js';


// ==========================================
// CONTEXTO DEL USUARIO
// ==========================================

export const obtenerUsuarioTicket =
  async userId => {
    const result = await pool.query(
      `SELECT
         u.rol,
         u.estado,
         u.operacion,
         u.persona_id
       FROM usuarios u
       WHERE u.id = $1
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

export const obtenerPersonalTickets =
  async () => {
    const result = await pool.query(
      `SELECT
         id,
         dni,
         nombre_completo,
         operacion
       FROM personal
       WHERE estado = 'Activo'
       ORDER BY nombre_completo ASC`
    );

    return result.rows;
  };

// ==========================================
// VALIDACIONES
// ==========================================

export const obtenerPersonaActivaPorId =
  async personaId => {
    const result = await pool.query(
      `SELECT
         id,
         dni,
         nombre_completo,
         operacion
       FROM personal
       WHERE id = $1
         AND estado = 'Activo'
       LIMIT 1`,
      [personaId]
    );

    return result.rows[0] || null;
  };

// ==========================================
// CREACIÓN
// ==========================================

export const insertarTicket =
  async ({
    placa,
    personaId,
    tipoSolicitud,
    descripcion,
    implemento,
    evidencias
  }) => {
    const result = await pool.query(
      `INSERT INTO tickets_unidades (
         placa,
         persona_id,
         tipo_solicitud,
         descripcion,
         implemento,
         evidencias
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6::jsonb
       )
       RETURNING *`,
      [
        placa,
        personaId,
        tipoSolicitud,
        descripcion,
        implemento,
        JSON.stringify(
          evidencias || []
        )
      ]
    );

    return result.rows[0] || null;
  };

  // ==========================================
// CREACIÓN DE PULSERAS
// ==========================================

export const insertarPulsera =
  async ({
    solicitantePersonaId,
    receptorPersonaId,
    operacion,
    motivoRenovacion,
    evidenciaUrl,
    creadoPor
  }) => {
    const result = await pool.query(
      `INSERT INTO pulseras (
         solicitante_persona_id,
         receptor_persona_id,
         operacion,
         motivo_renovacion,
         evidencia_url,
         creado_por
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6
       )
       RETURNING *`,
      [
        solicitantePersonaId,
        receptorPersonaId,
        operacion,
        motivoRenovacion,
        evidenciaUrl,
        creadoPor
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
      `SELECT
         t.*,
         p.nombre_completo,
         p.dni,
         p.operacion
       FROM tickets_unidades t
       INNER JOIN personal p
         ON p.id = t.persona_id
       WHERE $1::text IS NULL
          OR LOWER(BTRIM(p.operacion)) =
             LOWER(BTRIM($1))
       ORDER BY t.id DESC`,
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
      `SELECT
         t.*,
         p.nombre_completo,
         p.dni,
         p.operacion
       FROM tickets_unidades t
       INNER JOIN personal p
         ON p.id = t.persona_id
       WHERE t.id = $1`,
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
    const result = await pool.query(
      `UPDATE tickets_unidades
       SET
         estado = $1,
         evidencias =
           CASE
             WHEN $2::text IS NULL
               THEN evidencias
             ELSE evidencias ||
                  jsonb_build_array(
                    jsonb_build_object(
                      'tipo',
                      'cierre',
                      'url',
                      $2::text
                    )
                  )
           END
       WHERE id = $3
       RETURNING *`,
      [
        estado,
        evidencia,
        id
      ]
    );

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
      `DELETE FROM tickets_unidades
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] || null;
  };