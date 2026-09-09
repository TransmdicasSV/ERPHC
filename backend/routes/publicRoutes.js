import { Router } from 'express';
import { pool } from '../src/config/database.js';

const router = Router();

function componenteCorrecto(valor) {
  const estado = String(valor || '').trim().toUpperCase();

  return ['OK', 'N/A', 'NO APLICA'].includes(estado);
}

function calcularEstado(inspeccion) {
  const aprobado =
    componenteCorrecto(inspeccion.tablet) &&
    componenteCorrecto(inspeccion.radio) &&
    componenteCorrecto(inspeccion.camaras);

  return aprobado ? 'APROBADO' : 'OBSERVADO';
}

function construirUrlImagen(req, valor) {
  if (!valor) {
    return null;
  }

  if (/^https?:\/\//i.test(valor)) {
    return valor;
  }

  const nombreArchivo = String(valor)
    .replace(/^\/+/, '')
    .replace(/^uploads\//i, '');

  return `${req.protocol}://${req.get('host')}/uploads/${nombreArchivo}`;
}

function fechaActualPeru() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const valores = Object.fromEntries(
    partes.map(parte => [parte.type, parte.value])
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
}

// Estadísticas mostradas en el portal público
router.get('/stats', async (req, res) => {
  try {
    const hoy = fechaActualPeru();

    const [
      vehiculosResult,
      inspeccionesHoyResult,
      tickerResult,
      trabajosResult
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS cantidad
        FROM vehiculos
      `),

      pool.query(
        `SELECT COUNT(*)::int AS cantidad
         FROM inspecciones_flota
         WHERE fecha = $1::date`,
        [hoy]
      ),

      pool.query(`
        SELECT
          placa,
          fecha::text AS fecha,
          hora,
          tablet,
          radio,
          camaras
        FROM inspecciones_flota
        ORDER BY id DESC
        LIMIT 10
      `),

      pool.query(`
        SELECT
          id,
          tipo_solicitud,
          placa
        FROM incidentes_soporte
        WHERE estado IN ('Resuelto', 'Concluido')
        ORDER BY id DESC
        LIMIT 3
      `)
    ]);

    const ticker = tickerResult.rows.map(inspeccion => ({
      placa: inspeccion.placa,
      hora: inspeccion.hora,
      estado: calcularEstado(inspeccion)
    }));

    const trabajosTI = trabajosResult.rows.map(trabajo => ({
      id: trabajo.id,
      tipo: trabajo.tipo_solicitud,
      placa: trabajo.placa
    }));

    return res.json({
      totalFlota: Number(
        vehiculosResult.rows[0]?.cantidad || 0
      ),

      inspeccionesHoy: Number(
        inspeccionesHoyResult.rows[0]?.cantidad || 0
      ),

      ticker,
      trabajosTI
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas públicas:', error);

    return res.status(500).json({
      error: 'Error del servidor'
    });
  }
});

// Consultar el estado de una unidad por placa
router.get('/consulta/:placa', async (req, res) => {
  const placa = String(req.params.placa || '')
    .trim()
    .toUpperCase();

  if (!placa || placa.length > 20) {
    return res.status(400).json({
      error: 'La placa proporcionada no es válida'
    });
  }

  try {
    const [
      inspeccionResult,
      timelineResult,
      incidenteResult
    ] = await Promise.all([
      pool.query(
        `SELECT *, fecha::text AS fecha
         FROM inspecciones_flota
         WHERE placa = $1
         ORDER BY id DESC
         LIMIT 1`,
        [placa]
      ),

      pool.query(
        `SELECT
           fecha::text AS fecha,
           hora,
           tablet,
           radio,
           camaras
         FROM inspecciones_flota
         WHERE placa = $1
         ORDER BY id DESC
         LIMIT 3`,
        [placa]
      ),

      pool.query(
        `SELECT *
         FROM incidentes_soporte
         WHERE placa = $1
         ORDER BY id DESC
         LIMIT 1`,
        [placa]
      )
    ]);

    if (!inspeccionResult.rows.length) {
      return res.status(404).json({
        error: 'Unidad no encontrada'
      });
    }

    const inspeccion = inspeccionResult.rows[0];

    const timeline = timelineResult.rows.map(registro => ({
      fecha: registro.fecha,
      hora: registro.hora,
      estado: calcularEstado(registro)
    }));

    return res.json({
      placa: inspeccion.placa,
      fecha: inspeccion.fecha,
      hora: inspeccion.hora,
      tablet: inspeccion.tablet,
      radio: inspeccion.radio,
      camaras: inspeccion.camaras,

      estado_general: calcularEstado(inspeccion),

      incidente_pendiente:
        incidenteResult.rows[0] || null,

      timeline,

      fotos: [
        {
          tipo: 'Tablet',
          url: construirUrlImagen(
            req,
            inspeccion.img_tablet
          )
        },
        {
          tipo: 'Radio',
          url: construirUrlImagen(
            req,
            inspeccion.img_radio
          )
        },
        {
          tipo: 'Cámaras',
          url: construirUrlImagen(
            req,
            inspeccion.img_camaras
          )
        }
      ]
    });
  } catch (error) {
    console.error('Error consultando unidad pública:', error);

    return res.status(500).json({
      error: 'Error del servidor'
    });
  }
});

export default router;
