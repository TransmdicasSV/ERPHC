import 'dotenv/config';
import jwt from 'jsonwebtoken';

import { pool } from '../config/database.js';
import { ROLE_PERMISSIONS } from '../config/permissions.js';

export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error(
    'JWT_SECRET debe existir y contener al menos 64 caracteres'
  );
}

export const PUBLIC_ROUTES = [
  {
    method: 'POST',
    pattern: /^\/api\/auth\/login\/?$/
  },
  {
    method: 'POST',
    pattern: /^\/api\/public\/incidentes-soporte\/?$/
  },
  {
    method: 'GET',
    pattern: /^\/api\/public\/stats\/?$/
  },
  {
    method: 'GET',
    pattern: /^\/api\/public\/consulta\/[^/]+\/?$/
  },
  {
    method: 'GET',
    pattern: /^\/uploads\/.+$/
  },
  {
    method: 'HEAD',
    pattern: /^\/uploads\/.+$/
  }
];

export const isPublicRoute = req => {
  return PUBLIC_ROUTES.some(({ method, pattern }) => {
    return (
      req.method === method &&
      pattern.test(req.path)
    );
  });
};

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  const match = authHeader?.match(
    /^Bearer\s+(.+)$/i
  );

  const token = match?.[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token requerido para acceder a este recurso'
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         id,
         username,
         rol,
         estado,
         operacion
       FROM usuarios
       WHERE id = $1`,
      [decoded.id]
    );

    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({
        error: 'El usuario de esta sesión ya no existe'
      });
    }

    const estadoUsuario = String(
      usuario.estado || 'activo'
    )
      .trim()
      .toLowerCase();

    if (estadoUsuario !== 'activo') {
      return res.status(401).json({
        error: 'El usuario se encuentra inactivo'
      });
    }

    const rolOriginal = String(
      usuario.rol || ''
    )
      .trim()
      .toLowerCase();

    const rol = rolOriginal === 'administrador'
      ? 'admin'
      : rolOriginal;

    const permisos = ROLE_PERMISSIONS[rol];

    if (!permisos) {
      return res.status(403).json({
        error: 'El usuario tiene un rol no válido'
      });
    }

    req.user = {
      ...decoded,
      id: usuario.id,
      username: usuario.username,
      rol,
      permisos,
      operacion: usuario.operacion || null
    };

    return next();
  } catch (error) {
    console.error(
      'Error verificando el estado del usuario:',
      error
    );

    return res.status(500).json({
      error: 'Error al verificar la sesión'
    });
  }
};

export const requireAdmin = (req, res, next) => {
  const rol = String(
    req.user?.rol || ''
  ).toLowerCase();

  if (
    rol !== 'admin' &&
    rol !== 'administrador'
  ) {
    return res.status(403).json({
      error:
        'Acceso denegado. Se requiere rol de Administrador.'
    });
  }

  return next();
};

export const requirePermiso = (
  modulos,
  accion
) => {
  return (req, res, next) => {
    const rol = String(
      req.user?.rol || ''
    ).toLowerCase();

    if (
      rol === 'admin' ||
      rol === 'administrador'
    ) {
      return next();
    }

    const listaModulos = Array.isArray(modulos)
      ? modulos
      : [modulos];

    const permitido = listaModulos.some(modulo => {
      return (
        req.user?.permisos?.[modulo]?.[accion] === true
      );
    });

    if (!permitido) {
      return res.status(403).json({
        error:
          'No tienes permiso para acceder a este recurso'
      });
    }

    return next();
  };
};

export const hasPermiso = (
  req,
  modulo,
  accion
) => {
  const rol = String(
    req.user?.rol || ''
  ).toLowerCase();

  if (
    rol === 'admin' ||
    rol === 'administrador'
  ) {
    return true;
  }

  return (
    req.user?.permisos?.[modulo]?.[accion] === true
  );
};

export const getModuloMovimiento = tipoMovimiento => {
  const tipo = String(
    tipoMovimiento || 'Entrega'
  )
    .trim()
    .toLowerCase();

  return (
    tipo === 'devolución' ||
    tipo === 'devolucion'
  )
    ? 'devoluciones'
    : 'entregas';
};