import { pool } from '../../config/database.js';

import {
  CAMPOS_EDITABLES
} from './service.js';

// Las fechas se devuelven como texto para evitar desplazamientos de zona horaria.
const COLUMNAS = `
  id,
  codigo,
  nombre,
  periodo_inicio::text AS periodo_inicio,
  periodo_fin::text AS periodo_fin,
  version,
  fecha_documento::text AS fecha_documento,
  frecuencia_m1_dias,
  frecuencia_m2_dias,
  frecuencia_m3_dias,
  estado,
  created_at,
  updated_at`;

export const obtenerProgramas = async ({
  estado = null
} = {}) => {
  const result = await pool.query(
    `SELECT ${COLUMNAS}
     FROM programas_mantenimiento
     WHERE $1::text IS NULL
        OR estado = $1
     ORDER BY periodo_inicio DESC,
              codigo ASC,
              version ASC`,
    [estado]
  );

  return result.rows;
};

export const obtenerProgramaPorId =
  async id => {
    const result = await pool.query(
      `SELECT ${COLUMNAS}
       FROM programas_mantenimiento
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  };

export const insertarPrograma = async ({
  codigo,
  nombre,
  periodo_inicio,
  periodo_fin,
  version,
  fecha_documento,
  frecuencia_m1_dias,
  frecuencia_m2_dias,
  frecuencia_m3_dias,
  estado
}) => {
  const result = await pool.query(
    `INSERT INTO programas_mantenimiento (
       codigo,
       nombre,
       periodo_inicio,
       periodo_fin,
       version,
       fecha_documento,
       frecuencia_m1_dias,
       frecuencia_m2_dias,
       frecuencia_m3_dias,
       estado
     )
     VALUES (
       $1,
       $2,
       $3::date,
       $4::date,
       $5,
       $6::date,
       $7,
       $8,
       $9,
       $10
     )
     RETURNING ${COLUMNAS}`,
    [
      codigo,
      nombre,
      periodo_inicio,
      periodo_fin,
      version,
      fecha_documento,
      frecuencia_m1_dias,
      frecuencia_m2_dias,
      frecuencia_m3_dias,
      estado
    ]
  );

  return result.rows[0];
};

export const actualizarPrograma = async (
  id,
  campos,
  data
) => {
  // Solo se aceptan nombres de columna de la lista blanca del servicio:
  // nunca se arma SQL con claves recibidas del cliente.
  const permitidos = campos.filter(
    campo =>
      CAMPOS_EDITABLES.includes(campo)
  );

  if (!permitidos.length) {
    return null;
  }

  const cambios = permitidos
    .map(
      (campo, indice) =>
        `${campo} = $${indice + 1}`
    )
    .join(', ');

  const valores = permitidos.map(
    campo => data[campo]
  );

  valores.push(id);

  const result = await pool.query(
    `UPDATE programas_mantenimiento
     SET ${cambios}
     WHERE id = $${valores.length}
     RETURNING ${COLUMNAS}`,
    valores
  );

  return result.rows[0] || null;
};

export const actualizarEstadoPrograma =
  async (id, estado) => {
    const result = await pool.query(
      `UPDATE programas_mantenimiento
       SET estado = $1
       WHERE id = $2
       RETURNING ${COLUMNAS}`,
      [estado, id]
    );

    return result.rows[0] || null;
  };
