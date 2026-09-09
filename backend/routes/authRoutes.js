import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { pool } from '../src/config/database.js';
import { ROLE_PERMISSIONS } from '../src/config/permissions.js';
import { JWT_SECRET } from '../src/middlewares/auth.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const username = String(
    req.body?.username || ''
  ).trim();

  const password = String(
    req.body?.password || ''
  );

  if (!username || !password) {
    return res.status(400).json({
      error: 'Usuario y contraseña son obligatorios'
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM usuarios
       WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    const estadoUsuario = String(
      user.estado || 'activo'
    )
      .trim()
      .toLowerCase();

    if (estadoUsuario !== 'activo') {
      return res.status(403).json({
        error:
          'Este usuario se encuentra inactivo. Comuníquese con el administrador.'
      });
    }

    const rolOriginal = String(
      user.rol || ''
    )
      .trim()
      .toLowerCase();

    const rol = rolOriginal === 'administrador'
      ? 'admin'
      : rolOriginal;

    const permisos = ROLE_PERMISSIONS[rol];

    if (!permisos) {
      return res.status(403).json({
        error:
          'El usuario tiene un rol antiguo o no válido. Comuníquese con el administrador.'
      });
    }

    const operacion = user.operacion || null;

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        rol,
        permisos,
        operacion
      },
      JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    await logAction(
      user.id,
      'Inicio de sesión exitoso',
      'usuarios',
      req,
      null,
      {
        id: user.id,
        username: user.username,
        rol,
        operacion
      }
    );

    return res.json({
      token,

      user: {
        id: user.id,
        username: user.username,
        rol,
        permisos,
        operacion
      }
    });
  } catch (error) {
    console.error(
      'Error durante el inicio de sesión:',
      error
    );

    return res.status(500).json({
      error: 'Error del servidor'
    });
  }
});

export default router;
