import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const checks = [
    {
      nombre: 'mantenimientos_tecnicos.placa → vehiculos.placa',
      sql: `SELECT DISTINCT placa FROM mantenimientos_tecnicos
            WHERE placa IS NOT NULL AND placa NOT IN (SELECT placa FROM vehiculos)`,
    },
    {
      nombre: 'incidentes.placa → vehiculos.placa',
      sql: `SELECT DISTINCT placa FROM incidentes
            WHERE placa IS NOT NULL AND placa NOT IN (SELECT placa FROM vehiculos)`,
    },
    {
      nombre: 'incidentes_soporte.placa → vehiculos.placa',
      sql: `SELECT DISTINCT placa FROM incidentes_soporte
            WHERE placa IS NOT NULL AND placa NOT IN (SELECT placa FROM vehiculos)`,
    },
    {
      nombre: 'vehiculos.placa_sr → semirremolques.placa_sr',
      sql: `SELECT DISTINCT placa_sr FROM vehiculos
            WHERE placa_sr IS NOT NULL AND placa_sr != ''
            AND placa_sr NOT IN (SELECT placa_sr FROM semirremolques)`,
    },
    {
      nombre: 'audit_logs.user_id → usuarios.id',
      sql: `SELECT DISTINCT user_id FROM audit_logs
            WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM usuarios)`,
    },
    {
      nombre: 'entregas_ti.dni → personal.dni',
      sql: `SELECT DISTINCT dni FROM entregas_ti
            WHERE dni IS NOT NULL AND dni != '' AND dni NOT IN (SELECT dni FROM personal)`,
    },
  ];
    console.log('=== Revisando registros huérfanos antes de crear las FKs ===\n');

  for (const check of checks) {
    const result = await pool.query(check.sql);
    if (result.rows.length === 0) {
      console.log(`${check.nombre} — sin huérfanos, se puede crear la FK sin problema.`);
    } else {
      console.log(` ${check.nombre} — ${result.rows.length} valor(es) huérfano(s), NO crear la FK todavía:`);
      console.log('   ', result.rows.map(r => Object.values(r)[0]).join(', '));
    }
    console.log('');
  }

  await pool.end();
}