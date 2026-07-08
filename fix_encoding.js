const fs = require('fs');
const path = require('path');

const replacements = {
  'revisiÃ³n': 'revisión',
  'REVISIÃ³N': 'REVISIÓN',
  'OperaciÃ³n': 'Operación',
  'OPERACIÃ³N': 'OPERACIÓN',
  'OPERACIÃ²N': 'OPERACIÓN',
  'InspecciÃ³n': 'Inspección',
  'INSPECCIÃ³N': 'INSPECCIÓN',
  'Ãšltima': 'Última',
  'AÃ±o': 'Año',
  'AO': 'AÑO',
  'AÃ‘O': 'AÑO',
  'ðŸ“±': '??',
  'ðŸ“»': '??',
  'ðŸ“¹': '??',
  'âœ…': '?',
  'ðŸš¨': '??',
  'âš ï¸ ': '??',
  'â¬‡': '??',
  'GestiÃ³n': 'Gestión',
  'fotogrÃ¡ficos': 'fotográficos',
  'CATEGORÃ\x8dA': 'CATEGORÍA'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        processDir(fullPath);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [bad, good] of Object.entries(replacements)) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDir('backend');
processDir('app_flotas_web/src');
