import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { login } from './controller.js';

const router = Router();

const limitarIntentosLogin = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 20,

  skipSuccessfulRequests: true,

  standardHeaders: 'draft-8',
  legacyHeaders: false,

  message: {
    error:
      'Demasiados intentos de inicio de sesión. Espera unos minutos y vuelve a intentarlo.'
  }
});

router.post(
  '/login',
  limitarIntentosLogin,
  login
);

export default router;