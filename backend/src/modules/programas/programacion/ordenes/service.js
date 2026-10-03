import {
  ValidationError,
  normalizarId,
  normalizarTextoObligatorio,
  normalizarTextoOpcional,
  separarCamposEditables
} from '../../comun.js';

// UNA SOLA FUENTE DE VERDAD, igual que en frecuencias e inventario: las familias anuales y
// el orden de los niveles los define el nucleo del generador. Aqui se importan; no se
// vuelven a declarar.
//
// REGULARES no se importa a proposito: "familia regular" es, por definicion del dominio,
// "no anual" -chk_ciclo_tipo_equipo solo admite esas seis familias-, asi que la regla se
// expresa con ANUALES y no hace falta una segunda lista que mantener en paralelo.
import {
  ANUALES,
  ORDEN
} from '../../../../../scripts/ti-pr-01/generador-nucleo.mjs';

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
// EDITAR · cabecera y resultado por equipo (etapa 4.2)
// -------------------------------------------------------------------------------------
// Solo una OT ABIERTA admite cambios. Lo impone impedir_modificar_ot_cerrada, y aquí se
// comprueba antes para contestar un 409 operativo en vez de un P0001; la base sigue siendo
// la última defensa.
//
// LA COHERENCIA SE VALIDA SOBRE EL RESULTADO FUSIONADO, no sobre las claves presentes. Un
// PATCH parcial puede llegar con solo `estado` o solo `nivel_completado`, y lo que tiene
// que ser válido es la combinación final contra el equipo previsto.
//
// GPS y ADAS no admiten PARCIAL: su mantenimiento anual solo contempla M3 y no hay nivel
// inferior donde aterrizar el avance. Medido en la etapa 4.0: la base acepta el detalle y
// el fallo aparece después, al cerrar, como un 23514 de chk_ciclo_anual_solo_m3. Por eso se
// rechaza aquí, antes de cualquier escritura.
//
// -------------------------------------------------------------------------------------
// CERRAR (etapa 4.3)
// -------------------------------------------------------------------------------------
// El cierre NO se implementa aqui. Lo hace cerrar_orden_trabajo() en la base, que en una
// sola sentencia fija la fecha fisica en la visita, propaga los ciclos con la jerarquia
// acumulativa, deriva el resultado de la visita y cierra la OT. Este modulo la invoca como
// contrato transaccional y traduce sus siete excepciones; no reimplementa nada de eso.
//
// En particular NO se deriva aqui el resultado de la visita ni se decide si fecha_ejecucion
// es obligatoria: eso depende del resultado, que solo se conoce DENTRO de la funcion. La
// API valida el formato de la fecha -eso si es un problema del payload- y deja que la
// funcion imponga el resto.
//
// La fase administrativa es quincena_efectiva, nunca la fecha fisica. Lo garantiza la
// propia funcion y lo verifica trg_validar_coherencia_ciclo_ot fila a fila.
//
// -------------------------------------------------------------------------------------
// ANULAR (etapa 4.3)
// -------------------------------------------------------------------------------------
// Anular NO es borrar. La fila permanece con su motivo, su tecnico, sus observaciones, sus
// evidencias y todos sus detalles: es la constancia de que la orden existio y se desistio.
// 016 R1 prohibe borrar una OT en cualquier estado, asi que esta es la unica salida.
//
// No mueve ciclos y no escribe resultado en la visita: para la programacion es como si la
// orden no hubiera llegado a ejecutarse, y eso es justamente lo que vuelve a habilitar
// reprogramar y cancelar -lo gobierna congelar_visita_con_ot, que cuenta solo las OT NO
// anuladas-.
//
// chk_ot_cierre exige fecha_cierre y cerrada_por_id para CUALQUIER estado distinto de
// ABIERTA, asi que al anular hay que escribir los cuatro campos juntos aunque el nombre de
// dos de ellos hable de cierre.
//
// -------------------------------------------------------------------------------------
// LO QUE ESTA ETAPA NO HACE
// -------------------------------------------------------------------------------------
// No reabre, no borra, no escribe ciclos ni anclas desde JavaScript, y no toca el estado
// de la programacion por su cuenta.

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

// Los niveles y su jerarquía salen de ORDEN del núcleo: M1 < M2 < M3. No se reescribe.
export const NIVELES = Object.keys(ORDEN);

// Los cuatro campos editables de la cabecera mientras la OT está ABIERTA. El resto lo fija
// el servidor, la base o el cierre.
export const CAMPOS_EDITABLES_CABECERA = [
  'tecnico_id',
  'minutos',
  'observaciones',
  'evidencias'
];

// Lo que un técnico declara de un equipo. tipo_equipo y nivel_programado NO están aquí: son
// del equipo previsto y se leen por JOIN.
export const CAMPOS_EDITABLES_DETALLE = [
  'estado',
  'nivel_completado',
  'observaciones',
  'evidencias'
];

// Los tres campos opcionales del cierre. El usuario y el estado los decide el servidor, y
// el resultado de la visita lo deriva la funcion.
export const CAMPOS_ADMITIDOS_CIERRE = [
  'fecha_ejecucion',
  'minutos',
  'observaciones'
];

// Lo unico que admite la anulacion. Texto libre, sin catalogo.
export const CAMPOS_ADMITIDOS_ANULACION = [
  'motivo_anulacion'
];

const AYUDA_CIERRE =
  'El resultado de la visita y los ciclos los deriva el cierre; el usuario sale de la '
  + 'sesion. fecha_ejecucion es el dia FISICO del trabajo, no la quincena.';

const AYUDA_ANULACION =
  'Anular conserva la orden y todos sus detalles: no es un borrado. El estado, la fecha y '
  + 'el usuario los fija el servidor.';

const AYUDA_CABECERA =
  'El estado, las fechas y el usuario los fija el servidor; el resultado por equipo se '
  + 'edita en cada detalle.';

const AYUDA_DETALLE =
  'tipo_equipo y nivel_programado pertenecen al equipo previsto de la visita y son '
  + 'inmutables desde que la orden existe.';

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
    'El técnico indicado no existe en el personal registrado',
  noAbierta: estado =>
    `La orden de trabajo está ${estado} y es inmutable: solo una orden ABIERTA admite `
    + 'cambios.',
  detalleNoEncontrado:
    'Detalle no encontrado en esta orden de trabajo',
  completado: nivel =>
    `COMPLETADO exige declarar el nivel previsto (${nivel}): es lo que significa haber `
    + 'completado el mantenimiento de ese equipo.',
  parcialSinNivel:
    'PARCIAL exige declarar el nivel_completado realmente alcanzado',
  parcialNoMenor: (nivel, previsto) =>
    `PARCIAL exige un nivel_completado MENOR que el previsto: ${nivel} no es menor que `
    + `${previsto}.`,
  parcialImposible:
    'PARCIAL es imposible con un previsto M1: no existe un nivel inferior. Declara '
    + 'COMPLETADO si se hizo, o PENDIENTE si no.',
  parcialAnual: familia =>
    `El equipo ${familia} no admite resultado PARCIAL; su mantenimiento anual solo `
    + 'contempla M3. Declara COMPLETADO, PENDIENTE o NO_APLICA.',
  // Las siete excepciones de cerrar_orden_trabajo(), traducidas una por una. Todas llegan
  // como P0001 -la funcion no usa ERRCODE-, asi que se distinguen por su texto, que quedo
  // inventariado antes de escribir esto.
  cierreOtInexistente:
    'Orden de trabajo no encontrada en esta programación',
  cierreYaCerrada:
    'La orden de trabajo ya no está ABIERTA: no se puede cerrar de nuevo.',
  cierreSinQuincena:
    'La visita no tiene quincena efectiva: sin fase administrativa no se puede cerrar.',
  cierreFechaFutura:
    'fecha_ejecucion es futura respecto a la fecha de negocio de Perú: no se puede '
    + 'registrar como ejecutado un trabajo que todavía no ha ocurrido.',
  cierreVisitaVacia:
    'La visita no prevé ningún equipo: una orden sin alcance no es ejecutable y no puede '
    + 'cerrarse.',
  cierreVisitaIncompleta:
    'Falta registrar el resultado de algún equipo previsto: no se puede cerrar una visita '
    + 'incompleta.',
  cierreExigeFecha:
    'El resultado de la visita afirma que se ejecutó mantenimiento, así que '
    + 'fecha_ejecucion es obligatoria: es el día físico del trabajo y los ciclos la citan. '
    + 'NO_EJECUTADO y NO_APLICA sí admiten fecha nula.',
  motivoObligatorio:
    'motivo_anulacion es obligatorio: deja constancia de por qué se desiste de la orden',
  anularNoAbierta: estado =>
    `La orden de trabajo está ${estado} y es inmutable: solo una orden ABIERTA se puede `
    + 'anular.',
  fechaFormato: campo =>
    `${campo} debe tener el formato AAAA-MM-DD`,
  fechaInvalida: (campo, texto) =>
    `${campo} ${texto} no es una fecha válida`,
  sinNivel: estado =>
    `${estado} exige nivel_completado nulo: no se completó ningún nivel. Envía `
    + '"nivel_completado": null de forma explícita.'
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

// Qué admite una OT según SU estado. Las tres capacidades dependen del mismo hecho:
// impedir_modificar_ot_cerrada solo deja pasar un UPDATE cuando la fila está ABIERTA. No hay
// ninguna regla nueva aquí.
//
// Cada puede_X se publica cuando existe su endpoint, igual que hizo la etapa 3.1 con
// puede_programar y la 4.2 con puede_editar. En 4.3 existen POST /cerrar y PATCH /anular,
// así que los dos flags que faltaban entran ahora, con su ruta ya real detrás.
export const accionesDeOrden = orden => {
  const abierta = orden.estado === ESTADO_ABIERTA;

  return {
    puede_editar: abierta,
    puede_cerrar: abierta,
    puede_anular: abierta,
    motivo: abierta
      ? null
      : MENSAJES.noAbierta(orden.estado)
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

// ------------------------------------------------------------------------------------
// NORMALIZADORES DE 4.2
// ------------------------------------------------------------------------------------

// La columna es jsonb NOT NULL con CHECK jsonb_typeof(evidencias) = 'array'. Un objeto, un
// texto o null no caben: se rechazan aqui con un mensaje legible en vez de dejar que la
// base conteste un 23514. Esta etapa NO sube archivos: solo persiste y lee el JSON.
export const normalizarEvidencias = (
  campo,
  valor
) => {
  if (!Array.isArray(valor)) {
    throw new ValidationError(
      `${campo} debe ser un array JSON. Esta etapa no gestiona la carga de archivos: `
      + 'solo guarda y devuelve la estructura.'
    );
  }

  return valor;
};

// chk_ot_minutos: NULL o mayor que cero. normalizarId ya exige entero positivo y rechaza
// decimales y texto, que es exactamente el dominio; se reutiliza en vez de duplicarlo.
export const normalizarMinutos = valor => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null;
  }

  return normalizarId('minutos', valor);
};

const normalizarDeDominio = (
  campo,
  valor,
  dominio
) => {
  const texto = String(valor ?? '')
    .trim()
    .toUpperCase();

  if (!dominio.includes(texto)) {
    throw new ValidationError(
      `${campo} debe ser ${dominio.join(', ')}`
    );
  }

  return texto;
};

// nivel_completado admite null de forma EXPLICITA: es lo que declara que no se completo
// ningun nivel.
export const normalizarNivel = valor => {
  if (valor === null) {
    return null;
  }

  return normalizarDeDominio(
    'nivel_completado',
    valor,
    NIVELES
  );
};

// ------------------------------------------------------------------------------------
// PREPARAR LOS DOS PATCH
// ------------------------------------------------------------------------------------
// Sin permitirVacio: un PATCH con el cuerpo vacio es un error, y ese es el comportamiento
// que el modulo ya tenia. permitirVacio era exclusivo de la apertura.
export const prepararActualizacionCabecera = datos => {
  const campos = separarCamposEditables(
    datos,
    CAMPOS_EDITABLES_CABECERA,
    {
      sujeto: 'en la orden de trabajo',
      ayuda: AYUDA_CABECERA
    }
  );

  return {
    campos,
    data: {
      tecnico_id: campos.includes('tecnico_id')
        ? (datos.tecnico_id === null || datos.tecnico_id === ''
          ? null
          : normalizarId('tecnico_id', datos.tecnico_id))
        : undefined,
      minutos: campos.includes('minutos')
        ? normalizarMinutos(datos.minutos)
        : undefined,
      observaciones: campos.includes('observaciones')
        ? normalizarTextoOpcional('observaciones', datos.observaciones)
        : undefined,
      evidencias: campos.includes('evidencias')
        ? normalizarEvidencias('evidencias', datos.evidencias)
        : undefined
    }
  };
};

export const prepararActualizacionDetalle = datos => {
  const campos = separarCamposEditables(
    datos,
    CAMPOS_EDITABLES_DETALLE,
    {
      sujeto: 'en el detalle de la orden de trabajo',
      ayuda: AYUDA_DETALLE
    }
  );

  return {
    campos,
    data: {
      estado: campos.includes('estado')
        ? normalizarDeDominio('estado', datos.estado, ESTADOS_DETALLE)
        : undefined,
      nivel_completado: campos.includes('nivel_completado')
        ? normalizarNivel(datos.nivel_completado)
        : undefined,
      observaciones: campos.includes('observaciones')
        ? normalizarTextoOpcional('observaciones', datos.observaciones)
        : undefined,
      evidencias: campos.includes('evidencias')
        ? normalizarEvidencias('evidencias', datos.evidencias)
        : undefined
    }
  };
};

// ------------------------------------------------------------------------------------
// COHERENCIA DEL RESULTADO, SOBRE LA COMBINACION FINAL
// ------------------------------------------------------------------------------------
// El PATCH es parcial, asi que primero se FUSIONA con lo almacenado y despues se valida.
// Validar solo las claves presentes dejaria pasar un {estado:'COMPLETADO'} sobre un detalle
// con nivel NULL.
//
// NO se autocompleta nada. Si alguien manda COMPLETADO sin nivel, se rechaza: el nivel
// ejecutado lo declara quien hizo el trabajo, no se infiere del previsto. Y al pasar a
// PENDIENTE o NO_APLICA hay que enviar "nivel_completado": null de forma explicita, porque
// en este proyecto no existe ningun precedente de inferir un campo ausente -reprogramar
// exige su quincena, y los PATCH de unidades y programas solo normalizan lo que reciben-.
export const resolverResultado = (
  detalle,
  campos,
  data
) => {
  const estado = campos.includes('estado')
    ? data.estado
    : detalle.estado;

  const nivel = campos.includes('nivel_completado')
    ? data.nivel_completado
    : detalle.nivel_completado;

  const previsto = detalle.nivel_programado;

  if (
    estado === 'PENDIENTE' ||
    estado === 'NO_APLICA'
  ) {
    if (nivel !== null) {
      throw new ValidationError(
        MENSAJES.sinNivel(estado),
        409
      );
    }

    return { estado, nivel_completado: null };
  }

  if (estado === 'COMPLETADO') {
    if (nivel !== previsto) {
      throw new ValidationError(
        MENSAJES.completado(previsto),
        409
      );
    }

    return { estado, nivel_completado: nivel };
  }

  // PARCIAL. Las familias anuales quedan fuera: solo tienen M3.
  if (ANUALES.includes(detalle.tipo_equipo)) {
    throw new ValidationError(
      MENSAJES.parcialAnual(detalle.tipo_equipo),
      409
    );
  }

  if (previsto === 'M1') {
    throw new ValidationError(
      MENSAJES.parcialImposible,
      409
    );
  }

  if (nivel === null) {
    throw new ValidationError(
      MENSAJES.parcialSinNivel,
      409
    );
  }

  if (ORDEN[nivel] >= ORDEN[previsto]) {
    throw new ValidationError(
      MENSAJES.parcialNoMenor(nivel, previsto),
      409
    );
  }

  return { estado, nivel_completado: nivel };
};

// ------------------------------------------------------------------------------------
// NORMALIZADORES DE 4.3
// ------------------------------------------------------------------------------------

// El dominio es DATE, no timestamp: la fecha fisica de un trabajo es un dia, sin hora.
// Se valida el formato y que el dia exista de verdad -31 de febrero no-, y nada mas: que
// no sea futura respecto a America/Lima lo impone la funcion de cierre, porque su
// referencia se mueve y la base es la autoridad sobre la fecha de negocio.
//
// No se reutiliza normalizarQuincena de la programacion: esa exige dia 1 o 16, que es la
// regla de la FASE administrativa. La fecha fisica puede ser cualquier dia del mes.
export const normalizarFecha = (
  campo,
  valor
) => {
  if (typeof valor !== 'string') {
    throw new ValidationError(
      MENSAJES.fechaFormato(campo)
    );
  }

  const texto = valor.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new ValidationError(
      MENSAJES.fechaFormato(campo)
    );
  }

  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    throw new ValidationError(
      MENSAJES.fechaInvalida(campo, texto)
    );
  }

  return texto;
};

// Los tres campos del cierre son opcionales: una visita que no se ejecuto se cierra sin
// cuerpo. De ahi permitirVacio, igual que en la apertura.
export const prepararCierre = datos => {
  const cuerpo =
    datos === null || datos === undefined
      ? {}
      : datos;

  separarCamposEditables(
    cuerpo,
    CAMPOS_ADMITIDOS_CIERRE,
    {
      sujeto: 'al cerrar una orden de trabajo',
      ayuda: AYUDA_CIERRE,
      verbo: 'admiten',
      permitirVacio: true
    }
  );

  return {
    fecha_ejecucion:
      cuerpo.fecha_ejecucion === null ||
      cuerpo.fecha_ejecucion === undefined ||
      cuerpo.fecha_ejecucion === ''
        ? null
        : normalizarFecha('fecha_ejecucion', cuerpo.fecha_ejecucion),
    minutos: normalizarMinutos(cuerpo.minutos),
    observaciones: normalizarTextoOpcional(
      'observaciones',
      cuerpo.observaciones
    )
  };
};

// motivo_anulacion es text en la base, sin longitud maxima, asi que no se inventa una: se
// reutiliza el normalizador obligatorio del modulo -que exige string y rechaza el vacio
// tras recortar- con un tope infinito en vez de duplicar esa comprobacion aqui.
export const prepararAnulacion = datos => {
  separarCamposEditables(
    datos,
    CAMPOS_ADMITIDOS_ANULACION,
    {
      sujeto: 'al anular una orden de trabajo',
      ayuda: AYUDA_ANULACION,
      verbo: 'admiten'
    }
  );

  if (typeof datos.motivo_anulacion !== 'string') {
    throw new ValidationError(
      MENSAJES.motivoObligatorio
    );
  }

  return {
    motivo_anulacion: normalizarTextoObligatorio(
      'motivo_anulacion',
      datos.motivo_anulacion,
      Number.POSITIVE_INFINITY
    )
  };
};

// Solo una OT ABIERTA se anula. Mensaje propio: el de la edicion habla de cambios, y aqui
// lo que se rechaza es el desistimiento.
export const exigirAnulable = orden => {
  if (orden.estado !== ESTADO_ABIERTA) {
    throw new ValidationError(
      MENSAJES.anularNoAbierta(orden.estado),
      409
    );
  }

  return orden;
};

export const yaEstaAnulada = orden =>
  orden.estado === ESTADO_ANULADA;

// Solo una OT ABIERTA admite cambios. Se comprueba antes de intentar el UPDATE para dar un
// mensaje operativo; impedir_modificar_ot_cerrada lo volveria a rechazar de todos modos.
export const exigirOrdenAbierta = orden => {
  if (orden.estado !== ESTADO_ABIERTA) {
    throw new ValidationError(
      MENSAJES.noAbierta(orden.estado),
      409
    );
  }

  return orden;
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
