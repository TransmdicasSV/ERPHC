import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

puppeteer.use(StealthPlugin());

const TRACKLOG_AUTH_URL = "https://api.tracklogweb.com/v2.0/auth/token";
const TRACKLOG_API_URL = "https://api.tracklogweb.com/v2.0/livedata?pagination=false";
const RENDER_SYNC_URL = "https://jdcali-backend.onrender.com/api/radar/sync";
const SYNC_SECRET = "CORE_RADAR_SECURE_KEY_2026";
const INTERVAL_MS = 180000; // 3 minutos

let browser = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const printHeader = () => {
  console.clear();
  console.log(chalk.cyanBright.bold('=================================================='));
  console.log(chalk.cyanBright.bold('          JDCALI - CORE RADAR DESKTOP V1          '));
  console.log(chalk.cyanBright.bold('=================================================='));
  console.log(chalk.gray('Estado: ') + chalk.greenBright('ACTIVO') + chalk.gray(' | Motor: ') + chalk.yellow('PUPPETEER STEALTH'));
  console.log(chalk.gray('Enlace: ') + chalk.magentaBright(RENDER_SYNC_URL));
  console.log('');
};

const runRadarCycle = async () => {
  printHeader();
  const spinner = ora({ text: chalk.yellow('Iniciando ciclo de extracción...'), color: 'yellow' }).start();

  try {
    if (!browser) {
      spinner.text = chalk.yellow('Desplegando Navegador Fantasma (Chrome)...');
      browser = await puppeteer.launch({
        headless: true, // Se puede cambiar a false si falla localmente
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
    }

    const page = await browser.newPage();
    await page.setBypassCSP(true);

    spinner.text = chalk.yellow('Navegando al muro de Cloudflare (www.tracklogweb.com)...');
    
    await page.goto('https://www.tracklogweb.com', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    
    spinner.text = chalk.yellow('Ejecutando infiltración Same-Origin... Obteniendo datos GPS...');
    
    const result = await page.evaluate(async (authUrl, apiUrl) => {
      try {
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

        if (!authRes.ok) return { error: `Auth Error: HTTP ${authRes.status}` };

        const authData = await authRes.json();
        const token = authData.access_token;

        const apiRes = await fetch(apiUrl, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.tracklogweb.com',
            'Referer': 'https://www.tracklogweb.com/'
          }
        });

        if (!apiRes.ok) return { error: `API Error: HTTP ${apiRes.status}` };

        const gpsData = await apiRes.json();
        return { success: true, data: gpsData };
      } catch (e) {
        return { error: `Exception: ${e.message}` };
      }
    }, TRACKLOG_AUTH_URL, TRACKLOG_API_URL);

    await page.close();

    if (result.error) {
      spinner.fail(chalk.red(`Error en Extracción: ${result.error}`));
      throw new Error(result.error);
    }

    const vehiculos = result.data['hydra:member'] || result.data || [];
    spinner.succeed(chalk.green(`¡Datos GPS obtenidos! (${vehiculos.length} unidades)`));
    
    const syncSpinner = ora({ text: chalk.blueBright('Sincronizando con el servidor en la nube (Render)...'), color: 'blue' }).start();
    
    try {
      await axios.post(RENDER_SYNC_URL, {
        secret: SYNC_SECRET,
        tracklogData: result.data
      }, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      syncSpinner.succeed(chalk.greenBright('¡Nube Sincronizada Exitosamente! Frontend Actualizado.'));
    } catch (syncErr) {
      let errorDetail = syncErr.message;
      if (syncErr.response) {
        errorDetail += ` | Status: ${syncErr.response.status} | Data: ${JSON.stringify(syncErr.response.data)}`;
      }
      syncSpinner.fail(chalk.red(`Error de sincronización con la nube: ${errorDetail}`));
    }

  } catch (error) {
    spinner.fail(chalk.red(`[FALLO CRÍTICO] ${error.message}`));
    // Si falla, cerramos el navegador para que el próximo ciclo lo abra limpio
    if (browser) {
      await browser.close();
      browser = null;
    }
  }

  console.log(chalk.gray(`\nPróximo barrido en ${INTERVAL_MS / 1000} segundos...`));
};

// Iniciar
(async () => {
  printHeader();
  await runRadarCycle();
  setInterval(runRadarCycle, INTERVAL_MS);
})();
