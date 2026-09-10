import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const VARIABLES_CLOUDINARY = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const variablesFaltantes = VARIABLES_CLOUDINARY.filter(
  variable => !String(process.env[variable] || '').trim()
);

if (variablesFaltantes.length > 0) {
  throw new Error(
    `Faltan variables de Cloudinary: ${variablesFaltantes.join(', ')}`
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = (
  buffer,
  folderName,
  resourceType = 'auto'
) => {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer)) {
      reject(
        new Error('No se recibió un archivo válido para Cloudinary')
      );
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(
            new Error('Cloudinary no devolvió la URL del archivo')
          );
          return;
        }

        resolve(result.secure_url);
      }
    );

    streamifier
      .createReadStream(buffer)
      .pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async url => {
  if (
    typeof url !== 'string' ||
    !url.includes('cloudinary.com')
  ) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const partes = parsedUrl.pathname
      .split('/')
      .filter(Boolean);

    const uploadIndex = partes.indexOf('upload');

    if (
      uploadIndex === -1 ||
      uploadIndex >= partes.length - 1
    ) {
      return false;
    }

    const tipoEncontrado = partes.find(parte =>
      ['image', 'raw', 'video'].includes(parte)
    );

    const resourceType = tipoEncontrado || 'image';

    let partesPublicId = partes.slice(uploadIndex + 1);

    if (
      partesPublicId[0] &&
      /^v\d+$/.test(partesPublicId[0])
    ) {
      partesPublicId = partesPublicId.slice(1);
    }

    const publicIdConExtension = decodeURIComponent(
      partesPublicId.join('/')
    );

    const publicId = resourceType === 'raw'
      ? publicIdConExtension
      : publicIdConExtension.replace(/\.[^/.]+$/, '');

    if (!publicId) {
      return false;
    }

    const resultado = await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        invalidate: true
      }
    );

    console.log(
      `Archivo eliminado de Cloudinary: ${publicId}`
    );

    return ['ok', 'not found'].includes(resultado.result);
  } catch (error) {
    console.error(
      `Error eliminando archivo de Cloudinary (${url}):`,
      error
    );

    return false;
  }
};
