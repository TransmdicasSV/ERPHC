import { pool } from '../../config/database.js';

// ==========================================
// LEGACY
// ==========================================

export const obtenerEntregasLegacy =
  async () => {
    const result = await pool.query(
      'SELECT * FROM entregas_ti'
    );

    return result.rows;
  };

export const crearEntregaLegacy =
  async ({
    fecha_entrega,
    nombres,
    dni,
    cargo,
    operacion,
    condicion,
    marca,
    modelo,
    serie,
    precio,
    observaciones
  }) => {
    const result = await pool.query(
      `INSERT INTO entregas_ti (
         fecha_entrega,
         nombres,
         dni,
         cargo,
         operacion,
         condicion,
         marca,
         modelo,
         serie,
         precio,
         observaciones
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11
       )
       RETURNING *`,
      [
        fecha_entrega,
        nombres,
        dni,
        cargo,
        operacion,
        condicion,
        marca,
        modelo,
        serie,
        precio,
        observaciones
      ]
    );

    return result.rows[0];
  };

// ==========================================
// PERSONAL
// ==========================================

export const obtenerPersonalPorDni =
  async dni => {
    const result = await pool.query(
      `SELECT
         dni,
         nombre_completo,
         cargo,
         area
       FROM public.personal
       WHERE dni = $1`,
      [dni]
    );

    return result.rows[0] || null;
  };

// ==========================================
// INVENTARIO
// ==========================================

export const obtenerInventario =
  async ({
    puedeVerEntregas,
    puedeVerDevoluciones
  }) => {
    let query =
      'SELECT * FROM entregas_ti';

    if (
      puedeVerEntregas &&
      !puedeVerDevoluciones
    ) {
      query += `
        WHERE tipo_movimiento IS NULL
           OR TRIM(tipo_movimiento) = ''
           OR LOWER(TRIM(tipo_movimiento))
              = 'entrega'
      `;
    } else if (
      !puedeVerEntregas &&
      puedeVerDevoluciones
    ) {
      query += `
        WHERE LOWER(
          TRIM(tipo_movimiento)
        ) IN (
          'devolución',
          'devolucion'
        )
      `;
    }

    query += ' ORDER BY id DESC';

    const result =
      await pool.query(query);

    return result.rows;
  };

// ==========================================
// CREAR
// ==========================================

export const crearMovimiento =
  async ({
    fecha,
    encargado,
    nombre,
    dni,
    cargo,
    operacion,
    condicion,
    equipo_tipo,
    marca,
    modelo,
    serie,
    laptop,
    mouse,
    cargador,
    motivo,
    observaciones,
    precio,
    tipo_movimiento,
    documento_url
  }) => {
    const result = await pool.query(
      `INSERT INTO entregas_ti (
         fecha,
         encargado,
         nombre,
         dni,
         cargo,
         operacion,
         condicion,
         equipo_tipo,
         marca,
         modelo,
         serie,
         laptop,
         mouse,
         cargador,
         motivo,
         observaciones,
         precio,
         tipo_movimiento,
         documento_url
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15,
         $16, $17, $18, $19
       )
       RETURNING *`,
      [
        fecha,
        encargado,
        nombre,
        dni,
        cargo,
        operacion,
        condicion,
        equipo_tipo,
        marca,
        modelo,
        serie,
        laptop,
        mouse,
        cargador,
        motivo,
        observaciones,
        precio,
        tipo_movimiento,
        documento_url
      ]
    );

    return result.rows[0];
  };

// ==========================================
// CONSULTAS PARA ACTUALIZAR
// ==========================================

export const obtenerMovimientoPorId =
  async id => {
    const result = await pool.query(
      `SELECT *
       FROM entregas_ti
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  };

export const actualizarMovimiento =
  async ({
    id,
    fecha,
    encargado,
    nombre,
    dni,
    cargo,
    operacion,
    condicion,
    equipo_tipo,
    marca,
    modelo,
    serie,
    laptop,
    mouse,
    cargador,
    motivo,
    observaciones,
    precio,
    tipo_movimiento,
    documento_url
  }) => {
    const result = await pool.query(
      `UPDATE entregas_ti
       SET
         fecha = $1,
         encargado = $2,
         nombre = $3,
         dni = $4,
         cargo = $5,
         operacion = $6,
         condicion = $7,
         equipo_tipo = $8,
         marca = $9,
         modelo = $10,
         serie = $11,
         laptop = $12,
         mouse = $13,
         cargador = $14,
         motivo = $15,
         observaciones = $16,
         precio = $17,
         tipo_movimiento = $18,
         documento_url =
           COALESCE(
             $19,
             documento_url
           )
       WHERE id = $20
       RETURNING *`,
      [
        fecha,
        encargado,
        nombre,
        dni,
        cargo,
        operacion,
        condicion,
        equipo_tipo,
        marca,
        modelo,
        serie,
        laptop,
        mouse,
        cargador,
        motivo,
        observaciones,
        precio,
        tipo_movimiento,
        documento_url,
        id
      ]
    );

    return result.rows[0] || null;
  };

// ==========================================
// ELIMINAR
// ==========================================

export const eliminarMovimiento =
  async id => {
    const result = await pool.query(
      `DELETE FROM entregas_ti
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] || null;
  };
  // ==========================================
// EXPORTAR EXCEL
// ==========================================

export const obtenerMovimientosParaExportar =
  async ({
    tipo,
    categoria,
    fechaInicio,
    fechaFin
  }) => {
    let query = `
      SELECT *
      FROM entregas_ti
      WHERE 1 = 1
    `;

    const params = [];

    if (
      tipo === 'Devolución'
    ) {
      params.push(
        'Devolución'
      );

      query += `
        AND tipo_movimiento =
            $${params.length}
      `;
    } else if (
      tipo === 'Entrega'
    ) {
      params.push(
        'Entrega'
      );

      query += `
        AND (
          tipo_movimiento =
            $${params.length}
          OR tipo_movimiento IS NULL
          OR tipo_movimiento = ''
        )
      `;
    }

    if (categoria) {
      params.push(
        `%${categoria}%`
      );

      query += `
        AND equipo_tipo
            ILIKE
            $${params.length}
      `;
    }

    params.push(
      fechaInicio,
      fechaFin
    );

    query += `
      AND NULLIF(
        BTRIM(fecha::text),
        ''
      )::date
      BETWEEN
        $${params.length - 1}::date
      AND
        $${params.length}::date
    `;

    query +=
      ' ORDER BY id ASC';

    const result =
      await pool.query(
        query,
        params
      );

    return result.rows;
  };