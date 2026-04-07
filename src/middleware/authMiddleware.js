import { verifyToken, extractToken } from './token.js';

/**
 * Middleware que requiere autenticación válida
 * Extrae datos del token en req.user
 */
export const authRequired = (req, res, next) => {
  // Permitir acceso libre a documentación
  if (req.path === '/docs.html' || req.path === '/swagger.json' || req.path.startsWith('/swagger-ui')) {
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

  // Adjuntar datos decodificados al request
  req.user = decoded;
  next();
};

/**
 * Middleware que extrae token si existe, pero permite pasarlo sin él
 * Datos disponibles en req.user si el token es válido
 */
export const authOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = extractToken(authHeader);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
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
