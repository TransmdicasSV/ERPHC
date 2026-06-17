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
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

let cloudflareCookies = '';
let browserUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

// Cabeceras HTTP idénticas a Python para saltar el Firewall de Tracklog
const TRACKLOG_HEADERS = () => ({
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "es-419,es;q=0.9,en-US;q=0.8,en;q=0.7",
  "Origin": "https://www.tracklogweb.com",
  "Referer": "https://www.tracklogweb.com/",
  "User-Agent": browserUserAgent,
  "Cookie": cloudflareCookies,
  "Sec-Ch-Ua": "\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": "\"Windows\"",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin"
});

const solveCloudflareChallengeAndFetch = async (pool) => {
  emitToClients('log', { text: '[WAF] Desplegando Navegador Fantasma...', type: 'system' });
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    browserUserAgent = await browser.userAgent();
    const page = await browser.newPage();
    
    // Evitar bloqueos de Content Security Policy (CSP) que causan 'Failed to fetch'
    await page.setBypassCSP(true);

    // Capturar errores internos del navegador para depuración extrema
    page.on('console', msg => {
      if (msg.type() === 'error') emitToClients('log', { text: `[WAF-CHROME] ${msg.text()}`, type: 'warning' });
    });
    page.on('requestfailed', request => {
      emitToClients('log', { text: `[WAF-CHROME-NET] Fallo: ${request.url()} - ${request.failure()?.errorText}`, type: 'warning' });
    });
    
    // Bloquear imágenes y estilos para ahorrar RAM
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    emitToClients('log', { text: '[WAF] Navegando al muro de Cloudflare (API)...', type: 'system' });
    // Navegar directamente a la API. Cloudflare interceptará con la página "Just a moment..."
    await page.goto('https://api.tracklogweb.com/v2.0/livedata', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => {
        emitToClients('log', { text: `[WAF] Aviso en goto: ${e.message}`, type: 'warning' });
    });
    
    emitToClients('log', { text: '[WAF] Esperando resolución del desafío Turnstile...', type: 'system' });
    
    // Polling: Esperar activamente hasta 15 segundos a que aparezca la galleta cf_clearance
    let isSolved = false;
    for (let i = 0; i < 15; i++) {
      const cookies = await page.cookies();
      if (cookies.find(c => c.name === 'cf_clearance')) {
        isSolved = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (isSolved) {
      emitToClients('log', { text: '[WAF] ✅ Desafío Cloudflare superado. Galleta asegurada. Ejecutando Peticiones Nativas...', type: 'success' });
    } else {
      emitToClients('log', { text: '[WAF] ⚠️ No se detectó cf_clearance. Intentando peticiones a ciegas...', type: 'warning' });
    }
    
    // Ejecutar FETCH DENTRO del navegador para heredar el Fingerprint TLS y las Cookies!
    const result = await page.evaluate(async (authUrl, apiUrl) => {
      try {
        // 1. Obtener Token
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', 'TransTransmdicas');
        params.append('password', 'Trdcs18');
        params.append('client_id', 'efbdc332-83c5-4691-852f-735e5af0fc39');
        params.append('client_secret', '19389B4A6C3CA19B47711A8AF1F380A0');

        const authRes = await fetch(authUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.tracklogweb.com',
            'Referer': 'https://www.tracklogweb.com/'
          },
          body: params.toString()
        });

        if (!authRes.ok) {
          return { error: `Auth Error HTTP ${authRes.status}: ${await authRes.text().catch(e=>'')}` };
        }

        const authData = await authRes.json();
        const token = authData.access_token;

        // 2. Obtener GPS Data
        const apiRes = await fetch(apiUrl, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.tracklogweb.com',
            'Referer': 'https://www.tracklogweb.com/'
          }
        });

        if (!apiRes.ok) {
          return { error: `API Error HTTP ${apiRes.status}` };
        }

        const gpsData = await apiRes.json();
        return { success: true, data: gpsData };
      } catch (e) {
        return { error: `Browser Fetch Exception: ${e.message}` };
      }
    }, TRACKLOG_AUTH_URL, TRACKLOG_API_URL);

    if (result.error) {
      throw new Error(result.error);
    }

    emitToClients('log', { text: '[API] 📡 Se descargó información cruda exitosamente vía Chrome.', type: 'success' });
    return procesarDatosGps(result.data);

  } catch (err) {
    emitToClients('log', { text: `[!] WAF BYPASS ERROR: ${err.message}. Iniciando SIMULACIÓN TÁCTICA...`, type: 'warning' });
    return generarMockGps(pool);
  } finally {
    if (browser) await browser.close();
  }
};

const fetchTracklogLocations = async (pool) => {
  // Ahora consolidamos todo en el navegador invisible para garantizar que el
  // TLS fingerprint y las cookies CF coincidan al 100%.
  return await solveCloudflareChallengeAndFetch(pool);
};

const generarMockGps = async (pool) => {
  // Simulador avanzado en caso de bloqueo WAF
  const mockData = [];
  try {
    const result = await pool.query('SELECT placa FROM vehiculos');
    
    // Coordenadas base (Ate, Lima)
    const baseLat = -12.025;
    const baseLon = -76.905;
    
    result.rows.forEach(v => {
      // Pequeña variación aleatoria para que se muevan
      const lat = baseLat + (Math.random() - 0.5) * 0.05;
      const lon = baseLon + (Math.random() - 0.5) * 0.05;
      mockData.push({
        registration: v.placa,
        latitude: lat,
        longitude: lon,
        speed: Math.floor(Math.random() * 60)
      });
    });
  } catch (e) {
    console.error('Error generando mock:', e);
  }
  return procesarDatosGps(mockData);
};

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
// BUCLE PRINCIPAL DEL RADAR
// ==========================================
export const runRadarScan = async (pool) => {
  emitToClients('log', { text: '==================================================', type: 'system' });
  emitToClients('log', { text: '[SYS] BARRIDO TÁCTICO INICIADO', type: 'system' });

  try {
    // 1. Obtener todas las placas del sistema y sus programas
    const vRes = await pool.query('SELECT placa, operacion as programa FROM vehiculos');
    // Guardaremos un array de objetos con placa y programa
    const todasLasUnidades = vRes.rows.map(r => ({ placa: r.placa.toUpperCase(), programa: r.programa || 'Sin Categoría' }));
    const todasLasPlacas = todasLasUnidades.map(u => u.placa);

    // 2. Obtener placas con inspecciones HOY
    const hoy = new Date().toISOString().split('T')[0];
    const iRes = await pool.query('SELECT DISTINCT placa FROM inspecciones_flota WHERE fecha = $1', [hoy]);
    const inspeccionadosHoy = new Set(iRes.rows.map(r => r.placa.toUpperCase()));

    // 3. Determinar placas PENDIENTES
    const alertadasHoy = obtenerPlacasAlertadasHoy();
    const pendientesTotales = todasLasPlacas.filter(p => !inspeccionadosHoy.has(p));
    const pendientesAAlertar = pendientesTotales.filter(p => !alertadasHoy.includes(p));

    emitToClients('log', { text: `[DB] ${pendientesAAlertar.length} unidades pendientes por alertar (No inspeccionadas hoy).`, type: 'system' });
    
    lastDbState = {
      registradas: todasLasUnidades, // Enviamos los objetos enteros
      inspeccionadasHoy: Array.from(inspeccionadosHoy),
      pendientes: pendientesAAlertar
    };
    emitToClients('db_state', lastDbState);
    emitToClients('targets', pendientesAAlertar); // Mantenemos targets para retrocompatibilidad con logs antiguos

    // 4. Descargar GPS
    const ubicaciones = await fetchTracklogLocations(pool);
    
    // Guardar en caché y transmitir ubicaciones al frontend
    lastUbicaciones = ubicaciones;
    emitToClients('map_update', ubicaciones);

    // 5. Calcular Distancias
    for (const placa of pendientesAAlertar) {
      if (ubicaciones[placa]) {
        const gps = ubicaciones[placa];
        const distKM = getDistanceKM(BASE_LAT, BASE_LON, gps.lat, gps.lon);
        const distMetros = Math.round(distKM * 1000);

        emitToClients('log', { text: `📍 [${placa}] Detectada en Lat: ${gps.lat.toFixed(5)}, Lon: ${gps.lon.toFixed(5)}`, type: 'info_gps' });
        emitToClients('log', { text: `📏 [${placa}] Distancia al taller: ${distMetros} metros (Límite: ${RADIO_TOLERANCIA_KM * 1000}m)`, type: 'info_gps' });

        if (distKM <= RADIO_TOLERANCIA_KM) {
          emitToClients('log', { text: `✅ [${placa}] ¡ESTÁ DENTRO DEL RADIO! Disparando alerta...`, type: 'success' });
          emitToClients('alert', { placa, lat: gps.lat, lon: gps.lon }); // Frontend hace sonar alarma
          sendTelegramAlert(`La unidad *${placa}* ha ingresado a la Base Zero.\nRequiere inspección obligatoria inmediata.`);
          guardarPlacaAlertada(placa);
          emitToClients('log', { text: `[*] FIREWALL: ${placa} añadida a exclusión temporal.`, type: 'system' });
        } else {
          emitToClients('log', { text: `❌ [${placa}] Aún está demasiado lejos para alertar.`, type: 'error' });
        }
      }
    }
  } catch (error) {
    emitToClients('log', { text: `[!] ERROR FATAL EN BARRIDO: ${error.message}`, type: 'error' });
  }

  emitToClients('log', { text: '[SYS] Barrido completado.', type: 'system' });
};

// Iniciar el cron (cada 3 minutos)
export const startRadarService = (pool) => {
  // Ejecutar inmediatamente al arrancar el servidor
  runRadarScan(pool);
  
  setInterval(() => {
    runRadarScan(pool);
  }, 180000); // 3 minutos
};
