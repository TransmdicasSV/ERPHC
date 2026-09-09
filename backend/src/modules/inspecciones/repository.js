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
    `SELECT *, fecha::text AS fecha
     FROM inspecciones_flota
     WHERE placa = $1
     ORDER BY id DESC`,
    [placa]
  );

  return result.rows;
};

export const crearInspeccion = async ({
  placa,
  fecha,
  hora,
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
         fecha,
         hora,
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
         $6, $7, $8, $9, $10
       )
       RETURNING *, fecha::text AS fecha`,
      [
        placa,
        fecha,
        hora,
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
      `SELECT *, fecha::text AS fecha
       FROM inspecciones_flota
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  };

export const actualizarInspeccion =
  async ({
    id,
    fecha,
    hora,
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
       SET fecha = $1,
           hora = $2,
           tablet = $3,
           radio = $4,
           camaras = $5,
           img_tablet = $6,
           img_radio = $7,
           img_camaras = $8,
           observaciones = $9
       WHERE id = $10
       RETURNING *, fecha::text AS fecha`,
      [
        fecha,
        hora,
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
       RETURNING *, fecha::text AS fecha`,
      [id]
    );

    return result.rows[0] || null;
  };