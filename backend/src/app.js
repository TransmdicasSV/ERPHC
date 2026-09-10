import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import personalRoutes from './modules/personal/routes.js';
import vehiculosRoutes, {
  maestroRoutes
} from './modules/flota/routes.js';
import inspeccionesRoutes from './modules/inspecciones/routes.js';
import mantenimientosRoutes from './modules/mantenimiento/routes.js';
import statsRoutes from './modules/stats/routes.js';
import publicRoutes from './modules/publico/routes.js';

import {
  legacyEntregasRoutes,
  entregasRoutes
} from './modules/entregas/routes.js';
import {
  apiReportesRoutes,
  reportesRoutes
} from './modules/reportes/routes.js';

import {
  authenticateRequest,
  authorizeRequest
} from './middlewares/security.js'

import ticketsRoutes, {
  publicTicketCreationRoutes,
  protectedTicketCreationRoutes
} from './modules/tickets/routes.js';

import usuariosRoutes from './modules/usuarios/routes.js';
import authRoutes from './modules/auth/routes.js';

const app = express();

app.set('trust proxy', 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(
  __dirname,
  '..',
  'uploads'
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

app.use(cors());

app.use(
  express.json({
    limit: '50mb'
  })
);

app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true
  })
);

app.use(
  '/uploads',
  express.static(uploadDir)
);

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/public',
  publicRoutes
);

app.use(
  '/api/public',
  publicTicketCreationRoutes
);

// ==========================================
// SEGURIDAD GLOBAL
// ==========================================

app.use(
  authenticateRequest
);

app.use(
  authorizeRequest
);

// ==========================================
// RUTAS PROTEGIDAS
// ==========================================

app.use(
  '/api/usuarios',
  usuariosRoutes
);

app.use(
  '/api/personal',
  personalRoutes
);

app.use(
  '/api/maestro',
  maestroRoutes
);

app.use(
  '/vehiculos',
  vehiculosRoutes
);

app.use(
  '/inspecciones',
  inspeccionesRoutes
);

app.use(
  '/mantenimientos',
  mantenimientosRoutes
);

app.use(
  '/stats',
  statsRoutes
);

app.use(
  '/api/incidentes',
  ticketsRoutes
);

app.use(
  '/api/incidentes_soporte',
  protectedTicketCreationRoutes
);

app.use(
  '/api/reportes',
  apiReportesRoutes
);

app.use(
  '/reportes',
  reportesRoutes
);

app.use(
  '/entregas',
  legacyEntregasRoutes
);

app.use(
  '/api/entregas',
  entregasRoutes
);

export default app;
