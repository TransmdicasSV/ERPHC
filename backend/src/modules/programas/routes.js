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

import unidadesRoutes from './unidades/routes.js';
import frecuenciasRoutes from './frecuencias/routes.js';
import programacionRoutes from './programacion/routes.js';

const router = Router();

// ==========================================
// PROGRAMAS DE MANTENIMIENTO (TI-PR-01)
// La autorizacion la aplica authorizeRequest con el modulo 'mantenimiento'.
// No hay DELETE: los programas se cierran o anulan cambiando su estado, y ademas
// fk_programa_unidad_programa, fk_frecuencia_programa y fk_version_programa son
// ON DELETE RESTRICT.
//
// POST responde 501 a proposito: crear un programa exige hoy escribir columnas que los
// cleanup 900/901 eliminan. El motivo va en la respuesta, en controller.js.
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

// ==========================================
// UNIDADES DEL PROGRAMA
// ==========================================

router.use(
  '/:programaId/unidades',
  unidadesRoutes
);

// ==========================================
// FRECUENCIAS DEL PROGRAMA · solo lectura
// ==========================================

router.use(
  '/:programaId/frecuencias',
  frecuenciasRoutes
);

// ==========================================
// PROGRAMACION DEL PROGRAMA · consulta, reprogramar y cancelar
// ==========================================

router.use(
  '/:programaId/programacion',
  programacionRoutes
);

export default router;
