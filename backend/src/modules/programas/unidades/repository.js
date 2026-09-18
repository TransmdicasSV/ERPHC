import { pool } from '../../../config/database.js';

import {
  CAMPOS_EDITABLES
} from './service.js';

// Las fechas se devuelven como texto para que el driver no las convierta a Date
// y termine desplazando un día por zona horaria.
const COLUMNAS_UNIDAD = `
  u.id,
  u.programa_id,
  u.placa,
  u.fecha_base_m1::text AS fecha_base_m1,
  u.fecha_base_m2::text AS fecha_base_m2,
  u.fecha_base_m3::text AS fecha_base_m3,
  u.quincena_arranque::text AS quincena_arranque,
  u.observaciones,
  u.created_at,
  u.updated_at`;

// Datos del vehículo por JOIN: no se duplican en programa_mantenimiento_unidades.
// Solo columnas que existen hoy en vehiculos.
const COLUMNAS_VEHICULO = `
  v.operacion,
  v.cliente,
  v.tipo_vehiculo,
  v.marca_tracto,
  v.modelo_tracto,
  v.anio_fabricacion::text AS anio_fabricacion`;

export const obtenerUnidadesPorPrograma = async (
  programaId,
  { placa = null } = {}
) => {
  const result = await pool.query(
    `SELECT ${COLUMNAS_UNIDAD},
            ${COLUMNAS_VEHICULO}
     FROM programa_mantenimiento_unidades u
     JOIN vehiculos v
       ON v.placa = u.placa
     WHERE u.programa_id = $1
       AND ($2::text IS NULL OR u.placa = $2)
     ORDER BY u.placa ASC`,
    [programaId, placa]
  );

  return result.rows;
};

export const obtenerUnidadPorId = async (
  programaId,
  id
) => {
  const result = await pool.query(
    `SELECT ${COLUMNAS_UNIDAD},
            ${COLUMNAS_VEHICULO}
     FROM programa_mantenimiento_unidades u
     JOIN vehiculos v
       ON v.placa = u.placa
     WHERE u.id = $1
       AND u.programa_id = $2`,
    [id, programaId]
  );

  return result.rows[0] || null;
};

export const obtenerUnidadPorPlaca = async (
  programaId,
  placa
) => {
  const result = await pool.query(
    `SELECT ${COLUMNAS_UNIDAD}
     FROM programa_mantenimiento_unidades u
     WHERE u.programa_id = $1
       AND u.placa = $2`,
    [programaId, placa]
  );

  return result.rows[0] || null;
};

export const existeVehiculo = async placa => {
  const result = await pool.query(
    `SELECT 1
     FROM vehiculos
     WHERE placa = $1`,
    [placa]
  );

  return result.rowCount > 0;
};

export const insertarUnidad = async ({
  programa_id,
  placa,
  fecha_base_m1,
  fecha_base_m2,
  fecha_base_m3,
  quincena_arranque,
  observaciones
}) => {
  const result = await pool.query(
    `INSERT INTO programa_mantenimiento_unidades (
       programa_id,
       placa,
       fecha_base_m1,
       fecha_base_m2,
       fecha_base_m3,
       quincena_arranque,
       observaciones
     )
     VALUES (
       $1,
       $2,
       $3::date,
       $4::date,
       $5::date,
       $6::date,
       $7
     )
     RETURNING id`,
    [
      programa_id,
      placa,
      fecha_base_m1,
      fecha_base_m2,
      fecha_base_m3,
      quincena_arranque,
      observaciones
    ]
  );

  return obtenerUnidadPorId(
    programa_id,
    result.rows[0].id
  );
};

export const actualizarUnidad = async (
  programaId,
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
        campo === 'observaciones'
          ? `${campo} = $${indice + 1}`
          : `${campo} = $${indice + 1}::date`
    )
    .join(', ');

  const valores = permitidos.map(
    campo => data[campo]
  );

  valores.push(id, programaId);

  const result = await pool.query(
    `UPDATE programa_mantenimiento_unidades
     SET ${cambios}
     WHERE id = $${valores.length - 1}
       AND programa_id = $${valores.length}
     RETURNING id`,
    valores
  );

  if (!result.rows[0]) {
    return null;
  }

  return obtenerUnidadPorId(
    programaId,
    result.rows[0].id
  );
};
