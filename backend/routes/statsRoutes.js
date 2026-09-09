import { Router } from 'express';
import { pool } from '../src/config/database.js';

const router = Router();

// Estadísticas rápidas
router.get('/', async (req, res) => {
  try {
    const [vehiculosResult, inspeccionesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM vehiculos'),
      pool.query('SELECT COUNT(*) FROM inspecciones_flota')
    ]);

    return res.json({
      totalVehiculos: Number(vehiculosResult.rows[0].count),
      totalInspecciones: Number(inspeccionesResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);

    return res.status(500).json({
      error: 'Error al obtener estadísticas'
    });
  }
});

// Datos avanzados para los gráficos
router.get('/charts', async (req, res) => {
  try {
    const [
      inspeccionesResult,
      erroresResult,
      programasResult,
      saludResult,
      soporteResult
    ] = await Promise.all([
      pool.query(`
        SELECT fecha::text AS fecha
        FROM inspecciones_flota
        WHERE fecha IS NOT NULL
      `),

      pool.query(`
        SELECT
          SUM(
            CASE
              WHEN UPPER(TRIM(COALESCE(tablet, ''))) NOT IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              THEN 1
              ELSE 0
            END
          ) AS tablet_errors,

          SUM(
            CASE
              WHEN UPPER(TRIM(COALESCE(radio, ''))) NOT IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              THEN 1
              ELSE 0
            END
          ) AS radio_errors,

          SUM(
            CASE
              WHEN UPPER(TRIM(COALESCE(camaras, ''))) NOT IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              THEN 1
              ELSE 0
            END
          ) AS camaras_errors

        FROM inspecciones_flota
      `),

      pool.query(`
        SELECT
          COALESCE(NULLIF(TRIM(operacion), ''), 'Sin Categoría') AS programa,
          COUNT(*) AS cantidad
        FROM vehiculos
        GROUP BY
          COALESCE(NULLIF(TRIM(operacion), ''), 'Sin Categoría')
        ORDER BY programa
      `),

      pool.query(`
        SELECT
          SUM(
            CASE
              WHEN UPPER(TRIM(COALESCE(tablet, ''))) IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              AND UPPER(TRIM(COALESCE(radio, ''))) IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              AND UPPER(TRIM(COALESCE(camaras, ''))) IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              THEN 1
              ELSE 0
            END
          ) AS aprobados,

          SUM(
            CASE
              WHEN UPPER(TRIM(COALESCE(tablet, ''))) NOT IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              OR UPPER(TRIM(COALESCE(radio, ''))) NOT IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              OR UPPER(TRIM(COALESCE(camaras, ''))) NOT IN (
                'OK',
                'N/A',
                'NO APLICA',
                ''
              )
              THEN 1
              ELSE 0
            END
          ) AS observados

        FROM inspecciones_flota
      `),

      pool.query(`
        SELECT
          COALESCE(estado, 'Sin Estado') AS estado,
          COUNT(*) AS cantidad
        FROM incidentes_soporte
        GROUP BY COALESCE(estado, 'Sin Estado')
        ORDER BY estado
      `)
    ]);

    const conteoFechas = {};

    inspeccionesResult.rows.forEach(row => {
      if (!row.fecha) {
        return;
      }

      conteoFechas[row.fecha] =
        (conteoFechas[row.fecha] || 0) + 1;
    });

    const fechasOrdenadas = Object.keys(conteoFechas).sort(
      (fechaA, fechaB) =>
        new Date(`${fechaA}T00:00:00`).getTime() -
        new Date(`${fechaB}T00:00:00`).getTime()
    );

    const tendencia = fechasOrdenadas
      .slice(-14)
      .map(fecha => ({
        date: fecha,
        inspecciones: conteoFechas[fecha]
      }));

    const programas = programasResult.rows.map(row => ({
      name: row.programa,
      value: Number(row.cantidad)
    }));

    const soporte = soporteResult.rows.map(row => ({
      name: row.estado,
      value: Number(row.cantidad)
    }));

    let inventario = [];

    try {
      const inventarioResult = await pool.query(`
        SELECT
          COALESCE(tipo_movimiento, 'Entrega') AS tipo_movimiento,
          COUNT(*) AS cantidad
        FROM entregas_ti
        GROUP BY COALESCE(tipo_movimiento, 'Entrega')
        ORDER BY tipo_movimiento
      `);

      inventario = inventarioResult.rows.map(row => ({
        name: row.tipo_movimiento,
        value: Number(row.cantidad)
      }));
    } catch (error) {
      console.warn(
        'No se pudo agrupar inventario por tipo_movimiento:',
        error.message
      );

      const inventarioResult = await pool.query(`
        SELECT COUNT(*) AS cantidad
        FROM entregas_ti
      `);

      inventario = [
        {
          name: 'Entregas Registradas',
          value: Number(inventarioResult.rows[0].cantidad)
        }
      ];
    }

    return res.json({
      trend: tendencia,

      programas,

      salud: {
        aprobados: Number(
          saludResult.rows[0]?.aprobados || 0
        ),
        observados: Number(
          saludResult.rows[0]?.observados || 0
        )
      },

      fallos: [
        {
          name: 'Tablet',
          errores: Number(
            erroresResult.rows[0]?.tablet_errors || 0
          )
        },
        {
          name: 'Radio',
          errores: Number(
            erroresResult.rows[0]?.radio_errors || 0
          )
        },
        {
          name: 'Cámaras',
          errores: Number(
            erroresResult.rows[0]?.camaras_errors || 0
          )
        }
      ],

      soporte,

      inventario
    });
  } catch (error) {
    console.error('Error obteniendo gráficos:', error);

    return res.status(500).json({
      error: 'Error al obtener datos para los gráficos'
    });
  }
});

export default router;
