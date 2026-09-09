import { Router } from 'express';

import {
  requirePermiso
} from '../src/middlewares/auth.js';

import {
  receiveTicketEvidence
} from '../src/middlewares/upload.js';

import {
  createSupportTicket
} from '../controllers/ticketCreateController.js';

export const publicTicketCreationRoutes = Router();
export const protectedTicketCreationRoutes = Router();

// Creación desde el portal público
publicTicketCreationRoutes.post(
  '/incidentes-soporte',
  receiveTicketEvidence,
  createSupportTicket
);

// Creación desde el panel administrativo
protectedTicketCreationRoutes.post(
  '/',
  requirePermiso('tickets', 'crear'),
  receiveTicketEvidence,
  createSupportTicket
);
