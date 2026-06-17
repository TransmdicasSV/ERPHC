import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CONFIGURACIÓN DEL RADAR
// ==========================================
const BASE_LAT = -16.354118;
const BASE_LON = -71.604236;
const RADIO_TOLERANCIA_KM = 0.15;

const TELEGRAM_TOKEN = "8495402772:AAGmOoKmxOTzaXWxYwF7md5evPvwnaXqOaw";
const TELEGRAM_CHAT_ID = "1097712847";

const TRACKLOG_AUTH_URL = "https://api.tracklogweb.com/v2.0/auth/token";
const TRACKLOG_API_URL = "https://api.tracklogweb.com/v2.0/livedata?pagination=false";

let sseClients = [];
let tracklogToken = null;
const ARCHIVO_ALERTAS = path.join(__dirname, 'alertas_enviadas_hoy.json');

// Caché global para envíos inmediatos
let lastDbState = { registradas: [], inspeccionadasHoy: [], pendientes: [] };
let lastUbicaciones = {};
let lastLogs = [];

import axios from 'axios';
import { sendTelegramAlert } from './telegramBot.js';

// Ya no importamos Puppeteer ni StealthPlugin, este servidor ahora es solo un Relay.


// Funciones de utilidad para SSE (Server-Sent Events)
export const addRadarClient = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Crítico para Render/Nginx proxy
  res.flushHeaders(); // Evita buffer local

  sseClients.push(res);
  
  // Enviar estado en caché inmediatamente al conectar
  res.write(`event: db_state\ndata: ${JSON.stringify(lastDbState)}\n\n`);
  res.write(`event: map_update\ndata: ${JSON.stringify(lastUbicaciones)}\n\n`);
  lastLogs.forEach(log => {
    res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
  });

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
};

const emitToClients = (type, data) => {
  if (type === 'log') {
    lastLogs.push(data);
    if (lastLogs.length > 5000) lastLogs.shift();
  }
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => client.write(payload));
};

const sendTelegram = async (mensaje) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: mensaje, parse_mode: 'Markdown' });
    emitToClients('log', { text: `[+] DATALINK SECURE: Telegram despachado con éxito.`, type: 'success' });
  } catch (error) {
    emitToClients('log', { text: `[!] SYSTEM FAULT (Telegram): ${error.message}`, type: 'error' });
  }
};

const getDistanceKM = (lat1, lon1, lat2, lon2) => {
  const R = 6371.0; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const obtenerPlacasAlertadasHoy = () => {
  try {
    if (fs.existsSync(ARCHIVO_ALERTAS)) {
      const data = JSON.parse(fs.readFileSync(ARCHIVO_ALERTAS, 'utf-8'));
      const hoy = new Date().toISOString().split('T')[0];
      if (data.fecha !== hoy) return []; // Reseteo diario automático
      return data.placas;
    }
  } catch(e) {}
  return [];
};

const guardarPlacaAlertada = (placa) => {
  try {
    const placas = obtenerPlacasAlertadasHoy();
    placas.push(placa);
    const hoy = new Date().toISOString().split('T')[0];
    fs.writeFileSync(ARCHIVO_ALERTAS, JSON.stringify({ fecha: hoy, placas }));
  } catch(e) {}
};

// (Lógica de Puppeteer y Mock removida)

let gpsHistory = {}; // Almacenará el rastro

const procesarDatosGps = (data) => {
  const vehiculos = Array.isArray(data) ? data : (data['hydra:member'] || []);
  emitToClients('log', { text: `[API] 📡 Se descargó información bruta de ${vehiculos.length} unidades.`, type: 'system' });

  const flotaGps = {};
  vehiculos.forEach(v => {
    let placa = v.registration || v.matricula || v.alias || v.plate || v.name;
    if (!placa && v.vehicle) {
      placa = v.vehicle.matricula || v.vehicle.alias || v.vehicle.name;
    }
    const lat = parseFloat(v.latitude);
    const lon = parseFloat(v.longitude);
    const speed = parseFloat(v.speed || v.velocity || v.vel) || 0; // HUD Telemetría

    if (placa && !isNaN(lat) && !isNaN(lon)) {
      const placaStr = placa.toUpperCase();
      
      if (!gpsHistory[placaStr]) gpsHistory[placaStr] = [];
      const history = gpsHistory[placaStr];
      
      // Solo guardar en historial si se movió o es la primera vez
      if (history.length === 0 || history[history.length - 1].lat !== lat || history[history.length - 1].lon !== lon) {
        history.push({ lat, lon });
        if (history.length > 20) history.shift(); // Estela de máximo 20 puntos
      }

      flotaGps[placaStr] = { lat, lon, speed, history: [...history] };
    }
  });
  return flotaGps;
};

// ==========================================
// RECEPCIÓN DE DATOS DESDE EL CORE DESKTOP
// ==========================================
export const syncRadarData = async (req, res, pool) => {
  const { secret, tracklogData } = req.body;
  
  if (secret !== 'CORE_RADAR_SECURE_KEY_2026') {
    return res.status(403).json({ error: 'Acceso Denegado' });
  }
  
  if (!tracklogData || !Array.isArray(tracklogData['hydra:member'] || tracklogData)) {
    return res.status(400).json({ error: 'Payload GPS inválido' });
  }

  res.json({ message: 'Payload recibido y procesado por el Relay' });

  emitToClients('log', { text: '==================================================', type: 'system' });
  emitToClients('log', { text: '[SYS] RECEPCIÓN DE DATOS DESDE CORE DESKTOP', type: 'system' });

  try {
    // 1. Procesar RAW GPS a formato simplificado
    const ubicaciones = procesarDatosGps(tracklogData);

    // 2. Obtener la base de datos de vehiculos
    const vRes = await pool.query('SELECT placa, operacion as programa FROM vehiculos');
    const todasLasUnidades = vRes.rows.map(r => ({ placa: r.placa.toUpperCase(), programa: r.programa || 'Sin Categoría' }));
    const todasLasPlacas = todasLasUnidades.map(u => u.placa);

    // 3. Obtener placas con inspecciones HOY
    const hoy = new Date().toISOString().split('T')[0];
    const iRes = await pool.query('SELECT DISTINCT placa FROM inspecciones_flota WHERE fecha = $1', [hoy]);
    const inspeccionadosHoy = new Set(iRes.rows.map(r => r.placa.toUpperCase()));

    // 4. Determinar placas PENDIENTES
    const alertadasHoy = obtenerPlacasAlertadasHoy();
    const pendientesTotales = todasLasPlacas.filter(p => !inspeccionadosHoy.has(p));
    const pendientesAAlertar = pendientesTotales.filter(p => !alertadasHoy.includes(p));

    emitToClients('log', { text: `[DB] ${pendientesAAlertar.length} unidades pendientes por alertar.`, type: 'system' });
    
    lastDbState = {
      registradas: todasLasUnidades,
      inspeccionadasHoy: Array.from(inspeccionadosHoy),
      pendientes: pendientesAAlertar
    };
    emitToClients('db_state', lastDbState);
    emitToClients('targets', pendientesAAlertar); 

    // Guardar en caché y transmitir ubicaciones al frontend
    lastUbicaciones = ubicaciones;
    emitToClients('map_update', ubicaciones);

    // 5. Calcular Distancias y Lanzar Alertas
    for (const placa of pendientesAAlertar) {
      if (ubicaciones[placa]) {
        const gps = ubicaciones[placa];
        const distKM = getDistanceKM(BASE_LAT, BASE_LON, gps.lat, gps.lon);
        const distMetros = Math.round(distKM * 1000);

        // Opcional: Desactivar los logs de distancia muy verbosos si quieres para no saturar la UI
        // emitToClients('log', { text: `📍 [${placa}] Distancia al taller: ${distMetros}m`, type: 'info_gps' });

        if (distKM <= RADIO_TOLERANCIA_KM) {
          emitToClients('log', { text: `✅ [${placa}] ¡ESTÁ DENTRO DEL RADIO! Disparando alerta...`, type: 'success' });
          emitToClients('alert', { placa, lat: gps.lat, lon: gps.lon }); // Frontend hace sonar alarma
          sendTelegramAlert(`La unidad *${placa}* ha ingresado a la Base Zero.\nRequiere inspección obligatoria inmediata.`);
          guardarPlacaAlertada(placa);
          emitToClients('log', { text: `[*] FIREWALL: ${placa} añadida a exclusión temporal.`, type: 'system' });
        }
      }
    }
  } catch (error) {
    emitToClients('log', { text: `[!] ERROR FATAL EN EL RELAY: ${error.message}`, type: 'error' });
  }
};

export const startRadarService = (pool) => {
  // El servicio ahora es pasivo, solo escucha. Limpiamos alertas si hay que limpiar algo diario.
};

