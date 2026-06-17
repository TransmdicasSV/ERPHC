import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import { generateMasterReport } from './reporteMaster.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('Generating...');
    const wb = await generateMasterReport(pool, '2026-05-01', '2026-06-30');
    await wb.xlsx.writeFile('TEST_MASTER.xlsx');
    console.log('OK, file saved');
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    pool.end();
  }
}
test();
