import {
  ValidationError,
  normalizarId,
  separarCamposEditables
} from '../../comun.js';

// ==========================================
// ORDENES DE TRABAJO (TI-PR-01)
// Reglas de negocio y normalización. No conoce HTTP ni SQL.
// ==========================================
//
// TODO LO QUE HAY AQUI SE MIDIO CONTRA EL MODELO en la etapa 4.0, no se dedujo de memoria.
//
// -------------------------------------------------------------------------------------
// ABRIR
// -------------------------------------------------------------------------------------
// Una OT es el acto de autorizar la ejecución de una visita ya confirmada. Nace ABIERTA
// -lo exige validar_apertura_ot- y con su alcance ya cerrado: la regla R2 de 20260928_016
// congela los equipos previstos desde que existe CUALQUIER OT, así que el conjunto que la
// OT tendrá que resolver no puede cambiar después. Medido: intentar insertar un equipo
// previsto con la OT ya abierta se rechaza con «el alcance de la visita esta congelado».
//
// Por eso los detalles se materializan en la misma transacción que la apertura: el universo
// está determinado en ese instante y no volverá a moverse.
//
// Lo que la base ya protege, y por tanto NO se duplica aquí:
//   · estado de la visita     validar_apertura_ot (P0001), con mensaje propio para
//                             PROYECTADO y para CANCELADO
//   · una sola OT activa      uq_ot_programacion_activa (23505)
//   · la OT nace ABIERTA      validar_apertura_ot
//   · coherencia del detalle  chk_otd_presencia
// Se comprueban además aquí el estado y la OT activa para contestar un 409 legible en vez
// de un código de PostgreSQL, igual que hace el módulo de programación. La base sigue
// siendo la autoridad.
//
// -------------------------------------------------------------------------------------
// LO QUE ESTA ETAPA NO HACE
// -------------------------------------------------------------------------------------
// Ni cierra, ni anula, ni edita cabecera, ni toca detalles, ni mueve ciclos o anclas. Por
// eso aquí no hay ninguna regla sobre GPS/ADAS y PARCIAL: esa validación pertenece al
// endpoint que escribe el resultado de un detalle, y ponerla ahora sería un validador sin
// consumidor. Está medida y documentada, y es requisito de la etapa 4.2.

// chk_ot_estado, en el orden del ciclo de vida.
export const ESTADOS = [
  'ABIERTA',
  'CERRADA',
  'ANULADA'
];

// chk_otd_estado.
export const ESTADOS_DETALLE = [
  'COMPLETADO',
  'PARCIAL',
  'PENDIENTE',
  'NO_APLICA'
];

// Los dos únicos estados de visita que admiten abrir una OT, según validar_apertura_ot:
// «solo PROGRAMADO o REPROGRAMADO admiten abrir una OT».
export const ESTADOS_QUE_ADMITEN_OT = [
  'PROGRAMADO',
  'REPROGRAMADO'
];

export const ESTADO_ABIERTA = 'ABIERTA';
export const ESTADO_ANULADA = 'ANULADA';
export const ESTADO_INICIAL_DETALLE = 'PENDIENTE';

// Lo ÚNICO que el cliente puede enviar al abrir. Todo lo demás lo decide el servidor o la
// base: abierta_por_id sale del usuario autenticado, el estado nace ABIERTA, la fecha la
// pone la base, y los detalles se derivan del alcance previsto.
export const CAMPOS_ADMITIDOS_APERTURA = [
  'tecnico_id'
];

const AYUDA_APERTURA =
  'abierta_por_id sale del usuario autenticado, el estado y la fecha los fija la base, '
  + 'y los detalles se derivan de los equipos previstos de la visita.';

// tecnico_id es el ejecutor físico -> personal(id), no un usuario del ERP. Es opcional: la
// columna admite NULL y una OT puede abrirse sin técnico asignado todavía.
export const prepararApertura = datos => {
  const cuerpo =
    datos === null || datos === undefined
      ? {}
      : datos;

  // Se reutiliza el rechazo por nombre del módulo -no se ignoran campos en silencio- con
  // permitirVacio, porque al abrir SI es válido no enviar nada: el único campo admitido es
  // opcional. El resto del comportamiento es el mismo que en los PATCH del módulo.
  separarCamposEditables(
    cuerpo,
    CAMPOS_ADMITIDOS_APERTURA,
    {
      sujeto: 'al abrir una orden de trabajo',
      ayuda: AYUDA_APERTURA,
      verbo: 'admiten',
      permitirVacio: true
    }
  );

  const tecnico = cuerpo.tecnico_id;

  if (
    tecnico === null ||
    tecnico === undefined ||
    tecnico === ''
  ) {
    return { tecnico_id: null };
  }

  return {
    tecnico_id: normalizarId(
      'tecnico_id',
      tecnico
    )
  };
};

// Los textos de cada rechazo, en UN solo sitio. Los usan las dos rutas por las que puede
// llegar el mismo rechazo: la comprobación de este service -el camino normal- y la
// traducción del P0001 que levantaría validar_apertura_ot si la base lo rechazara primero.
// Tener dos redacciones para una misma regla seria dar dos respuestas distintas al cliente.
export const MENSAJES = {
  proyectada:
    'La visita está PROYECTADA: es solo la proyección automática del programa. '
    + 'Confírmala como PROGRAMADA antes de abrir la orden de trabajo.',
  cancelada:
    'La visita está CANCELADA: no admite abrir una orden de trabajo. '
    + 'La sustitución exige crear una visita nueva.',
  estadoNoAdmite:
    'Solo una visita PROGRAMADA o REPROGRAMADA admite abrir una orden de trabajo. '
    + 'Una visita ya resuelta no se reabre: exige una visita nueva.',
  activa:
    'La visita ya tiene una orden de trabajo activa. Anúlala antes de abrir otra: '
    + 'solo puede haber una no anulada por visita.',
  sinPrevistos:
    'La visita no prevé ningún equipo: una orden de trabajo sin alcance no podría '
    + 'cerrarse nunca.',
  alcanceCongelado:
    'El alcance de la visita está congelado porque ya tuvo una orden de trabajo',
  nace:
    'Una orden de trabajo nace ABIERTA',
  tecnicoInexistente:
    'El técnico indicado no existe en el personal registrado'
};

// Por qué una visita admite o no admite una OT nueva. Una sola definición: la usan el POST
// -para decidir- y los GET -para informar-.
export const bloqueosDeApertura = (
  visita,
  {
    activas,
    previstos
  }
) => {
  let motivo = null;

  if (visita.estado === 'PROYECTADO') {
    motivo = MENSAJES.proyectada;
  } else if (visita.estado === 'CANCELADO') {
    motivo = MENSAJES.cancelada;
  } else if (
    !ESTADOS_QUE_ADMITEN_OT.includes(visita.estado)
  ) {
    // El estado real va delante para que el operador sepa en qué punto está la visita.
    motivo = `La visita está en ${visita.estado}. ${MENSAJES.estadoNoAdmite}`;
  } else if (activas > 0) {
    motivo = MENSAJES.activa;
  } else if (previstos === 0) {
    motivo = MENSAJES.sinPrevistos;
  }

  return {
    puede_abrir: motivo === null,
    motivo_abrir: motivo
  };
};

// Qué admite una OT según SU estado. Derivado de impedir_modificar_ot_cerrada, que solo
// deja pasar un UPDATE cuando la fila está ABIERTA. No hay ninguna regla nueva aquí.
export const accionesDeOrden = orden => {
  const abierta = orden.estado === ESTADO_ABIERTA;

  const motivo = abierta
    ? null
    : `La orden de trabajo está ${orden.estado} y es inmutable.`;

  return {
    puede_editar: abierta,
    puede_cerrar: abierta,
    puede_anular: abierta,
    motivo: motivo
  };
};

// activa = estado <> 'ANULADA', que es exactamente el predicado del índice parcial
// uq_ot_programacion_activa: la OT que ocupa el hueco de la visita.
export const estaActiva = orden =>
  orden.estado !== ESTADO_ANULADA;

// Reparte la fila en la forma que publica la API. La unidad y la quincena viajan aparte
// porque pertenecen a la visita, no a la OT.
export const presentarOrden = (
  orden,
  detalles
) => {
  const {
    programa_unidad_id,
    placa,
    quincena_efectiva,
    ...resto
  } = orden;

  return {
    ...resto,
    activa: estaActiva(orden),
    unidad: {
      id: programa_unidad_id,
      placa
    },
    visita: {
      id: orden.programacion_id,
      quincena_efectiva
    },
    acciones: accionesDeOrden(orden),
    detalles: {
      descripcion:
        'Un detalle por cada equipo previsto de la visita, materializado al abrir la '
        + 'orden. tipo_equipo y nivel_programado se leen de programacion_mantenimiento_'
        + 'equipos, que es la única fuente de verdad de lo previsto.',
      total: detalles.length,
      items: detalles
    }
  };
};

// Se exige que la visita exista y pertenezca al programa antes de cualquier otra cosa: una
// OT de otro programa no se filtra, no existe para esta ruta.
export const exigirVisita = visita => {
  if (!visita) {
    throw new ValidationError(
      'Programación no encontrada en este programa',
      404
    );
  }

  return visita;
};
