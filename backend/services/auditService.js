import { isIP } from 'node:net';
import { pool } from '../src/config/database.js';

const CAMPOS_SENSIBLES_AUDITORIA = new Set([
  'password',
  'password_hash',
  'token',
  'jwt',
  'jwt_secret',
  'authorization',
  'api_key',
  'api_secret',
  'secret'
]);

const limpiarValoresAuditoria = valor => {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (Buffer.isBuffer(valor)) {
    return '[BUFFER OMITIDO]';
  }

  if (Array.isArray(valor)) {
    return valor.map(limpiarValoresAuditoria);
  }

  if (typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => {
        if (
          CAMPOS_SENSIBLES_AUDITORIA.has(
            clave.toLowerCase()
          )
        ) {
          return [clave, '[PROTEGIDO]'];
        }

        return [
          clave,
          limpiarValoresAuditoria(contenido)
        ];
      })
    );
  }

  return valor;
};

const obtenerIpCliente = req => {
  if (!req) {
    return null;
  }

  const ip =
    req.ip ||
    req.socket?.remoteAddress ||
    null;

  if (
    typeof ip !== 'string' ||
    !ip.trim()
  ) {
    return null;
  }

  const ipNormalizada = ip
    .trim()
    .replace(/^::ffff:/, '');

  return isIP(ipNormalizada)
    ? ipNormalizada
    : null;
};

export const logAction = async (
  userId,
  accion,
  tablaAfectada,
  req = null,
  valoresAnteriores = null,
  valoresActuales = null
) => {
  try {
    const ipAddress = obtenerIpCliente(req);

    const anterioresLimpios =
      limpiarValoresAuditoria(valoresAnteriores);

    const actualesLimpios =
      limpiarValoresAuditoria(valoresActuales);

    await pool.query(
      `INSERT INTO audit_logs (
        user_id,
        accion,
        tabla_afectada,
        fecha,
        ip_address,
        valores_anteriores,
        valores_actuales
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        $4::inet,
        $5::jsonb,
        $6::jsonb
      )`,
      [
        userId || null,
        accion,
        tablaAfectada,
        ipAddress,
        anterioresLimpios === null
          ? null
          : JSON.stringify(anterioresLimpios),
        actualesLimpios === null
          ? null
          : JSON.stringify(actualesLimpios)
      ]
    );
  } catch (error) {
    console.error(
      'Error guardando la auditoría:',
      error
    );
  }
};
