import { extractToken, verifyToken } from './token.js';

export const adminAuthRequired = (req, res, next) => {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Token Bearer de administrador requerido' });
  }

  const decoded = verifyToken(token);

  if (!decoded || decoded.type !== 'admin') {
    return res.status(403).json({ error: 'Token de administrador invalido o expirado' });
  }

  req.admin = decoded;
  req.user = decoded;
  next();
};

export default adminAuthRequired;
