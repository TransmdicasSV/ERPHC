export class EntregaValidationError extends Error {
  constructor(
    message,
    status = 400
  ) {
    super(message);

    this.name =
      'EntregaValidationError';

    this.status = status;
  }
}

export const normalizarTipoMovimiento =
  valor => {
    const tipo =
      String(
        valor || 'Entrega'
      )
        .trim()
        .toLowerCase();

    if (
      ![
        'entrega',
        'devolución',
        'devolucion'
      ].includes(tipo)
    ) {
      throw new EntregaValidationError(
        'Tipo de movimiento no válido'
      );
    }

    return tipo === 'entrega'
      ? 'Entrega'
      : 'Devolución';
  };

export const normalizarDni =
  valor => {
    const dni =
      String(valor || '').trim();

    if (
      !/^[0-9]{1,20}$/.test(dni)
    ) {
      throw new EntregaValidationError(
        'Ingrese un DNI válido, solo con números'
      );
    }

    return dni;
  };

export const normalizarPrecio =
  valor => {
    const precio =
      Number.parseFloat(valor);

    return Number.isNaN(precio)
      ? null
      : precio;
  };

export const normalizarFecha =
  valor =>
    valor || null;

export const obtenerResourceTypeActa =
  mimetype =>
    mimetype ===
    'application/pdf'
      ? 'raw'
      : 'auto';