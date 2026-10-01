import {
  Router
} from 'express';

import {
  listarProgramacion,
  obtenerVisita,
  programar,
  reprogramar,
  cancelar
} from './controller.js';

import ordenesRoutes from './ordenes/routes.js';

// mergeParams para recibir :programaId del router padre.
const router = Router({
  mergeParams: true
});

// ==========================================
// PROGRAMACION DE MANTENIMIENTO (TI-PR-01)
// Montadas bajo /api/programas-mantenimiento/:programaId/programacion, asi que heredan la
// regla de autorizacion del modulo 'mantenimiento'.
//
// SIN POST: crear programacion es trabajo del generador, no de un alta manual por API.
// SIN DELETE: la base lo aceptaria -y programacion_mantenimiento_equipos tiene ON DELETE
// CASCADE, asi que se llevaria la evidencia del alcance-, pero borrar una visita no es una
// operacion del negocio. Una visita se reprograma o se cancela, y la fila permanece.
// ==========================================

router.get(
  '/',
  listarProgramacion
);

router.get(
  '/:id',
  obtenerVisita
);

// PATCH y no PUT: cada una toca una sola cosa. Programar escribe exclusivamente el estado;
// reprogramar escribe exclusivamente quincena_reprogramada -y el estado que el modelo le
// corresponde-; cancelar escribe exclusivamente el estado.
//
// programar es el acto humano que 014 exige para poder abrir una OT: convierte la
// proyeccion del generador en una obligacion confirmada, sobre la MISMA fila.
router.patch(
  '/:id/programar',
  programar
);

router.patch(
  '/:id/reprogramar',
  reprogramar
);

router.patch(
  '/:id/cancelar',
  cancelar
);

// Las ordenes de trabajo cuelgan de la visita, que es de quien dependen por FK obligatoria.
// El parametro se llama :programacionId y no :id porque dentro de ese router conviven con
// el :otId de la propia orden, y dos ids sin nombre propio se confunden.
//
// No colisiona con las rutas de arriba: '/:id' exige un solo segmento, y las de dos
// segmentos terminan en un literal distinto -reprogramar, cancelar, programar-.
router.use(
  '/:programacionId/ordenes-trabajo',
  ordenesRoutes
);

export default router;
