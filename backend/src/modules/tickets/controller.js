import {
  uploadToCloudinary,
  deleteFromCloudinary
} from '../../services/cloudinaryService.js';

import {
  logAction
} from '../../services/auditService.js';

import {
  obtenerVehiculosTickets,
  obtenerPersonalTickets,
  obtenerPersonaActivaPorId,
  insertarTicket,
  obtenerTickets,
  obtenerTicketPorId,
  actualizarEstadoTicket,
  obtenerUltimaInspeccion,
  actualizarInspeccionTicket,
  eliminarTicketPorId,
  obtenerUsuarioTicket
} from './repository.js';

import {
  contextoTicket,
  OPERACIONES_INVALIDAS_TICKET,
  IMPLEMENTOS_PERMITIDOS,
  componenteConFalla,
  obtenerOperacionesUnicas
} from './service.js';


// ==========================================
// OPCIONES DE TICKETS DE UNIDADES
// ==========================================

export const opcionesTickets =
  async (req, res) => {
    try {
      const contexto =
        await contextoTicket(req);

      const [
        vehiculos,
        personal
      ] =
        await Promise.all([
          obtenerVehiculosTickets(
            contexto.operacion,
            OPERACIONES_INVALIDAS_TICKET
          ),

          obtenerPersonalTickets()
        ]);

      const operaciones =
        obtenerOperacionesUnicas(
          vehiculos
        );

      return res.json({
        vehiculos,
        personal,
        operaciones,
        operacionAsignada:
          contexto.operacion
      });

    } catch (error) {
      console.error(
        'Error cargando opciones de tickets:',
        error
      );

      return res
        .status(
          error.status || 500
        )
        .json({
          error:
            error.status === 401 ||
            error.status === 403
              ? error.message
              : 'Error al cargar opciones de tickets'
        });
    }
  };


// ==========================================
// PULSERAS
// TEMPORALMENTE DESHABILITADO
// ==========================================

export const opcionesReportePulseras =
  async (req, res) => {
    return res.status(503).json({
      error:
        'El módulo de tickets de pulseras se encuentra temporalmente en rediseño'
    });
  };


// ==========================================
// CREAR TICKET DE UNIDAD
// ==========================================
export const createSupportTicket =
  async (req, res) => {
    const {
  placa,
  tipo_solicitud,
  descripcion,
  implemento
} = req.body || {};

    const placaFinal =
      String(
        placa || ''
      )
        .trim()
        .toUpperCase();

    const tipoSolicitudFinal =
      String(
        tipo_solicitud || ''
      ).trim();

    const descripcionFinal =
      String(
        descripcion || ''
      ).trim();

    

    const implementoFinal =
      tipoSolicitudFinal ===
      'Soporte Técnico'
        ? String(
            implemento || ''
          ).trim()
        : null;


    // ========================================
    // VALIDACIONES
    // ========================================

    if (
      !placaFinal ||
      placaFinal.length > 20
    ) {
      return res
        .status(400)
        .json({
          error:
            'Debe seleccionar una placa válida'
        });
    }

    if (!tipoSolicitudFinal) {
      return res
        .status(400)
        .json({
          error:
            'Debe indicar el tipo de solicitud'
        });
    }

    if (!descripcionFinal) {
      return res
        .status(400)
        .json({
          error:
            'La descripción es obligatoria'
        });
    }

    if (
      tipoSolicitudFinal ===
        'Soporte Técnico' &&
      !IMPLEMENTOS_PERMITIDOS.includes(
        implementoFinal
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Seleccione el implemento que presenta la falla'
        });
    }


    const evidenciasSubidas = [];

    let ticketCreado = false;


    try {
      const contexto =
        await contextoTicket(
          req,
          'crear'
        );
        const usuarioTicket =
  await obtenerUsuarioTicket(
    req.user.id
  );

if (!usuarioTicket?.persona_id) {
  return res.status(400).json({
    error:
      'El usuario actual no está vinculado a una persona'
  });
}

const personaIdFinal =
  Number(usuarioTicket.persona_id);


      // ========================================
      // VALIDAR PERSONA
      // ========================================

      const persona =
        await obtenerPersonaActivaPorId(
          personaIdFinal
        );

      if (!persona) {
        return res
          .status(400)
          .json({
            error:
              'La persona seleccionada no existe o está inactiva'
          });
      }


      // ========================================
      // VALIDAR OPERACIÓN DEL SUPERVISOR
      // ========================================

      if (
        contexto.rol ===
          'supervisor' &&
        String(
          persona.operacion || ''
        )
          .trim()
          .toLowerCase() !==
        String(
          contexto.operacion || ''
        )
          .trim()
          .toLowerCase()
      ) {
        return res
          .status(403)
          .json({
            error:
              'La persona seleccionada no pertenece a su operación'
          });
      }


      // ========================================
      // SUBIR EVIDENCIAS INICIALES
      // ========================================

      for (
        const archivo of
        req.files || []
      ) {
        const url =
          await uploadToCloudinary(
            archivo.buffer,
            'tickets_unidades/evidencias_iniciales',
            'image'
          );

        evidenciasSubidas.push({
          tipo: 'inicial',
          url
        });
      }


      // ========================================
      // CREAR
      // ========================================

  const ticket =
  await insertarTicket({
    placa: placaFinal,
    personaId: personaIdFinal,
    tipoSolicitud: tipoSolicitudFinal,
    descripcion: descripcionFinal,
    implemento: implementoFinal,
    evidencias: evidenciasSubidas
  });


      if (!ticket) {
        throw new Error(
          'No se pudo crear el ticket'
        );
      }


      ticketCreado = true;


      await logAction(
        req.user?.id || null,

        `Creó ticket de unidad #${ticket.id}`,

        'tickets_unidades',

        req,

        null,

        ticket
      );


      return res
        .status(201)
        .json({
          success: true,
          id:
            ticket.id,
          ticket
        });

    } catch (error) {
      if (!ticketCreado) {
        await Promise.allSettled(
          evidenciasSubidas.map(
            evidencia =>
              deleteFromCloudinary(
                evidencia.url
              )
          )
        );
      }


      console.error(
        'Error registrando ticket de unidad:',
        error
      );


      if (
        error.status === 401 ||
        error.status === 403
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


      if (
        error.code ===
        '23503'
      ) {
        return res
          .status(400)
          .json({
            error:
              'La placa o la persona seleccionada ya no existe'
          });
      }


      return res
        .status(500)
        .json({
          error:
            'Error al registrar el ticket'
        });
    }
  };


// ==========================================
// LISTAR
// ==========================================

export const listarTickets =
  async (req, res) => {
    try {
      const contexto =
        await contextoTicket(req);

      const tickets =
        await obtenerTickets(
          contexto.operacion
        );

      return res.json(
        tickets
      );

    } catch (error) {
      console.error(
        'Error obteniendo tickets:',
        error
      );

      return res
        .status(
          error.status || 500
        )
        .json({
          error:
            error.status === 401 ||
            error.status === 403
              ? error.message
              : 'Error al obtener tickets'
        });
    }
  };


// ==========================================
// ACTUALIZAR ESTADO
// ==========================================

export const actualizarTicket =
  async (req, res) => {
    const { id } =
      req.params;

    const {
      estado,
      resolucion_desc
    } =
      req.body || {};


    if (
      !id ||
      !/^\d+$/.test(
        String(id)
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'El identificador del ticket no es válido'
        });
    }


    const estadoFinal =
      String(
        estado || ''
      ).trim();


    if (
      ![
        'Pendiente',
        'En Proceso',
        'Resuelto'
      ].includes(
        estadoFinal
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'El estado debe ser Pendiente, En Proceso o Resuelto'
        });
    }


    // ========================================
    // EVIDENCIA OBLIGATORIA AL RESOLVER
    // ========================================

    if (
      estadoFinal ===
        'Resuelto' &&
      !req.file
    ) {
      return res
        .status(400)
        .json({
          error:
            'Debe adjuntar una evidencia para resolver el ticket'
        });
    }


    let evidenciaUrl =
      null;

    let evidenciaPersistida =
      false;


    try {
      const valoresAnteriores =
        await obtenerTicketPorId(
          id
        );


      if (!valoresAnteriores) {
        return res
          .status(404)
          .json({
            error:
              'Ticket no encontrado'
          });
      }


      // ========================================
      // SUBIR EVIDENCIA DE CIERRE
      // ========================================

      if (req.file) {
        evidenciaUrl =
          await uploadToCloudinary(
            req.file.buffer,
            'tickets_unidades/evidencias_cierre',
            'image'
          );
      }


      const valoresActuales =
        await actualizarEstadoTicket({
          id,

          estado:
            estadoFinal,

          evidencia:
            evidenciaUrl
        });


      if (!valoresActuales) {
        if (evidenciaUrl) {
          await deleteFromCloudinary(
            evidenciaUrl
          );
        }

        return res
          .status(404)
          .json({
            error:
              'Ticket no encontrado'
          });
      }


      evidenciaPersistida =
        Boolean(
          evidenciaUrl
        );


      await logAction(
        req.user?.id || null,

        `Actualizó ticket de unidad #${id} a ${estadoFinal}`,

        'tickets_unidades',

        req,

        valoresAnteriores,

        valoresActuales
      );


      // ========================================
      // SI SE RESUELVE, REPARAR INSPECCIÓN
      // ========================================

      if (
        estadoFinal ===
          'Resuelto' &&
        valoresActuales.placa
      ) {
        await repararInspeccionRelacionada({
          req,

          ticket:
            valoresActuales,

          ticketId:
            id,

          resolucion:
            resolucion_desc
        });
      }


      return res.json({
        success: true,

        ticket:
          valoresActuales,

        evidenciaUrl
      });


    } catch (error) {
      if (
        evidenciaUrl &&
        !evidenciaPersistida
      ) {
        await deleteFromCloudinary(
          evidenciaUrl
        );
      }


      console.error(
        'Error actualizando ticket:',
        error
      );


      if (
        error.message?.includes(
          'No se puede resolver el ticket sin evidencia'
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              error.message
          });
      }


      return res
        .status(500)
        .json({
          error:
            'Error al actualizar el ticket'
        });
    }
  };


// ==========================================
// REPARAR INSPECCIÓN RELACIONADA
// ==========================================

const repararInspeccionRelacionada =
  async ({
    req,
    ticket,
    ticketId,
    resolucion
  }) => {
    const inspeccionAnterior =
      await obtenerUltimaInspeccion(
        ticket.placa
      );


    if (!inspeccionAnterior) {
      return;
    }


    let tablet =
      inspeccionAnterior.tablet;

    let radio =
      inspeccionAnterior.radio;

    let camaras =
      inspeccionAnterior.camaras;

    let fueActualizada =
      false;


    if (
      componenteConFalla(
        tablet
      )
    ) {
      tablet = 'OK';
      fueActualizada = true;
    }


    if (
      componenteConFalla(
        radio
      )
    ) {
      radio = 'OK';
      fueActualizada = true;
    }


    if (
      componenteConFalla(
        camaras
      )
    ) {
      camaras = 'OK';
      fueActualizada = true;
    }


    if (!fueActualizada) {
      return;
    }


    const resolucionFinal =
      String(
        resolucion || ''
      ).trim();


    const detalleResolucion =
      resolucionFinal
        ? `: ${resolucionFinal}`
        : '';


    const nuevaObservacion =
      `[Reparado por TKT-${ticketId}${detalleResolucion}]`;


    const observaciones =
      inspeccionAnterior
        .observaciones
        ? `${inspeccionAnterior.observaciones} ${nuevaObservacion}`
        : nuevaObservacion;


    const inspeccionActual =
      await actualizarInspeccionTicket({
        id:
          inspeccionAnterior.id,

        tablet,

        radio,

        camaras,

        observaciones
      });


    await logAction(
      req.user?.id || null,

      `Reparó última inspección para ${ticket.placa} mediante TKT-${ticketId}`,

      'inspecciones_flota',

      req,

      inspeccionAnterior,

      inspeccionActual
    );
  };


// ==========================================
// ELIMINAR
// ==========================================

export const eliminarTicket =
  async (req, res) => {
    const { id } =
      req.params;


    if (
      !id ||
      !/^\d+$/.test(
        String(id)
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'El identificador del ticket no es válido'
        });
    }


    try {
      const ticketEliminado =
        await eliminarTicketPorId(
          id
        );


      if (!ticketEliminado) {
        return res
          .status(404)
          .json({
            error:
              'Ticket no encontrado'
          });
      }


      // ========================================
      // BORRAR EVIDENCIAS DE CLOUDINARY
      // ========================================

      const evidencias =
        Array.isArray(
          ticketEliminado.evidencias
        )
          ? ticketEliminado.evidencias
          : [];


      const urls =
        evidencias
          .map(
            evidencia =>
              typeof evidencia ===
                'string'
                ? evidencia
                : evidencia?.url
          )
          .filter(Boolean);


      await Promise.allSettled(
        urls.map(
          url =>
            deleteFromCloudinary(
              url
            )
        )
      );


      await logAction(
        req.user?.id || null,

        `Eliminó ticket de unidad #${id}`,

        'tickets_unidades',

        req,

        ticketEliminado,

        null
      );


      return res.json({
        success: true
      });


    } catch (error) {
      console.error(
        'Error eliminando ticket:',
        error
      );


      return res
        .status(500)
        .json({
          error:
            'Error al eliminar el ticket'
        });
    }
  };