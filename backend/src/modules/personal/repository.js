import { pool } from '../../config/database.js';

export const obtenerPersonal = async () => {
  const result = await pool.query(
    `SELECT *
     FROM personal
     ORDER BY nombre_completo ASC`
  );

  return result.rows;
};

export const crearPersonal = async ({
  id_interno,
  nombre_completo,
  dni,
  modalidad,
  area,
  cargo,
  telefono,
  estado
}) => {
  const result = await pool.query(
    `INSERT INTO personal (
       id_interno,
       nombre_completo,
       dni,
       modalidad,
       area,
       cargo,
       telefono,
       estado
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8
     )
     RETURNING *`,
    [
      id_interno,
      nombre_completo,
      dni,
      modalidad,
      area,
      cargo,
      telefono,
      estado || 'Activo'
    ]
  );

  return result.rows[0];
};

export const actualizarPersonal = async (
  id,
  {
    id_interno,
    nombre_completo,
    dni,
    modalidad,
    area,
    cargo,
    telefono,
    estado
  }
) => {
  const result = await pool.query(
    `UPDATE personal
     SET
       id_interno = $1,
       nombre_completo = $2,
       dni = $3,
       modalidad = $4,
       area = $5,
       cargo = $6,
       telefono = $7,
       estado = $8
     WHERE id = $9
     RETURNING *`,
    [
      id_interno,
      nombre_completo,
      dni,
      modalidad,
      area,
      cargo,
      telefono,
      estado,
      id
    ]
  );

  return result.rows[0] || null;
};

export const eliminarPersonal = async id => {
  await pool.query(
    `DELETE FROM personal
     WHERE id = $1`,
    [id]
  );
};