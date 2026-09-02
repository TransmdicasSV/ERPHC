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
import { createHash } from 'node:crypto';

import xlsx from 'xlsx';
import { generatePDF, generateExcel } from './reports.js';
import { generateMasterReport } from './reporteMaster.js';
const JWT_SECRET = process.env.JWT_SECRET;//corregido 

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error(
    'JWT_SECRET debe existir y contener al menos 64 caracteres'
  );
}
/*Resuelto problema de seguridad(Mostraba la JWT de forma directa con peligro a 
vulnerabilidades, linea 21,linea22)*/
const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 8000;

// Configuración de multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar que exista la carpeta uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuración de Cloudinary
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

// Configuración de Multer (Memoria en vez de Disco)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configuración de CORS y estÃ¡ticos
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Servir imÃ¡genes estÃ¡ticas

// Conexión a PostgreSQL (Neon.tech en la Nube)
if (!process.env.DATABASE_URL) {
  throw new Error('Falta configurar DATABASE_URL en backend/.env.');
}

let erpDatabaseUrl;

try {
  erpDatabaseUrl = new URL(process.env.DATABASE_URL);

  if (!['postgres:', 'postgresql:'].includes(erpDatabaseUrl.protocol)) {
    throw new Error();
  }
} catch {
  throw new Error('DATABASE_URL no tiene un formato PostgreSQL valido.');
}

// Exigir validación del certificado y del servidor de Neon.
erpDatabaseUrl.searchParams.set('sslmode', 'verify-full');

const pool = new Pool({
  connectionString: erpDatabaseUrl.toString(),
  connectionTimeoutMillis: 10000
});

// Inicializar Tablas
// Verificar la estructura existente. Las migraciones se ejecutan por separado.
const initDb = async () => {
  const esquemaEsperado = {
    audit_logs: ['id', 'user_id', 'accion', 'tabla_afectada', 'fecha'],
    entregas_ti: ['id', 'fecha', 'encargado', 'nombre', 'dni', 'cargo', 'operacion', 'condicion', 'equipo_tipo', 'marca', 'modelo', 'serie', 'laptop', 'mouse', 'cargador', 'motivo', 'observaciones', 'precio', 'tipo_movimiento', 'documento_url'],
    incidentes_soporte: ['id', 'placa', 'tipo_solicitud', 'descripcion', 'operador', 'estado', 'fecha', 'categoria', 'prioridad', 'evidencia'],
    inspecciones_flota: ['id', 'placa', 'fecha', 'hora', 'tablet', 'radio', 'camaras', 'img_tablet', 'img_radio', 'img_camaras', 'observaciones'],
    mantenimientos_tecnicos: ['id', 'placa', 'fecha_ejecutada', 'frecuencia_dias', 'dvr', 'copiloto', 'radio_base', 'handy', 'camara_interna', 'camara_externa', 'camara_retroceso', 'sensores_retroceso', 'sensores_delanteros', 'sistema_adas'],
    personal: ['id', 'id_interno', 'nombre_completo', 'dni', 'modalidad', 'area', 'cargo', 'telefono', 'estado', 'created_at'],
    usuarios: ['id', 'username', 'password_hash', 'rol', 'estado', 'permisos', 'operacion', 'created_at'],
    vehiculos: ['placa', 'programa', 'tipo_vehiculo', 'marca_tracto', 'modelo_tracto', 'anio_fabricacion', 'operacion', 'cliente', 'estado_operativo', 'observaciones_operativas', 'fecha_reporte_flota']
  };

  const { rows } = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [Object.keys(esquemaEsperado)]);

  const tablas = new Set(rows.map(r => r.table_name));
  const columnas = new Map(
    rows.map(r => [`${r.table_name}.${r.column_name}`, r.data_type])
  );
  const faltantes = [];

  for (const [tabla, campos] of Object.entries(esquemaEsperado)) {
    if (!tablas.has(tabla)) {
      faltantes.push(`tabla public.${tabla}`);
      continue;
    }

    for (const campo of campos) {
      if (!columnas.has(`${tabla}.${campo}`)) {
        faltantes.push(`${tabla}.${campo}`);
      }
    }
  }

  if (faltantes.length) {
    throw new Error(
      `Faltan tablas o columnas, o permisos para verlas: ${faltantes.join(', ')}. Revisa la base y las migraciones.`
    );
  }

  for (const campo of [
    'entregas_ti.fecha',
    'mantenimientos_tecnicos.fecha_ejecutada',
    'vehiculos.fecha_reporte_flota'
  ]) {
    if (columnas.get(campo) !== 'date') {
      throw new Error(`${campo} debe ser DATE. No se modifico la base.`);
    }
  }

  console.log('Tablas y columnas requeridas verificadas. Sin cambios en la base de datos.');
};


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
const ROLE_MODULES = ['resumen', 'flota', 'personal', 'dashboard', 'tickets', 'entregas', 'devoluciones', 'mantenimiento', 'reportes', 'usuarios'];

const ROLE_PERMISSIONS = {
  admin: {
    ...Object.fromEntries(ROLE_MODULES.map(modulo => [modulo, { ver: true, editar: true }])),
    tickets: { ver: true, editar: true, crear: true, gestionar: true }
  },

  supervisor: {
    resumen: { ver: true, editar: false },
    flota: { ver: true, editar: false },
    personal: { ver: false, editar: false },
    dashboard: { ver: true, editar: true },
    tickets: { ver: true, editar: false, crear: false, gestionar: false },
    entregas: { ver: true, editar: true },
    devoluciones: { ver: false, editar: false },
    mantenimiento: { ver: false, editar: false },
    reportes: { ver: false, editar: false },
    usuarios: { ver: false, editar: false }
  },

  ti: {
    resumen: { ver: true, editar: false },
    flota: { ver: true, editar: true },
    personal: { ver: true, editar: true },
    dashboard: { ver: true, editar: true },
    tickets: { ver: true, editar: true, crear: false, gestionar: true },
    entregas: { ver: true, editar: true },
    devoluciones: { ver: true, editar: true },
    mantenimiento: { ver: true, editar: true },
    reportes: { ver: false, editar: false },
    usuarios: { ver: false, editar: false }
  }
};
// Middleware para proteger rutas
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return res.status(403).json({
      error: 'Token requerido para acceder a este recurso'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: 'Token inválido o expirado'
      });
    }

    req.user = decoded;
    next();
  });
};

const PUBLIC_ROUTES = [
  { method: 'POST', pattern: /^\/api\/auth\/login\/?$/ },
  { method: 'POST', pattern: /^\/api\/public\/incidentes-soporte\/?$/ },
  { method: 'GET', pattern: /^\/api\/public\/stats\/?$/ },
  { method: 'GET', pattern: /^\/api\/public\/consulta\/[^/]+\/?$/ },
  { method: 'GET', pattern: /^\/uploads\/.+$/ },
  { method: 'HEAD', pattern: /^\/uploads\/.+$/ }
];

const isPublicRoute = (req) => {
  return PUBLIC_ROUTES.some(({ method, pattern }) => {
    return req.method === method && pattern.test(req.path);
  });
};

app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || isPublicRoute(req)) {
    return next();
  }

  return verifyToken(req, res, next);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

    const userRolOriginal = String(user.rol || '').toLowerCase();
    const userRol = userRolOriginal === 'administrador' ? 'admin' : userRolOriginal;
    const userPermisos = ROLE_PERMISSIONS[userRol];
    if (!userPermisos) return res.status(403).json({ error: 'El usuario tiene un rol antiguo o no válido. Comuníquese con el administrador' });
    const userOperacion = user.operacion || null;
    const token = jwt.sign({ id: user.id, username: user.username, rol: userRol, permisos: userPermisos, operacion: userOperacion }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, rol: userRol, permisos: userPermisos, operacion: userOperacion } });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});





const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'Administrador')) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  next();
};
const requirePermiso = (modulos, accion) => {
  return (req, res, next) => {
    const rol = String(req.user?.rol || '').toLowerCase();
    const isAdmin = rol === 'admin' || rol === 'administrador';

    if (isAdmin) {
      return next();
    }

    const listaModulos = Array.isArray(modulos)
      ? modulos
      : [modulos];

    const permitido = listaModulos.some((modulo) => {
      return req.user?.permisos?.[modulo]?.[accion] === true;
    });

    if (!permitido) {
      return res.status(403).json({
        error: 'No tienes permiso para acceder a este recurso'
      });
    }

    next();
  };
};
const hastPermiso = (req, modulo, action) => {
  const rol = String(req.user?.rol || '').toLowerCase();
  if (rol === 'admin' || rol === 'administrador') return true;
  return req.user?.permisos?.[modulo]?.[action] === true;
};

const getModuleMovimiento = (tipoMovimiento) => {
  const tipo = String(tipoMovimiento || 'Entrega').toLowerCase();
  return tipo === 'devolucion' || tipo === 'devolución' ? 'devoluciones' : 'entregas';
}

const hasPermiso = (req, modulo, accion) => {
  const rol = String(req.user?.rol || '').toLowerCase();
  if (rol === 'admin' || rol === 'administrador') return true;
  return req.user?.permisos?.[modulo]?.[accion] === true;
};

const getModuloMovimiento = (tipoMovimiento) => {
  const tipo = String(tipoMovimiento || 'Entrega').trim().toLowerCase();
  return tipo === 'devolución' || tipo === 'devolucion' ? 'devoluciones' : 'entregas';
};
const PERMISSION_ROUTES = [
  { pattern: /^\/api\/usuarios(?:\/|$)/, adminOnly: true },
  { pattern: /^\/api\/personal(?:\/|$)/, modules: ['personal'] },
  { pattern: /^\/api\/maestro(?:\/|$)/, modules: ['flota'] },
  { pattern: /^\/vehiculos(?:\/|$)/, modules: ['flota'] },
  { pattern: /^\/inspecciones(?:\/|$)/, modules: ['dashboard'] },
  { pattern: /^\/api\/incidentes(?:\/|$)/, modules: ['tickets'] },
  { pattern: /^\/api\/incidentes_soporte(?:\/|$)/, modules: ['tickets'] },
  { pattern: /^\/mantenimientos(?:\/|$)/, modules: ['mantenimiento'] },
  { pattern: /^\/api\/entregas(?:\/|$)/, modules: ['entregas', 'devoluciones'] },
  { pattern: /^\/entregas(?:\/|$)/, modules: ['entregas', 'devoluciones'] },
  { pattern: /^\/api\/reportes(?:\/|$)/, modules: ['reportes'] },
  { pattern: /^\/reportes(?:\/|$)/, modules: ['reportes'] },
  { pattern: /^\/stats(?:\/|$)/, modules: ['resumen'] }
];

app.use((req, res, next) => {
  if (isPublicRoute(req)) {
    return next();
  }

  const rule = PERMISSION_ROUTES.find(({ pattern }) => {
    return pattern.test(req.path);
  });

  if (!rule) {
    return next();
  }

  if (rule.adminOnly) {
    return requireAdmin(req, res, next);
  }

  const accion =
    req.method === 'GET' || req.method === 'HEAD'
      ? 'ver'
      : 'editar';

  return requirePermiso(rule.modules, accion)(req, res, next);
});

// ==========================================
// ENDPOINTS GESTIÓN DE USUARIOS
// ==========================================
app.get('/api/usuarios/operaciones', async (req, res) => {
  try {
    const result = await pool.query("SELECT MIN(TRIM(operacion)) AS operacion FROM vehiculos WHERE operacion IS NOT NULL AND LOWER(TRIM(operacion)) NOT IN ('', 'test', 'text', 'null', 'undefined', 'sin operacion', 'sin operación', 'falta identificar') GROUP BY LOWER(TRIM(operacion)) ORDER BY operacion ASC");
    res.json(result.rows.map(row => row.operacion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener operaciones' });
  }
});
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, rol, estado, permisos, operacion, created_at FROM usuarios ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});



app.post('/api/usuarios', requireAdmin, async (req, res) => {
  const { username, password, rol, estado, operacion } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const rolFinal = rol || 'supervisor';
  const rolesValidos = ['admin', 'supervisor', 'ti'];
  if (!rolesValidos.includes(rolFinal)) return res.status(400).json({ error: 'Rol no válido' });
  if (rolFinal === 'supervisor' && !String(operacion || '').trim()) return res.status(400).json({ error: 'Debe asignar una operación al supervisor' });
  const operacionFinal = rolFinal === 'supervisor' ? String(operacion).trim() : null;
  const permisosFinales = ROLE_PERMISSIONS[rolFinal];
  try {
    const existing = await pool.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'El usuario ya existe' });

    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (username, password_hash, rol, permisos, estado, operacion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [username, hash, rolFinal, permisosFinales, estado || 'activo', operacionFinal]
    );
    await logAction(req.user.id, `Usuario creado: ${username}`, 'usuarios');
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.delete('/api/usuarios/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  try {
    await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);
    await logAction(req.user.id, `Usuario eliminado ID: ${id}`, 'usuarios');
    res.json({ success: true });
  }  catch (err) {
    console.error(err);

    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar este usuario porque tiene registros relacionados. Debe conservarse su historial.'
      });
    }

    return res.status(500).json({
      error: 'Error al eliminar usuario'
    });
  }
  }
);

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
        const isOkOrNa = (val) => {
          if (!val) return false;
          const upper = val.trim().toUpperCase();
          return upper === 'OK' || upper === 'N/A' || upper === 'NO APLICA';
        };
        const isOk = isOkOrNa(r.tablet) && isOkOrNa(r.radio) && isOkOrNa(r.camaras);
        ticker.push({ placa: r.placa, hora: r.hora, estado: isOk ? 'APROBADO' : 'OBSERVADO' });
      }
    });

    // Traer últimos trabajos de TI resueltos
    const resolvedTIResult = await pool.query("SELECT id, tipo_solicitud, placa FROM incidentes_soporte WHERE estado IN ('Resuelto', 'Concluido') ORDER BY id DESC LIMIT 3");
    const trabajosTI = resolvedTIResult.rows.map(r => ({
      id: r.id,
      tipo: r.tipo_solicitud,
      placa: r.placa
    }));

    res.json({
      totalFlota: parseInt(veh.rows[0].count),
      inspeccionesHoy,
      ticker,
      trabajosTI
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

    const isOkOrNaStr = (val) => {
      if (!val) return false;
      const upper = val.trim().toUpperCase();
      return upper === 'OK' || upper === 'N/A' || upper === 'NO APLICA';
    };
    const estado_general = (isOkOrNaStr(insp.tablet) && isOkOrNaStr(insp.radio) && isOkOrNaStr(insp.camaras)) ? 'APROBADO' : 'OBSERVADO';

    // Timeline: Últimas 3 inspecciones
    const timelineResult = await pool.query('SELECT fecha, hora, tablet, radio, camaras FROM inspecciones_flota WHERE placa = $1 ORDER BY id DESC LIMIT 3', [placa]);
    const timeline = timelineResult.rows.map(t => ({
      fecha: t.fecha,
      hora: t.hora,
      estado: (isOkOrNaStr(t.tablet) && isOkOrNaStr(t.radio) && isOkOrNaStr(t.camaras)) ? 'APROBADO' : 'OBSERVADO'
    }));

    // Buscar el último incidente de soporte registrado para esta placa
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
      incidente_pendiente: incidente_pendiente,
      timeline: timeline,
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

// Crear ticket desde el portal público o desde la administración
const createSupportTicket = async (req, res) => {
  const {
    placa, tipo_solicitud, descripcion,
    operador, categoria, prioridad
  } = req.body || {};

  const placaFinal =
    typeof placa === 'string' ? placa.trim().toUpperCase() : '';

  if (!placaFinal) {
    return res.status(400).json({
      error: 'Debe indicar una placa del maestro de vehiculos'
    });
  }

  if (!tipo_solicitud || !descripcion || !operador) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios'
    });
  }

  try {
    await pool.query(
      `INSERT INTO incidentes_soporte
       (placa, tipo_solicitud, descripcion, operador, categoria, prioridad)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        placaFinal, tipo_solicitud, descripcion, operador,
        categoria || 'General', prioridad || 'Media'
      ]
    );

    await logAction(
      req.user?.id || null,
      `Solicitud de soporte para ${placaFinal}`,
      'incidentes_soporte'
    );

    return res.status(201).json({ success: true });
  } catch (err) {
    if (
      err.code === '23503' &&
      err.constraint === 'incidentes_soporte_placa_fkey'
    ) {
      return res.status(400).json({
        error: 'La placa no existe en el maestro de vehiculos. Seleccione una placa registrada.'
      });
    }

    console.error(err);
    return res.status(500).json({
      error: 'Error al registrar la solicitud'
    });
  }
};

app.post('/api/public/incidentes-soporte', createSupportTicket);
app.post('/api/incidentes_soporte', requireAdmin, createSupportTicket);

// APLICAR PROTECCIÓN GLOBAL AL RESTO DE RUTAS
// Endpoint para recibir la telemetría del Core Desktop local (Sin JWT, usa secret interno)



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
        v.placa, v.programa, v.tipo_vehiculo, v.marca_tracto, v.modelo_tracto, v.anio_fabricacion, v.operacion, v.cliente,
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
      let estado = 'Falta de revisión';
      if (v.tablet) {
        const t = v.tablet.trim().toUpperCase();
        const r = v.radio.trim().toUpperCase();
        const c = v.camaras.trim().toUpperCase();

        const isOkOrNa = (val) => val === 'OK' || val === 'N/A' || val === 'NO APLICA';
        const isNa = (val) => val === 'N/A' || val === 'NO APLICA';
        const hasError = t === 'ERROR' || r === 'ERROR' || c === 'ERROR';
        const hasFalta = t.includes('FALTA') || r.includes('FALTA') || c.includes('FALTA');

        if (hasError) estado = 'Observada';
        else if (hasFalta) estado = 'Falta de revisión';
        else if (isNa(t) && isNa(r) && isNa(c)) estado = 'N/A';
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
    const query = 'INSERT INTO vehiculos (placa, operacion, tipo_vehiculo, cliente, marca_tracto, modelo_tracto, anio_fabricacion) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const values = [placa, opFinal, tipo_vehiculo, cliente, marca_tracto, modelo_tracto, anio_fabricacion];
    const result = await pool.query(query, values);

    await logAction(req.user ? req.user.id : null, `Creó el vehÃ­culo ${placa}`, 'vehiculos');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') res.status(400).json({ error: 'La placa ya existe' });
    else res.status(500).json({ error: 'Error al crear vehiculo' });
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
  const {
    placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto,
    radio_base, handy, camara_interna, camara_externa,
    camara_retroceso, sensores_retroceso, sensores_delanteros,
    sistema_adas
  } = req.body;

  if (typeof placa !== 'string' || !placa.trim()) {
    return res.status(400).json({
      error: 'Debe seleccionar un vehículo para registrar el mantenimiento'
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO mantenimientos_tecnicos (
        placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto,
        radio_base, handy, camara_interna, camara_externa,
        camara_retroceso, sensores_retroceso, sensores_delanteros,
        sistema_adas
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
      RETURNING *
    `, [
      placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto,
      radio_base, handy, camara_interna, camara_externa,
      camara_retroceso, sensores_retroceso, sensores_delanteros,
      sistema_adas
    ]);

    await logAction(
      req.user ? req.user.id : null,
      `Registró mantenimiento para ${placa}`,
      'mantenimientos_tecnicos'
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    if (err.code === '23503') {
      return res.status(400).json({
        error: 'La placa seleccionada no existe en el maestro de vehículos'
      });
    }

    return res.status(500).json({
      error: 'Error al registrar mantenimiento'
    });
  }
});

// Generar Reporte Master (Auditoría)
app.get('/api/reportes/operaciones', async (req, res) => {
  try {
    const result = await pool.query("SELECT MIN(op) AS operacion FROM (SELECT CASE WHEN LOWER(BTRIM(COALESCE(operacion, ''))) IN ('', 'null', 'sin operacion', 'sin operación', 'falta identificar') THEN 'Sin Operación' ELSE BTRIM(operacion) END AS op FROM vehiculos WHERE LOWER(BTRIM(COALESCE(operacion, ''))) NOT IN ('test', 'text')) operaciones_limpias GROUP BY LOWER(op) ORDER BY operacion");
    res.json(result.rows.map(row => row.operacion));
  } catch (err) {
    console.error('Error obteniendo operaciones de reportes:', err);
    res.status(500).json({ error: 'No se pudieron cargar las operaciones' });
  }
});

app.get('/api/reportes/master', async (req, res) => {
  const { startDate, endDate, operacion } = req.query;
  const fechaValida = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!fechaValida(startDate) || !fechaValida(endDate) || startDate > endDate) return res.status(400).json({ error: 'El rango de fechas no es válido' });
  if (typeof operacion !== 'string' || !operacion.trim() || operacion.length > 100) return res.status(400).json({ error: 'Seleccione una operación válida' });
  try {
    const workbook = await generateMasterReport(pool, startDate, endDate, operacion.trim());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Master.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generando Reporte Master:', err);
    if (res.headersSent) return res.destroy();
    res.status(err.status === 404 ? 404 : 500).json({ error: err.status === 404 ? err.message : 'Error interno generando reporte' });
  }
});

// Generar Reporte Excel
app.get('/api/reportes/mantenimiento-excel', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Mantenimiento', { views: [{ showGridLines: false }] });

    // ESTILOS COMUNES
    const borderAll = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
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

    const metadata = ['Versión:', 'Fecha:', 'Revisa:', 'Aprueba:'];
    for (let i = 0; i < 4; i++) {
      const c = sheet.getCell('V' + (i + 2));
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
      'NÂ°', 'TIPO DE VEHÃCULO', 'PLACA', 'MARCA TRACTO', 'MODELO TRACTO', 'AÑO FABRICACIÃ“N TRACTO', 'OPERACIÃ“N', 'CLIENTE',
      'FECHA ULT MANTENIMIENTO', 'FRECUENCIA', 'FECHA PROX MANTENIMIENTO',
      'DVR', 'COPILOTO', 'RADIO BASE', 'HANDY', 'CAMARA INTERNA', 'CAMARA EXTERNA', 'CAMARA DE RETROCESO', 'SENSORES DE RETROCESO', 'SENSORES DELANTEROS', 'SISTEMA ADAS', 'FECHA EJECUTADA'
    ];

    // Anchos
    const widths = [4, 15, 12, 12, 12, 15, 12, 12, 15, 10, 15, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15];

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
    const rol = String(req.user?.rol || '').toLowerCase();

    if (rol === 'supervisor') {
      const operacion = String(req.user?.operacion || '').trim();
      if (!operacion) return res.status(403).json({ error: 'El supervisor no tiene una operación asignada' });

      const result = await pool.query("SELECT i.* FROM incidentes_soporte i INNER JOIN vehiculos v ON UPPER(TRIM(v.placa)) = UPPER(TRIM(i.placa)) WHERE LOWER(TRIM(v.operacion)) = LOWER(TRIM($1)) ORDER BY i.id DESC", [operacion]);
      return res.json(result.rows);
    }

    const result = await pool.query('SELECT * FROM incidentes_soporte ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
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
    await logAction(req.user ? req.user.id : null, `Eliminó incidente de soporte #${id}`, 'incidentes_soporte');
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

// Registrar Inspección CON ImÃ¡genes
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
  } catch (e) {
    console.error("Error subiendo a Cloudinary:", e);
    return res.status(500).json({ error: 'Error al subir imÃ¡genes a la nube' });
  }

  let client;
  let descartar = false;
  let result;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO vehiculos (placa, operacion) VALUES ($1, $2) ON CONFLICT (placa) DO UPDATE SET operacion = $2',
      [placa, programa]
    );

    result = await client.query(
      `INSERT INTO inspecciones_flota (placa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [placa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras, observaciones || '']
    );

    await client.query('COMMIT');
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { descartar = true; }
    }

    console.error('Error al registrar inspeccion:', err);
    return res.status(500).json({ error: 'Error al registrar inspeccion' });
  } finally {
    if (client) client.release(descartar);
  }

  await logAction(
    req.user ? req.user.id : null,
    `Registró inspección en ${placa}`,
    'inspecciones_flota'
  );

  res.json(result.rows[0]);
});

// Actualizar Vehículo Completo (Tracto)
app.put('/vehiculos/:placa', async (req, res) => {
  const { placa } = req.params;
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'Datos del vehículo no válidos' });
  const permitidos = ['programa', 'tipo_vehiculo', 'marca_tracto', 'modelo_tracto', 'anio_fabricacion', 'operacion', 'cliente', 'estado_operativo', 'observaciones_operativas'];
  const campos = permitidos.filter(campo => Object.prototype.hasOwnProperty.call(data, campo));
  if (!campos.length) return res.status(400).json({ error: 'No se enviaron campos editables' });
  if (campos.some(campo => data[campo] !== null && typeof data[campo] !== 'string')) return res.status(400).json({ error: 'Los campos deben contener texto o null' });
  try {
    const cambios = campos.map((campo, indice) => `${campo} = $${indice + 1}`).join(', ');
    const values = campos.map(campo => data[campo] === null ? null : (data[campo].trim() || null));
    values.push(placa);
    const query = `UPDATE public.vehiculos SET ${cambios} WHERE placa = $${values.length} RETURNING *`;
    const result = await pool.query(query, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Vehículo no encontrado' });
    await logAction(req.user ? req.user.id : null, `Actualizó el tracto ${placa}`, 'vehiculos');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error PUT /vehiculos:', err);
    if (err.code === '22001') return res.status(400).json({ error: 'Uno de los campos supera la longitud permitida' });
    res.status(500).json({ error: 'Error al actualizar el vehículo' });
  }
});

// Eliminar Vehículo (Protegido por Foreign Key constraint por defecto)
app.delete('/vehiculos/:placa', async (req, res) => {
  const { placa } = req.params;
  try {
    await pool.query('DELETE FROM vehiculos WHERE placa = $1', [placa]);
    await logAction(req.user ? req.user.id : null, `Eliminó el vehículo ${placa}`, 'vehiculos');
    res.json({ message: 'Vehículo eliminado' });
  } catch (err) {
    // Código de error de PostgreSQL para Foreign Key Violation es 23503
    if (err.code === '23503') {
      res.status(400).json({ error: 'No se puede eliminar el vehículo porque tiene registros relacionados. Debe conservarse su historial.' });
    } else {
      res.status(500).json({ error: 'Error interno al eliminar' });
    }
  }
});





// Eliminar Inspección individual
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
    res.json({ message: 'Inspección eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar inspección' });
  }
});

// Editar Estado y Fotos de Inspección individual
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
    res.status(500).json({ error: 'Error al actualizar inspección completa' });
  }
});

// ==========================================
// ENDPOINTS REPORTES (PDF/EXCEL)
// ==========================================
app.get('/reportes/pdf', async (req, res) => {
  await generatePDF(pool, req.query, res);
});

app.get('/reportes/excel', async (req, res) => {
  await generateExcel(pool, req.query, res);
});

// ==========================================
// ENDPOINTS INCIDENTES Y ENTREGAS (Sin Cambios)
// ==========================================







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
      const parseDate = (d) => {
        if (!d) return 0;
        if (d.includes('-')) {
          return new Date(d).getTime();
        } else if (d.includes('/')) {
          const parts = d.split('/');
          if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        }
        return 0;
      };
      return parseDate(a) - parseDate(b);
    });

    const recentTrend = sortedFechas.slice(-14).map(date => ({
      date: date,
      inspecciones: conteoFechas[date]
    }));

    // 2. Distribución de fallos globales
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
          WHEN (UPPER(TRIM(COALESCE(tablet, ''))) IN ('OK', 'N/A', 'NO APLICA')) 
           AND (UPPER(TRIM(COALESCE(radio, ''))) IN ('OK', 'N/A', 'NO APLICA')) 
           AND (UPPER(TRIM(COALESCE(camaras, ''))) IN ('OK', 'N/A', 'NO APLICA')) 
          THEN 1 ELSE 0 
        END) as aprobados,
        SUM(CASE 
          WHEN (UPPER(TRIM(COALESCE(tablet, ''))) NOT IN ('OK', 'N/A', 'NO APLICA'))
            OR (UPPER(TRIM(COALESCE(radio, ''))) NOT IN ('OK', 'N/A', 'NO APLICA'))
            OR (UPPER(TRIM(COALESCE(camaras, ''))) NOT IN ('OK', 'N/A', 'NO APLICA'))
          THEN 1 ELSE 0 
        END) as observados
      FROM inspecciones_flota
    `);

    // 5. Soporte TI (Incidentes por Estado)
    const soporte = await pool.query(`SELECT estado, COUNT(*) as count FROM incidentes_soporte GROUP BY estado`);
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
    } catch (e) {
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
// ENDPOINTS ENTREGAS TI
// ==========================================

app.get('/api/entregas', async (req, res) => {
  try {
    const puedeVerEntregas = hasPermiso(req, 'entregas', 'ver');
    const puedeVerDevoluciones = hasPermiso(req, 'devoluciones', 'ver');
    if (!puedeVerEntregas && !puedeVerDevoluciones) {
      return res.status(403).json({ error: 'No tienes permiso para consultar inventario TI' });
    }
    let query = 'SELECT * FROM entregas_ti';
    const params = [];
    if (puedeVerEntregas && !puedeVerDevoluciones) {
      query += " WHERE tipo_movimiento IS NULL OR TRIM(tipo_movimiento) = '' OR LOWER(TRIM(tipo_movimiento)) = 'entrega'";
    } else if (!puedeVerEntregas && puedeVerDevoluciones) {
      query += " WHERE LOWER(TRIM(tipo_movimiento)) IN ('devolución','devolucion')";
    }
    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo inventario TI' })
  }
});

app.post('/api/entregas', upload.single('acta'), async (req, res) => {
  const { fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio, tipo_movimiento, documento_url } = req.body;
  const tipoNormalizado = String(tipo_movimiento || 'Entrega').trim().toLocaleLowerCase();
  if (!['entrega', 'devolución', 'devolucion'].includes(tipoNormalizado))
    return res.status(400).json({ error: 'Tipo de Movimiento no valido' });
  const t_mov = tipoNormalizado === 'entrega' ? 'Entrega' : 'Devolución';
  const moduloMovimiento = getModuloMovimiento(t_mov);
  if (!hasPermiso(req, moduloMovimiento, 'editar')) return res.status(403).json({ error: `No tienes permiso para crear registros de ${t_mov}` });
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
  const tipoNormalizado = String(tipo_movimiento || 'Entrega').trim().toLowerCase();
  if (!['entrega', 'devolución', 'devolucion'].includes(tipoNormalizado)) return res.status(400).json({ error: 'Tipo de movimiento no válido' });
  const t_mov = tipoNormalizado === 'entrega' ? 'Entrega' : 'Devolución';

  try {
    const registroActual = await pool.query('SELECT tipo_movimiento FROM entregas_ti WHERE id = $1', [id]);
    if (registroActual.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const moduloActual = getModuloMovimiento(registroActual.rows[0].tipo_movimiento);
    const moduloNuevo = getModuloMovimiento(t_mov);

    if (!hasPermiso(req, moduloActual, 'editar') || !hasPermiso(req, moduloNuevo, 'editar')) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este tipo de movimiento' });
    }
  } catch (error) {
    console.error('Error verificando permisos de inventario:', error);
    return res.status(500).json({ error: 'Error verificando el registro' });
  }
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

app.delete('/api/entregas/:id', requireAdmin, async (req, res) => {
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

app.post('/api/entregas/upload-excel', (req, res, next) => {
  if (!hasPermiso(req, 'entregas', 'editar') || !hasPermiso(req, 'devoluciones', 'editar')) return res.status(403).json({ error: 'No tienes permiso para realizar cargas masivas de inventario' });
  next();
}, upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) return res.status(400).json({ error: 'Selecciona un archivo Excel' });
  const tipo = req.body.tipo;
  if (!['Entrega', 'Devolución'].includes(tipo)) return res.status(400).json({ error: 'Selecciona Entregas o Devoluciones antes de importar' });
  let client;

  try {
    const texto = valor => String(valor ?? '').trim();
    const normalizar = valor => texto(valor).replace(/\s+/g, ' ').toUpperCase();
    const serieClave = valor => /^(?:-*|S\/N|N\/A|NULL|SIN SERIE|NO APLICA)$/.test(normalizar(valor)) ? '' : normalizar(valor);
    const fallo = mensaje => { throw Object.assign(new Error(mensaje), { status: 400 }); };

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) fallo('El archivo no contiene una hoja');

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true, range: 0 });
    const titulo = normalizar(sheet.D2?.v);
    const tipoArchivo = titulo.includes('DEVOLUCIONES') ? 'Devolución' : titulo.includes('ENTREGAS') ? 'Entrega' : null;
    if (tipoArchivo !== tipo) fallo('El título del Excel no corresponde a la sección seleccionada');

    const cabecera = data.findIndex(r => normalizar(r[1]) === 'FECHA' && normalizar(r[4]) === 'DNI' && normalizar(r[8]) === 'EQUIPO' && normalizar(r[11]).startsWith('S/N'));
    if (cabecera < 0) fallo('No se reconocen las columnas del formato de inventario TI');

    const convertirFecha = (valor, fila) => {
      if (!texto(valor)) return null;
      let fechaISO;

      if (typeof valor === 'number') {
        const usa1904 = [true, 1, '1', 'true'].includes(workbook.Workbook?.WBProps?.date1904);
        const dias = Math.floor(valor);
        if (!Number.isFinite(valor) || dias < (usa1904 ? 0 : 1) || (!usa1904 && dias === 60)) fallo(`Fecha numérica no válida en la fila ${fila}`);
        const base = usa1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, dias < 60 ? 31 : 30);
        const fecha = new Date(base + dias * 86400000);
        if (Number.isNaN(fecha.getTime())) fallo(`Fecha no válida en la fila ${fila}`);
        fechaISO = fecha.toISOString().slice(0, 10);
      } else {
        const partes = texto(valor).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        fechaISO = partes ? `${partes[3]}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}` : texto(valor);
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO) || fechaISO.startsWith('0000-')) fallo(`Formato de fecha no válido en la fila ${fila}`);
      const fecha = new Date(`${fechaISO}T00:00:00.000Z`);
      if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== fechaISO) fallo(`Fecha inexistente en la fila ${fila}`);
      return fechaISO;
    };

    const campos = ['fecha', 'encargado', 'nombre', 'dni', 'cargo', 'operacion', 'condicion', 'equipo_tipo', 'marca', 'modelo', 'serie', 'laptop', 'mouse', 'cargador', 'motivo', 'observaciones', 'precio', 'tipo_movimiento'];
    const registros = [];

    for (let i = cabecera + 1; i < data.length; i++) {
      const row = data[i];
      if (!row?.some(v => texto(v))) continue;
      if (!texto(row[3])) fallo(`Falta el nombre en la fila ${i + 1}`);

      const registro = Object.fromEntries(campos.slice(0, 17).map((campo, j) => [campo, texto(row[j + 1]) || null]));
      registro.fecha = convertirFecha(row[1], i + 1);
      registro.precio = !texto(row[17]) || /^-+$/.test(texto(row[17])) ? null : Number(row[17]);
      if (registro.precio !== null && !Number.isFinite(registro.precio)) fallo(`Precio no válido en la fila ${i + 1}`);
      registro.tipo_movimiento = tipo;
      registro.fila = i + 1;
      registros.push(registro);
    }

    if (!registros.length || registros.length > 10000) fallo('El Excel debe contener entre 1 y 10000 registros');

    const clave = r => JSON.stringify([normalizar(r.tipo_movimiento || 'Entrega').replace('DEVOLUCION', 'DEVOLUCIÓN'), r.fecha || '', normalizar(r.dni), normalizar(r.nombre), normalizar(r.equipo_tipo), serieClave(r.serie)]);

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query('LOCK TABLE public.entregas_ti IN SHARE ROW EXCLUSIVE MODE');

    const actual = await client.query("SELECT *, to_char(fecha, 'YYYY-MM-DD') AS fecha FROM public.entregas_ti");
    const conocidas = new Set(actual.rows.map(clave));
    const nuevos = [];
    let omitidos = 0;

    for (const registro of registros) {
      const llave = clave(registro);
      if (conocidas.has(llave)) { omitidos++; continue; }
      if (!registro.fecha || !registro.dni || !registro.equipo_tipo || normalizar(registro.equipo_tipo) === 'NUEVO') fallo(`La fila ${registro.fila} no coincide con un registro existente y necesita revisar fecha, DNI o equipo antes de importarse`);
      conocidas.add(llave);
      nuevos.push(registro);
    }

    const firma = createHash('sha256').update(JSON.stringify(nuevos.map(r => campos.map(c => r[c])))).digest('hex');
    const resumen = { total: registros.length, nuevos: nuevos.length, omitidos, firma };

    if (req.body.confirmar !== 'si') {
      await client.query('ROLLBACK');
      return res.json({ ...resumen, revision: true, message: `Revisión: ${nuevos.length} por agregar; ${omitidos} ya reconocidos. No se guardó nada.` });
    }

    if (req.body.firma !== firma) fallo('Los datos cambiaron desde la revisión. Vuelve a seleccionar el archivo para revisarlo otra vez');

    const sql = `INSERT INTO public.entregas_ti (${campos.join(', ')}) VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')})`;
    for (const registro of nuevos) await client.query(sql, campos.map(campo => registro[campo]));

    await client.query('COMMIT');
    res.json({ ...resumen, insertados: nuevos.length, message: `Importación completada: ${nuevos.length} agregados y ${omitidos} ya reconocidos.` });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rollbackError) { client.release(rollbackError); client = null; }
    }
    console.error('Error importando Excel:', error);
    res.status(error.status || 500).json({ error: error.status === 400 ? error.message : 'No se pudo completar la importación. Revisa el registro del backend antes de reintentar.' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/entregas/export-excel', async (req, res) => {
  try {
    const { tipo, categoria } = req.query;
    const tipoNormalizado = String(tipo || '').trim().toLowerCase();

    if (tipoNormalizado && !['entrega', 'devolución', 'devolucion'].includes(tipoNormalizado)) {
      return res.status(400).json({ error: 'Tipo de movimiento no válido' });
    }

    const puedeVerEntregas = hasPermiso(req, 'entregas', 'ver');
    const puedeVerDevoluciones = hasPermiso(req, 'devoluciones', 'ver');
    let tipoAutorizado = tipoNormalizado === 'entrega' ? 'Entrega' : tipoNormalizado === 'devolución' || tipoNormalizado === 'devolucion' ? 'Devolución' : null;

    if (tipoAutorizado === 'Entrega' && !puedeVerEntregas) return res.status(403).json({ error: 'No tienes permiso para exportar entregas' });
    if (tipoAutorizado === 'Devolución' && !puedeVerDevoluciones) return res.status(403).json({ error: 'No tienes permiso para exportar devoluciones' });

    if (!tipoAutorizado) {
      if (puedeVerEntregas && !puedeVerDevoluciones) tipoAutorizado = 'Entrega';
      else if (!puedeVerEntregas && puedeVerDevoluciones) tipoAutorizado = 'Devolución';
      else if (!puedeVerEntregas && !puedeVerDevoluciones) return res.status(403).json({ error: 'No tienes permiso para exportar inventario' });
    }

    let query = 'SELECT * FROM entregas_ti WHERE 1=1';
    let params = [];

    if (tipoAutorizado === 'Devolución') {
      params.push('Devolución');
      query += ` AND tipo_movimiento = $${params.length}`;
    } else if (tipo === 'Entrega') {
      params.push('Entrega');
      query += ` AND (tipo_movimiento = $${params.length} OR tipo_movimiento IS NULL OR tipo_movimiento = '')`;
    }

    if (categoria) {
      params.push(`%${categoria}%`);
      query += ` AND equipo_tipo ILIKE $${params.length}`;
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
    titleCell.value = tipo === 'Devolución' ? 'REGISTRO DE DEVOLUCIONES TI' : 'REGISTRO DE ENTREGAS TI';
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

    const filename = tipo === 'Devolución' ? 'Devoluciones_Equipos_TI_Premium.xlsx' : 'Entrega_Equipos_TI_Premium.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando Excel:', error);
    res.status(500).send('Error generando el archivo Excel premium');
  }
});
const detenerArranque = async (error) => {
  console.error('Arranque detenido:', error.message);
  process.exitCode = 1;

  try {
    await pool.end();
  } catch (cierreError) {
    console.error(
      'Error cerrando la conexion:',
      cierreError.code || 'SIN_CODIGO'
    );
  }
};

const iniciarServidor = async () => {
  await initDb();

  const servidor = app.listen(port, () => {
    console.log(`Servidor backend corriendo en el puerto ${port}`);
  });

  servidor.once('error', detenerArranque);
};

iniciarServidor().catch(detenerArranque);