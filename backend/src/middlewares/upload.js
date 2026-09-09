import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage
});

const ticketEvidenceUpload = multer({
  storage,

  limits: {
    files: 20,
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    if (
      !file.mimetype ||
      !file.mimetype.startsWith('image/')
    ) {
      return callback(
        new Error('Solo se permiten imágenes'),
        false
      );
    }

    return callback(null, true);
  }
});

export const receiveTicketEvidence = (
  req,
  res,
  next
) => {
  ticketEvidenceUpload.array(
    'evidencias',
    20
  )(req, res, error => {
    if (!error) {
      return next();
    }

    let message =
      'Solo se permiten hasta 20 archivos de imagen';

    if (error.code === 'LIMIT_FILE_SIZE') {
      message =
        'Cada imagen debe pesar como máximo 5 MB';
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      message =
        'Puede adjuntar como máximo 20 imágenes';
    }

    if (
      error.message === 'Solo se permiten imágenes'
    ) {
      message = error.message;
    }

    return res.status(400).json({
      error: message
    });
  });
};