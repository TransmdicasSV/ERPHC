import {
  uploadToCloudinary,
  deleteFromCloudinary
} from '../../../services/cloudinaryService.js';

import {
  logAction
} from '../../../services/auditService.js';

import {
  obtenerVehiculosTickets,
  obtenerOperacionesPulsera,
  obtenerPersonalPulsera,
  obtenerPersonaActivaPorDni,
  existeOperacionTicket,
  insertarTicket,
  obtenerTickets,
  obtenerTicketPorId,
  actualizarEstadoTicket,
  obtenerUltimaInspeccion,
  actualizarInspeccionTicket,
  eliminarTicketPorId
} from './repository.js';

import {
  contextoTicket,
  OPERACIONES_INVALIDAS_TICKET,
  IMPLEMENTOS_PERMITIDOS,
  componenteConFalla,
  obtenerEvidenciasIniciales,
  obtenerOperacionesUnicas
} from './service.js';

// ==========================================
// OPCIONES DE TICKETS
// ==========================================

export const opcionesTickets =
  async (req, res) => {
    try {
      const contexto =
        await contextoTicket(req);

      const vehiculos =
        await obtenerVehiculosTickets(
          contexto.operacion,
          OPERACIONES_INVALIDAS_TICKET
        );

      const operaciones =
        obtenerOperacionesUnicas(
          vehiculos
        );

      return res.json({
        vehiculos,
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
// OPCIONES DE PULSERAS
// ==========================================

export const opcionesReportePulseras =
  async (req, res) => {
    try {
      const contexto =
        await contextoTicket(
          req,
          'crear'
        );

      if (
        ![
          'admin',
          'supervisor'
        ].includes(
          contexto.rol
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              'No tienes permiso para registrar reportes de pulseras'
          });
      }

      const [
        operaciones,
        personal
      ] =
        await Promise.all([
          obtenerOperacionesPulsera(
            OPERACIONES_INVALIDAS_TICKET
          ),
          obtenerPersonalPulsera()
        ]);

      return res.json({
        operaciones,
        personal
      });
    } catch (error) {
      console.error(
        'Error cargando opciones de pulseras:',
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
              : 'Error al cargar opciones de reportes de pulseras'
        });
    }
  };

// ==========================================
// CREAR TICKET
// ==========================================

export const createSupportTicket =
  async (req, res) => {
    const {
      placa,
      tipo_solicitud,
      descripcion,
      operador,
      categoria,
      prioridad,
      implemento,
      operacion,
      persona_pulsera,
      dni_persona_pulsera,
      motivo_renovacion
    } = req.body || {};

    if (
      placa != null &&
      typeof placa !== 'string'
    ) {
      return res.status(400).json({
        error:
          'La placa debe ser texto o quedar vacía'
      });
    }

    const placaFinal =
      placa
        ?.trim()
        .toUpperCase() ||
      null;

    const tipoSolicitudFinal =
      typeof tipo_solicitud ===
        'string'
        ? tipo_solicitud.trim()
        : '';

    const descripcionFinal =
      typeof descripcion ===
        'string'
        ? descripcion.trim()
        : '';

    const operadorFinal =
      typeof operador ===
        'string'
        ? operador.trim()
        : '';

    const implementoFinal =
      tipoSolicitudFinal ===
      'Soporte Técnico'
        ? String(
            implemento || ''
          ).trim()
        : null;

    const esReportePulsera =
      tipoSolicitudFinal ===
      'Reporte de Pulsera';

    const personaPulseraFinal =
      esReportePulsera
        ? String(
            persona_pulsera ||
              ''
          ).trim()
        : null;

    const dniPulseraFinal =
      esReportePulsera
        ? String(
            dni_persona_pulsera ||
              ''
          ).trim()
        : null;

    const motivoRenovacionFinal =
      esReportePulsera
        ? String(
            motivo_renovacion ||
              ''
          ).trim()
        : null;

    const operacionPulseraFinal =
      esReportePulsera
        ? String(
            operacion || ''
          ).trim()
        : null;

    if (
      (
        placaFinal &&
        placaFinal.length > 20
      ) ||
      !tipoSolicitudFinal ||
      !descripcionFinal ||
      !operadorFinal
    ) {
      return res
        .status(400)
        .json({
          error:
            'Revise los datos obligatorios y la placa'
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

    if (
      esReportePulsera &&
      (
        !operacionPulseraFinal ||
        !personaPulseraFinal ||
        !/^\d{8}$/.test(
          dniPulseraFinal
        ) ||
        !motivoRenovacionFinal ||
        !(req.files || []).length
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Complete los datos de la pulsera, seleccione una operación y adjunte una evidencia'
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

      if (
        esReportePulsera &&
        ![
          'admin',
          'supervisor'
        ].includes(
          contexto.rol
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              'No tienes permiso para registrar reportes de pulseras'
          });
      }

      if (esReportePulsera) {
        const persona =
          await obtenerPersonaActivaPorDni(
            dniPulseraFinal
          );

        if (!persona) {
          return res
            .status(400)
            .json({
              error:
                'Seleccione un trabajador válido de la lista'
            });
        }

        const personaEncontrada =
          persona
            .nombre_completo
            .trim()
            .toLowerCase();

        if (
          personaEncontrada !==
          personaPulseraFinal
            .toLowerCase()
        ) {
          return res
            .status(400)
            .json({
              error:
                'El DNI seleccionado no corresponde al trabajador indicado'
            });
        }

        const operacionExiste =
          await existeOperacionTicket(
            operacionPulseraFinal,
            OPERACIONES_INVALIDAS_TICKET
          );

        if (!operacionExiste) {
          return res
            .status(400)
            .json({
              error:
                'Seleccione una operación válida'
            });
        }
      }

      if (
        esReportePulsera &&
        contexto.rol ===
          'publico'
      ) {
        return res
          .status(403)
          .json({
            error:
              'El reporte de pulseras requiere iniciar sesión'
          });
      }

      let operacionSinPlaca =
        null;

      if (esReportePulsera) {
        operacionSinPlaca =
          operacionPulseraFinal;
      } else if (
        contexto.rol ===
        'supervisor'
      ) {
        operacionSinPlaca =
          contexto.operacion;
      } else if (
        contexto.rol ===
          'admin' &&
        typeof operacion ===
          'string'
      ) {
        operacionSinPlaca =
          operacion.trim() ||
          null;
      }

      if (
        !placaFinal &&
        !operacionSinPlaca
      ) {
        return res
          .status(400)
          .json({
            error:
              contexto.rol ===
              'publico'
                ? 'En el portal público debe indicar una placa'
                : 'Seleccione una operación para el ticket sin placa'
          });
      }

      for (
        const archivo of
        req.files || []
      ) {
        const url =
          await uploadToCloudinary(
            archivo.buffer,
            'tickets_evidencias_iniciales',
            'image'
          );

        evidenciasSubidas.push(
          url
        );
      }

      const ticket =
        await insertarTicket({
          placa:
            placaFinal,

          tipoSolicitud:
            tipoSolicitudFinal,

          descripcion:
            descripcionFinal,

          operador:
            operadorFinal,

          categoria:
            esReportePulsera
              ? 'Pulseras'
              : String(
                  categoria ||
                    'General'
                ).trim(),

          prioridad:
            String(
              prioridad ||
                'Media'
            ).trim(),

          operacionContexto:
            contexto.operacion,

          operacionSinPlaca,

          operacionesInvalidas:
            OPERACIONES_INVALIDAS_TICKET,

          implemento:
            implementoFinal,

          evidenciasIniciales:
            evidenciasSubidas,

          personaPulsera:
            personaPulseraFinal,

          dniPulsera:
            dniPulseraFinal,

          motivoRenovacion:
            motivoRenovacionFinal,

          esReportePulsera
        });

      if (!ticket) {
        await Promise.allSettled(
          evidenciasSubidas.map(
            url =>
              deleteFromCloudinary(
                url
              )
          )
        );

        return res
          .status(
            contexto.rol ===
              'supervisor'
              ? 403
              : 400
          )
          .json({
            error:
              'La placa o la operación no son válidas o no están autorizadas para su cuenta'
          });
      }

      ticketCreado = true;

      await logAction(
        req.user?.id ||
          null,
        `Solicitud de soporte: ${
          placaFinal ||
          'sin placa'
        }`,
        'incidentes_soporte',
        req,
        null,
        ticket
      );

      return res
        .status(201)
        .json({
          success: true,
          id: ticket.id
        });
    } catch (error) {
      if (!ticketCreado) {
        await Promise.allSettled(
          evidenciasSubidas.map(
            url =>
              deleteFromCloudinary(
                url
              )
          )
        );
      }

      console.error(
        'Error registrando ticket:',
        error
      );

      if (
        error.status === 401 ||
        error.status === 403
      ) {
        return res
          .status(error.status)
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
              'La placa ya no está disponible'
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
// ACTUALIZAR
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

    if (
      typeof estado !==
        'string' ||
      !estado.trim()
    ) {
      return res
        .status(400)
        .json({
          error:
            'Debe seleccionar un estado'
        });
    }

    const estadoFinal =
      estado.trim();

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

      if (req.file) {
        evidenciaUrl =
          await uploadToCloudinary(
            req.file.buffer,
            'tickets_evidencias',
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
        req.user.id,
        `Actualizó estado de incidente #${id}`,
        'incidentes_soporte',
        req,
        valoresAnteriores,
        valoresActuales
      );

      if (
        evidenciaUrl &&
        valoresAnteriores.evidencia &&
        valoresAnteriores.evidencia !==
          evidenciaUrl
      ) {
        await deleteFromCloudinary(
          valoresAnteriores.evidencia
        );
      }

      if (
        estadoFinal
          .toLowerCase() ===
          'resuelto' &&
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

      return res
        .status(500)
        .json({
          error:
            'Error al actualizar incidente'
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
      typeof resolucion ===
        'string'
        ? resolucion.trim()
        : '';

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
      req.user.id,
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

      const evidencias = [
        ticketEliminado.evidencia,

        ...obtenerEvidenciasIniciales(
          ticketEliminado
            .evidencias_iniciales
        )
      ].filter(Boolean);

      await Promise.allSettled(
        evidencias.map(
          url =>
            deleteFromCloudinary(
              url
            )
        )
      );

      await logAction(
        req.user.id,
        `Eliminó incidente de soporte #${id}`,
        'incidentes_soporte',
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
            'Error al eliminar incidente'
        });
    }
  };
  