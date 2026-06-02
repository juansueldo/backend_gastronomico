import { extractToken, verifyToken } from './token.js';
import DeliveryDriver from '../models/deliveryDriver.js';

export const driverAuthRequired = async (req, res, next) => {
  const token = extractToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'Token Bearer de repartidor requerido' });

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'driver') {
    return res.status(403).json({ error: 'Token de repartidor inválido o expirado' });
  }

  try {
    const driver = await DeliveryDriver.findOne({
      where: { id: decoded.id, storeId: decoded.storeId },
    });

    if (!driver || driver.status === 'inactive') {
      return res.status(401).json({ error: 'Repartidor no disponible' });
    }

    if (Number(driver.mobileSessionVersion ?? 0) !== Number(decoded.mobileSessionVersion ?? -1)) {
      return res.status(401).json({
        code: 'DRIVER_SESSION_REPLACED',
        error: 'La sesión del repartidor fue reemplazada. Volvé a activar la app.',
      });
    }

    req.driver = driver;
    req.user = {
      id: driver.id,
      storeId: driver.storeId,
      type: 'driver',
    };
    next();
  } catch {
    return res.status(401).json({ error: 'No se pudo validar la sesión del repartidor' });
  }
};

export default driverAuthRequired;
