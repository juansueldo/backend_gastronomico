import { verifyToken, extractToken } from './token.js';
import User from '../models/user.js';

/**
 * Middleware que requiere autenticación válida
 * Extrae datos del token en req.user
 */
async function isCurrentUserSession(decoded) {
  if (!decoded?.id || decoded.type === 'admin') {
    return true;
  }

  if (!Number.isInteger(Number(decoded.sessionVersion))) {
    return false;
  }

  const user = await User.findByPk(decoded.id, {
    attributes: ['id', 'sessionVersion'],
  });

  return Boolean(user) && Number(user.sessionVersion ?? 0) === Number(decoded.sessionVersion);
}

export const authRequired = async (req, res, next) => {
  // Permitir acceso libre a documentación
  if (
    req.path === '/docs.html' ||
    req.path === '/openapi.json' ||
    req.path === '/swagger.json' ||
    req.path.startsWith('/swagger-ui')
  ) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = extractToken(authHeader);

  if (!token) {
    return res.status(401).json({ error: 'Token Bearer requerido' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  try {
    const isCurrentSession = await isCurrentUserSession(decoded);
    if (!isCurrentSession) {
      return res.status(401).json({
        code: 'SESSION_REPLACED',
        error: 'Tu sesión fue cerrada porque se inició sesión en otro dispositivo o pestaña.',
      });
    }

    // Adjuntar datos decodificados al request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'No se pudo validar la sesión' });
  }
};

/**
 * Middleware que extrae token si existe, pero permite pasarlo sin él
 * Datos disponibles en req.user si el token es válido
 */
export const authOptional = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = extractToken(authHeader);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      try {
        const isCurrentSession = await isCurrentUserSession(decoded);
        if (isCurrentSession) {
          req.user = decoded;
        }
      } catch {
        // El endpoint es opcional: si la sesión no se puede validar, continúa como anónimo.
      }
    }
  }

  next();
};

/**
 * Middleware que requiere que req.user.id exista (es decir, autenticación válida)
 * Se usa en conjunto con authOptional para proteger endpoints
 */
export const requireUser = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  next();
};

export default authRequired;
