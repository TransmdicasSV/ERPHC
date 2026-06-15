const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'dicas', password: 'admin', port: 5432 });

async function init() {
  try {
    console.log('Agregando columnas a vehiculos...');
    await pool.query(`
      ALTER TABLE vehiculos 
      ADD COLUMN IF NOT EXISTS tipo_vehiculo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS marca_tracto VARCHAR(100),
      ADD COLUMN IF NOT EXISTS modelo_tracto VARCHAR(100),
      ADD COLUMN IF NOT EXISTS anio_fabricacion VARCHAR(20),
      ADD COLUMN IF NOT EXISTS operacion VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cliente VARCHAR(100)
    `);
    
    console.log('Creando tabla mantenimientos_tecnicos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mantenimientos_tecnicos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(50),
        fecha_ejecutada DATE,
        frecuencia_dias INTEGER DEFAULT 30,
        dvr VARCHAR(50),
        copiloto VARCHAR(50),
        radio_base VARCHAR(50),
        handy VARCHAR(50),
        camara_interna VARCHAR(50),
        camara_externa VARCHAR(50),
        camara_retroceso VARCHAR(50),
        sensores_retroceso VARCHAR(50),
        sensores_delanteros VARCHAR(50),
        sistema_adas VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Base de datos actualizada con éxito');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
init();
