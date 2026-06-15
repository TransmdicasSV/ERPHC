import pg from 'pg';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dicas',
  password: 'admin',
  port: 5432,
});

const uploadToCloudinary = async (filePath, folderName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder: folderName });
    return result.secure_url;
  } catch (err) {
    console.error(`Error subiendo ${filePath}:`, err.message);
    return null;
  }
};

async function migrateImages() {
  console.log('Iniciando migración de imágenes locales a Cloudinary...');
  
  try {
    const res = await pool.query('SELECT id, img_tablet, img_radio, img_camaras FROM inspecciones_flota');
    const records = res.rows;
    let migratedCount = 0;

    for (const record of records) {
      let { id, img_tablet, img_radio, img_camaras } = record;
      let updated = false;

      const processImage = async (imgField) => {
        if (imgField && !imgField.startsWith('http')) {
          const localPath = path.join(__dirname, 'uploads', imgField);
          if (fs.existsSync(localPath)) {
            console.log(`Subiendo ${imgField} (ID: ${id})...`);
            const url = await uploadToCloudinary(localPath, 'flotas_inspecciones');
            if (url) return url;
          } else {
            console.log(`Archivo no encontrado: ${localPath}`);
          }
        }
        return imgField;
      };

      const newTablet = await processImage(img_tablet);
      if (newTablet !== img_tablet) { img_tablet = newTablet; updated = true; }

      const newRadio = await processImage(img_radio);
      if (newRadio !== img_radio) { img_radio = newRadio; updated = true; }

      const newCamaras = await processImage(img_camaras);
      if (newCamaras !== img_camaras) { img_camaras = newCamaras; updated = true; }

      if (updated) {
        await pool.query(
          'UPDATE inspecciones_flota SET img_tablet = $1, img_radio = $2, img_camaras = $3 WHERE id = $4',
          [img_tablet, img_radio, img_camaras, id]
        );
        migratedCount++;
        console.log(`Registro ID ${id} actualizado en BD.`);
      }
    }

    console.log(`Migración completada. Registros actualizados: ${migratedCount}`);
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    pool.end();
  }
}

migrateImages();
