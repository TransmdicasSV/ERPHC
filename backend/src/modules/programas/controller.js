import {
  obtenerProgramas,
  obtenerProgramaPorId,
  obtenerVersionesDeProgramas,
  actualizarPrograma,
  actualizarEstadoPrograma
} from './repository.js';

import {
  prepararActualizacionPrograma,
  prepararCambioEstado,
  marcarVigente,
  vigenteDe
} from './service.js';

import {
  normalizarId,
  noEncontrado,
  manejar
} from './comun.js';

import {
  logAction
} from '../../services/auditService.js';

// Un solo mapa de traducción para todo el dominio. La taxonomía de códigos vive en
// comun.js; aquí solo el texto propio de programas.
const ERRORES = {
  mensajes: {
    uq_programas_mantenimiento_codigo: {
      status: 409,
      error: 'Ya existe un programa con ese código'
    }
  }
};

const NO_ENCONTRADO =
  'Programa de mantenimiento no encontrado';

const idDe = req => normalizarId(
  'El id del programa',
  req.params.id
);

const programaOFalla = async id => {
  const {
    fecha_negocio,
    programa
  } = await obtenerProgramaPorId(id);

  if (!programa) {
    throw noEncontrado(NO_ENCONTRADO);
  }

  return { fecha_negocio, programa };
};

export const listarProgramas = manejar(
  async (req, res) => {
    const estado = req.query.estado
      ? String(req.query.estado)
        .trim()
        .toUpperCase()
      : null;

    const {
      fecha_negocio: fecha,
      programas
    } = await obtenerProgramas({ estado });

    if (programas.length === 0) {
      return res.json({
        fecha_negocio: null,
        programas: []
      });
    }

    // Una consulta para las versiones de TODOS los programas del listado.
    const versiones =
      await obtenerVersionesDeProgramas(
        programas.map(p => p.id)
      );

    return res.json({
      fecha_negocio: fecha,
      programas: programas.map(
        programa => ({
          ...programa,
          version_vigente: vigenteDe(
            versiones.get(programa.id),
            fecha
          )
        })
      )
    });
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al listar los programas de mantenimiento'
  }
);

export const obtenerPrograma = manejar(
  async (req, res) => {
    const id = idDe(req);

    const {
      fecha_negocio: fecha,
      programa
    } = await programaOFalla(id);

    const versiones = marcarVigente(
      (
        await obtenerVersionesDeProgramas(
          [id]
        )
      ).get(id),
      fecha
    );

    return res.json({
      fecha_negocio: fecha,
      ...programa,
      versiones,
      version_vigente:
        versiones.find(
          version =>
            version.vigente_en_fecha
        ) ?? null
    });
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al obtener el programa de mantenimiento'
  }
);

// ==========================================
// POST · BLOQUEADO POR TRANSICION DE ESQUEMA
// ==========================================
// Crear un programa exige HOY escribir 7 columnas NOT NULL sin DEFAULT que los cleanup
// pendientes eliminan del encabezado: periodo_inicio, periodo_fin, version y
// fecha_documento -20261001_901- y frecuencia_m1/m2/m3_dias -20261001_900-.
//
// Comprobado empiricamente en transaccion revertida:
//   INSERT (codigo, nombre, estado)  -> 23502 null value in column "periodo_inicio"
//   INSERT + las 7 columnas legacy   -> ACEPTADO
//
// Implementarlo hoy significaria escribir columnas condenadas -deuda legacy escondida en el
// repository- y el endpoint moriria el dia del cleanup. Ademas falta una decision de
// negocio: quien cierra la vigencia de la version anterior al publicar una nueva.
//
// La respuesta publica NO cita migraciones, columnas ni SQL: el detalle queda en este
// comentario y en el log del servidor.
const CODIGO_BLOQUEO = 'TI_PR_01_SCHEMA_TRANSITION';

export const registrarPrograma = manejar(
  async (req, res) => {
    console.warn(
      `[${CODIGO_BLOQUEO}] POST /api/programas-mantenimiento rechazado: `
      + 'programas_mantenimiento exige 7 columnas NOT NULL que retiran los cleanup '
      + '20261001_900 y 20261001_901 (periodo_inicio, periodo_fin, version, '
      + 'fecha_documento, frecuencia_m1_dias, frecuencia_m2_dias, frecuencia_m3_dias). '
      + 'Ver comentario en modules/programas/controller.js.'
    );

    return res
      .status(501)
      .json({
        error:
          'Crear programas de mantenimiento no está disponible todavía',
        code: CODIGO_BLOQUEO,
        message:
          'El modelo de programas está en transición y la creación por API queda '
          + 'deshabilitada hasta que termine. La consulta, la edición del nombre y el '
          + 'cambio de estado funcionan con normalidad.',
        details: {
          disponible: [
            'GET /api/programas-mantenimiento',
            'GET /api/programas-mantenimiento/:id',
            'PUT /api/programas-mantenimiento/:id',
            'PATCH /api/programas-mantenimiento/:id/estado'
          ],
          alta_de_programas:
            'se realiza por carga controlada, no por API',
          reintentar: false
        }
      });
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al procesar la creación del programa'
  }
);

export const editarPrograma = manejar(
  async (req, res) => {
    const id = idDe(req);

    const {
      programa: anterior
    } = await programaOFalla(id);

    const {
      campos,
      data
    } = prepararActualizacionPrograma(
      req.body
    );

    const programa =
      await actualizarPrograma(
        id,
        campos,
        data
      );

    await logAction(
      req.user
        ? req.user.id
        : null,
      `Editó el programa de mantenimiento ${anterior.codigo}`,
      'programas_mantenimiento',
      req,
      anterior,
      programa
    );

    return res.json(programa);
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al editar el programa de mantenimiento'
  }
);

export const cambiarEstadoPrograma = manejar(
  async (req, res) => {
    const id = idDe(req);

    const {
      programa: anterior
    } = await programaOFalla(id);

    const {
      estado
    } = prepararCambioEstado(req.body);

    const programa =
      await actualizarEstadoPrograma(
        id,
        estado
      );

    await logAction(
      req.user
        ? req.user.id
        : null,
      `Cambió el estado del programa ${anterior.codigo} a ${estado}`,
      'programas_mantenimiento',
      req,
      anterior,
      programa
    );

    return res.json(programa);
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al cambiar el estado del programa de mantenimiento'
  }
);
