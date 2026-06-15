import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'dicas', password: 'admin', port: 5432 });

pool.query(`
  CREATE TABLE IF NOT EXISTS incidentes_soporte (
    id SERIAL PRIMARY KEY, 
    placa VARCHAR(20) NOT NULL, 
    tipo_solicitud VARCHAR(100) NOT NULL, 
    descripcion TEXT NOT NULL, 
    operador VARCHAR(100) NOT NULL, 
    estado VARCHAR(20) DEFAULT 'Pendiente', 
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => { console.log('Tabla creada'); pool.end(); })
.catch(console.error);
