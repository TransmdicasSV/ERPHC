import bcrypt from 'bcryptjs';

import {
  ROLE_PERMISSIONS
} from '../../config/permissions.js';

import {
  crearUsuario,
  obtenerUsuarioPorId,
  actualizarEstadoUsuario
} from './repository.js';

export class UsuarioValidationError extends Error {
  constructor(message, status = 400) {
    super(message);

    this.name =
      'UsuarioValidationError';

    this.status = status;
  }
}

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