import { Pool } from 'pg';
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'dicas', password: 'admin', port: 5432 });

async function run() {
  try {
    const res = await pool.query(
      `UPDATE entregas_ti SET 
        fecha=$1, encargado=$2, nombre=$3, dni=$4, cargo=$5, operacion=$6, condicion=$7, equipo_tipo=$8, marca=$9, modelo=$10, serie=$11, laptop=$12, mouse=$13, cargador=$14, motivo=$15, observaciones=$16, precio=$17
       WHERE id = $18 RETURNING *`,
      ['2023-10-10', 'Test', 'Test', '12345', 'Test', 'Test', 'NUEVO', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', null, 73]
    );
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
