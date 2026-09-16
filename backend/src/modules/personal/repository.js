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
  nombre_completo,
  dni,
  modalidad,
  area,
  cargo,
  estado
}) => {
  const result = await pool.query(
    `INSERT INTO personal (
       nombre_completo,
       dni,
       modalidad,
       area,
       cargo,
       estado
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
      nombre_completo,
      dni,
      modalidad,
      area,
      cargo,
      estado || 'Activo'
    ]
  );

  return result.rows[0];
};
   

export const actualizarPersonal = async (
  id,
  {
    nombre_completo,
    dni,
    modalidad,
    area,
    cargo,
    estado
  }
) => {
  const result = await pool.query(
    `UPDATE personal
     SET
       nombre_completo = $1,
       dni = $2,
       modalidad = $3,
       area = $4,
       cargo = $5,
       estado = $6
     WHERE id = $7
     RETURNING *`,
    [
      nombre_completo,
      dni,
      modalidad,
      area,
      cargo,
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