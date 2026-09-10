export const fechaISOValida =
  value => {
    if (
      typeof value !==
        'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {
      return false;
    }

    const date =
      new Date(
        `${value}T00:00:00Z`
      );

    return (
      Number.isFinite(
        date.getTime()
      ) &&
      date
        .toISOString()
        .slice(0, 10) ===
        value
    );
  };

export const validarParametrosMaster =
  ({
    startDate,
    endDate,
    operacion
  }) => {
    if (
      !fechaISOValida(
        startDate
      ) ||
      !fechaISOValida(
        endDate
      ) ||
      startDate > endDate
    ) {
      const error =
        new Error(
          'El rango de fechas no es válido'
        );

      error.status = 400;

      throw error;
    }

    if (
      typeof operacion !==
        'string' ||
      !operacion.trim() ||
      operacion.length > 100
    ) {
      const error =
        new Error(
          'Seleccione una operación válida'
        );

      error.status = 400;

      throw error;
    }

    return {
      startDate,
      endDate,
      operacion:
        operacion.trim()
    };
  };