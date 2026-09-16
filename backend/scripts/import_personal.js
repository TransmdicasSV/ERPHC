import dotenv from 'dotenv';
import pkg from 'pg';
import xlsx from 'xlsx';
dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

async function importPersonal() {
  try {
    console.log('1. Creando tabla personal si no existe...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS personal (
        id SERIAL PRIMARY KEY,
        nombre_completo VARCHAR(200) NOT NULL,
        dni VARCHAR(20) UNIQUE NOT NULL,
        modalidad VARCHAR(100),
        area VARCHAR(100),
        cargo VARCHAR(100),
        fecha_ingreso DATE,
        estado VARCHAR(20) DEFAULT 'Activo'
      );
    `);
    
    console.log('2. Leyendo archivo Excel...');
    const excelPath = 'C:\\\\Users\\\\LEONARDONEIRA\\\\Desktop\\\\excel\\\\Personal Transmdicas.xlsx';
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
    console.log(`3. Importando datos (${data.length - 1} filas)...`);
    let inserted = 0;
    
    // Ignoramos la primera fila (índice 0) si es la cabecera real o si tiene los nombres
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue; // Saltar filas vacías
      
      const nombre_completo = row[1] ? String(row[1]).trim() : null;
      let dni = row[2] ? String(row[2]).trim() : null;
      const modalidad = row[3] ? String(row[3]) : null;
      const area = row[4] ? String(row[4]) : null;
      const cargo = row[5] ? String(row[5]) : null;
      
      // Fecha ingreso
      let fecha_ingreso = null;
      if (row[6]) {
        fecha_ingreso = excelDateToJSDate(row[6]);
      }
      
      
      if (!nombre_completo || !dni) continue;
      
      try {
        await pool.query(`
          INSERT INTO personal (nombre_completo, dni, modalidad, area, cargo, fecha_ingreso)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (dni) DO UPDATE SET 
            nombre_completo = EXCLUDED.nombre_completo,
            cargo = EXCLUDED.cargo,
            area = EXCLUDED.area,

            estado = 'Activo'
        `, [nombre_completo, dni, modalidad, area, cargo, fecha_ingreso]);
        inserted++;
      } catch (err) {
        console.error(`Error importando DNI ${dni}:`, err.message);
      }
    }
    
    console.log(`\n¡Importación finalizada! ${inserted} registros actualizados/insertados.`);
  } catch (err) {
    console.error('Error fatal:', err);
  } finally {
    pool.end();
  }
}

importPersonal();
