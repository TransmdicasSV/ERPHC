import {
  obtenerUnidadesPorPrograma,
  obtenerUnidadPorId,
  obtenerUnidadPorPlaca,
  existeVehiculo,
  insertarUnidad,
  actualizarUnidad
} from './repository.js';

import {
  prepararNuevaUnidad,
  prepararActualizacionUnidad,
  prepararFiltroUnidades,
  normalizarIdPrograma,
  normalizarIdUnidad,
  UnidadValidationError
} from './service.js';

import {
  obtenerProgramaPorId
} from '../repository.js';

import {
  logAction
} from '../../../services/auditService.js';

const NO_ENCONTRADA =
  'Unidad del programa no encontrada';

const PROGRAMA_NO_ENCONTRADO =
  'Programa de mantenimiento no encontrado';

// La base de datos es la protección final: FK y UNIQUE.
// Aquí solo se traduce cada rechazo a una respuesta entendible.
const responderError = (
  error,
  res,
  mensajeGenerico
) => {
  if (
    error instanceof
    UnidadValidationError
  ) {
    return res
      .status(error.status)
      .json({
        error: error.message
      });
  }

  if (error.code === '23505') {
    return res
      .status(409)
      .json({
        error:
          'Esa placa ya está asociada a este programa'
      });
  }

  if (error.code === '23503') {
    return res
      .status(404)
      .json({
        error:
          'El programa o la placa indicados no existen',
        detalle: error.constraint
      });
  }

  if (error.code === '23514') {
    return res
      .status(400)
      .json({
        error:
          'Los datos de la unidad no cumplen las reglas de la base de datos',
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

const asegurarPrograma = async (
  programaId,
  res
) => {
  const programa =
    await obtenerProgramaPorId(
      programaId
    );

  if (!programa) {
    res
      .status(404)
      .json({
        error: PROGRAMA_NO_ENCONTRADO
      });

    return null;
  }

  return programa;
};

export const listarUnidades =
  async (req, res) => {
    try {
      const { programaId, placa } =
        prepararFiltroUnidades(
          req.params.programaId,
          req.query
        );

      const programa =
        await asegurarPrograma(
          programaId,
          res
        );

      if (!programa) {
        return undefined;
      }

      const unidades =
        await obtenerUnidadesPorPrograma(
          programaId,
          { placa }
        );

      return res.json(unidades);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al obtener las unidades del programa'
      );
    }
  };

export const obtenerUnidad =
  async (req, res) => {
    try {
      const programaId =
        normalizarIdPrograma(
          req.params.programaId
        );

      const id = normalizarIdUnidad(
        req.params.id
      );

      const unidad =
        await obtenerUnidadPorId(
          programaId,
          id
        );

      if (!unidad) {
        return res
          .status(404)
          .json({
            error: NO_ENCONTRADA
          });
      }

      return res.json(unidad);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al obtener la unidad del programa'
      );
    }
  };

export const agregarUnidad =
  async (req, res) => {
    try {
      const datos =
        prepararNuevaUnidad(
          req.params.programaId,
          req.body
        );

      const programa =
        await asegurarPrograma(
          datos.programa_id,
          res
        );

      if (!programa) {
        return undefined;
      }

      if (
        !(await existeVehiculo(
          datos.placa
        ))
      ) {
        return res
          .status(404)
          .json({
            error: `La placa ${datos.placa} no existe en el maestro de vehículos`
          });
      }

      const yaAsociada =
        await obtenerUnidadPorPlaca(
          datos.programa_id,
          datos.placa
        );

      if (yaAsociada) {
        return res
          .status(409)
          .json({
            error:
              'Esa placa ya está asociada a este programa'
          });
      }

      const unidad =
        await insertarUnidad(datos);

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Agregó la unidad ${unidad.placa} al programa de mantenimiento ${programa.codigo} ${programa.version}`,
        'programa_mantenimiento_unidades',
        req,
        null,
        unidad
      );

      return res
        .status(201)
        .json(unidad);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al agregar la unidad al programa'
      );
    }
  };

export const editarUnidad =
  async (req, res) => {
    try {
      const {
        programaId,
        id,
        campos,
        data
      } =
        prepararActualizacionUnidad(
          req.params.programaId,
          req.params.id,
          req.body
        );

      const unidadAnterior =
        await obtenerUnidadPorId(
          programaId,
          id
        );

      if (!unidadAnterior) {
        return res
          .status(404)
          .json({
            error: NO_ENCONTRADA
          });
      }

      const unidad =
        await actualizarUnidad(
          programaId,
          id,
          campos,
          data
        );

      if (!unidad) {
        return res
          .status(404)
          .json({
            error: NO_ENCONTRADA
          });
      }

      await logAction(
        req.user
          ? req.user.id
          : null,
        `Actualizó la unidad ${unidad.placa} del programa de mantenimiento ${programaId}`,
        'programa_mantenimiento_unidades',
        req,
        unidadAnterior,
        unidad
      );

      return res.json(unidad);
    } catch (error) {
      return responderError(
        error,
        res,
        'Error al actualizar la unidad del programa'
      );
    }
  };
