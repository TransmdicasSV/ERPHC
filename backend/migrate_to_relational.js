import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dicas',
  password: 'admin',
  port: 5432,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Creando tablas vehiculos e inspecciones_flota...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehiculos (
        placa VARCHAR(20) PRIMARY KEY,
        programa VARCHAR(50)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inspecciones_flota (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) REFERENCES vehiculos(placa),
        fecha VARCHAR(20),
        hora VARCHAR(20),
        tablet VARCHAR(50),
        radio VARCHAR(50),
        camaras VARCHAR(50),
        img_tablet TEXT,
        img_radio TEXT,
        img_camaras TEXT
      );
    `);

    console.log('2. Extrayendo datos unicos de vehiculos...');
    const vehiculosResult = await client.query(`
      SELECT DISTINCT placa, programa FROM equipos_flota
    `);

    console.log('3. Insertando en vehiculos...');
    for (const v of vehiculosResult.rows) {
      await client.query(
        'INSERT INTO vehiculos (placa, programa) VALUES ($1, $2) ON CONFLICT (placa) DO NOTHING',
        [v.placa, v.programa]
      );
    }

    console.log('4. Migrando historial de inspecciones...');
    const equiposResult = await client.query('SELECT * FROM equipos_flota');
    for (const e of equiposResult.rows) {
      await client.query(
        `INSERT INTO inspecciones_flota (placa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [e.placa, e.fecha, e.hora, e.tablet, e.radio, e.camaras, e.img_tablet, e.img_radio, e.img_camaras]
      );
    }

    await client.query('COMMIT');
    console.log('¡Migración relacional exitosa!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error durante la migración:', e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
