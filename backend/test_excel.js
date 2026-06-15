import xlsx from 'xlsx';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dicas',
  password: 'admin',
  port: 5432,
});

async function testUpload() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entregas_ti (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        encargado VARCHAR(100),
        nombre VARCHAR(200),
        dni VARCHAR(20),
        cargo VARCHAR(100),
        operacion VARCHAR(100),
        condicion VARCHAR(50),
        equipo_tipo VARCHAR(100),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        serie VARCHAR(100),
        laptop VARCHAR(100),
        mouse VARCHAR(100),
        cargador VARCHAR(100),
        motivo VARCHAR(200),
        observaciones TEXT,
        precio NUMERIC(10,2)
      );
    `);
    
    const workbook = xlsx.readFile('C:\\Users\\nanie\\Desktop\\jdcali\\entrega de equipos TI.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
    console.log(`Excel leído con ${data.length} filas.`);
    
    const excelDateToJSDate = (serial) => {
      if (!serial || isNaN(serial)) return null;
      const utc_days  = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;                                        
      const date_info = new Date(utc_value * 1000);
      return date_info.toISOString().split('T')[0];
    };

    let inserted = 0;
    let startRow = 0;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      if (data[i] && data[i].includes('DNI')) {
        startRow = i + 1;
        break;
      }
    }

    console.log(`Comenzando a insertar desde la fila ${startRow}`);
    
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row[3]) continue; 

      const fechaRaw = row[1];
      let fechaFormat = null;
      if (typeof fechaRaw === 'number') {
        fechaFormat = excelDateToJSDate(fechaRaw);
      } else if (typeof fechaRaw === 'string') {
        fechaFormat = fechaRaw;
      }

      await pool.query(
        `INSERT INTO entregas_ti (fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          fechaFormat,
          row[2] || '', row[3] || '', row[4] ? String(row[4]) : '', row[5] || '', row[6] || '', row[7] || '', row[8] || '', row[9] || '', row[10] || '', row[11] || '', row[12] || '', row[13] || '', row[14] || '', row[15] || '', row[16] || '', row[17] ? parseFloat(row[17]) : null
        ]
      );
      inserted++;
    }
    
    console.log(`Test completado. Insertados: ${inserted}`);
    process.exit(0);
  } catch (error) {
    console.error('Error detallado:', error);
    process.exit(1);
  }
}

testUpload();
