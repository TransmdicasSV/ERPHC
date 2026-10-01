// ==========================================
// PIEZAS COMPARTIDAS DEL MODULO PROGRAMAS (TI-PR-01)
// ==========================================
// Vive dentro del modulo, no en una carpeta global de utilidades: lo usan programas y
// unidades, y nadie mas. Cada pieza esta aqui porque estaba duplicada literalmente en los
// dos controllers o en los dos services, no por gusto de abstraer.

export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);

    this.name = 'ValidationError';
    this.status = status;
  }
}

export const noEncontrado = mensaje =>
  new ValidationError(mensaje, 404);

// etiqueta va en el mensaje para que cada ruta diga de QUE id habla.
export const normalizarId = (
  etiqueta,
  valor
) => {
  const id = Number.parseInt(
    valor,
    10
  );

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    String(valor).trim() !== String(id)
  ) {
    throw new ValidationError(
      `${etiqueta} debe ser un entero positivo`
    );
  }

  return id;
};

export const normalizarTextoObligatorio = (
  campo,
  valor,
  maximo
) => {
  if (typeof valor !== 'string') {
    throw new ValidationError(
      `${campo} es obligatorio`
    );
  }

  const texto = valor.trim();

  if (!texto) {
    throw new ValidationError(
      `${campo} es obligatorio`
    );
  }

  if (texto.length > maximo) {
    throw new ValidationError(
      `${campo} no puede superar ${maximo} caracteres`
    );
  }

  return texto;
};

export const normalizarTextoOpcional = (
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

  if (typeof valor !== 'string') {
    throw new ValidationError(
      `${campo} debe ser texto`
    );
  }

  const texto = valor.trim();

  return texto === ''
    ? null
    : texto;
};

// Rechaza por NOMBRE lo que no se edita, en vez de ignorarlo en silencio: quien intente
// escribir una columna que el cleanup elimina tiene que enterarse. Devuelve la lista de
// campos realmente enviados, en el orden de la lista blanca.
//
// permitirVacio existe para las ALTAS cuyos campos son todos opcionales -abrir una orden de
// trabajo, por ejemplo-: ahi un cuerpo vacio es valido y no hay nada que reprochar. En un
// PATCH sigue siendo un error, que es el comportamiento por defecto.
export const separarCamposEditables = (
  datos,
  editables,
  { sujeto, ayuda = '', verbo = 'editan', permitirVacio = false }
) => {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new ValidationError(
      `Datos ${sujeto} no válidos`
    );
  }

  const enviados = Object.keys(datos);

  const rechazados = enviados.filter(
    campo => !editables.includes(campo)
  );

  if (rechazados.length > 0) {
    throw new ValidationError(
      `Estos campos no se ${verbo} ${sujeto}: ${rechazados.join(', ')}. `
      + `${verbo === 'editan' ? 'Editables' : 'Admitidos'}: ${editables.join(', ')}.`
      + (ayuda ? ` ${ayuda}` : '')
    );
  }

  const campos = editables.filter(
    campo => enviados.includes(campo)
  );

  if (
    campos.length === 0 &&
    !permitirVacio
  ) {
    throw new ValidationError(
      `Nada que actualizar. Editables: ${editables.join(', ')}`
    );
  }

  return campos;
};

// ==========================================
// TRADUCCION DE ERRORES A HTTP
// ==========================================
// PostgreSQL es la autoridad: los CHECK, las FK y los UNIQUE rechazan antes que cualquier
// validacion de aqui. Esta funcion solo traduce ese rechazo; nunca devuelve el mensaje
// crudo del driver, que puede citar nombres de columnas y de constraints.
//
// mensajes permite que cada dominio ponga su texto por constraint sin repetir la taxonomia.
const HTTP_POR_CODIGO = {
  23505: 409,
  23503: 409,
  23514: 400,
  23502: 422,
  22008: 400,
  22007: 400
};

export const traducirError = (
  error,
  res,
  {
    mensajeGenerico,
    mensajes = {},
    porCodigo = {},
    reglasDeNegocio = []
  }
) => {
  if (error instanceof ValidationError) {
    return res
      .status(error.status)
      .json({
        error: error.message
      });
  }

  // P0001 es un RAISE EXCEPTION de un trigger: una regla de negocio de 013/015/016, no un
  // fallo del servidor. Nunca puede contestar 500. Cada dominio declara qué patrón de su
  // mensaje corresponde a qué respuesta; el texto del driver no se devuelve nunca.
  if (error.code === 'P0001') {
    const regla = reglasDeNegocio.find(
      r => r.patron.test(error.message ?? '')
    );

    return res
      .status(regla?.status ?? 409)
      .json({
        error: regla?.error ?? mensajeGenerico,
        code: regla?.code ?? 'REGLA_DE_NEGOCIO'
      });
  }

  const porConstraint =
    error.constraint
      ? mensajes[error.constraint]
      : undefined;

  if (porConstraint) {
    return res
      .status(porConstraint.status)
      .json({
        error: porConstraint.error,
        constraint: error.constraint
      });
  }

  const estado =
    porCodigo[error.code] ??
    HTTP_POR_CODIGO[error.code];

  if (estado) {
    return res
      .status(estado)
      .json({
        error: mensajeGenerico,
        constraint: error.constraint ?? null
      });
  }

  // El detalle tecnico se queda en el log del servidor, no en la respuesta publica.
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

// Quita el try/catch identico que tenian los nueve handlers.
export const manejar = (
  fn,
  opciones
) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return traducirError(
      error,
      res,
      opciones
    );
  }
};
