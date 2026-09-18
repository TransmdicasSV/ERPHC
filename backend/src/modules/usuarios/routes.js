import {
  Router
} from 'express';

import {
  requireAdmin
} from '../../middlewares/auth.js';

import {
  listarOperaciones,
  listarPersonalAdministrativo,
  listarUsuarios,
  registrarUsuario,
  actualizarUsuario,
  cambiarEstado
} from './controller.js';
const router = Router();

router.use(
  requireAdmin
);

router.get(
  '/operaciones',
  listarOperaciones
);

router.get(
  '/personal-administrativo',
  listarPersonalAdministrativo
);

router.get(
  '/',
  listarUsuarios
);

router.post(
  '/',
  registrarUsuario
);
router.put(
  '/:id',
  actualizarUsuario
);

router.patch(
  '/:id/estado',
  cambiarEstado
);

export default router;