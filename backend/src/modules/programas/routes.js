import {
  Router
} from 'express';

import {
  listarProgramas,
  obtenerPrograma,
  registrarPrograma,
  editarPrograma,
  cambiarEstadoPrograma
} from './controller.js';

const router = Router();

// ==========================================
// PROGRAMAS DE MANTENIMIENTO (TI-PR-01)
// La autorización la aplica authorizeRequest con el módulo 'mantenimiento'.
// No hay DELETE: los programas se cierran o anulan cambiando su estado.
// ==========================================

router.get(
  '/',
  listarProgramas
);

router.get(
  '/:id',
  obtenerPrograma
);

router.post(
  '/',
  registrarPrograma
);

router.put(
  '/:id',
  editarPrograma
);

router.patch(
  '/:id/estado',
  cambiarEstadoPrograma
);

export default router;
