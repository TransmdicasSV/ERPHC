import {
  Router
} from 'express';

import {
  abrirOrden,
  listarOrdenes,
  obtenerOrden,
  editarOrden,
  editarDetalle
} from './controller.js';

// mergeParams para recibir :programaId y :programacionId de los routers padres.
const router = Router({
  mergeParams: true
});

// ==========================================
// ORDENES DE TRABAJO (TI-PR-01)
// Montadas bajo /api/programas-mantenimiento/:programaId/programacion/:programacionId/
// ordenes-trabajo, asi que heredan la regla de autorizacion del modulo 'mantenimiento' que
// ya declara security.js para toda la familia. No hace falta tocar app.js ni security.js.
//
// ETAPA 4.2: abrir, listar, obtener, editar la cabecera y registrar el resultado de un
// equipo. Cerrar y anular son de la etapa 4.3.
//
// SIN POST de detalles, ni ahora ni despues: el conjunto de detalles es exactamente el de
// los equipos previstos de la visita, y se materializa al abrir, en la misma transaccion.
// Anadir uno a mano permitiria una OT con un alcance distinto al que congelo 016 R2.
//
// SIN DELETE: la regla R1 de 20260928_016 prohibe borrar una OT en cualquier estado, porque
// su existencia es lo que vuelve historico el alcance de la visita. Una OT abierta por
// error se anula, con su motivo.
// ==========================================

router.post(
  '/',
  abrirOrden
);

router.get(
  '/',
  listarOrdenes
);

router.get(
  '/:otId',
  obtenerOrden
);

// PATCH y no PUT: cada uno toca un subconjunto declarado de campos y deja el resto intacto.
router.patch(
  '/:otId',
  editarOrden
);

// El resultado se registra POR EQUIPO. No hay POST ni DELETE de detalles: el conjunto es
// exactamente el de los equipos previstos y se materializo al abrir la orden.
router.patch(
  '/:otId/detalles/:detalleId',
  editarDetalle
);

export default router;
