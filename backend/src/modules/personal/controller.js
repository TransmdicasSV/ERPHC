import {
  obtenerPersonal,
  crearPersonal,
  actualizarPersonal,
  eliminarPersonal
} from './repository.js';

import {
  validarNuevoPersonal,
  PersonalValidationError
} from './service.js';

import {
  logAction
} from '../../services/auditService.js';

export const listarPersonal =
  async (req, res) => {
    try {
      const personal =
        await obtenerPersonal();

      return res.json(
        personal
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Error obteniendo el personal'
      });
    }
  };

export const registrarPersonal =
  async (req, res) => {
    try {
      const datos =
        validarNuevoPersonal(
          req.body
        );

      const personalCreado =
        await crearPersonal(
          datos
        );

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Registró nuevo personal: ${datos.nombre_completo}`,
        'personal'
      );

      return res
        .status(201)
        .json(personalCreado);
    } catch (error) {
      if (
        error instanceof
        PersonalValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      console.error(error);

      return res.status(500).json({
        error:
          'Error al registrar personal (DNI duplicado?)'
      });
    }
  };

export const editarPersonal =
  async (req, res) => {
    const { id } = req.params;

    try {
      const personalActualizado =
        await actualizarPersonal(
          id,
          req.body
        );

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Actualizó personal: ${req.body?.nombre_completo}`,
        'personal'
      );

      return res.json(
        personalActualizado
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Error al actualizar personal'
      });
    }
  };

export const borrarPersonal =
  async (req, res) => {
    const { id } = req.params;

    try {
      await eliminarPersonal(
        id
      );

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Eliminó registro de personal ID: ${id}`,
        'personal'
      );

      return res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Error al eliminar personal'
      });
    }
  };