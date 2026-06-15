import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dicas',
  password: 'admin',
  port: 5432,
});

async function initDB() {
  try {
    // Drop in case it exists with wrong schema
    await pool.query('DROP TABLE IF EXISTS usuarios CASCADE');
    
    await pool.query(`
      CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'auditor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if admin exists
    const check = await pool.query("SELECT * FROM usuarios WHERE username = 'admin'");
    if (check.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await pool.query(
        "INSERT INTO usuarios (username, password_hash, rol) VALUES ($1, $2, $3)",
        ['admin', hash, 'admin']
      );
      console.log('Usuario admin creado con clave: admin123');
    } else {
      console.log('Usuario admin ya existe.');
    }
  } catch (e) {
    console.error('Error al inicializar DB:', e);
  } finally {
    pool.end();
  }
}

initDB();
