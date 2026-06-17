import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
    console.log('Lanzando navegador...');
    const browser = await puppeteer.launch({
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
    const page = await browser.newPage();
    console.log('Navegando a www.tracklogweb.com...');
    await page.goto('https://www.tracklogweb.com', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Timeout navigation'));
    
    console.log('Ejecutando evaluate...');
    const result = await page.evaluate(async () => {
      try {
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', 'TransTransmdicas');
        params.append('password', 'Trdcs18');
        params.append('client_id', 'efbdc332-83c5-4691-852f-735e5af0fc39');
        params.append('client_secret', '19389B4A6C3CA19B47711A8AF1F380A0');

        const authRes = await fetch('https://api.tracklogweb.com/v2.0/auth/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*'
          },
          body: params.toString()
        });
        if (!authRes.ok) return { error: `Auth Error: ${authRes.status}` };
        return { success: true, data: await authRes.json() };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    });

    console.log('Resultado:', result);
    await browser.close();
})();
