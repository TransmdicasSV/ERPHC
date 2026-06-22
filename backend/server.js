import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import xlsx from 'xlsx';
import { generatePDF, generateExcel } from './reports.js';
import { generateMasterReport } from './reporteMaster.js';
import { startRadarService, addRadarClient, syncRadarData } from './radarService.js';
import { startTelegramBot } from './telegramBot.js';

const JWT_SECRET = 'NEXUS_TACTICAL_SECRET_2026';
const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 8000;

// ConfiguraciÃ³n de multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar que exista la carpeta uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ConfiguraciÃ³n de Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadToCloudinary = (buffer, folderName, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: resourceType },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (url) => {
  if (!url || !url.includes('cloudinary.com')) return;
  try {
    const parts = url.split('/');
    const versionIndex = parts.findIndex(p => p.startsWith('v') && !isNaN(p.substring(1)));
    if (versionIndex !== -1 && versionIndex < parts.length - 1) {
      const publicIdWithExt = parts.slice(versionIndex + 1).join('/');
      const publicId = publicIdWithExt.split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
    }
  } catch (err) {
    console.error(`Error al eliminar de Cloudinary (${url}):`, err);
  }
};

// ConfiguraciÃ³n de Multer (Memoria en vez de Disco)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ConfiguraciÃ³n de CORS y estÃ¡ticos
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir imÃ¡genes estÃ¡ticas

// ConexiÃ³n a PostgreSQL (Neon.tech en la Nube)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicializar Tablas
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entregas_ti (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        encargado VARCHAR(100),
        receptor VARCHAR(255),
        equipo VARCHAR(255),
        serie VARCHAR(100),
        tipo_movimiento VARCHAR(50),
        observaciones TEXT,
        acta_url TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        accion VARCHAR(255),
        tabla_afectada VARCHAR(100),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'tecnico';
    `);
    console.log('Tablas validadas y estructura de seguridad lista.');
  } catch (err) {
    console.error('Error al crear tablas:', err);
  }
};
initDb();

// FUNCIÃ“N DE AUDITORÃ A
const logAction = async (userId, accion, tablaAfectada) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, accion, tabla_afectada, fecha) VALUES ($1, $2, $3, NOW())',
      [userId || null, accion, tablaAfectada]
    );
  } catch (err) {
    console.error('Error de auditorÃ­a:', err);
  }
};

// ===================================// ENDPOINTS PÃšBLICOS Y LOGIN (No requieren token)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ error: 'Credenciales invÃ¡lidas' });
    
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales invÃ¡lidas' });
    
    const userRol = user.rol || 'tecnico';
    const token = jwt.sign({ id: user.id, username: user.username, rol: userRol }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { username: user.username, rol: userRol } });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/public/incidentes', async (req, res) => {
  const { placa, titulo, descripcion } = req.body;
  
  if (!placa || !titulo) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const query = 'INSERT INTO incidentes (placa, titulo, descripcion, estado, fecha_reporte) VALUES ($1, $2, $3, $4, NOW()) RETURNING *';
    const values = [placa, titulo, descripcion, 'Pendiente'];
    const result = await pool.query(query, values);
    
    await logAction(null, `Incidente reportado pÃºblicamente: ${titulo}`, 'incidentes');
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware para proteger rutas
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  if (!token) return res.status(403).json({ error: 'Token requerido para acceder a este recurso' });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token invÃ¡lido o expirado' });
    req.user = decoded;
    next();
  });
};

  const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'Administrador')) {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
    next();
  };

//
//

// ==========================================
// ENDPOINTS PÃšBLICOS (PORTAL OPERADORES)
// ==========================================

app.get('/api/public/stats', async (req, res) => {
  try {
    const veh = await pool.query('SELECT COUNT(*) FROM vehiculos');
    
    const result = await pool.query('SELECT placa, fecha, hora, tablet, radio, camaras FROM inspecciones_flota ORDER BY id DESC LIMIT 500');
    
    const today1 = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayParts = today1.split('-');
    const today2 = `${todayParts[2]}-${todayParts[1]}-${todayParts[0]}`; // DD-MM-YYYY
    
    let inspeccionesHoy = 0;
    const ticker = [];
    
    result.rows.forEach(r => {
      if (r.fecha === today1 || r.fecha === today2) inspeccionesHoy++;
      if (ticker.length < 10) {
        const isOk = (r.tablet === 'OK' || r.tablet === 'N/A') && (r.radio === 'OK' || r.radio === 'N/A') && (r.camaras === 'OK' || r.camaras === 'N/A');
        ticker.push({ placa: r.placa, hora: r.hora, estado: isOk ? 'APROBADO' : 'OBSERVADO' });
      }
    });

    res.json({
      totalFlota: parseInt(veh.rows[0].count),
      inspeccionesHoy,
      ticker
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
app.get('/api/public/consulta/:placa', async (req, res) => {
  const { placa } = req.params;
  try {
    const result = await pool.query('SELECT * FROM inspecciones_flota WHERE placa = $1 ORDER BY id DESC LIMIT 1', [placa]);
    const insp = result.rows[0];
    
    if (!insp) return res.status(404).json({ error: 'Unidad no encontrada' });

    const estado_general = (insp.tablet === 'OK' && insp.radio === 'OK' && insp.camaras === 'OK') ? 'APROBADO' : 'OBSERVADO';

    // Buscar el Ãºltimo incidente de soporte registrado para esta placa
    const incidenteResult = await pool.query("SELECT * FROM incidentes_soporte WHERE placa = $1 ORDER BY id DESC LIMIT 1", [placa]);
    const incidente_pendiente = incidenteResult.rows[0] || null;

    res.json({
      placa: insp.placa,
      fecha: insp.fecha,
      hora: insp.hora,
      tablet: insp.tablet,
      radio: insp.radio,
      camaras: insp.camaras,
      estado_general,
      incidente_pendiente,
      fotos: [
        { tipo: 'Tablet', url: insp.img_tablet ? (insp.img_tablet.startsWith('http') ? insp.img_tablet : `http://localhost:8000/uploads/${insp.img_tablet}`) : null },
        { tipo: 'Radio', url: insp.img_radio ? (insp.img_radio.startsWith('http') ? insp.img_radio : `http://localhost:8000/uploads/${insp.img_radio}`) : null },
        { tipo: 'CÃ¡maras', url: insp.img_camaras ? (insp.img_camaras.startsWith('http') ? insp.img_camaras : `http://localhost:8000/uploads/${insp.img_camaras}`) : null }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear Incidente (Desde Portal Público)
app.post('/api/incidentes_soporte', async (req, res) => {
  const { placa, tipo_solicitud, descripcion, operador } = req.body;
  try {
    await pool.query(
      'INSERT INTO incidentes_soporte (placa, tipo_solicitud, descripcion, operador) VALUES ($1, $2, $3, $4)',
      [placa, tipo_solicitud, descripcion, operador]
    );
    await logAction(null, `Solicitud de soporte para ${placa}`, 'incidentes_soporte');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la solicitud' });
  }
});

// APLICAR PROTECCIÓN GLOBAL AL RESTO DE RUTAS
// Endpoint para recibir la telemetría del Core Desktop local (Sin JWT, usa secret interno)
app.post('/api/radar/sync', async (req, res) => {
  await syncRadarData(req, res, pool);
});

app.use(verifyToken);

  // ==========================================
  // ENDPOINTS DIRECTORIO DE PERSONAL
  // ==========================================
  app.get('/api/personal', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM personal ORDER BY nombre_completo ASC');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error obteniendo el personal' });
    }
  });

  app.post('/api/personal', async (req, res) => {
    const { id_interno, nombre_completo, dni, modalidad, area, cargo, telefono, estado } = req.body;
    if (!nombre_completo || !dni) {
      return res.status(400).json({ error: 'Nombre y DNI son obligatorios' });
    }
    try {
      const result = await pool.query(
        `INSERT INTO personal (id_interno, nombre_completo, dni, modalidad, area, cargo, telefono, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id_interno, nombre_completo, dni, modalidad, area, cargo, telefono, estado || 'Activo']
      );
      await logAction(req.user ? req.user.id : null, `Registró nuevo personal: ${nombre_completo}`, 'personal');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar personal (DNI duplicado?)' });
    }
  });

  app.put('/api/personal/:id', async (req, res) => {
    const { id } = req.params;
    const { id_interno, nombre_completo, dni, modalidad, area, cargo, telefono, estado } = req.body;
    try {
      const result = await pool.query(
        `UPDATE personal SET 
          id_interno = $1, nombre_completo = $2, dni = $3, modalidad = $4, area = $5, cargo = $6, telefono = $7, estado = $8
         WHERE id = $9 RETURNING *`,
        [id_interno, nombre_completo, dni, modalidad, area, cargo, telefono, estado, id]
      );
      await logAction(req.user ? req.user.id : null, `Actualizó personal: ${nombre_completo}`, 'personal');
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar personal' });
    }
  });

  app.delete('/api/personal/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM personal WHERE id = $1', [id]);
      await logAction(req.user ? req.user.id : null, `Eliminó registro de personal ID: ${id}`, 'personal');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al eliminar personal' });
    }
  });

  // ==========================================
  // ENDPOINTS MAESTRO DE FLOTAS
  // ==========================================

app.get('/api/maestro/tractos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehiculos ORDER BY placa ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo tractos' });
  }
});

app.get('/api/maestro/semirremolques', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM semirremolques ORDER BY placa_sr ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo semirremolques' });
  }
});

// ==========================================
// ENDPOINTS RELACIONALES (FLOTAS E INCIDENTES)
// ==========================================

// Obtener VehÃ­culos (Inventario Principal - PAGINADO)
app.get('/vehiculos/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase() : '';
    const operacion = req.query.operacion && req.query.operacion !== 'Todos' ? req.query.operacion : '';

    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (LOWER(v.placa) LIKE $${paramIndex} OR LOWER(v.operacion) LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

      if (operacion) {
        if (operacion === 'Falta identificar') {
          whereClause += ` AND (v.operacion IS NULL OR v.operacion = '' OR LOWER(v.operacion) = 'sin operación')`;
        } else if (operacion === 'Industrias') {
          whereClause += ` AND LOWER(v.operacion) LIKE $${paramIndex}`;
          params.push('%industria%');
          paramIndex++;
        } else if (operacion === 'Bambas') {
          whereClause += ` AND LOWER(v.operacion) LIKE $${paramIndex}`;
          params.push('%bambas%');
          paramIndex++;
        } else {
          whereClause += ` AND LOWER(v.operacion) = $${paramIndex}`;
          params.push(operacion.toLowerCase());
          paramIndex++;
        }
      }

    const query = `
      SELECT 
        v.placa, v.operacion as programa, v.tipo_vehiculo, v.marca as marca_tracto, v.modelo as modelo_tracto, v.anio as anio_fabricacion, v.operacion, v.cliente,
        i.tablet, i.radio, i.camaras, i.fecha, i.observaciones
      FROM vehiculos v
      LEFT JOIN (
        SELECT placa, tablet, radio, camaras, fecha, observaciones,
               ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
        FROM inspecciones_flota
      ) i ON v.placa = i.placa AND i.rn = 1
      ${whereClause}
      ORDER BY v.placa ASC
    `;

    const result = await pool.query(query, params);

    let vehiculosConEstado = result.rows.map(v => {
      let estado = 'Falta de revisiÃ³n';
      if (v.tablet) {
        const t = v.tablet.trim().toUpperCase();
        const r = v.radio.trim().toUpperCase();
        const c = v.camaras.trim().toUpperCase();

        const isOkOrNa = (val) => val === 'OK' || val === 'N/A';

        if (t === 'N/A' && r === 'N/A' && c === 'N/A') estado = 'N/A';
        else if (isOkOrNa(t) && isOkOrNa(r) && isOkOrNa(c)) estado = 'Operativa';
        else estado = 'Observada';
      }
      return { ...v, estado };
    });

    const estadoFiltro = req.query.estado || 'Todos';
    if (estadoFiltro !== 'Todos') {
      vehiculosConEstado = vehiculosConEstado.filter(v => v.estado === estadoFiltro);
    }

    const total = vehiculosConEstado.length;
    const paginatedData = vehiculosConEstado.slice(offset, offset + limit);

    res.json({
      data: paginatedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener vehiculos' });
  }
});

// Crear VehÃ­culo
app.post('/vehiculos/', async (req, res) => {
  const { placa, programa, tipo_vehiculo, operacion, cliente, marca_tracto, modelo_tracto, anio_fabricacion } = req.body;
  const opFinal = operacion || programa;
  if (!placa || !opFinal) return res.status(400).json({ error: 'Placa y Operacion son obligatorios' });
  try {
    const query = 'INSERT INTO vehiculos (placa, operacion, tipo_vehiculo, cliente, marca, modelo, anio) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const values = [placa, opFinal, tipo_vehiculo, cliente, marca_tracto, modelo_tracto, anio_fabricacion];
    const result = await pool.query(query, values);
    
    await logAction(req.user ? req.user.id : null, `CreÃ³ el vehÃ­culo ${placa}`, 'vehiculos');
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') res.status(400).json({ error: 'La placa ya existe' });
    else res.status(500).json({ error: 'Error al crear vehiculo' });
  }
});

// Editar datos estÃ¡ticos de VehÃ­culo
app.put('/vehiculos/:placa', async (req, res) => {
  const { placa } = req.params;
  const { programa, tipo_vehiculo, marca_tracto, modelo_tracto, anio_fabricacion, operacion, cliente } = req.body;
  const opFinal = operacion || programa;
  try {
    const result = await pool.query(
      `UPDATE vehiculos 
       SET operacion = $1, tipo_vehiculo = $2, marca = $3, modelo = $4, anio = $5, cliente = $6 
       WHERE placa = $7 RETURNING *`,
      [opFinal, tipo_vehiculo, marca_tracto, modelo_tracto, anio_fabricacion, cliente, placa]
    );
    await logAction(req.user ? req.user.id : null, `EditÃ³ el vehÃ­culo ${placa}`, 'vehiculos');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar vehiculo' });
  }
});

// ==========================================
// ENDPOINTS: MANTENIMIENTO TÃ‰CNICO Y EXCEL
// ==========================================

// Listar mantenimientos
app.get('/mantenimientos/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.placa,
        COALESCE(m.id, i.id, 0) as id,
        COALESCE(i.fecha::text, m.fecha_ejecutada::text) as fecha_ejecutada_raw,
        COALESCE(m.frecuencia_dias, 180) as frecuencia_dias,
        CASE WHEN i.camaras ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.dvr, 'N/A') END as dvr,
        CASE WHEN i.tablet ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.copiloto, 'N/A') END as copiloto,
        CASE WHEN i.radio ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.radio_base, 'N/A') END as radio_base,
        COALESCE(m.handy, 'N/A') as handy,
        COALESCE(m.camara_interna, 'N/A') as camara_interna,
        COALESCE(m.camara_externa, 'N/A') as camara_externa,
        COALESCE(m.camara_retroceso, 'N/A') as camara_retroceso,
        COALESCE(m.sensores_retroceso, 'N/A') as sensores_retroceso,
        COALESCE(m.sensores_delanteros, 'N/A') as sensores_delanteros,
        COALESCE(m.sistema_adas, 'N/A') as sistema_adas
      FROM vehiculos v
      LEFT JOIN (
        SELECT placa, fecha, camaras, tablet, radio, id,
               ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
        FROM inspecciones_flota
      ) i ON v.placa = i.placa AND i.rn = 1
      LEFT JOIN (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
        FROM mantenimientos_tecnicos
      ) m ON v.placa = m.placa AND m.rn = 1
      ORDER BY v.placa ASC
    `);

    const data = result.rows.map(row => {
      // Normalizar fecha
      let f = row.fecha_ejecutada_raw;
      if (f && f.includes('--')) f = null;
      if (f && f.includes('/')) {
        const parts = f.split('/');
        if (parts.length === 3) {
          f = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      // No forzamos la fecha actual si no tiene registro

      return {
        ...row,
        fecha_ejecutada: f
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mantenimientos' });
  }
});

// Crear mantenimiento
app.post('/mantenimientos/', async (req, res) => {
  const { placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto, radio_base, handy, camara_interna, camara_externa, camara_retroceso, sensores_retroceso, sensores_delanteros, sistema_adas } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO mantenimientos_tecnicos (placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto, radio_base, handy, camara_interna, camara_externa, camara_retroceso, sensores_retroceso, sensores_delanteros, sistema_adas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
    `, [placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto, radio_base, handy, camara_interna, camara_externa, camara_retroceso, sensores_retroceso, sensores_delanteros, sistema_adas]);
    await logAction(req.user ? req.user.id : null, `RegistrÃ³ mantenimiento para ${placa}`, 'mantenimientos_tecnicos');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar mantenimiento' });
  }
});

  // Generar Reporte Master (Auditoría)
app.get('/api/reportes/master', async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const workbook = await generateMasterReport(pool, startDate, endDate);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Master.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generando Reporte Master:', err);
    res.status(500).json({ error: 'Error interno generando reporte' });
  }
});

// Generar Reporte Excel
app.get('/api/reportes/mantenimiento-excel', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Mantenimiento', { views: [{ showGridLines: false }] });

    // ESTILOS COMUNES
    const borderAll = {
      top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
    };
    const fontBold = { bold: true, name: 'Arial', size: 10 };
    const fontNormal = { name: 'Arial', size: 9 };
    const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // FILA 1: PROGRAMA (Azul)
    sheet.mergeCells('A1:U1');
    const f1 = sheet.getCell('A1');
    f1.value = 'PROGRAMA';
    f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E99' } };
    f1.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
    f1.alignment = centerAlign;
    f1.border = borderAll;

    sheet.getCell('V1').value = 'TI - PR - 01';
    sheet.getCell('V1').font = fontBold;
    sheet.getCell('V1').alignment = centerAlign;
    sheet.getCell('V1').border = borderAll;

    // FILA 2 a 5: TÃ­tulo
    sheet.mergeCells('D2:U5');
    const titulo = sheet.getCell('D2');
    titulo.value = 'MANTENIMIENTO DE EQUIPOS TECNOLÃ“GICOS - TRACTO/CAMIONETAS';
    titulo.font = { bold: true, size: 14, name: 'Arial' };
    titulo.alignment = centerAlign;
    titulo.border = borderAll;

    // Logo area (A2:C5)
    sheet.mergeCells('A2:C5');
    sheet.getCell('A2').value = 'TRANSMDICAS S.R.L.';
    sheet.getCell('A2').alignment = centerAlign;
    sheet.getCell('A2').font = fontBold;
    sheet.getCell('A2').border = borderAll;

    const metadata = ['VersiÃ³n:', 'Fecha:', 'Revisa:', 'Aprueba:'];
    for(let i=0; i<4; i++) {
      const c = sheet.getCell('V' + (i+2));
      c.value = metadata[i];
      c.border = borderAll;
      c.font = fontNormal;
    }

    // FILA 6: Secciones principales (Verde oscuro)
    const greenHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF99' } };
    sheet.mergeCells('A6:H6');
    sheet.getCell('A6').value = 'DATOS';
    sheet.mergeCells('I6:K6');
    sheet.getCell('I6').value = 'PROGRAMADO';
    sheet.mergeCells('L6:V6');
    sheet.getCell('L6').value = 'EJECUTADO';

    ['A6', 'I6', 'L6'].forEach(col => {
      const c = sheet.getCell(col);
      c.fill = greenHeader;
      c.font = fontBold;
      c.alignment = centerAlign;
      c.border = borderAll;
    });

    // FILA 7: Columnas (Verde claro/cian)
    const headers = [
      'NÂ°', 'TIPO DE VEHÃCULO', 'PLACA', 'MARCA TRACTO', 'MODELO TRACTO', 'AÃ‘O FABRICACIÃ“N TRACTO', 'OPERACIÃ“N', 'CLIENTE',
      'FECHA ULT MANTENIMIENTO', 'FRECUENCIA', 'FECHA PROX MANTENIMIENTO',
      'DVR', 'COPILOTO', 'RADIO BASE', 'HANDY', 'CAMARA INTERNA', 'CAMARA EXTERNA', 'CAMARA DE RETROCESO', 'SENSORES DE RETROCESO', 'SENSORES DELANTEROS', 'SISTEMA ADAS', 'FECHA EJECUTADA'
    ];
    
    // Anchos
    const widths = [4, 15, 12, 12, 12, 15, 12, 12, 15, 10, 15, 5,5,5,5,5,5,5,5,5,5, 15];
    
    headers.forEach((h, index) => {
      const colLetter = sheet.getColumn(index + 1).letter;
      const c = sheet.getCell(colLetter + '7');
      c.value = h;
      c.fill = greenHeader;
      c.font = { bold: true, size: 8, name: 'Arial' };
      c.alignment = centerAlign;
      c.border = borderAll;
      
      // Ajustar ancho
      sheet.getColumn(index + 1).width = widths[index];
    });
    sheet.getRow(7).height = 80; // Hacer cabeceras verticales legibles

    // OBTENER DATOS
    const query = `
      SELECT 
        v.*,
        COALESCE(i.fecha::text, m.fecha_ejecutada::text) as fecha_ejecutada_raw,
        COALESCE(m.frecuencia_dias, 180) as frecuencia_dias,
        CASE WHEN i.camaras ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.dvr, 'N/A') END as dvr,
        CASE WHEN i.tablet ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.copiloto, 'N/A') END as copiloto,
        CASE WHEN i.radio ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.radio_base, 'N/A') END as radio_base,
        COALESCE(m.handy, 'N/A') as handy,
        COALESCE(m.camara_interna, 'N/A') as camara_interna,
        COALESCE(m.camara_externa, 'N/A') as camara_externa,
        COALESCE(m.camara_retroceso, 'N/A') as camara_retroceso,
        COALESCE(m.sensores_retroceso, 'N/A') as sensores_retroceso,
        COALESCE(m.sensores_delanteros, 'N/A') as sensores_delanteros,
        COALESCE(m.sistema_adas, 'N/A') as sistema_adas
      FROM vehiculos v
      LEFT JOIN (
        SELECT placa, fecha, camaras, tablet, radio, id,
               ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
        FROM inspecciones_flota
      ) i ON v.placa = i.placa AND i.rn = 1
      LEFT JOIN (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
        FROM mantenimientos_tecnicos
      ) m ON v.placa = m.placa AND m.rn = 1
      ORDER BY v.placa ASC
    `;
    const dataRes = await pool.query(query);

    let rowNum = 8;
    dataRes.rows.forEach((row, i) => {
      // Normalizar fecha para excel
      let rawF = row.fecha_ejecutada_raw;
      if (rawF && rawF.includes('--')) rawF = null;
      if (rawF && rawF.includes('/')) {
        const parts = rawF.split('/');
        if (parts.length === 3) rawF = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      let ultMant = rawF ? new Date(rawF) : null;
      let freq = row.frecuencia_dias || 30;
      let proxMant = null;
      if (ultMant) {
        proxMant = new Date(ultMant);
        proxMant.setDate(proxMant.getDate() + freq);
      }

      const formatDate = (d) => d ? d.toISOString().split('T')[0] : '';

      const rowData = [
        i + 1,
        row.tipo_vehiculo || '',
        row.placa,
        row.marca_tracto || '',
        row.modelo_tracto || '',
        row.anio_fabricacion || '',
        row.operacion || '',
        row.cliente || '',
        formatDate(ultMant),
        freq === 180 ? 'Semestral' : `${freq} dÃ­as`,
        formatDate(proxMant),
        row.dvr || '', row.copiloto || '', row.radio_base || '', row.handy || '',
        row.camara_interna || '', row.camara_externa || '', row.camara_retroceso || '',
        row.sensores_retroceso || '', row.sensores_delanteros || '', row.sistema_adas || '',
        formatDate(ultMant)
      ];

      rowData.forEach((val, colIndex) => {
        const c = sheet.getCell(sheet.getColumn(colIndex + 1).letter + rowNum);
        c.value = val;
        c.border = borderAll;
        c.alignment = centerAlign;
        c.font = fontNormal;
      });
      rowNum++;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=MantenimientoEquipos.xlsx');
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar excel' });
  }
});


// ==========================================
// ENDPOINTS: GESTIÃ“N DE INCIDENTES (SOPORTE TI)
// ==========================================

// Listar Incidentes (Para el Dashboard Interno)
app.get('/api/incidentes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidentes_soporte ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener incidentes' });
  }
});

// Actualizar Estado de Incidente
app.put('/api/incidentes/:id', upload.single('evidencia'), async (req, res) => {
  const { id } = req.params;
  const { estado, resolucion_desc } = req.body;
  let evidenciaUrl = null;

  try {
    if (req.file) {
      evidenciaUrl = await uploadToCloudinary(req.file.buffer, 'tickets_evidencias');
    }

    const updateQuery = evidenciaUrl 
      ? 'UPDATE incidentes_soporte SET estado = $1, evidencia = $2 WHERE id = $3'
      : 'UPDATE incidentes_soporte SET estado = $1 WHERE id = $2';
    
    const updateParams = evidenciaUrl ? [estado, evidenciaUrl, id] : [estado, id];

    await pool.query(updateQuery, updateParams);
    await logAction(req.user ? req.user.id : null, `Actualizó estado de incidente #${id}`, 'incidentes_soporte');

    // Lógica de Soporte -> Reparación (Actualización de la última inspección)
    if (estado === 'Resuelto') {
      const ticketResult = await pool.query('SELECT placa, tipo_solicitud, descripcion FROM incidentes_soporte WHERE id = $1', [id]);
      const ticket = ticketResult.rows[0];

      if (ticket && ticket.placa) {
        const ultimaInsp = await pool.query('SELECT * FROM inspecciones_flota WHERE placa = $1 ORDER BY id DESC LIMIT 1', [ticket.placa]);
        
        if (ultimaInsp.rows.length > 0) {
          const insp = ultimaInsp.rows[0];
          let updated = false;
          let newTablet = insp.tablet;
          let newRadio = insp.radio;
          let newCamaras = insp.camaras;

          // Solo cambiar a OK lo que estaba explícitamente en Error o Falta o SOPORTE
          if (['Falta', 'Error', 'SOPORTE'].includes(insp.tablet)) { newTablet = 'OK'; updated = true; }
          if (['Falta', 'Error', 'SOPORTE'].includes(insp.radio)) { newRadio = 'OK'; updated = true; }
          if (['Falta', 'Error', 'SOPORTE'].includes(insp.camaras)) { newCamaras = 'OK'; updated = true; }

          if (updated) {
            // Se le concatena un texto a las observaciones para saber que un ticket la reparó y el detalle
            const detalle = resolucion_desc ? `: ${resolucion_desc}` : '';
            const addObs = `[Reparado por TKT-${id}${detalle}]`;
            const observacionFinal = insp.observaciones ? `${insp.observaciones} ${addObs}` : addObs;

            await pool.query(
              'UPDATE inspecciones_flota SET tablet = $1, radio = $2, camaras = $3, observaciones = $4 WHERE id = $5',
              [newTablet, newRadio, newCamaras, observacionFinal, insp.id]
            );
            await logAction(req.user ? req.user.id : null, `Reparó última inspección a OK para ${ticket.placa} (Ticket Resuelto)`, 'inspecciones_flota');
          }
        }
      }
    }

    res.json({ success: true, evidenciaUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar incidente' });
  }
});

// Eliminar Incidente (Dashboard)
app.delete('/api/incidentes/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM incidentes_soporte WHERE id = $1', [id]);
    await logAction(req.user ? req.user.id : null, `EliminÃ³ incidente de soporte #${id}`, 'incidentes_soporte');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar incidente' });
  }
});
// ==========================================

// Obtener inspecciones de un vehÃ­culo (Historial)
app.get('/inspecciones/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const result = await pool.query('SELECT * FROM inspecciones_flota WHERE placa = $1 ORDER BY id DESC', [placa]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// Registrar InspecciÃ³n CON ImÃ¡genes
app.post('/inspecciones/', upload.fields([{ name: 'img_tablet' }, { name: 'img_radio' }, { name: 'img_camaras' }]), async (req, res) => {
  const { placa, programa, fecha, hora, tablet, radio, camaras, observaciones } = req.body;
  
  // Subir imÃ¡genes a Cloudinary
  let img_tablet = '';
  let img_radio = '';
  let img_camaras = '';

  try {
    if (req.files['img_tablet']) img_tablet = await uploadToCloudinary(req.files['img_tablet'][0].buffer, 'flotas_inspecciones');
    if (req.files['img_radio']) img_radio = await uploadToCloudinary(req.files['img_radio'][0].buffer, 'flotas_inspecciones');
    if (req.files['img_camaras']) img_camaras = await uploadToCloudinary(req.files['img_camaras'][0].buffer, 'flotas_inspecciones');
  } catch(e) {
    console.error("Error subiendo a Cloudinary:", e);
    return res.status(500).json({ error: 'Error al subir imÃ¡genes a la nube' });
  }

  try {
    await pool.query('BEGIN');
    
    // Asegurar que el vehÃ­culo exista (Upsert)
    await pool.query(
      'INSERT INTO vehiculos (placa, operacion) VALUES ($1, $2) ON CONFLICT (placa) DO UPDATE SET operacion = $2',
      [placa, programa]
    );

    // Insertar inspecciÃ³n en el historial
    const query = `
      INSERT INTO inspecciones_flota (placa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `;
    const values = [placa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras, observaciones || ''];
    const result = await pool.query(query, values);
    
    await logAction(req.user ? req.user.id : null, `RegistrÃ³ inspecciÃ³n en ${placa}`, 'inspecciones_flota');
    
    await pool.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al registrar inspecciÃ³n' });
  }
});

// Actualizar VehÃ­culo (Programa)
app.put('/vehiculos/:placa', async (req, res) => {
  const { placa } = req.params;
  const { programa } = req.body;
  try {
    const result = await pool.query('UPDATE vehiculos SET operacion = $1 WHERE placa = $2 RETURNING *', [programa, placa]);
    await logAction(req.user ? req.user.id : null, `Actualizó programa de ${placa}`, 'vehiculos');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar vehiculo' });
  }
});

// Eliminar VehÃ­culo (Protegido por Foreign Key constraint por defecto)
app.delete('/vehiculos/:placa', requireAdmin, async (req, res) => {
  const { placa } = req.params;
  try {
    await pool.query('DELETE FROM vehiculos WHERE placa = $1', [placa]);
    await logAction(req.user ? req.user.id : null, `EliminÃ³ el vehÃ­culo ${placa}`, 'vehiculos');
    res.json({ message: 'VehÃ­culo eliminado' });
  } catch (err) {
    // CÃ³digo de error de PostgreSQL para Foreign Key Violation es 23503
    if (err.code === '23503') {
      res.status(400).json({ error: 'No se puede eliminar porque tiene historial de inspecciones. Elimine el historial primero.' });
    } else {
      res.status(500).json({ error: 'Error interno al eliminar' });
    }
  }
});

// Eliminar InspecciÃ³n individual
app.delete('/inspecciones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const inspRes = await pool.query('SELECT img_tablet, img_radio, img_camaras FROM inspecciones_flota WHERE id = $1', [id]);
    if (inspRes.rows.length > 0) {
      const { img_tablet, img_radio, img_camaras } = inspRes.rows[0];
      await Promise.all([
        deleteFromCloudinary(img_tablet),
        deleteFromCloudinary(img_radio),
        deleteFromCloudinary(img_camaras)
      ]);
    }
    
    await pool.query('DELETE FROM inspecciones_flota WHERE id = $1', [id]);
    res.json({ message: 'InspecciÃ³n eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar inspecciÃ³n' });
  }
});

// Editar Estado y Fotos de InspecciÃ³n individual
app.put('/inspecciones/:id', upload.fields([{ name: 'img_tablet' }, { name: 'img_radio' }, { name: 'img_camaras' }]), async (req, res) => {
  const { id } = req.params;
  const { fecha, hora, tablet, radio, camaras, observaciones } = req.body;
  
  try {
    // Primero obtener los datos actuales para no borrar las fotos que no se actualizaron
    const currentInsp = await pool.query('SELECT * FROM inspecciones_flota WHERE id = $1', [id]);
    if (currentInsp.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    
    const curr = currentInsp.rows[0];
    let img_tablet = curr.img_tablet;
    let img_radio = curr.img_radio;
    let img_camaras = curr.img_camaras;

    if (req.files && req.files['img_tablet']) {
      await deleteFromCloudinary(curr.img_tablet);
      img_tablet = await uploadToCloudinary(req.files['img_tablet'][0].buffer, 'flotas_inspecciones');
    }
    if (req.files && req.files['img_radio']) {
      await deleteFromCloudinary(curr.img_radio);
      img_radio = await uploadToCloudinary(req.files['img_radio'][0].buffer, 'flotas_inspecciones');
    }
    if (req.files && req.files['img_camaras']) {
      await deleteFromCloudinary(curr.img_camaras);
      img_camaras = await uploadToCloudinary(req.files['img_camaras'][0].buffer, 'flotas_inspecciones');
    }

    await pool.query(
      'UPDATE inspecciones_flota SET fecha=$1, hora=$2, tablet=$3, radio=$4, camaras=$5, img_tablet=$6, img_radio=$7, img_camaras=$8, observaciones=$9 WHERE id=$10',
      [fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras, observaciones || '', id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar inspecciÃ³n completa' });
  }
});

// ==========================================
// ENDPOINTS REPORTES (PDF/EXCEL)
// ==========================================
app.get('/reportes/pdf', async (req, res) => {
  const { filtro, valor } = req.query; // filtro: 'todos', 'placa', 'programa'
  await generatePDF(pool, filtro, valor, res);
});

app.get('/reportes/excel', async (req, res) => {
  const { filtro, valor } = req.query;
  await generateExcel(pool, filtro, valor, res);
});

// ==========================================
// ENDPOINTS INCIDENTES Y ENTREGAS (Sin Cambios)
// ==========================================

app.get('/incidentes/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidentes');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
});

app.post('/incidentes/', async (req, res) => {
  const { placa, conductor, fecha, area, novedad, estado, img } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO incidentes (placa, conductor, fecha, area, novedad, estado, img) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [placa, conductor, fecha, area, novedad, estado, img]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

app.delete('/incidentes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM incidentes WHERE id = $1', [id]);
    res.json({ message: 'Incidente eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar incidente' });
  }
});

app.get('/entregas/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entregas_ti');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

app.post('/entregas/', async (req, res) => {
  const { fecha_entrega, nombres, dni, cargo, operacion, condicion, marca, modelo, serie, precio, observaciones } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO entregas_ti (fecha_entrega, nombres, dni, cargo, operacion, condicion, marca, modelo, serie, precio, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [fecha_entrega, nombres, dni, cargo, operacion, condicion, marca, modelo, serie, precio, observaciones]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// EstadÃ­sticas RÃ¡pidas
app.get('/stats/', async (req, res) => {
  try {
    const vehiculosCount = await pool.query('SELECT COUNT(*) FROM vehiculos');
    const inspeccionesCount = await pool.query('SELECT COUNT(*) FROM inspecciones_flota');
    res.json({
      totalVehiculos: vehiculosCount.rows[0].count,
      totalInspecciones: inspeccionesCount.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// Datos Avanzados para GrÃ¡ficos (BI)
app.get('/stats/charts', async (req, res) => {
  try {
    // 1. Obtener todas las inspecciones para procesar en memoria (seguro contra formatos raros)
    const all = await pool.query('SELECT fecha FROM inspecciones_flota');
    
    // Agrupar por fecha
    const conteoFechas = {};
    all.rows.forEach(r => {
      let f = r.fecha;
      // Normalizar formato si es necesario (asumimos que la mayorÃ­a son vÃ¡lidas o consistentes)
      if (f && f !== '--/--/----') {
        conteoFechas[f] = (conteoFechas[f] || 0) + 1;
      }
    });

    // Ordenar las fechas y tomar las Ãºltimas 7
    const sortedFechas = Object.keys(conteoFechas).sort((a, b) => {
      // Intento de parseo de fechas para ordenarlas
      // Si a = DD/MM/YYYY y b = YYYY-MM-DD serÃ¡ difÃ­cil, pero simplifiquemos:
      return new Date(a) - new Date(b); 
    });

    const recentTrend = sortedFechas.slice(-14).map(date => ({
      date: date,
      inspecciones: conteoFechas[date]
    }));

    // 2. DistribuciÃ³n de fallos globales
    const errors = await pool.query(`
      SELECT 
        SUM(CASE WHEN tablet != 'OK' AND tablet != 'N/A' THEN 1 ELSE 0 END) as tablet_errors,
        SUM(CASE WHEN radio != 'OK' AND radio != 'N/A' THEN 1 ELSE 0 END) as radio_errors,
        SUM(CASE WHEN camaras != 'OK' AND camaras != 'N/A' THEN 1 ELSE 0 END) as camaras_errors
      FROM inspecciones_flota
    `);

    // 3. Distribución por Programas
    const veh = await pool.query('SELECT operacion as programa, COUNT(*) as count FROM vehiculos GROUP BY operacion');
    const programas = veh.rows.map(r => ({
      name: r.programa || 'Sin Categoría',
      value: parseInt(r.count)
    }));

    // 4. Salud General (Aprobados vs Observados)
    const salud = await pool.query(`
      SELECT 
        SUM(CASE 
          WHEN UPPER(TRIM(tablet)) = 'ERROR' OR UPPER(TRIM(radio)) = 'ERROR' OR UPPER(TRIM(camaras)) = 'ERROR' THEN 0
          WHEN UPPER(TRIM(tablet)) = 'FALTA REVISION' OR UPPER(TRIM(radio)) = 'FALTA REVISION' OR UPPER(TRIM(camaras)) = 'FALTA REVISION' THEN 0
          WHEN (UPPER(TRIM(tablet)) = 'NO APLICA' OR UPPER(TRIM(radio)) = 'NO APLICA' OR UPPER(TRIM(camaras)) = 'NO APLICA') AND (observaciones IS NULL OR TRIM(observaciones) = '') THEN 0
          ELSE 1 
        END) as aprobados,
        SUM(CASE WHEN UPPER(TRIM(tablet)) = 'ERROR' OR UPPER(TRIM(radio)) = 'ERROR' OR UPPER(TRIM(camaras)) = 'ERROR' THEN 1 ELSE 0 END) as observados
      FROM inspecciones_flota
    `);

    // 5. Soporte TI (Incidentes por Estado)
    const soporte = await pool.query(`SELECT estado, COUNT(*) as count FROM incidentes GROUP BY estado`);
    const soporteData = soporte.rows.map(r => ({
      name: r.estado || 'Sin Estado',
      value: parseInt(r.count)
    }));

    // 6. Inventario TI (Entregas por Tipo)
    // Algunas tablas viejas pueden no tener tipo_movimiento, filtramos por si acaso
    let inventarioData = [];
    try {
      const inv = await pool.query(`SELECT tipo_movimiento, COUNT(*) as count FROM entregas_ti GROUP BY tipo_movimiento`);
      inventarioData = inv.rows.map(r => ({
        name: r.tipo_movimiento || 'Entrega',
        value: parseInt(r.count)
      }));
    } catch(e) {
      // Si tipo_movimiento no existe aÃºn, solo contamos el total
      const inv = await pool.query(`SELECT COUNT(*) as count FROM entregas_ti`);
      inventarioData = [{ name: 'Entregas Registradas', value: parseInt(inv.rows[0].count) }];
    }

    res.json({
      trend: recentTrend,
      programas: programas,
      salud: {
        aprobados: parseInt(salud.rows[0].aprobados || 0),
        observados: parseInt(salud.rows[0].observados || 0)
      },
      fallos: [
        { name: 'Tablet', errores: parseInt(errors.rows[0].tablet_errors || 0) },
        { name: 'Radio', errores: parseInt(errors.rows[0].radio_errors || 0) },
        { name: 'CÃ¡maras', errores: parseInt(errors.rows[0].camaras_errors || 0) }
      ],
      soporte: soporteData,
      inventario: inventarioData
    });
  } catch (err) {
    console.error('Error stats charts:', err);
    res.status(500).json({ error: 'Error' });
  }
});

// ==========================================
// ENDPOINTS RADAR C.O.R.E.
// ==========================================
app.get('/radar/stream', (req, res) => {
  addRadarClient(req, res);
});

app.post('/radar/force', async (req, res) => {
  res.json({ message: 'Escaneo forzado iniciado' });
  syncRadarData(pool); // Se corre asincrÃ³nicamente
});

// Iniciar Motor de Radar al arrancar el servidor
startRadarService(pool);

// Iniciar Bot TÃ¡ctico de Telegram
startTelegramBot(pool);

// ==========================================
// ENDPOINTS ENTREGAS TI
// ==========================================

app.get('/api/entregas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entregas_ti ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo entregas TI' });
  }
});

app.post('/api/entregas', upload.single('acta'), async (req, res) => {
  const { fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio, tipo_movimiento, documento_url } = req.body;
  
  let final_documento_url = documento_url || null;
  if (req.file) {
    try {
      const resType = req.file.mimetype === 'application/pdf' ? 'raw' : 'auto';
      final_documento_url = await uploadToCloudinary(req.file.buffer, 'entregas_actas', resType);
    } catch (e) {
      console.error("Error subiendo acta a Cloudinary:", e);
      return res.status(500).json({ error: 'Error al subir documento a la nube' });
    }
  }

  let precioParsed = parseFloat(precio);
  if (isNaN(precioParsed)) precioParsed = null;
  const fechaParsed = fecha || null;
  const t_mov = tipo_movimiento || 'Entrega';
  try {
    const result = await pool.query(
      `INSERT INTO entregas_ti (fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio, tipo_movimiento, documento_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [fechaParsed, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precioParsed, t_mov, final_documento_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('API POST Error:', error);
    res.status(500).json({ error: 'Error registrando entrega TI: ' + error.message });
  }
});

app.put('/api/entregas/:id', upload.single('acta'), async (req, res) => {
  const { id } = req.params;
  const { fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio, tipo_movimiento, documento_url } = req.body;
  
  let final_documento_url = documento_url || null;
  
  if (req.file) {
    try {
      // Buscar documento anterior para eliminarlo
      const oldRes = await pool.query('SELECT documento_url FROM entregas_ti WHERE id = $1', [id]);
      if (oldRes.rows.length > 0 && oldRes.rows[0].documento_url) {
        await deleteFromCloudinary(oldRes.rows[0].documento_url);
      }
      const resType = req.file.mimetype === 'application/pdf' ? 'raw' : 'auto';
      final_documento_url = await uploadToCloudinary(req.file.buffer, 'entregas_actas', resType);
    } catch (e) {
      console.error("Error subiendo acta a Cloudinary:", e);
      return res.status(500).json({ error: 'Error al subir documento a la nube' });
    }
  }

  let precioParsed = parseFloat(precio);
  if (isNaN(precioParsed)) precioParsed = null;
  const fechaParsed = fecha || null;
  const t_mov = tipo_movimiento || 'Entrega';
  try {
    const result = await pool.query(
      `UPDATE entregas_ti SET 
        fecha=$1, encargado=$2, nombre=$3, dni=$4, cargo=$5, operacion=$6, condicion=$7, equipo_tipo=$8, marca=$9, modelo=$10, serie=$11, laptop=$12, mouse=$13, cargador=$14, motivo=$15, observaciones=$16, precio=$17, tipo_movimiento=$18, documento_url=COALESCE($19, documento_url)
       WHERE id = $20 RETURNING *`,
      [fechaParsed, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precioParsed, t_mov, final_documento_url, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('API PUT Error:', error);
    res.status(500).json({ error: 'Error actualizando entrega TI: ' + error.message });
  }
});

app.delete('/api/entregas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM entregas_ti WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error eliminando entrega TI' });
  }
});

app.post('/api/entregas/upload-excel', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subiÃ³ ningÃºn archivo' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
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

      const dniVal = row[4] ? String(row[4]) : '';
      const equipoVal = row[8] || '';
      const serieVal = row[11] || '';

      const checkExist = await pool.query(
        'SELECT id FROM entregas_ti WHERE dni = $1 AND equipo_tipo = $2 AND serie = $3',
        [dniVal, equipoVal, serieVal]
      );

      if (checkExist.rows.length === 0) {
        await pool.query(
          `INSERT INTO entregas_ti (fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            fechaFormat,
            row[2] || '', row[3] || '', dniVal, row[5] || '', row[6] || '', row[7] || '', equipoVal, row[9] || '', row[10] || '', serieVal, row[12] || '', row[13] || '', row[14] || '', row[15] || '', row[16] || '', row[17] ? parseFloat(row[17]) : null
          ]
        );
        inserted++;
      }
    }
    fs.unlinkSync(req.file.path);
    res.json({ message: `ImportaciÃ³n exitosa. ${inserted} registros nuevos aÃ±adidos (se ignoraron los duplicados).` });
  } catch (error) {
    console.error('Error importando Excel:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel' });
  }
});

app.get('/api/entregas/export-excel', async (req, res) => {
  try {
    const { tipo } = req.query; // 'Entrega' o 'DevoluciÃ³n'
    let query = 'SELECT * FROM entregas_ti';
    let params = [];
    
    if (tipo === 'DevoluciÃ³n') {
      query += ' WHERE tipo_movimiento = $1';
      params.push('DevoluciÃ³n');
    } else if (tipo === 'Entrega') {
      query += " WHERE tipo_movimiento = $1 OR tipo_movimiento IS NULL OR tipo_movimiento = ''";
      params.push('Entrega');
    }
    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    const entregas = result.rows;

    const formatDMY = (dateObj) => {
      if (!dateObj) return '';
      const d = dateObj.getDate().toString().padStart(2, '0');
      const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const y = dateObj.getFullYear();
      return `${d}-${m}-${y}`;
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ENTREGAS TI', {
      views: [{ showGridLines: false }]
    });

    // Agregar el logo
    const logoPath = 'C:\\Users\\LEONARDONEIRA\\.gemini\\antigravity\\brain\\e3497895-f6e2-4012-b5fb-890e3415d02a\\media__1781535209025.png';
    if (fs.existsSync(logoPath)) {
      const logoImage = workbook.addImage({
        filename: logoPath,
        extension: 'png',
      });
      worksheet.addImage(logoImage, {
        tl: { col: 0, row: 0 },
        ext: { width: 250, height: 80 }
      });
    }

    // TÃ­tulo Principal
    worksheet.mergeCells('D2:J3');
    const titleCell = worksheet.getCell('D2');
    titleCell.value = tipo === 'DevoluciÃ³n' ? 'REGISTRO DE DEVOLUCIONES TI' : 'REGISTRO DE ENTREGAS TI';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Espacio antes de los datos
    worksheet.getRow(5).height = 10;

    // Cabeceras
    const headers = [
      "NÂ°", "FECHA", "ENTREGADO POR TI", "NOMBRES Y APELLIDOS / CUSTODIO", "DNI",
      "CARGO", "OPERACION", "CONDICION DE EQUIPO A ENTREGAR", "EQUIPO", "MARCA",
      "MODELO", "S/N Y/O NÂ° DE SERIE", "LAPTOP", "MOUSE", "CARGADOR", "MOTIVO DE ENTREGA Y/O CAMBIO", "OBSERVACION", "PRECIO"
    ];

    const headerRow = worksheet.getRow(6);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Agregar Datos
    entregas.forEach((e, index) => {
      const row = worksheet.addRow([
        index + 1,
        e.fecha ? formatDMY(new Date(e.fecha)) : '',
        e.encargado || '',
        e.nombre || '',
        e.dni || '',
        e.cargo || '',
        e.operacion || '',
        e.condicion || '',
        e.equipo_tipo || '',
        e.marca || '',
        e.modelo || '',
        e.serie || '',
        e.laptop || '',
        e.mouse || '',
        e.cargador || '',
        e.motivo || '',
        e.observaciones || '',
        e.precio || ''
      ]);

      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        };
      });
      
      // Color alterno para filas
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        });
      }
    });

    // Ajustar anchos de columnas
    worksheet.columns = [
      { width: 5 }, { width: 12 }, { width: 20 }, { width: 35 }, { width: 15 },
      { width: 25 }, { width: 20 }, { width: 25 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 30 }, { width: 30 }, { width: 15 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    
    const filename = tipo === 'DevoluciÃ³n' ? 'Devoluciones_Equipos_TI_Premium.xlsx' : 'Entrega_Equipos_TI_Premium.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando Excel:', error);
    res.status(500).send('Error generando el archivo Excel premium');
  }
});

app.listen(8000, () => {
  console.log('Servidor backend corriendo en el puerto 8000');
  console.log('Motor de Radar C.O.R.E iniciado.');
});
