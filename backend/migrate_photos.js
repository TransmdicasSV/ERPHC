import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dicas',
  password: 'admin',
  port: 5432,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

async function migrate() {
  console.log('Iniciando migración de fotos...');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const res = await pool.query('SELECT id, img_tablet, img_radio, img_camaras FROM inspecciones_flota');
  const rows = res.rows;
  console.log(`Analizando ${rows.length} registros...`);

  let count = 0;

  for (const row of rows) {
    let changed = false;
    let newPaths = {
      img_tablet: row.img_tablet,
      img_radio: row.img_radio,
      img_camaras: row.img_camaras
    };

    const processField = (fieldKey) => {
      const originalPath = row[fieldKey];
      if (originalPath && (originalPath.startsWith('C:') || originalPath.startsWith('c:'))) {
        try {
          if (fs.existsSync(originalPath)) {
            // Generate a safe unique filename
            const ext = path.extname(originalPath) || '.jpeg';
            const newFilename = `migrated_${row.id}_${fieldKey}${ext}`;
            const destPath = path.join(uploadDir, newFilename);
            
            // Copy file
            fs.copyFileSync(originalPath, destPath);
            newPaths[fieldKey] = newFilename;
            changed = true;
          } else {
            console.log(`[!] Archivo no encontrado en disco: ${originalPath}`);
            // If it doesn't exist on disk, we might want to clear it to avoid broken images,
            // or leave it. We'll leave it or set to null.
            newPaths[fieldKey] = null;
            changed = true;
          }
        } catch (e) {
          console.error(`Error copiando ${originalPath}:`, e.message);
        }
      }
    };

    processField('img_tablet');
    processField('img_radio');
    processField('img_camaras');

    if (changed) {
      await pool.query(
        'UPDATE inspecciones_flota SET img_tablet=$1, img_radio=$2, img_camaras=$3 WHERE id=$4',
        [newPaths.img_tablet, newPaths.img_radio, newPaths.img_camaras, row.id]
      );
      count++;
    }
  }

  console.log(`✅ Migración completada. ${count} registros actualizados.`);
  pool.end();
}

migrate();
