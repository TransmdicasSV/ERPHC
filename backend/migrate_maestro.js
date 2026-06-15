import pkg from 'pg';
import xlsx from 'xlsx';

import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateMaestro() {
  try {
    console.log('Iniciando migración del Maestro de Flotas...');

    // 1. Crear tabla semirremolques
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semirremolques (
        placa_sr VARCHAR(20) PRIMARY KEY,
        tipo VARCHAR(100),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        anio INT,
        chasis VARCHAR(100),
        capacidad INT,
        compartimientos INT,
        diametro_interior VARCHAR(50),
        ultimo_km INT,
        frecuencia_p INT,
        dias_p INT
      );
    `);
    console.log('Tabla semirremolques creada/verificada.');

    // 2. Modificar tabla vehiculos para añadir nuevas columnas estáticas y placa_sr
    const columnsToAdd = [
      'operacion VARCHAR(100)',
      'cliente VARCHAR(100)',
      'vin VARCHAR(100)',
      'marca VARCHAR(100)',
      'modelo VARCHAR(100)',
      'anio INT',
      'color VARCHAR(50)',
      'peso_ton FLOAT',
      'potencia VARCHAR(100)',
      'cilindros INT',
      'cilindrada FLOAT',
      'torque VARCHAR(100)',
      'cambios INT',
      'suspension_del TEXT',
      'suspension_post TEXT',
      'transmision VARCHAR(100)',
      'reduccion_diferencial VARCHAR(50)',
      'freno_motor TEXT',
      'frecuencia INT',
      'dias INT',
      'placa_sr VARCHAR(20)',
      'trip_distance INT',
      'trip_time INT'
    ];

    for (const col of columnsToAdd) {
      const colName = col.split(' ')[0];
      try {
        await pool.query(`ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) {
        console.error(`Error agregando columna ${colName}:`, e.message);
      }
    }
    console.log('Columnas maestras agregadas a vehiculos.');

    // 3. Leer Excel
    const workbook = xlsx.readFile('C:\\Users\\LEONARDONEIRA\\Desktop\\excel\\Base de Datos.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`Leídas ${data.length} filas del Excel.`);

    let insertedSR = 0;
    let updatedTractos = 0;

    for (const row of data) {
      const placaStr = row['Placa'] ? String(row['Placa']).trim() : null;
      if (!placaStr) continue;

      // 4. Upsert Semirremolque
      let placaSr = null;
      if (row['Semi - Remolque'] && String(row['Semi - Remolque']).trim() !== '' && String(row['Semi - Remolque']).trim() !== 'Sin Operación' && String(row['Semi - Remolque']).trim() !== 'Granelero') {
        placaSr = String(row['Semi - Remolque']).trim();
        
        // Si el valor no parece una placa, quizás lo omitimos o lo limpiamos, pero confiemos en el dato por ahora
        // Solo insertamos si tiene al menos 5 caracteres (ej. A1B-234)
        if (placaSr.length >= 5) {
          await pool.query(`
            INSERT INTO semirremolques (
              placa_sr, tipo, marca, modelo, anio, chasis, capacidad, compartimientos, diametro_interior, ultimo_km, frecuencia_p, dias_p
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (placa_sr) DO UPDATE SET
              tipo = EXCLUDED.tipo,
              marca = EXCLUDED.marca,
              modelo = EXCLUDED.modelo,
              anio = EXCLUDED.anio,
              chasis = EXCLUDED.chasis,
              capacidad = EXCLUDED.capacidad,
              compartimientos = EXCLUDED.compartimientos,
              diametro_interior = EXCLUDED.diametro_interior,
              ultimo_km = EXCLUDED.ultimo_km,
              frecuencia_p = EXCLUDED.frecuencia_p,
              dias_p = EXCLUDED.dias_p;
          `, [
            placaSr,
            row['Tipo'] || null,
            row['Marca SR'] || null,
            row['Modelo SR'] || null,
            row['Año SR'] ? parseInt(row['Año SR']) : null,
            row['Chasis'] || null,
            row['Capacidad'] ? parseInt(row['Capacidad']) : null,
            row['Compartimientos'] ? parseInt(row['Compartimientos']) : null,
            row['Diámetro Interior'] || null,
            row['Último km'] ? parseInt(row['Último km']) : null,
            row['Frecuencia P'] ? parseInt(row['Frecuencia P']) : null,
            row['Días P'] ? parseInt(row['Días P']) : null
          ]);
          insertedSR++;
        } else {
          placaSr = null; // No era placa válida
        }
      }

      // 5. Upsert Vehiculo (Tracto)
      await pool.query(`
        INSERT INTO vehiculos (
          placa, operacion, cliente, vin, marca, modelo, anio, color, peso_ton, potencia, cilindros, cilindrada,
          torque, cambios, suspension_del, suspension_post, transmision, reduccion_diferencial, freno_motor,
          frecuencia, dias, placa_sr, trip_distance, trip_time
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        ON CONFLICT (placa) DO UPDATE SET
          operacion = EXCLUDED.operacion,
          cliente = EXCLUDED.cliente,
          vin = EXCLUDED.vin,
          marca = EXCLUDED.marca,
          modelo = EXCLUDED.modelo,
          anio = EXCLUDED.anio,
          color = EXCLUDED.color,
          peso_ton = EXCLUDED.peso_ton,
          potencia = EXCLUDED.potencia,
          cilindros = EXCLUDED.cilindros,
          cilindrada = EXCLUDED.cilindrada,
          torque = EXCLUDED.torque,
          cambios = EXCLUDED.cambios,
          suspension_del = EXCLUDED.suspension_del,
          suspension_post = EXCLUDED.suspension_post,
          transmision = EXCLUDED.transmision,
          reduccion_diferencial = EXCLUDED.reduccion_diferencial,
          freno_motor = EXCLUDED.freno_motor,
          frecuencia = EXCLUDED.frecuencia,
          dias = EXCLUDED.dias,
          placa_sr = EXCLUDED.placa_sr,
          trip_distance = EXCLUDED.trip_distance,
          trip_time = EXCLUDED.trip_time;
      `, [
        placaStr,
        row['Operación'] || null,
        row['Cliente'] || null,
        row['VIN'] || null,
        row['Marca'] || null,
        row['Modelo'] || null,
        row['Año'] ? parseInt(row['Año']) : null,
        row['Color '] || null,
        row['Peso (TON)'] ? parseFloat(row['Peso (TON)']) : null,
        row['Potencia'] || null,
        row['Cantidad de Cilindros'] ? parseInt(row['Cantidad de Cilindros']) : null,
        row['Cilindrada'] ? parseFloat(row['Cilindrada']) : null,
        row['Torque'] || null,
        row['Cantidad de Cambios'] ? parseInt(row['Cantidad de Cambios']) : null,
        row['Suspensión Delantera'] || null,
        row['Suspensión Posterior'] || null,
        row['Tipo de Transmisión'] || null,
        row['Reducción Final del Diferencial'] || null,
        row['Tipo de Freno de Motor'] || null,
        row['Frecuencia'] ? parseInt(row['Frecuencia']) : null,
        row['Días'] ? parseInt(row['Días']) : null,
        placaSr,
        row['Trip Distance'] ? parseInt(row['Trip Distance']) : null,
        row['Trip Time'] ? parseInt(row['Trip Time']) : null
      ]);
      updatedTractos++;
    }

    console.log(`✅ Migración Completa. ${updatedTractos} tractos actualizados y ${insertedSR} semirremolques procesados.`);

  } catch (err) {
    console.error('Error durante la migración:', err);
  } finally {
    pool.end();
  }
}

migrateMaestro();
