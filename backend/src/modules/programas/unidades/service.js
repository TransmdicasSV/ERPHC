// ==========================================
// UNIDADES POR PROGRAMA DE MANTENIMIENTO (TI-PR-01)
// Validaciones y normalización previas a la base de datos.
// ==========================================

import {
  normalizarPlaca
} from '../../flota/service.js';

export class UnidadValidationError extends Error {
  constructor(message, status = 400) {
    super(message);

    this.name =
      'UnidadValidationError';

    this.status = status;
  }
}

// El programa y la placa definen la relación: no se cambian por PUT.
// created_at y updated_at los administra PostgreSQL.
export const CAMPOS_EDITABLES = [
  'fecha_base_m1',
  'fecha_base_m2',
  'fecha_base_m3',
  'quincena_arranque',
  'observaciones'
];

const CAMPOS_FECHA = [
  'fecha_base_m1',
  'fecha_base_m2',
  'fecha_base_m3',
  'quincena_arranque'
];

const CAMPOS_RELACION = [
  'id',
  'programa_id',
  'placa'
];

const normalizarEntero = (
  valor,
  mensaje
) => {
  const numero = Number.parseInt(
    valor,
    10
  );

  if (
    !Number.isInteger(numero) ||
    numero < 1 ||
    String(valor).trim() !==
      String(numero)
  ) {
    throw new UnidadValidationError(
      mensaje
    );
  }

  return numero;
};

export const normalizarIdPrograma = valor =>
  normalizarEntero(
    valor,
    'ID de programa no válido'
  );

export const normalizarIdUnidad = valor =>
  normalizarEntero(
    valor,
    'ID de unidad no válido'
  );

export const normalizarPlacaUnidad = valor => {
  const placa = normalizarPlaca(valor);

  if (!placa) {
    throw new UnidadValidationError(
      'La placa es obligatoria'
    );
  }

  if (placa.length > 20) {
    throw new UnidadValidationError(
      'La placa supera los 20 caracteres'
    );
  }

  return placa;
};

// Las fechas son opcionales. Se validan como texto AAAA-MM-DD y se envían
// como texto a PostgreSQL, para que ninguna conversión de JS desplace el día.
const normalizarFechaOpcional = (
  campo,
  valor
) => {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return null;
  }

  const texto = String(valor).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      texto
    )
  ) {
    throw new UnidadValidationError(
      `El campo ${campo} debe tener formato AAAA-MM-DD`
    );
  }

  const fecha = new Date(
    `${texto}T00:00:00Z`
  );

  if (
    Number.isNaN(
      fecha.getTime()
    ) ||
    fecha
      .toISOString()
      .slice(0, 10) !== texto
  ) {
    throw new UnidadValidationError(
      `El campo ${campo} no es una fecha válida`
    );
  }

  return texto;
};

const normalizarObservaciones = valor => {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto = String(valor).trim();

  return texto === ''
    ? null
    : texto;
};

const validarCuerpo = datos => {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new UnidadValidationError(
      'Datos de la unidad no válidos'
    );
  }
};

export const prepararNuevaUnidad = (
  programaIdParam,
  datos
) => {
  const programaId =
    normalizarIdPrograma(
      programaIdParam
    );

  validarCuerpo(datos);

  // El programa lo define la ruta. Si el cuerpo trae otro, es un error del cliente.
  if (
    datos.programa_id !== undefined &&
    String(datos.programa_id) !==
      String(programaId)
  ) {
    throw new UnidadValidationError(
      'El programa_id del cuerpo no coincide con el de la ruta'
    );
  }

  const unidad = {
    programa_id: programaId,
    placa: normalizarPlacaUnidad(
      datos.placa
    ),
    observaciones:
      normalizarObservaciones(
        datos.observaciones
      )
  };

  for (const campo of CAMPOS_FECHA) {
    unidad[campo] =
      normalizarFechaOpcional(
        campo,
        datos[campo]
      );
  }

  return unidad;
};

export const prepararActualizacionUnidad = (
  programaIdParam,
  idParam,
  datos
) => {
  const programaId =
    normalizarIdPrograma(
      programaIdParam
    );

  const id = normalizarIdUnidad(
    idParam
  );

  validarCuerpo(datos);

  const relacionEnviada =
    CAMPOS_RELACION.filter(campo =>
      Object.prototype.hasOwnProperty.call(
        datos,
        campo
      )
    );

  if (relacionEnviada.length) {
    throw new UnidadValidationError(
      `No se puede modificar ${relacionEnviada.join(', ')} de una unidad ya asociada`
    );
  }

  const campos = CAMPOS_EDITABLES.filter(
    campo =>
      Object.prototype.hasOwnProperty.call(
        datos,
        campo
      )
  );

  if (!campos.length) {
    throw new UnidadValidationError(
      'No se enviaron campos editables'
    );
  }

  const data = {};

  for (const campo of campos) {
    data[campo] = CAMPOS_FECHA.includes(
      campo
    )
      ? normalizarFechaOpcional(
        campo,
        datos[campo]
      )
      : normalizarObservaciones(
        datos[campo]
      );
  }

  return { programaId, id, campos, data };
};

export const prepararFiltroUnidades = (
  programaIdParam,
  query
) => {
  const programaId =
    normalizarIdPrograma(
      programaIdParam
    );

  const placa = query?.placa
    ? normalizarPlacaUnidad(
      query.placa
    )
    : null;

  return { programaId, placa };
};
