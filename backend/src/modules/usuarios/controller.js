import {
  obtenerOperaciones,
  obtenerPersonalAdministrativo,
  obtenerUsuarios
} from './repository.js';

import {
  prepararNuevoUsuario,
  actualizarUsuarioCompleto,
  cambiarEstadoUsuario,
  UsuarioValidationError
} from './service.js';

import {
  logAction
} from '../../services/auditService.js';

export const listarOperaciones =
  async (req, res) => {
    try {
      const operaciones =
        await obtenerOperaciones();

      return res.json(
        operaciones
      );
    } catch (error) {
      console.error(
        'Error obteniendo operaciones:',
        error
      );

      return res.status(500).json({
        error:
          'Error al obtener operaciones'
      });
    }
  };

export const listarPersonalAdministrativo =
  async (req, res) => {
    try {
      const personal =
        await obtenerPersonalAdministrativo();

      return res.json(
        personal
      );
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
  };

export const listarUsuarios =
  async (req, res) => {
    try {
      const usuarios =
        await obtenerUsuarios();

      return res.json(
        usuarios
      );
    } catch (error) {
      console.error(
        'Error obteniendo usuarios:',
        error
      );

      return res.status(500).json({
        error:
          'Error al obtener usuarios'
      });
    }
  };

export const registrarUsuario =
  async (req, res) => {
    try {
      const {
        usernameFinal,
        usuarioCreado
      } =
        await prepararNuevoUsuario(
          req.body
        );

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
        usuario:
          usuarioCreado
      });
    } catch (error) {
      if (
        error instanceof
        UsuarioValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      if (
        error.code === '23505'
      ) {
        return res
          .status(409)
          .json({
            error:
              'El usuario ya existe'
          });
      }

      console.error(
        'Error creando usuario:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error al crear usuario'
        });
    }
  };
export const actualizarUsuario =
  async (req, res) => {
    try {
      const {
        usuarioAnterior,
        usuarioActualizado
      } =
        await actualizarUsuarioCompleto({
          id: req.params.id,
          datos: req.body,
          usuarioActualId:
            req.user.id
        });

      await logAction(
        req.user.id,
        `Usuario actualizado: ${usuarioActualizado.username}`,
        'usuarios',
        req,
        usuarioAnterior,
        usuarioActualizado
      );

      return res.json({
        success: true,
        usuario:
          usuarioActualizado
      });
    } catch (error) {
      if (
        error instanceof
        UsuarioValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      console.error(
        'Error editando usuario:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error al actualizar usuario'
        });
    }
  };
export const cambiarEstado =
  async (req, res) => {
    try {
      const {
        estadoFinal,
        usuarioAnterior,
        usuarioActualizado
      } =
        await cambiarEstadoUsuario({
          id: req.params.id,
          estado:
            req.body?.estado,
          usuarioActualId:
            req.user.id
        });

      await logAction(
        req.user.id,
        `Usuario ${usuarioActualizado.username} cambiado a ${estadoFinal}`,
        'usuarios',
        req,
        usuarioAnterior,
        usuarioActualizado
      );

      return res.json({
        success: true,
        usuario:
          usuarioActualizado
      });
    } catch (error) {
      if (
        error instanceof
        UsuarioValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      console.error(
        'Error actualizando usuario:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error al cambiar el estado del usuario'
        });
    }
  };