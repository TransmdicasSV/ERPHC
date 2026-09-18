import {
  obtenerProgramas,
  obtenerProgramaPorId,
  insertarPrograma,
  actualizarPrograma,
  actualizarEstadoPrograma
} from './repository.js';

import {
  prepararNuevoPrograma,
  prepararActualizacionPrograma,
  prepararCambioEstado,
  normalizarId,
  normalizarEstado,
  ProgramaValidationError
} from './service.js';

import {
  logAction
} from '../../services/auditService.js';

// PostgreSQL ya garantiza unicidad, estados y coherencia del periodo.
// Aquí solo se traduce ese rechazo a una respuesta entendible.
const responderErrorBd = (
  error,
  res,
  mensajeGenerico
) => {
  if (error.code === '23505') {
    return res
      .status(409)
      .json({
        error:
          'Ya existe un programa con ese código, periodo de inicio y versión'
      });
  }

  if (error.code === '23514') {
    return res
      .status(400)
      .json({
        error:
          'Los datos del programa no cumplen las reglas de la base de datos',
        detalle: error.constraint
      });
  }

  console.error(
    mensajeGenerico,
    error
  );

  return res
    .status(500)
    .json({
      error: mensajeGenerico
    });
};

const responderError = (
  error,
  res,
  mensajeGenerico
) => {
  if (
    error instanceof
    ProgramaValidationError
  ) {
    return res
      .status(error.status)
      .json({
        error: error.message
      });
  }

  return responderErrorBd(
    error,
    res,
    mensajeGenerico
  );
};

export const listarProgramas =
  async (req, res) => {
    try {
      const estado =
        req.query?.estado
          ? normalizarEstado(
            req.query.estado
          )
          : null;

      const programas =
        await obtenerProgramas({
          estado
        });

      return res.json(programas);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al obtener los programas de mantenimiento'
      );
    }
  };

export const obtenerPrograma =
  async (req, res) => {
    try {
      const id = normalizarId(
        req.params.id
      );

      const programa =
        await obtenerProgramaPorId(
          id
        );

      if (!programa) {
        return res
          .status(404)
          .json({
            error:
              'Programa de mantenimiento no encontrado'
          });
      }

      return res.json(programa);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al obtener el programa de mantenimiento'
      );
    }
  };

export const registrarPrograma =
  async (req, res) => {
    try {
      const datos =
        prepararNuevoPrograma(
          req.body
        );

      const programa =
        await insertarPrograma(
          datos
        );

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Creó el programa de mantenimiento ${programa.codigo} ${programa.version}`,
        'programas_mantenimiento',
        req,
        null,
        programa
      );

      return res
        .status(201)
        .json(programa);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al registrar el programa de mantenimiento'
      );
    }
  };

export const editarPrograma =
  async (req, res) => {
    try {
      const id = normalizarId(
        req.params.id
      );

      const programaAnterior =
        await obtenerProgramaPorId(
          id
        );

      if (!programaAnterior) {
        return res
          .status(404)
          .json({
            error:
              'Programa de mantenimiento no encontrado'
          });
      }

      const {
        campos,
        data
      } =
        prepararActualizacionPrograma(
          id,
          req.body,
          programaAnterior
        );

      const programa =
        await actualizarPrograma(
          id,
          campos,
          data
        );

      if (!programa) {
        return res
          .status(404)
          .json({
            error:
              'Programa de mantenimiento no encontrado'
          });
      }

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Actualizó el programa de mantenimiento ${programa.codigo} ${programa.version}`,
        'programas_mantenimiento',
        req,
        programaAnterior,
        programa
      );

      return res.json(programa);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al actualizar el programa de mantenimiento'
      );
    }
  };

export const cambiarEstadoPrograma =
  async (req, res) => {
    try {
      const { id, estado } =
        prepararCambioEstado(
          req.params.id,
          req.body?.estado
        );

      const programaAnterior =
        await obtenerProgramaPorId(
          id
        );

      if (!programaAnterior) {
        return res
          .status(404)
          .json({
            error:
              'Programa de mantenimiento no encontrado'
          });
      }

      const programa =
        await actualizarEstadoPrograma(
          id,
          estado
        );

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Cambió el programa de mantenimiento ${programa.codigo} ${programa.version} a ${estado}`,
        'programas_mantenimiento',
        req,
        programaAnterior,
        programa
      );

      return res.json({
        success: true,
        programa
      });
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al cambiar el estado del programa de mantenimiento'
      );
    }
  };
