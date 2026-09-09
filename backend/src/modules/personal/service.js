export class PersonalValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'PersonalValidationError';
    this.status = status;
  }
}

export const validarNuevoPersonal = datos => {
  const {
    nombre_completo,
    dni
  } = datos || {};

  if (
    !nombre_completo ||
    !dni
  ) {
    throw new PersonalValidationError(
      'Nombre y DNI son obligatorios'
    );
  }

  return datos;
};