import { Router } from 'express';

import {
  requireAdmin,
  requirePermiso
} from '../src/middlewares/auth.js';

import { upload } from '../src/middlewares/upload.js';

import {
  opcionesTickets,
  opcionesReportePulseras
} from '../controllers/ticketOptionsController.js';

import {
  listarTickets,
  actualizarTicket,
  eliminarTicket
} from '../controllers/ticketsController.js';

const router = Router();

// Opciones para crear tickets
router.get(
  '/opciones',
  opcionesTickets
);

// Opciones para reportes de pulseras
router.get(
  '/pulseras/opciones',
  requirePermiso('tickets', 'crear'),
  opcionesReportePulseras
);

// Listar tickets
router.get(
  '/',
  listarTickets
);

// Actualizar estado y evidencia
router.put(
  '/:id',
  upload.single('evidencia'),
  actualizarTicket
);

// Eliminar ticket: solo administrador
router.delete(
  '/:id',
  requireAdmin,
  eliminarTicket
);

export default router;
