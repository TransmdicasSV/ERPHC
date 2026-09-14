import { pool } from '../../config/database.js';

export const existeVehiculo = async placa => {
  const result = await pool.query(
    `SELECT placa
     FROM public.vehiculos
     WHERE placa = $1`,
    [placa]
  );

  return result.rows.length > 0;
};

export const obtenerHistorial = async placa => {
  const result = await pool.query(
    `SELECT *,
       fecha_hora::date::text AS fecha,
       to_char(fecha_hora, 'HH24:MI') AS hora
     FROM inspecciones_flota
     WHERE placa = $1
     ORDER BY id DESC`,
    [placa]
  );

  return result.rows;
};

export const crearInspeccion = async ({
  placa,
  fechaHora,
  tablet,
  radio,
  camaras,
  imgTablet,
  imgRadio,
  imgCamaras,
  observaciones
}) => {
  let client;
  let descartar = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO inspecciones_flota (
     placa,
     fecha_hora,
     tablet,
     radio,
     camaras,
     img_tablet,
     img_radio,
     img_camaras,
     observaciones
   )
   VALUES (
     $1, $2, $3, $4, $5,
     $6, $7, $8, $9
   )
   RETURNING *,
             fecha_hora::date::text AS fecha,
             to_char(fecha_hora, 'HH24:MI') AS hora`,
      [
        placa,
        fechaHora,
        tablet,
        radio,
        camaras,
        imgTablet,
        imgRadio,
        imgCamaras,
        observaciones || ''
      ]
    );
    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        descartar = true;
      }
    }

    throw error;
  } finally {
    if (client) {
      client.release(descartar);
    }
  }
};

export const obtenerInspeccionPorId =
  async id => {
    const result = await pool.query(
      `SELECT *,
              fecha_hora::date::text AS fecha,
              to_char(fecha_hora, 'HH24:MI') AS hora
       FROM inspecciones_flota
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  };

export const actualizarInspeccion =
  async ({
    id,
    fechaHora,
    tablet,
    radio,
    camaras,
    imgTablet,
    imgRadio,
    imgCamaras,
    observaciones
  }) => {
    const result = await pool.query(
      `UPDATE inspecciones_flota
   SET fecha_hora = $1,
       tablet = $2,
       radio = $3,
       camaras = $4,
       img_tablet = $5,
       img_radio = $6,
       img_camaras = $7,
       observaciones = $8
   WHERE id = $9
   RETURNING *,
             fecha_hora::date::text AS fecha,
             to_char(fecha_hora, 'HH24:MI') AS hora`,
      [
        fechaHora,
        tablet,
        radio,
        camaras,
        imgTablet,
        imgRadio,
        imgCamaras,
        observaciones || '',
        id
      ]
    );


    return result.rows[0] || null;
  };

export const eliminarInspeccion =
  async id => {
    const result = await pool.query(
      `DELETE FROM inspecciones_flota
       WHERE id = $1
       RETURNING *,
          fecha_hora::date::text AS fecha,
          to_char(fecha_hora, 'HH24:MI') AS hora`,
      [id]
    );

    return result.rows[0] || null;
  };