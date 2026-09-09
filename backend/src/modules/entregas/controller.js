import {
  hasPermiso,
  getModuloMovimiento
} from '../../middlewares/auth.js';

import {
  uploadToCloudinary,
  deleteFromCloudinary
} from '../../../services/cloudinaryService.js';

import {
  obtenerEntregasLegacy,
  crearEntregaLegacy,
  obtenerPersonalPorDni,
  obtenerInventario,
  crearMovimiento,
  obtenerMovimientoPorId,
  actualizarMovimiento,
  eliminarMovimiento
} from './repository.js';

import {
  normalizarTipoMovimiento,
  normalizarDni,
  normalizarPrecio,
  normalizarFecha,
  obtenerResourceTypeActa,
  EntregaValidationError
} from './service.js';

// ==========================================
// LEGACY
// ==========================================

export const listarLegacy =
  async (req, res) => {
    try {
      const entregas =
        await obtenerEntregasLegacy();

      return res.json(
        entregas
      );
    } catch {
      return res.status(500).json({
        error: 'Error'
      });
    }
  };

export const registrarLegacy =
  async (req, res) => {
    try {
      const entrega =
        await crearEntregaLegacy(
          req.body
        );

      return res.json(
        entrega
      );
    } catch {
      return res.status(500).json({
        error: 'Error'
      });
    }
  };

// ==========================================
// PERSONAL
// ==========================================

export const buscarPersonal =
  async (req, res) => {
    try {
      const tipoMovimiento =
        normalizarTipoMovimiento(
          req.query.tipo ||
            'Entrega'
        );

      const modulo =
        getModuloMovimiento(
          tipoMovimiento
        );

      if (
        !hasPermiso(
          req,
          modulo,
          'ver'
        ) ||
        !hasPermiso(
          req,
          modulo,
          'editar'
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              'No tienes permiso para registrar o editar este movimiento'
          });
      }

      const dni =
        normalizarDni(
          req.params.dni
        );

      const persona =
        await obtenerPersonalPorDni(
          dni
        );

      res.set(
        'Cache-Control',
        'no-store'
      );

      return res.json({
        persona
      });
    } catch (error) {
      if (
        error instanceof
        EntregaValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      console.error(
        'Error buscando personal para entrega:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'No se pudo consultar al trabajador'
        });
    }
  };

// ==========================================
// LISTAR INVENTARIO
// ==========================================

export const listarInventario =
  async (req, res) => {
    try {
      const puedeVerEntregas =
        hasPermiso(
          req,
          'entregas',
          'ver'
        );

      const puedeVerDevoluciones =
        hasPermiso(
          req,
          'devoluciones',
          'ver'
        );

      if (
        !puedeVerEntregas &&
        !puedeVerDevoluciones
      ) {
        return res
          .status(403)
          .json({
            error:
              'No tienes permiso para consultar inventario TI'
          });
      }

      const inventario =
        await obtenerInventario({
          puedeVerEntregas,
          puedeVerDevoluciones
        });

      return res.json(
        inventario
      );
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            'Error obteniendo inventario TI'
        });
    }
  };

// ==========================================
// CREAR
// ==========================================

export const registrarMovimiento =
  async (req, res) => {
    try {
      const tipoMovimiento =
        normalizarTipoMovimiento(
          req.body
            ?.tipo_movimiento ||
            'Entrega'
        );

      const moduloMovimiento =
        getModuloMovimiento(
          tipoMovimiento
        );

      if (
        !hasPermiso(
          req,
          moduloMovimiento,
          'editar'
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              `No tienes permiso para crear registros de ${tipoMovimiento}`
          });
      }

      let documentoFinal =
        req.body
          ?.documento_url ||
        null;

      if (req.file) {
        const resourceType =
          obtenerResourceTypeActa(
            req.file.mimetype
          );

        try {
          documentoFinal =
            await uploadToCloudinary(
              req.file.buffer,
              'entregas_actas',
              resourceType
            );
        } catch (error) {
          console.error(
            'Error subiendo acta a Cloudinary:',
            error
          );

          return res
            .status(500)
            .json({
              error:
                'Error al subir documento a la nube'
            });
        }
      }

      const movimiento =
        await crearMovimiento({
          fecha:
            normalizarFecha(
              req.body?.fecha
            ),

          encargado:
            req.body?.encargado,

          nombre:
            req.body?.nombre,

          dni:
            req.body?.dni,

          cargo:
            req.body?.cargo,

          operacion:
            req.body?.operacion,

          condicion:
            req.body?.condicion,

          equipo_tipo:
            req.body?.equipo_tipo,

          marca:
            req.body?.marca,

          modelo:
            req.body?.modelo,

          serie:
            req.body?.serie,

          laptop:
            req.body?.laptop,

          mouse:
            req.body?.mouse,

          cargador:
            req.body?.cargador,

          motivo:
            req.body?.motivo,

          observaciones:
            req.body?.observaciones,

          precio:
            normalizarPrecio(
              req.body?.precio
            ),

          tipo_movimiento:
            tipoMovimiento,

          documento_url:
            documentoFinal
        });

      return res
        .status(201)
        .json(
          movimiento
        );
    } catch (error) {
      if (
        error instanceof
        EntregaValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      console.error(
        'API POST Error:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error registrando entrega TI: ' +
            error.message
        });
    }
  };

// ==========================================
// ACTUALIZAR
// ==========================================

export const editarMovimiento =
  async (req, res) => {
    const { id } =
      req.params;

    try {
      const tipoMovimiento =
        normalizarTipoMovimiento(
          req.body
            ?.tipo_movimiento ||
            'Entrega'
        );

      const actual =
        await obtenerMovimientoPorId(
          id
        );

      if (!actual) {
        return res
          .status(404)
          .json({
            error:
              'No encontrado'
          });
      }

      const moduloActual =
        getModuloMovimiento(
          actual.tipo_movimiento
        );

      const moduloNuevo =
        getModuloMovimiento(
          tipoMovimiento
        );

      if (
        !hasPermiso(
          req,
          moduloActual,
          'editar'
        ) ||
        !hasPermiso(
          req,
          moduloNuevo,
          'editar'
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              'No tienes permiso para modificar este tipo de movimiento'
          });
      }

      let documentoFinal =
        req.body
          ?.documento_url ||
        null;

      if (req.file) {
        try {
          if (
            actual.documento_url
          ) {
            await deleteFromCloudinary(
              actual.documento_url
            );
          }

          const resourceType =
            obtenerResourceTypeActa(
              req.file.mimetype
            );

          documentoFinal =
            await uploadToCloudinary(
              req.file.buffer,
              'entregas_actas',
              resourceType
            );
        } catch (error) {
          console.error(
            'Error subiendo acta a Cloudinary:',
            error
          );

          return res
            .status(500)
            .json({
              error:
                'Error al subir documento a la nube'
            });
        }
      }

      const movimientoActualizado =
        await actualizarMovimiento({
          id,

          fecha:
            normalizarFecha(
              req.body?.fecha
            ),

          encargado:
            req.body?.encargado,

          nombre:
            req.body?.nombre,

          dni:
            req.body?.dni,

          cargo:
            req.body?.cargo,

          operacion:
            req.body?.operacion,

          condicion:
            req.body?.condicion,

          equipo_tipo:
            req.body?.equipo_tipo,

          marca:
            req.body?.marca,

          modelo:
            req.body?.modelo,

          serie:
            req.body?.serie,

          laptop:
            req.body?.laptop,

          mouse:
            req.body?.mouse,

          cargador:
            req.body?.cargador,

          motivo:
            req.body?.motivo,

          observaciones:
            req.body?.observaciones,

          precio:
            normalizarPrecio(
              req.body?.precio
            ),

          tipo_movimiento:
            tipoMovimiento,

          documento_url:
            documentoFinal
        });

      if (
        !movimientoActualizado
      ) {
        return res
          .status(404)
          .json({
            error:
              'No encontrado'
          });
      }

      return res.json(
        movimientoActualizado
      );
    } catch (error) {
      if (
        error instanceof
        EntregaValidationError
      ) {
        return res
          .status(error.status)
          .json({
            error:
              error.message
          });
      }

      console.error(
        'API PUT Error:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error actualizando entrega TI: ' +
            error.message
        });
    }
  };

// ==========================================
// ELIMINAR
// ==========================================

export const borrarMovimiento =
  async (req, res) => {
    try {
      const eliminado =
        await eliminarMovimiento(
          req.params.id
        );

      if (!eliminado) {
        return res
          .status(404)
          .json({
            error:
              'No encontrado'
          });
      }

      return res.json({
        message:
          'Eliminado correctamente'
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            'Error eliminando entrega TI'
        });
    }
  };