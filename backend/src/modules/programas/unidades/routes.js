import {
  Router
} from 'express';

import {
  listarUnidades,
  obtenerUnidad,
  agregarUnidad,
  editarUnidad
} from './controller.js';

// mergeParams para recibir :programaId del router padre.
const router = Router({
  mergeParams: true
});

// ==========================================
// UNIDADES DE UN PROGRAMA (TI-PR-01)
// Montadas bajo /api/programas-mantenimiento/:programaId/unidades, asi que heredan la
// regla de autorizacion del modulo 'mantenimiento'.
// Sin DELETE: dar de baja una unidad arrastraria sus ciclos, sus anclas y su programacion.
// La politica de baja se define junto con programacion_mantenimiento.
// ==========================================

router.get(
  '/',
  listarUnidades
);

router.get(
  '/:id',
  obtenerUnidad
);

router.post(
  '/',
  agregarUnidad
);

router.put(
  '/:id',
  editarUnidad
);

export default router;
