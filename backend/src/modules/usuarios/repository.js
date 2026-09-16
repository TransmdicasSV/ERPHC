import { pool } from '../../config/database.js';

export const obtenerOperaciones = async () => {
  const result = await pool.query(
    `SELECT MIN(BTRIM(operacion)) AS operacion
     FROM vehiculos
     WHERE operacion IS NOT NULL
       AND LOWER(BTRIM(operacion)) NOT IN (
         '',
         'test',
         'text',
         'null',
         'undefined',
         'sin operacion',
         'sin operación',
         'falta identificar'
       )
     GROUP BY LOWER(BTRIM(operacion))
     ORDER BY operacion ASC`
  );

  return result.rows.map(
    row => row.operacion
  );
};

export const obtenerPersonalAdministrativo =
  async () => {
    const result = await pool.query(
      `SELECT
         id,
         dni,
         nombre_completo
       FROM personal
       WHERE LOWER(
         BTRIM(COALESCE(modalidad, ''))
       ) = 'administrativo'
       ORDER BY nombre_completo`
    );

    return result.rows;
  };

export const obtenerUsuarios = async () => {
  const result = await pool.query(
    `SELECT
       id,
       username,
       rol,
       estado,
       permisos,
       operacion,
       created_at
     FROM usuarios
     ORDER BY id DESC`
  );

  return result.rows;
};

export const crearUsuario = async ({
  username,
  passwordHash,
  rol,
  permisos,
  estado,
  operacion
}) => {
  const result = await pool.query(
    `INSERT INTO usuarios (
       username,
       password_hash,
       rol,
       permisos,
       estado,
       operacion,
       persona_id
     )
     SELECT
       p.dni,
       $2,
       $3,
       $4,
       $5,
       $6,
       p.id
     FROM personal p
     WHERE p.dni = $1
       AND LOWER(
         BTRIM(COALESCE(p.modalidad, ''))
       ) = 'administrativo'
     RETURNING
       id,
       username,
       rol,
       estado,
       operacion,
       permisos,
       persona_id`,
    [
      username,
      passwordHash,
      rol,
      permisos,
      estado,
      operacion
    ] 
  );

  return result.rows[0] || null;
};

export const obtenerUsuarioPorId =
  async id => {
    const result = await pool.query(
      `SELECT
         id,
         username,
         rol,
         estado,
         operacion,
         permisos
       FROM usuarios
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  };

export const actualizarEstadoUsuario =
  async (id, estado) => {
    const result = await pool.query(
      `UPDATE usuarios
       SET estado = $1
       WHERE id = $2
       RETURNING
         id,
         username,
         rol,
         estado,
         operacion,
         permisos`,
      [
        estado,
        id
      ]
    );

    return result.rows[0] || null;
  };