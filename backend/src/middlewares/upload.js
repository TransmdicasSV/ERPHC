import multer from 'multer';

const storage = multer.memoryStorage();
const MB = 1024 * 1024;

const TIPOS_IMAGEN = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif'
]);

const CAMPOS_IMAGEN = new Set([
  'img_tablet',
  'img_radio',
  'img_camaras',
  'evidencia',
  'evidencias'
]);

const TIPOS_EXCEL = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream'
]);

const filtrarArchivo = (_req, file, callback) => {
  let permitido = false;

  if (CAMPOS_IMAGEN.has(file.fieldname)) {
    permitido = TIPOS_IMAGEN.has(file.mimetype);
  } else if (file.fieldname === 'acta') {
    permitido =
      TIPOS_IMAGEN.has(file.mimetype) ||
      file.mimetype === 'application/pdf';
  } else if (file.fieldname === 'file') {
    permitido =
      /\.(xlsx|xls)$/i.test(file.originalname) &&
      TIPOS_EXCEL.has(file.mimetype);
  }

  if (!permitido) {
    const error = new Error(
      'Tipo de archivo no permitido para este campo'
    );

    error.code = 'INVALID_FILE_TYPE';

    return callback(error);
  }

  return callback(null, true);
};

export const upload = multer({
  storage,
  fileFilter: filtrarArchivo,

  limits: {
    fileSize: 10 * MB,
    files: 3,
    fields: 40,
    fieldSize: 64 * 1024
  }
});

const ticketEvidenceUpload = multer({
  storage,
  fileFilter: filtrarArchivo,

  limits: {
    fileSize: 5 * MB,
    files: 20,
    fields: 40,
    fieldSize: 64 * 1024
  }
});

export const receiveTicketEvidence =
  ticketEvidenceUpload.array('evidencias', 20);