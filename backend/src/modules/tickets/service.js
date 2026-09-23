import {
  ROLE_PERMISSIONS
} from '../../config/permissions.js';

import {
  obtenerUsuarioTicket
} from './repository.js';

export const OPERACIONES_INVALIDAS_TICKET = [
  '',
  'test',
  'text',
  'null',
  'undefined',
  'sin operacion',
  'sin operación',
  'falta identificar'
];

export const IMPLEMENTOS_PERMITIDOS = [
  'Tablet',
  'Radio Base',
  'Copiloto',
  'Handy',
  'Otros'
];

const normalizarRol = rol => {
  const rolNormalizado =
    String(rol || '')
      .trim()
      .toLowerCase();

  if (
    rolNormalizado ===
    'administrador'
  ) {
    return 'admin';
  }

  return rolNormalizado;
};

export const contextoTicket =
  async (
    req,
    accion = 'ver'
  ) => {
    if (!req.user) {
      return {
        rol: 'publico',
        operacion: null
      };
    }

    const usuario =
      await obtenerUsuarioTicket(
        req.user.id
      );

    if (!usuario) {
      throw Object.assign(
        new Error(
          'Usuario no encontrado'
        ),
        {
          status: 401
        }
      );
    }

    const rol =
      normalizarRol(
        usuario.rol
      );

    const estado =
      String(
        usuario.estado || ''
      )
        .trim()
        .toLowerCase();

    const operacion =
      String(
        usuario.operacion || ''
      ).trim();

    if (estado !== 'activo') {
      throw Object.assign(
        new Error(
          'La cuenta del usuario está inactiva'
        ),
        {
          status: 403
        }
      );
    }

    if (
      !ROLE_PERMISSIONS[
        rol
      ]?.tickets?.[accion]
    ) {
      throw Object.assign(
        new Error(
          'La cuenta no tiene permiso para esta acción'
        ),
        {
          status: 403
        }
      );
    }

    if (
      rol === 'supervisor' &&
      OPERACIONES_INVALIDAS_TICKET.includes(
        operacion.toLowerCase()
      )
    ) {
      throw Object.assign(
        new Error(
          'La cuenta no tiene una operación válida asignada'
        ),
        {
          status: 403
        }
      );
    }

    return{
      rol,
      nombreSolicitante:
      usuario.nombre_solicitante,

      operacion:
      rol=== 'supervisor'
      ? operacion
      :null
    };
  };

export const componenteConFalla =
  valor => {
    const estado =
      String(valor || '')
        .trim()
        .toUpperCase();

    return [
      'FALTA',
      'ERROR',
      'SOPORTE'
    ].includes(estado);
  };

export const obtenerEvidenciasIniciales =
  valor => {
    if (Array.isArray(valor)) {
      return valor;
    }

    if (
      typeof valor !== 'string' ||
      !valor.trim()
    ) {
      return [];
    }

    try {
      const resultado =
        JSON.parse(valor);

      return Array.isArray(
        resultado
      )
        ? resultado
        : [];
    } catch {
      return [];
    }
  };

export const obtenerOperacionesUnicas =
  vehiculos => {
    return [
      ...new Map(
        vehiculos.map(
          vehiculo => [
            vehiculo.operacion
              .toLowerCase(),
            vehiculo.operacion
          ]
        )
      ).values()
    ].sort(
      (
        operacionA,
        operacionB
      ) =>
        operacionA.localeCompare(
          operacionB,
          'es'
        )
    );
  };