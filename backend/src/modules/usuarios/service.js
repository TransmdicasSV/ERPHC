import bcrypt from 'bcryptjs';

import {
  ROLE_PERMISSIONS
} from '../../config/permissions.js';

import {
  crearUsuario,
  obtenerUsuarioPorId,
  actualizarEstadoUsuario,
  actualizarUsuarioPorId
} from './repository.js';

export class UsuarioValidationError extends Error {
  constructor(message, status = 400) {
    super(message);

    this.name =
      'UsuarioValidationError';

    this.status = status;
  }
}
const validarNuevaPassword = password => {
  if (typeof password !== 'string') {
    throw new UsuarioValidationError(
      'La contraseña debe ser un texto'
    );
  }

  if (!password.trim()) {
    throw new UsuarioValidationError(
      'La contraseña no puede contener solo espacios'
    );
  }

  if ([...password].length < 15) {
    throw new UsuarioValidationError(
      'La contraseña debe tener al menos 15 caracteres'
    );
  }

  if (bcrypt.truncates(password)) {
    throw new UsuarioValidationError(
      'La contraseña supera el límite de 72 bytes; usa una más corta'
    );
  }
};

export const prepararNuevoUsuario =
  async datos => {
    const {
      username,
      password,
      rol,
      estado,
      operacion
    } = datos || {};

    const usernameFinal = String(
      username || ''
    ).trim();

    if (
      !usernameFinal ||
      typeof password !== 'string' ||
      !password
    ) {
      throw new UsuarioValidationError(
        'Faltan campos obligatorios'
      );
    }

    const rolFinal = String(
      rol || 'supervisor'
    )
      .trim()
      .toLowerCase();

    if (
      ![
        'admin',
        'supervisor',
        'ti'
      ].includes(rolFinal)
    ) {
      throw new UsuarioValidationError(
        'Rol no válido'
      );
    }

    const estadoFinal = String(
      estado || 'activo'
    )
      .trim()
      .toLowerCase();

    if (
      ![
        'activo',
        'inactivo'
      ].includes(estadoFinal)
    ) {
      throw new UsuarioValidationError(
        'Estado de usuario no válido'
      );
    }

    const operacionFinal =
      rolFinal === 'supervisor'
        ? String(
          operacion || ''
        ).trim()
        : null;

    if (
      rolFinal === 'supervisor' &&
      !operacionFinal
    ) {
      throw new UsuarioValidationError(
        'Debe asignar una operación al supervisor'
      );
    }

    validarNuevaPassword(password);

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    const usuarioCreado =
      await crearUsuario({
        username: usernameFinal,
        passwordHash,
        rol: rolFinal,
        permisos:
          ROLE_PERMISSIONS[
          rolFinal
          ],
        estado: estadoFinal,
        operacion:
          operacionFinal
      });

    if (!usuarioCreado) {
      throw new UsuarioValidationError(
        'Seleccione un trabajador con modalidad de contrato Administrativo'
      );
    }

    return {
      usernameFinal,
      usuarioCreado
    };
  };
export const actualizarUsuarioCompleto =
  async ({
    id,
    datos,
    usuarioActualId
  }) => {
    const idFinal =
      Number.parseInt(
        id,
        10
      );

    if (
      !Number.isInteger(
        idFinal
      )
    ) {
      throw new UsuarioValidationError(
        'ID de usuario no válido'
      );
    }

    const usuarioAnterior =
      await obtenerUsuarioPorId(
        idFinal
      );

    if (!usuarioAnterior) {
      throw new UsuarioValidationError(
        'Usuario no encontrado',
        404
      );
    }

    const {
      password,
      rol,
      estado,
      operacion
    } = datos || {};

    const rolFinal = String(
      rol ||
      usuarioAnterior.rol
    )
      .trim()
      .toLowerCase();

    if (
      ![
        'admin',
        'supervisor',
        'ti'
      ].includes(rolFinal)
    ) {
      throw new UsuarioValidationError(
        'Rol no válido'
      );
    }

    const estadoFinal = String(
      estado ||
      usuarioAnterior.estado
    )
      .trim()
      .toLowerCase();

    if (
      ![
        'activo',
        'inactivo'
      ].includes(estadoFinal)
    ) {
      throw new UsuarioValidationError(
        'Estado de usuario no válido'
      );
    }

    if (
      idFinal ===
      Number(usuarioActualId) &&
      estadoFinal ===
      'inactivo'
    ) {
      throw new UsuarioValidationError(
        'No puedes desactivar tu propio usuario'
      );
    }

    const operacionFinal =
      rolFinal === 'supervisor'
        ? String(
          operacion ??
          usuarioAnterior.operacion ??
          ''
        ).trim()
        : null;

    if (
      rolFinal === 'supervisor' &&
      !operacionFinal
    ) {
      throw new UsuarioValidationError(
        'Debe asignar una operación al supervisor'
      );
    }

    let passwordHash = null;

    if (password !== undefined && password !== '') {
      validarNuevaPassword(password);
      passwordHash = await bcrypt.hash(password, 10);
    }

    const usuarioActualizado =
      await actualizarUsuarioPorId({
        id: idFinal,
        passwordHash,
        rol: rolFinal,
        permisos:
          ROLE_PERMISSIONS[
          rolFinal
          ],
        estado: estadoFinal,
        operacion:
          operacionFinal
      });

    if (!usuarioActualizado) {
      throw new UsuarioValidationError(
        'Usuario no encontrado',
        404
      );
    }

    return {
      usuarioAnterior,
      usuarioActualizado
    };
  };
export const cambiarEstadoUsuario =
  async ({
    id,
    estado,
    usuarioActualId
  }) => {
    const idFinal =
      Number.parseInt(
        id,
        10
      );

    const estadoFinal = String(
      estado || ''
    )
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(
        idFinal
      )
    ) {
      throw new UsuarioValidationError(
        'ID de usuario no válido'
      );
    }

    if (
      ![
        'activo',
        'inactivo'
      ].includes(
        estadoFinal
      )
    ) {
      throw new UsuarioValidationError(
        'El estado debe ser activo o inactivo'
      );
    }

    if (
      idFinal ===
      Number(usuarioActualId) &&
      estadoFinal ===
      'inactivo'
    ) {
      throw new UsuarioValidationError(
        'No puedes desactivar tu propio usuario'
      );
    }

    const usuarioAnterior =
      await obtenerUsuarioPorId(
        idFinal
      );

    if (!usuarioAnterior) {
      throw new UsuarioValidationError(
        'Usuario no encontrado',
        404
      );
    }

    const usuarioActualizado =
      await actualizarEstadoUsuario(
        idFinal,
        estadoFinal
      );

    return {
      estadoFinal,
      usuarioAnterior,
      usuarioActualizado
    };
  };