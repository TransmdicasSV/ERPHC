import express from 'express';
import bcrypt from 'bcryptjs';

import { pool } from '../src/config/database.js';
import { ROLE_PERMISSIONS } from '../src/config/permissions.js';
import { requireAdmin } from '../src/middlewares/auth.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/operaciones', async (req, res) => {
  try {
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

    return res.json(
      result.rows.map(row => row.operacion)
    );
  } catch (error) {
    console.error(
      'Error obteniendo operaciones:',
      error
    );

    return res.status(500).json({
      error: 'Error al obtener operaciones'
    });
  }
});

router.get(
  '/personal-administrativo',
  async (req, res) => {
    try {
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

      return res.json(result.rows);
    } catch (error) {
      console.error(
        'Error cargando personal administrativo:',
        error
      );

      return res.status(500).json({
        error:
          'Error al cargar personal administrativo'
      });
    }
  }
);

router.get('/', async (req, res) => {
  try {
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

    return res.json(result.rows);
  } catch (error) {
    console.error(
      'Error obteniendo usuarios:',
      error
    );

    return res.status(500).json({
      error: 'Error al obtener usuarios'
    });
  }
});

router.post('/', async (req, res) => {
  const {
    username,
    password,
    rol,
    estado,
    operacion
  } = req.body || {};

  const usernameFinal = String(
    username || ''
  ).trim();

  if (
    !usernameFinal ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios'
    });
  }

  const rolFinal = String(
    rol || 'supervisor'
  )
    .trim()
    .toLowerCase();

  if (
    !['admin', 'supervisor', 'ti'].includes(
      rolFinal
    )
  ) {
    return res.status(400).json({
      error: 'Rol no válido'
    });
  }

  const estadoFinal = String(
    estado || 'activo'
  )
    .trim()
    .toLowerCase();

  if (
    !['activo', 'inactivo'].includes(
      estadoFinal
    )
  ) {
    return res.status(400).json({
      error: 'Estado de usuario no válido'
    });
  }

  const operacionFinal =
    rolFinal === 'supervisor'
      ? String(operacion || '').trim()
      : null;

  if (
    rolFinal === 'supervisor' &&
    !operacionFinal
  ) {
    return res.status(400).json({
      error:
        'Debe asignar una operación al supervisor'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const result = await pool.query(
      `INSERT INTO usuarios (
         username,
         password_hash,
         rol,
         permisos,
         estado,
         operacion
       )
       SELECT
         p.dni,
         $2,
         $3,
         $4,
         $5,
         $6
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
         permisos`,
      [
        usernameFinal,
        passwordHash,
        rolFinal,
        ROLE_PERMISSIONS[rolFinal],
        estadoFinal,
        operacionFinal
      ]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        error:
          'Seleccione un trabajador con modalidad de contrato Administrativo'
      });
    }

    const usuarioCreado = result.rows[0];

    await logAction(
      req.user.id,
      `Usuario creado: ${usernameFinal}`,
      'usuarios',
      req,
      null,
      usuarioCreado
    );

    return res.status(201).json({
      success: true,
      id: usuarioCreado.id,
      usuario: usuarioCreado
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'El usuario ya existe'
      });
    }

    console.error(
      'Error creando usuario:',
      error
    );

    return res.status(500).json({
      error: 'Error al crear usuario'
    });
  }
});

router.patch('/:id/estado', async (req, res) => {
  const id = Number.parseInt(
    req.params.id,
    10
  );

  const estado = String(
    req.body?.estado || ''
  )
    .trim()
    .toLowerCase();

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      error: 'ID de usuario no válido'
    });
  }

  if (
    !['activo', 'inactivo'].includes(estado)
  ) {
    return res.status(400).json({
      error:
        'El estado debe ser activo o inactivo'
    });
  }

  if (
    id === Number(req.user.id) &&
    estado === 'inactivo'
  ) {
    return res.status(400).json({
      error:
        'No puedes desactivar tu propio usuario'
    });
  }

  try {
    const anteriorResult = await pool.query(
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

    if (!anteriorResult.rows.length) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const valoresAnteriores =
      anteriorResult.rows[0];

    const resultado = await pool.query(
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
      [estado, id]
    );

    const valoresActuales = resultado.rows[0];

    await logAction(
      req.user.id,
      `Usuario ${valoresActuales.username} cambiado a ${estado}`,
      'usuarios',
      req,
      valoresAnteriores,
      valoresActuales
    );

    return res.json({
      success: true,
      usuario: valoresActuales
    });
  } catch (error) {
    console.error(
      'Error actualizando usuario:',
      error
    );

    return res.status(500).json({
      error:
        'Error al cambiar el estado del usuario'
    });
  }
});

export default router;
