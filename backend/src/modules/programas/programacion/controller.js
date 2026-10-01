import {
  obtenerProgramacion,
  contarProgramacion,
  obtenerVisitaPorId,
  obtenerEquiposDeVisitas,
  reprogramarVisita,
  cancelarVisita
} from './repository.js';

import {
  normalizarFiltros,
  prepararReprogramacion,
  bloqueos,
  ESTADOS,
  ESTADO_CANCELADO
} from './service.js';

import {
  existePrograma
} from '../repository.js';

import {
  normalizarId,
  noEncontrado,
  manejar,
  ValidationError
} from '../comun.js';

import {
  logAction
} from '../../../services/auditService.js';

// La base es la autoridad. Aquí solo se traduce su rechazo, y nunca se devuelve el mensaje
// del driver. Los patrones de reglasDeNegocio corresponden a los RAISE EXCEPTION de
// 20260925_013, 20260925_015 y 20260928_016, cuyos textos se midieron uno por uno.
const ERRORES = {
  mensajes: {
    uq_programacion_unidad_quincena_efectiva: {
      status: 409,
      error:
        'Esa unidad ya tiene una visita activa en la quincena de destino. '
        + 'Cancela la que la ocupa o elige otra quincena.'
    },
    chk_programacion_quincena_reprogramada: {
      status: 400,
      error:
        'quincena_reprogramada debe caer el día 1 o el día 16'
    }
  },
  reglasDeNegocio: [
    {
      patron: /no admite cambiar su identidad original/,
      status: 409,
      code: 'IDENTIDAD_INMUTABLE',
      error:
        'La identidad original de la visita -unidad, programa y quincena programada- '
        + 'es inmutable'
    },
    {
      patron: /OT no anulada\(s\)/,
      status: 409,
      code: 'OT_NO_ANULADA',
      error:
        'La visita tiene una orden de trabajo no anulada: anúlala antes de reprogramar '
        + 'o cancelar'
    },
    {
      patron: /esta CANCELADA: es historica/,
      status: 409,
      code: 'CANCELADO_TERMINAL',
      error:
        'La visita está CANCELADA: es histórica y no vuelve a un estado activo'
    },
    {
      patron: /tiene una OT ABIERTA/,
      status: 409,
      code: 'OT_ABIERTA',
      error:
        'La visita tiene una orden de trabajo ABIERTA y no admite cambios'
    },
    {
      patron: /tiene una OT CERRADA/,
      status: 409,
      code: 'OT_CERRADA',
      error:
        'La visita tiene una orden de trabajo CERRADA: su resultado es histórico'
    }
  ]
};

const NO_ENCONTRADA =
  'Programación no encontrada en este programa';

const programaDe = async req => {
  const programaId = normalizarId(
    'programaId',
    req.params.programaId
  );

  if (
    !await existePrograma(programaId)
  ) {
    throw noEncontrado(
      'Programa de mantenimiento no encontrado'
    );
  }

  return programaId;
};

const visitaDe = async (
  programaId,
  req
) => {
  const id = normalizarId(
    'id',
    req.params.id
  );

  const visita = await obtenerVisitaPorId(
    programaId,
    id
  );

  if (!visita) {
    throw noEncontrado(NO_ENCONTRADA);
  }

  return visita;
};

// Reparte la fila en la forma que publica la API: la visita, su unidad y, aparte, la
// existencia de OT. No se mezcla el contenido de la OT: eso es otra etapa.
const presentar = (
  visita,
  equipos
) => {
  const {
    placa,
    ot_total,
    ot_abiertas,
    ot_cerradas,
    ot_anuladas,
    ot_no_anuladas,
    ...resto
  } = visita;

  return {
    ...resto,
    unidad: {
      id: visita.programa_unidad_id,
      placa
    },
    ordenes_trabajo: {
      total: ot_total,
      abiertas: ot_abiertas,
      cerradas: ot_cerradas,
      anuladas: ot_anuladas,
      no_anuladas: ot_no_anuladas
    },
    acciones: bloqueos(visita),
    equipos: {
      descripcion:
        'Evidencia de qué quedó materializado al crear la visita. No se recalcula con '
        + 'la frecuencia vigente: un cambio de frecuencia solo afecta proyecciones '
        + 'futuras todavía no materializadas.',
      total: equipos.length,
      items: equipos
    }
  };
};

export const listarProgramacion = manejar(
  async (req, res) => {
    const programaId = await programaDe(req);

    const filtros = normalizarFiltros(
      req.query
    );

    const visitas = await obtenerProgramacion(
      programaId,
      filtros
    );

    // Una consulta para los equipos de TODAS las visitas del listado.
    const equipos =
      await obtenerEquiposDeVisitas(
        visitas.map(v => v.id)
      );

    const total = await contarProgramacion(
      programaId,
      filtros
    );

    return res.json({
      programa_id: programaId,
      total,
      devueltas: visitas.length,
      estados: ESTADOS,
      filtros,
      programacion: visitas.map(
        visita => presentar(
          visita,
          equipos.get(visita.id)
        )
      )
    });
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al listar la programación del programa'
  }
);

export const obtenerVisita = manejar(
  async (req, res) => {
    const programaId = await programaDe(req);

    const visita = await visitaDe(
      programaId,
      req
    );

    const equipos = (
      await obtenerEquiposDeVisitas([visita.id])
    ).get(visita.id);

    return res.json(
      presentar(visita, equipos)
    );
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al obtener la programación'
  }
);

export const reprogramar = manejar(
  async (req, res) => {
    const programaId = await programaDe(req);

    const antes = await visitaDe(
      programaId,
      req
    );

    const {
      quincena_reprogramada
    } = prepararReprogramacion(req.body);

    const permiso = bloqueos(antes);

    if (!permiso.puede_reprogramar) {
      throw new ValidationError(
        permiso.motivo_reprogramar,
        409
      );
    }

    if (
      antes.quincena_reprogramada ===
      quincena_reprogramada
    ) {
      return res.json({
        ...presentar(
          antes,
          (await obtenerEquiposDeVisitas([antes.id]))
            .get(antes.id)
        ),
        ya_estaba_en_esa_quincena: true
      });
    }

    const movida = await reprogramarVisita(
      programaId,
      antes.id,
      quincena_reprogramada
    );

    if (!movida) {
      // La puerta del WHERE no dejó pasar la fila: se vuelve a leer para decir por qué en
      // vez de contestar un 500 sin explicación.
      const ahora = await obtenerVisitaPorId(
        programaId,
        antes.id
      );

      throw new ValidationError(
        bloqueos(ahora).motivo_reprogramar
        ?? 'La visita no admite reprogramación en su estado actual',
        409
      );
    }

    const despues = await obtenerVisitaPorId(
      programaId,
      antes.id
    );

    await logAction(
      req.user
        ? req.user.id
        : null,
      `Reprogramó la visita ${antes.id} de ${antes.placa} a la quincena `
      + `${quincena_reprogramada}`,
      'programacion_mantenimiento',
      req,
      antes,
      despues
    );

    return res.json(
      presentar(
        despues,
        (await obtenerEquiposDeVisitas([antes.id]))
          .get(antes.id)
      )
    );
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al reprogramar la visita'
  }
);

export const cancelar = manejar(
  async (req, res) => {
    const programaId = await programaDe(req);

    const antes = await visitaDe(
      programaId,
      req
    );

    const equipos = (
      await obtenerEquiposDeVisitas([antes.id])
    ).get(antes.id);

    // Idempotente: la base acepta CANCELADO -> CANCELADO -medido-, así que repetir la
    // cancelación no es un error, es la misma situación final.
    if (antes.estado === ESTADO_CANCELADO) {
      return res.json({
        ...presentar(antes, equipos),
        ya_estaba_cancelada: true
      });
    }

    const permiso = bloqueos(antes);

    if (!permiso.puede_cancelar) {
      throw new ValidationError(
        permiso.motivo_cancelar,
        409
      );
    }

    const cancelada = await cancelarVisita(
      programaId,
      antes.id
    );

    if (!cancelada) {
      const ahora = await obtenerVisitaPorId(
        programaId,
        antes.id
      );

      throw new ValidationError(
        bloqueos(ahora).motivo_cancelar
        ?? 'La visita no admite cancelación en su estado actual',
        409
      );
    }

    const despues = await obtenerVisitaPorId(
      programaId,
      antes.id
    );

    await logAction(
      req.user
        ? req.user.id
        : null,
      `Canceló la visita ${antes.id} de ${antes.placa} en la quincena `
      + `${antes.quincena_efectiva}`,
      'programacion_mantenimiento',
      req,
      antes,
      despues
    );

    return res.json(
      presentar(
        despues,
        (await obtenerEquiposDeVisitas([antes.id]))
          .get(antes.id)
      )
    );
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al cancelar la visita'
  }
);
