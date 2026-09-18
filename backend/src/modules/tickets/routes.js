import {
  Router
} from 'express';

import {
  requireAdmin,
  requirePermiso
} from '../../middlewares/auth.js';

import {
  upload,
  receiveTicketEvidence
} from '../../middlewares/upload.js';

import {
  opcionesTickets,
  opcionesReportePulseras,
  crearReportePulsera,
  createSupportTicket,
  listarTickets,
  actualizarTicket,
  eliminarTicket
} from './controller.js';

// ==========================================
// /api/incidentes
// ==========================================

const router = Router();

router.get(
  '/opciones',
  opcionesTickets
);
// Opciones para reporte de pulseras
router.get(
  '/pulseras/opciones',
  requirePermiso('tickets', 'crear'),
  opcionesReportePulseras
);

// Crear reporte de pulsera
router.post(
  '/pulseras',
  requirePermiso('tickets', 'crear'),
  upload.single('evidencia'),
  crearReportePulsera
);

router.get(
  '/',
  listarTickets
);

router.put(
  '/:id',
  upload.single(
    'evidencia'
  ),
  actualizarTicket
);

router.delete(
  '/:id',
  requireAdmin,
  eliminarTicket
);

// ==========================================
// /api/incidentes_soporte
// ==========================================

export const protectedTicketCreationRoutes =
  Router();

protectedTicketCreationRoutes.post(
  '/',
  requirePermiso(
    'tickets',
    'crear'
  ),
  receiveTicketEvidence,
  createSupportTicket
);

// ==========================================
// /api/public
// ==========================================

export const publicTicketCreationRoutes =
  Router();

publicTicketCreationRoutes.post(
  '/incidentes-soporte',
  receiveTicketEvidence,
  createSupportTicket
);

export default router;