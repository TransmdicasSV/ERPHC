// ==========================================
// PROGRAMACION DE MANTENIMIENTO (TI-PR-01)
// Reglas de negocio y normalización. No conoce HTTP ni SQL.
// ==========================================
//
// TODO LO QUE HAY AQUI SE MIDIO CONTRA EL MODELO, no se dedujo de memoria. Las
// transiciones se probaron una por una con fixtures en BEGIN ... ROLLBACK antes de escribir
// este archivo, y lo que la base acepta o rechaza está anotado en cada regla.
//
// -------------------------------------------------------------------------------------
// REPROGRAMAR
// -------------------------------------------------------------------------------------
// Cambia UNA sola columna: quincena_reprogramada. quincena_programada es la identidad
// histórica de la obligación y la congela la regla R3 de 20260928_016 -medido: el UPDATE
// se rechaza con "no admite cambiar su identidad original"-.
//
// quincena_efectiva es GENERATED ALWAYS AS COALESCE(quincena_reprogramada,
// quincena_programada) STORED, así que se mueve sola y no se escribe nunca.
//
// Lo que la base ya protege, y por tanto NO se duplica aquí:
//   · día 1 o 16            chk_programacion_quincena_reprogramada (23514)
//   · OT no anulada         regla de 013, viva en 016 (P0001)
//   · colisión de slot      uq_programacion_unidad_quincena_efectiva (23505)
// Se valida el día aquí ADEMAS, solo para contestar un 400 legible en vez de un 23514.
//
// EL ESTADO. La base NO lo fuerza: medido, se puede escribir quincena_reprogramada
// dejando el estado en PROGRAMADO. Pero el modelo sí dice cuál es el estado de una visita
// reprogramada: 20260928_016 enumera las transiciones administrativas que existen como
// "PROYECTADO -> PROGRAMADO, PROGRAMADO <-> REPROGRAMADO, y la cancelacion", y tanto 015
// como 016 dicen que REPROGRAMADO "se alcanza modificando una programacion que ya existe".
// GENERADOR.md lo remata: la obligación espera "hasta que se ejecute o se reprograme
// formalmente (quincena_reprogramada, conservando quincena_programada)". Por eso esta capa
// escribe estado = 'REPROGRAMADO' junto con la quincena.
//
// -------------------------------------------------------------------------------------
// CANCELAR
// -------------------------------------------------------------------------------------
// Cambia solo el estado a CANCELADO. No borra la fila ni sus equipos previstos: son la
// evidencia de qué quedó materializado. Medido: los 4 detalles siguen ahí tras cancelar.
//
// El índice parcial uq_programacion_unidad_quincena_efectiva excluye CANCELADO, así que
// cancelar libera el slot de la quincena y habilita una sustituta. Medido.
//
// Lo que la base protege: CANCELADO es terminal -no vuelve a ningún estado activo- y no se
// puede cancelar con una OT no anulada, ni ABIERTA ni CERRADA. Medido las tres.

import {
  ValidationError
} from '../comun.js';

// chk_programacion_mantenimiento_estado, en el orden del dominio.
export const ESTADOS = [
  'PROYECTADO',
  'PROGRAMADO',
  'EJECUTADO',
  'EJECUTADO_PARCIAL',
  'NO_EJECUTADO',
  'NO_APLICA',
  'REPROGRAMADO',
  'CANCELADO'
];

// Los cuatro RESULTADOS: solo los escribe cerrar_orden_trabajo(). Ninguna operación de
// esta capa puede producirlos.
export const RESULTADOS = [
  'EJECUTADO',
  'EJECUTADO_PARCIAL',
  'NO_EJECUTADO',
  'NO_APLICA'
];

// Las dos únicas puntas de la transición administrativa que 016 enumera para reprogramar:
// PROGRAMADO <-> REPROGRAMADO.
export const ESTADOS_REPROGRAMABLES = [
  'PROGRAMADO',
  'REPROGRAMADO'
];

// Medido: la base acepta cancelar desde PROYECTADO, PROGRAMADO y REPROGRAMADO, y rechaza
// desde CANCELADO -terminal- y desde cualquier resultado, porque un resultado implica una
// OT cerrada y la regla A congela el estado.
export const ESTADOS_CANCELABLES = [
  'PROYECTADO',
  'PROGRAMADO',
  'REPROGRAMADO'
];

export const ESTADO_CANCELADO = 'CANCELADO';
export const ESTADO_REPROGRAMADO = 'REPROGRAMADO';

const esQuincena = texto =>
  /^\d{4}-\d{2}-\d{2}$/.test(texto);

// Espejo de chk_programacion_quincena_reprogramada: el día tiene que ser 1 o 16. Se valida
// aquí para dar un 400 con el motivo en vez de dejar que la base conteste con un 23514
// ilegible. La base sigue siendo la autoridad.
export const normalizarQuincena = (
  campo,
  valor
) => {
  if (typeof valor !== 'string') {
    throw new ValidationError(
      `${campo} es obligatoria y debe ser una fecha AAAA-MM-DD`
    );
  }

  const texto = valor.trim();

  if (!esQuincena(texto)) {
    throw new ValidationError(
      `${campo} debe tener el formato AAAA-MM-DD`
    );
  }

  const [
    anio,
    mes,
    dia
  ] = texto
    .split('-')
    .map(Number);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    throw new ValidationError(
      `${campo} ${texto} no es una fecha válida`
    );
  }

  if (dia !== 1 && dia !== 16) {
    throw new ValidationError(
      `${campo} debe caer el día 1 o el día 16: es una quincena administrativa, `
      + 'no una fecha libre'
    );
  }

  return texto;
};

const normalizarDeDominio = (
  campo,
  valor,
  dominio
) => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null;
  }

  const texto = String(valor)
    .trim()
    .toUpperCase();

  if (!dominio.includes(texto)) {
    throw new ValidationError(
      `${campo} debe ser ${dominio.join(', ')}`
    );
  }

  return texto;
};

const normalizarQuincenaOpcional = (
  campo,
  valor
) => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null;
  }

  return normalizarQuincena(campo, valor);
};

// Los cuatro filtros que el modelo soporta limpiamente: estado -dominio del CHECK-, placa
// -la lleva la unidad-, y quincena efectiva exacta o por rango, que es la columna generada
// sobre la que ya existe el índice parcial.
//
// desplazamiento y limite no son filtros: son paginación defensiva. Una corrida del
// generador materializa cientos de visitas, y devolverlas todas sin tope sería un defecto.
export const normalizarFiltros = (
  query = {}
) => {
  const desde = normalizarQuincenaOpcional(
    'desde',
    query.desde
  );

  const hasta = normalizarQuincenaOpcional(
    'hasta',
    query.hasta
  );

  if (desde && hasta && hasta < desde) {
    throw new ValidationError(
      'hasta no puede ser anterior a desde'
    );
  }

  const quincena = normalizarQuincenaOpcional(
    'quincena_efectiva',
    query.quincena_efectiva
  );

  if (quincena && (desde || hasta)) {
    throw new ValidationError(
      'quincena_efectiva y el rango desde/hasta son excluyentes: usa uno de los dos'
    );
  }

  const entero = (campo, valor, def, max) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return def;
    }

    const n = Number.parseInt(valor, 10);

    if (
      !Number.isInteger(n) ||
      n < 0 ||
      String(valor).trim() !== String(n)
    ) {
      throw new ValidationError(
        `${campo} debe ser un entero no negativo`
      );
    }

    if (max !== undefined && n > max) {
      throw new ValidationError(
        `${campo} no puede superar ${max}`
      );
    }

    return n;
  };

  return {
    estado: normalizarDeDominio(
      'estado',
      query.estado,
      ESTADOS
    ),
    placa: query.placa
      ? String(query.placa).trim().toUpperCase()
      : null,
    quincena_efectiva: quincena,
    desde,
    hasta,
    limite: entero('limite', query.limite, 500, 1000),
    desplazamiento: entero(
      'desplazamiento',
      query.desplazamiento,
      0
    )
  };
};

export const prepararReprogramacion = datos => {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new ValidationError(
      'Datos de la reprogramación no válidos'
    );
  }

  const admitidos = ['quincena_reprogramada'];

  const rechazados = Object.keys(datos)
    .filter(
      campo => !admitidos.includes(campo)
    );

  if (rechazados.length > 0) {
    throw new ValidationError(
      `Estos campos no se aceptan al reprogramar: ${rechazados.join(', ')}. `
      + `Admitidos: ${admitidos.join(', ')}. `
      + 'quincena_programada es la identidad histórica de la obligación y es inmutable; '
      + 'quincena_efectiva se calcula sola; el resultado y el día físico solo los escribe '
      + 'el cierre de la orden de trabajo.'
    );
  }

  return {
    quincena_reprogramada: normalizarQuincena(
      'quincena_reprogramada',
      datos.quincena_reprogramada
    )
  };
};

// Los bloqueos se calculan UNA vez y se usan en dos sitios: el GET de detalle los expone y
// los dos PATCH los aplican. Una sola implementación de la regla.
export const bloqueos = visita => {
  const motivos = {
    reprogramar: null,
    cancelar: null
  };

  if (visita.estado === ESTADO_CANCELADO) {
    motivos.reprogramar =
      'La visita está CANCELADA: es histórica y no vuelve a un estado activo';
    motivos.cancelar = null;
  } else if (RESULTADOS.includes(visita.estado)) {
    motivos.reprogramar =
      `La visita tiene un resultado histórico (${visita.estado}) y no se reprograma`;
    motivos.cancelar =
      `La visita tiene un resultado histórico (${visita.estado}) y no se cancela`;
  } else if (
    !ESTADOS_REPROGRAMABLES.includes(visita.estado)
  ) {
    motivos.reprogramar =
      `Una visita en ${visita.estado} todavía no es una obligación confirmada: `
      + 'promuévela a PROGRAMADO antes de reprogramarla';
  }

  if (visita.ot_no_anuladas > 0) {
    const detalle =
      `tiene ${visita.ot_no_anuladas} orden(es) de trabajo no anulada(s)`;

    motivos.reprogramar = motivos.reprogramar
      ?? `La visita ${detalle}: anula la OT antes de reprogramar`;

    motivos.cancelar = motivos.cancelar
      ?? `La visita ${detalle}: anula la OT antes de cancelar`;
  }

  return {
    puede_reprogramar: motivos.reprogramar === null,
    motivo_reprogramar: motivos.reprogramar,
    puede_cancelar:
      motivos.cancelar === null &&
      visita.estado !== ESTADO_CANCELADO,
    motivo_cancelar:
      visita.estado === ESTADO_CANCELADO
        ? 'La visita ya está CANCELADA'
        : motivos.cancelar
  };
};
