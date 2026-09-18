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
// Montadas bajo /api/programas-mantenimiento/:programaId/unidades,
// así que heredan la regla de autorización del módulo 'mantenimiento'.
// Sin DELETE: la política de baja se definirá junto con programacion_mantenimiento.
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
