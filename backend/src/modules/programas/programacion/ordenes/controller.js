import { pool } from '../../../../config/database.js';

import {
  obtenerProgramacionParaApertura,
  contarEquiposPrevistos,
  contarOrdenesActivas,
  insertarOrden,
  materializarDetalles,
  obtenerOrdenes,
  obtenerOrdenPorId,
  obtenerDetallesDeOrdenes,
  existeVisitaEnPrograma,
  obtenerOrdenParaEscritura,
  obtenerDetalleDeOrden,
  actualizarOrden,
  actualizarDetalle,
  evidenciasIgualesEnOrden,
  evidenciasIgualesEnDetalle
} from './repository.js';

import {
  prepararApertura,
  prepararActualizacionCabecera,
  prepararActualizacionDetalle,
  bloqueosDeApertura,
  resolverResultado,
  exigirOrdenAbierta,
  presentarOrden,
  exigirVisita,
  MENSAJES,
  ESTADOS,
  ESTADOS_DETALLE
} from './service.js';

import {
  existePrograma
} from '../../repository.js';

import {
  normalizarId,
  noEncontrado,
  manejar,
  ValidationError
} from '../../comun.js';

import {
  logAction
} from '../../../../services/auditService.js';

// La base es la autoridad. Aquí solo se traduce su rechazo, y nunca se devuelve el mensaje
// del driver. Los patrones corresponden a los RAISE EXCEPTION de 20260925_013 y 014, cuyos
// textos se midieron uno por uno en la etapa 4.0.
// Los textos salen de MENSAJES, en el service: una sola redaccion por regla, venga el
// rechazo de la comprobacion previa o del trigger de la base.
const ERRORES = {
  mensajes: {
    uq_ot_programacion_activa: {
      status: 409,
      error: MENSAJES.activa
    },
    fk_ot_tecnico: {
      status: 409,
      error: MENSAJES.tecnicoInexistente
    }
  },
  reglasDeNegocio: [
    {
      patron: /esta PROYECTADO/,
      status: 409,
      code: 'VISITA_PROYECTADA',
      error: MENSAJES.proyectada
    },
    {
      patron: /esta CANCELADA: no admite abrir/,
      status: 409,
      code: 'VISITA_CANCELADA',
      error: MENSAJES.cancelada
    },
    {
      patron: /solo PROGRAMADO o REPROGRAMADO admiten/,
      status: 409,
      code: 'ESTADO_NO_ADMITE_OT',
      error: MENSAJES.estadoNoAdmite
    },
    {
      patron: /Una OT nace ABIERTA/,
      status: 409,
      code: 'ESTADO_INICIAL_OT',
      error: MENSAJES.nace
    },
    {
      patron: /alcance de la visita esta congelado/,
      status: 409,
      code: 'ALCANCE_CONGELADO',
      error: MENSAJES.alcanceCongelado
    }
  ]
};

const NO_ENCONTRADA_VISITA =
  'Programación no encontrada en este programa';

const NO_ENCONTRADA_ORDEN =
  'Orden de trabajo no encontrada en esta programación';

// Mismo orden de comprobación en los tres handlers: programa, luego visita, luego OT. Así
// un id de otro programa nunca llega a tocar la OT.
const idsDe = async req => {
  const programaId = normalizarId(
    'programaId',
    req.params.programaId
  );

  const programacionId = normalizarId(
    'programacionId',
    req.params.programacionId
  );

  if (
    !await existePrograma(programaId)
  ) {
    throw noEncontrado(
      'Programa de mantenimiento no encontrado'
    );
  }

  return { programaId, programacionId };
};

// ------------------------------------------------------------------------------------
// POST · abrir
// ------------------------------------------------------------------------------------
// Una sola transacción, y el orden importa:
//
//   BEGIN
//   1. leer y BLOQUEAR la visita            FOR UPDATE OF p
//   2. validar pertenencia y estado
//   3. comprobar alcance previsto y OT activa
//   4. INSERT de la cabecera
//   5. INSERT ... SELECT de todos los detalles      una sentencia
//   6. releer la OT ya completa
//   7. logAction con el MISMO client
//   COMMIT        · ROLLBACK ante cualquier error
//
// El cerrojo del paso 1 se toma ANTES de decidir, no después: es lo que serializa la
// apertura contra una reprogramación, una cancelación o una promoción concurrentes.
//
// logAction va con { client }: desde la etapa 3.2 eso hace que el INSERT de auditoría entre
// en esta transacción y que su fallo la revierta entera. Nunca pool.query aquí.
export const abrirOrden = manejar(
  async (req, res) => {
    const {
      programaId,
      programacionId
    } = await idsDe(req);

    const { tecnico_id } = prepararApertura(req.body);

    // abierta_por_id NO viene del cuerpo: sale del usuario autenticado que fija
    // authenticateRequest en app.js antes de este router (middlewares/auth.js establece
    // req.user con el id leído de la tabla usuarios). La ruta está cubierta por la regla
    // /^\/api\/programas-mantenimiento(?:\/|$)/ de security.js, así que no hay forma de
    // llegar aquí sin sesión; aun así se comprueba, porque la columna es NOT NULL.
    const abiertaPorId = req.user?.id ?? null;

    if (!abiertaPorId) {
      throw new ValidationError(
        'No se pudo determinar el usuario que abre la orden de trabajo',
        401
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const visita = exigirVisita(
        await obtenerProgramacionParaApertura(
          programaId,
          programacionId,
          client
        )
      );

      const previstos = await contarEquiposPrevistos(
        programacionId,
        client
      );

      const activas = await contarOrdenesActivas(
        programacionId,
        client
      );

      const permiso = bloqueosDeApertura(
        visita,
        { activas, previstos }
      );

      if (!permiso.puede_abrir) {
        throw new ValidationError(
          permiso.motivo_abrir,
          409
        );
      }

      const otId = await insertarOrden(
        programacionId,
        tecnico_id,
        abiertaPorId,
        client
      );

      const materializados = await materializarDetalles(
        otId,
        programacionId,
        client
      );

      // Si el alcance previsto y los detalles no coinciden, la OT no podría cerrarse
      // nunca. Se comprueba aquí, dentro de la transacción, para revertir en el sitio.
      if (materializados !== previstos) {
        throw new Error(
          `Se materializaron ${materializados} detalles para ${previstos} equipos `
          + 'previstos'
        );
      }

      const orden = await obtenerOrdenPorId(
        programaId,
        programacionId,
        otId,
        client
      );

      const detalles = (
        await obtenerDetallesDeOrdenes([otId], client)
      ).get(otId);

      await logAction(
        abiertaPorId,
        `Abrió la orden de trabajo ${otId} de la visita ${programacionId} `
        + `(${visita.placa}, quincena ${visita.quincena_efectiva}) con `
        + `${materializados} equipo(s) previsto(s)`,
        'ordenes_trabajo',
        req,
        null,
        orden,
        { client }
      );

      await client.query('COMMIT');

      return res
        .status(201)
        .json(
          presentarOrden(orden, detalles)
        );
    } catch (error) {
      await client.query('ROLLBACK');

      throw error;
    } finally {
      client.release();
    }
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al abrir la orden de trabajo'
  }
);

// ------------------------------------------------------------------------------------
// PATCH · esqueleto transaccional comun a las dos ediciones (etapa 4.2)
// ------------------------------------------------------------------------------------
// Los dos PATCH hacen lo mismo alrededor de su escritura, y escribirlo dos veces seria
// duplicar justo la parte delicada: el cerrojo, su orden y el ROLLBACK.
//
//   BEGIN
//   1. leer y BLOQUEAR la CABECERA           FOR UPDATE OF o
//   2. 404 si no existe en ese programa y esa visita
//   3. 409 si no esta ABIERTA
//   4. el trabajo propio de cada endpoint    -> devuelve si hubo escritura y su accion
//   5. releer la OT y sus detalles
//   6. logAction con el MISMO client, SOLO si hubo escritura real
//   COMMIT        · ROLLBACK ante cualquier error
//
// El cerrojo se toma SIEMPRE primero y SIEMPRE sobre la cabecera, el mismo orden que usa
// cerrar_orden_trabajo(). Nunca se bloquea el detalle antes que su cabecera.
const editandoLaOrden = async (
  req,
  trabajo,
  errores
) => {
  const {
    programaId,
    programacionId
  } = await idsDe(req);

  const otId = normalizarId(
    'otId',
    req.params.otId
  );

  const usuarioId = req.user?.id ?? null;

  if (!usuarioId) {
    throw new ValidationError(
      'No se pudo determinar el usuario que edita la orden de trabajo',
      401
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orden = await obtenerOrdenParaEscritura(
      programaId,
      programacionId,
      otId,
      client
    );

    if (!orden) {
      throw noEncontrado(NO_ENCONTRADA_ORDEN);
    }

    exigirOrdenAbierta(orden);

    const resultado = await trabajo({
      client,
      orden,
      otId,
      programaId,
      programacionId
    });

    const actualizada = await obtenerOrdenPorId(
      programaId,
      programacionId,
      otId,
      client
    );

    const detalles = (
      await obtenerDetallesDeOrdenes([otId], client)
    ).get(otId);

    // Sin escritura real no hay nada que auditar: una peticion idempotente no deja rastro.
    if (resultado.escribio) {
      await logAction(
        usuarioId,
        resultado.accion,
        resultado.tabla,
        req,
        resultado.antes,
        resultado.despues ?? actualizada,
        { client }
      );
    }

    await client.query('COMMIT');

    return {
      cuerpo: presentarOrden(actualizada, detalles),
      escribio: resultado.escribio
    };
  } catch (error) {
    await client.query('ROLLBACK');

    throw error;
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------------------------
// PATCH · cabecera
// ------------------------------------------------------------------------------------
// Idempotente: si todos los valores enviados ya son los almacenados no se emite ningun
// UPDATE, updated_at no se mueve y no se escribe auditoria. Es el mismo criterio que usan
// programar y cancelar en la etapa 3.1.
//
// evidencias se compara en PostgreSQL con el operador de jsonb, no con JSON.stringify: el
// orden de las claves no debe contar como un cambio.
export const editarOrden = manejar(
  async (req, res) => {
    const {
      campos,
      data
    } = prepararActualizacionCabecera(req.body);

    const { cuerpo } = await editandoLaOrden(req, async ({
      client,
      orden,
      otId,
      programaId,
      programacionId
    }) => {
      const igualEnLaBase = async campo => {
        if (campo === 'evidencias') {
          return evidenciasIgualesEnOrden(
            otId,
            data.evidencias,
            client
          );
        }

        return orden[campo] === data[campo];
      };

      const distintos = [];

      for (const campo of campos) {
        if (!await igualEnLaBase(campo)) {
          distintos.push(campo);
        }
      }

      if (distintos.length === 0) {
        return { escribio: false };
      }

      const filas = await actualizarOrden(
        otId,
        distintos,
        data,
        client
      );

      if (filas !== 1) {
        // La guarda del WHERE no dejo pasar la fila. Se RELEE el estado actual para decir
        // por que: informar con el estado leido al tomar el cerrojo daria el mensaje
        // absurdo de que una OT ABIERTA es inmutable.
        throw new ValidationError(
          MENSAJES.noAbierta(
            (await obtenerOrdenPorId(
              programaId,
              programacionId,
              otId,
              client
            ))?.estado ?? orden.estado
          ),
          409
        );
      }

      return {
        escribio: true,
        tabla: 'ordenes_trabajo',
        antes: orden,
        accion: `Edito la orden de trabajo ${otId} de ${orden.placa}: `
          + distintos.join(', ')
      };
    });

    return res.json(cuerpo);
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al editar la orden de trabajo'
  }
);

// ------------------------------------------------------------------------------------
// PATCH · resultado de un equipo
// ------------------------------------------------------------------------------------
// La coherencia se valida sobre el resultado FUSIONADO con lo almacenado, no sobre las
// claves presentes: lo resuelve resolverResultado en el service, que es la unica
// definicion de esas reglas.
export const editarDetalle = manejar(
  async (req, res) => {
    const {
      campos,
      data
    } = prepararActualizacionDetalle(req.body);

    const detalleId = normalizarId(
      'detalleId',
      req.params.detalleId
    );

    const { cuerpo } = await editandoLaOrden(req, async ({
      client,
      orden,
      otId,
      programaId,
      programacionId
    }) => {
      const detalle = await obtenerDetalleDeOrden(
        otId,
        detalleId,
        client
      );

      if (!detalle) {
        throw noEncontrado(MENSAJES.detalleNoEncontrado);
      }

      // Primero la coherencia: si la combinacion final es invalida no se escribe nada, y
      // en particular un PARCIAL sobre GPS o ADAS no llega nunca a los ciclos.
      const resultado = resolverResultado(
        detalle,
        campos,
        data
      );

      const porEscribir = {
        ...data,
        estado: resultado.estado,
        nivel_completado: resultado.nivel_completado
      };

      const igualEnLaBase = async campo => {
        if (campo === 'evidencias') {
          return evidenciasIgualesEnDetalle(
            detalleId,
            data.evidencias,
            client
          );
        }

        return detalle[campo] === porEscribir[campo];
      };

      const distintos = [];

      for (const campo of campos) {
        if (!await igualEnLaBase(campo)) {
          distintos.push(campo);
        }
      }

      if (distintos.length === 0) {
        return { escribio: false };
      }

      const filas = await actualizarDetalle(
        detalleId,
        distintos,
        porEscribir,
        client
      );

      if (filas !== 1) {
        // La guarda del WHERE no dejo pasar la fila. Se RELEE el estado actual para decir
        // por que: informar con el estado leido al tomar el cerrojo daria el mensaje
        // absurdo de que una OT ABIERTA es inmutable.
        throw new ValidationError(
          MENSAJES.noAbierta(
            (await obtenerOrdenPorId(
              programaId,
              programacionId,
              otId,
              client
            ))?.estado ?? orden.estado
          ),
          409
        );
      }

      const despues = await obtenerDetalleDeOrden(
        otId,
        detalleId,
        client
      );

      return {
        escribio: true,
        tabla: 'ordenes_trabajo_detalle',
        antes: detalle,
        despues,
        accion: `Registro el resultado de ${detalle.tipo_equipo} (previsto `
          + `${detalle.nivel_programado}) en la orden de trabajo ${otId}: `
          + resultado.estado
          + (resultado.nivel_completado
            ? ' ' + resultado.nivel_completado
            : '')
      };
    });

    return res.json(cuerpo);
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al editar el resultado del equipo'
  }
);

// ------------------------------------------------------------------------------------
// GET · listado
// ------------------------------------------------------------------------------------
// Histórico completo: las anuladas y la activa, si existe. Sin transacción: son lecturas,
// y el patrón del módulo no las envuelve.
//
// Número de consultas CONSTANTE: una para la visita, una para las cabeceras y una para los
// detalles de todas ellas. No crece con el número de OT.
export const listarOrdenes = manejar(
  async (req, res) => {
    const {
      programaId,
      programacionId
    } = await idsDe(req);

    const ordenes = await obtenerOrdenes(
      programaId,
      programacionId
    );

    // Con cero OT hay que distinguir la visita que no existe de la que no tiene ninguna:
    // la primera es 404 y la segunda un listado vacío. Solo se consulta en ese caso, así
    // que el número de consultas sigue siendo el mismo en las dos ramas.
    if (ordenes.length === 0) {
      const existe = await existeVisitaEnPrograma(
        programaId,
        programacionId
      );

      if (!existe) {
        throw noEncontrado(NO_ENCONTRADA_VISITA);
      }
    }

    const detalles = await obtenerDetallesDeOrdenes(
      ordenes.map(o => o.id)
    );

    return res.json({
      programa_id: programaId,
      programacion_id: programacionId,
      total: ordenes.length,
      activas: ordenes.filter(
        o => o.estado !== 'ANULADA'
      ).length,
      estados: ESTADOS,
      estados_detalle: ESTADOS_DETALLE,
      ordenes_trabajo: ordenes.map(
        orden => presentarOrden(
          orden,
          detalles.get(orden.id)
        )
      )
    });
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al listar las órdenes de trabajo'
  }
);

// ------------------------------------------------------------------------------------
// GET · detalle
// ------------------------------------------------------------------------------------
export const obtenerOrden = manejar(
  async (req, res) => {
    const {
      programaId,
      programacionId
    } = await idsDe(req);

    const otId = normalizarId(
      'otId',
      req.params.otId
    );

    const orden = await obtenerOrdenPorId(
      programaId,
      programacionId,
      otId
    );

    if (!orden) {
      throw noEncontrado(NO_ENCONTRADA_ORDEN);
    }

    const detalles = (
      await obtenerDetallesDeOrdenes([orden.id])
    ).get(orden.id);

    return res.json(
      presentarOrden(orden, detalles)
    );
  },
  {
    ...ERRORES,
    mensajeGenerico:
      'Error al obtener la orden de trabajo'
  }
);
