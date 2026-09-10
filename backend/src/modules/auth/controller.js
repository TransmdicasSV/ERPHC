import {
  logAction
} from '../../services/auditService.js';

import {
  autenticarUsuario,
  AuthError
} from './service.js';

export const login =
  async (req, res) => {
    try {
      const resultado =
        await autenticarUsuario({
          username:
            req.body?.username,

          password:
            req.body?.password
        });

      await logAction(
        resultado.user.id,
        'Inicio de sesión exitoso',
        'usuarios',
        req,
        null,
        {
          id:
            resultado.user.id,

          username:
            resultado.user.username,

          rol:
            resultado.user.rol,

          operacion:
            resultado.user.operacion
        }
      );

      return res.json(
        resultado
      );
    } catch (error) {
      if (
        error instanceof
        AuthError
      ) {
        return res
          .status(
            error.status
          )
          .json({
            error:
              error.message
          });
      }

      console.error(
        'Error durante el inicio de sesión:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error del servidor'
        });
    }
  };