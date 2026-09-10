import { pool } from '../../config/database.js';

// ==========================================
// ESTADÍSTICAS RÁPIDAS
// ==========================================

export const obtenerConteosRapidos =
  async () => {
    const [
      vehiculosResult,
      inspeccionesResult
    ] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) FROM vehiculos'
      ),

      pool.query(
        'SELECT COUNT(*) FROM inspecciones_flota'
      )
    ]);

    return {
      totalVehiculos:
        Number(
          vehiculosResult
            .rows[0]
            .count
        ),

      totalInspecciones:
        Number(
          inspeccionesResult
            .rows[0]
            .count
        )
    };
  };

// ==========================================
// DATOS PARA GRÁFICOS
// ==========================================

export const obtenerFechasInspecciones =
  async () => {
    const result =
      await pool.query(
        `SELECT fecha::text AS fecha
         FROM inspecciones_flota
         WHERE fecha IS NOT NULL`
      );

    return result.rows;
  };

export const obtenerFallosComponentes =
  async () => {
    const result =
      await pool.query(
        `SELECT
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

         FROM inspecciones_flota`
      );

    return result.rows[0] || {};
  };

export const obtenerProgramasStats =
  async () => {
    const result =
      await pool.query(
        `SELECT
           COALESCE(
             NULLIF(
               TRIM(operacion),
               ''
             ),
             'Sin Categoría'
           ) AS programa,

           COUNT(*) AS cantidad

         FROM vehiculos

         GROUP BY
           COALESCE(
             NULLIF(
               TRIM(operacion),
               ''
             ),
             'Sin Categoría'
           )

         ORDER BY programa`
      );

    return result.rows;
  };

export const obtenerSaludInspecciones =
  async () => {
    const result =
      await pool.query(
        `SELECT
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

         FROM inspecciones_flota`
      );

    return result.rows[0] || {};
  };

export const obtenerSoporteStats =
  async () => {
    const result =
      await pool.query(
        `SELECT
           COALESCE(
             estado,
             'Sin Estado'
           ) AS estado,

           COUNT(*) AS cantidad

         FROM incidentes_soporte

         GROUP BY
           COALESCE(
             estado,
             'Sin Estado'
           )

         ORDER BY estado`
      );

    return result.rows;
  };

export const obtenerInventarioAgrupado =
  async () => {
    const result =
      await pool.query(
        `SELECT
           COALESCE(
             tipo_movimiento,
             'Entrega'
           ) AS tipo_movimiento,

           COUNT(*) AS cantidad

         FROM entregas_ti

         GROUP BY
           COALESCE(
             tipo_movimiento,
             'Entrega'
           )

         ORDER BY tipo_movimiento`
      );

    return result.rows;
  };

export const obtenerTotalInventario =
  async () => {
    const result =
      await pool.query(
        `SELECT COUNT(*) AS cantidad
         FROM entregas_ti`
      );

    return Number(
      result.rows[0]
        ?.cantidad || 0
    );
  };