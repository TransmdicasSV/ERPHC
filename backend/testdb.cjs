const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const res = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'inspecciones_flota\'');
    console.log(res.rows);
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    pool.end();
  }
}
test();
