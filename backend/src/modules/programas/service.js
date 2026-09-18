// ==========================================
// PROGRAMAS DE MANTENIMIENTO (TI-PR-01)
// Validaciones y normalización previas a la base de datos.
// ==========================================

export class ProgramaValidationError extends Error {
  constructor(message, status = 400) {
    super(message);

    this.name =
      'ProgramaValidationError';

    this.status = status;
  }
}

export const ESTADOS_PROGRAMA = [
  'ACTIVO',
  'CERRADO',
  'ANULADO'
];

// Solo estos campos pueden editarse. id, created_at y updated_at quedan fuera:
// updated_at lo mantiene el trigger de PostgreSQL. El estado tiene su propio endpoint.
export const CAMPOS_EDITABLES = [
  'codigo',
  'nombre',
  'periodo_inicio',
  'periodo_fin',
  'version',
  'fecha_documento',
  'frecuencia_m1_dias',
  'frecuencia_m2_dias',
  'frecuencia_m3_dias'
];

const CAMPOS_FECHA = [
  'periodo_inicio',
  'periodo_fin',
  'fecha_documento'
];

const CAMPOS_FRECUENCIA = [
  'frecuencia_m1_dias',
  'frecuencia_m2_dias',
  'frecuencia_m3_dias'
];

const LONGITUDES = {
  codigo: 30,
  nombre: 200,
  version: 20
};

export const normalizarId = valor => {
  const id = Number.parseInt(
    valor,
    10
  );

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    throw new ProgramaValidationError(
      'ID de programa no válido'
    );
  }

  return id;
};

const normalizarTexto = (
  campo,
  valor
) => {
  const texto = String(
    valor ?? ''
  ).trim();

  if (!texto) {
    throw new ProgramaValidationError(
      `El campo ${campo} es obligatorio`
    );
  }

  if (
    texto.length >
    LONGITUDES[campo]
  ) {
    throw new ProgramaValidationError(
      `El campo ${campo} supera los ${LONGITUDES[campo]} caracteres`
    );
  }

  return texto;
};

const normalizarFecha = (
  campo,
  valor
) => {
  const texto = String(
    valor ?? ''
  ).trim();

  if (!texto) {
    throw new ProgramaValidationError(
      `El campo ${campo} es obligatorio`
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      texto
    )
  ) {
    throw new ProgramaValidationError(
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
    throw new ProgramaValidationError(
      `El campo ${campo} no es una fecha válida`
    );
  }

  return texto;
};

const normalizarFrecuencia = (
  campo,
  valor
) => {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    throw new ProgramaValidationError(
      `El campo ${campo} es obligatorio`
    );
  }

  const dias = Number(valor);

  if (
    !Number.isInteger(dias) ||
    dias < 1
  ) {
    throw new ProgramaValidationError(
      `El campo ${campo} debe ser un entero mayor que cero`
    );
  }

  return dias;
};

export const normalizarEstado = valor => {
  const estado = String(
    valor ?? ''
  )
    .trim()
    .toUpperCase();

  if (
    !ESTADOS_PROGRAMA.includes(
      estado
    )
  ) {
    throw new ProgramaValidationError(
      `El estado debe ser ${ESTADOS_PROGRAMA.join(', ')}`
    );
  }

  return estado;
};

const validarPeriodo = (
  periodoInicio,
  periodoFin
) => {
  if (periodoFin < periodoInicio) {
    throw new ProgramaValidationError(
      'periodo_fin no puede ser anterior a periodo_inicio'
    );
  }
};

export const prepararNuevoPrograma = datos => {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new ProgramaValidationError(
      'Datos del programa no válidos'
    );
  }

  const programa = {
    codigo: normalizarTexto(
      'codigo',
      datos.codigo
    ),
    nombre: normalizarTexto(
      'nombre',
      datos.nombre
    ),
    version: normalizarTexto(
      'version',
      datos.version
    )
  };

  for (const campo of CAMPOS_FECHA) {
    programa[campo] = normalizarFecha(
      campo,
      datos[campo]
    );
  }

  for (const campo of CAMPOS_FRECUENCIA) {
    programa[campo] = normalizarFrecuencia(
      campo,
      datos[campo]
    );
  }

  validarPeriodo(
    programa.periodo_inicio,
    programa.periodo_fin
  );

  programa.estado =
    datos.estado === undefined ||
    datos.estado === null ||
    String(datos.estado).trim() === ''
      ? 'ACTIVO'
      : normalizarEstado(datos.estado);

  return programa;
};

export const prepararActualizacionPrograma = (
  idParam,
  datos,
  programaActual
) => {
  const id = normalizarId(idParam);

  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new ProgramaValidationError(
      'Datos del programa no válidos'
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      datos,
      'estado'
    )
  ) {
    throw new ProgramaValidationError(
      'El estado se cambia con PATCH /:id/estado'
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
    throw new ProgramaValidationError(
      'No se enviaron campos editables'
    );
  }

  const data = {};

  for (const campo of campos) {
    if (CAMPOS_FECHA.includes(campo)) {
      data[campo] = normalizarFecha(
        campo,
        datos[campo]
      );

      continue;
    }

    if (
      CAMPOS_FRECUENCIA.includes(campo)
    ) {
      data[campo] = normalizarFrecuencia(
        campo,
        datos[campo]
      );

      continue;
    }

    data[campo] = normalizarTexto(
      campo,
      datos[campo]
    );
  }

  // El periodo se valida contra el valor que quedará guardado,
  // aunque solo se envíe uno de los dos extremos.
  const periodoInicio =
    data.periodo_inicio ??
    String(
      programaActual.periodo_inicio
    ).slice(0, 10);

  const periodoFin =
    data.periodo_fin ??
    String(
      programaActual.periodo_fin
    ).slice(0, 10);

  validarPeriodo(
    periodoInicio,
    periodoFin
  );

  return { id, campos, data };
};

export const prepararCambioEstado = (
  idParam,
  estadoParam
) => {
  return {
    id: normalizarId(idParam),
    estado: normalizarEstado(
      estadoParam
    )
  };
};
