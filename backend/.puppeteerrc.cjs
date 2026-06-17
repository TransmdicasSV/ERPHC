const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Configuración vital para Render.com: Obliga a Puppeteer a guardar 
  // el navegador dentro de la carpeta del proyecto en lugar del sistema raíz.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
