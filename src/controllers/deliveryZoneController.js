import { DeliveryZone, Headquarter, Status, Store } from '../models/index.js';

function isPointInPolygon(lat, lon, polygon) {
  let coordinates = null;

  if (Array.isArray(polygon)) {
    coordinates = polygon;
  } else if (typeof polygon === 'string') {
    try {
      const parsedPolygon = JSON.parse(polygon);
      return isPointInPolygon(lat, lon, parsedPolygon);
    } catch {
      return false;
    }
  } else if (polygon?.type === 'Polygon') {
    coordinates = polygon.coordinates?.[0] || null;
  } else if (polygon?.type === 'Feature' && polygon.geometry?.type === 'Polygon') {
    coordinates = polygon.geometry.coordinates?.[0] || null;
  }

  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i];
    const [xj, yj] = coordinates[j];

    const xiEqual = Math.abs(xi - lon) < 0.0000001;
    const xjEqual = Math.abs(xj - lon) < 0.0000001;

    if (xiEqual && xjEqual && Math.min(yi, yj) <= lat && lat <= Math.max(yi, yj)) {
      return true;
    }

    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

class DeliveryZoneController {
  /**
   * Crear una nueva zona de entrega
   * @param {Object} req - Request object con { storeId, name, polygon, metadata, zoneid }
   * @param {Object} res - Response object
   */
  static async create(req, res) {
    try {
      const { headquarterId, name, polygon, metadata, zoneid } = req.body;

      // Validaciones
      const storeId = req.user?.storeId;
      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      if (!polygon) return res.status(400).json({ error: 'polygon es requerido (formato GeoJSON o WKT)' });
      if (!headquarterId) return res.status(400).json({ error: 'headquarterId es requerido' });

      // Validar que la tienda existe
      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Store no encontrada' });

      const headquarter = await Headquarter.findOne({
        where: { id: headquarterId, storeId },
      });
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      // Crear zona de entrega
      const deliveryZone = await DeliveryZone.create({
        headquarterId,
        storeId,
        name,
        polygon,
        metadata: metadata || {},
        zoneid: zoneid || `ZONE_${Date.now()}`,
        statusId: 1,
      });

      res.status(201).json(deliveryZone);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener todas las zonas de entrega de una tienda
   * @param {Object} req - Request object con query.storeId
   * @param {Object} res - Response object
   */
  static async getByStore(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const zones = await DeliveryZone.findAndCountAll({
        where: { storeId },
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
          { model: Headquarter, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(zones);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async checkAddress(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { headquarterId, latitude, longitude } = req.body;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'latitude y longitude son requeridos' });
      }

      const parsedLatitude = Number(latitude);
      const parsedLongitude = Number(longitude);

      if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
        return res.status(400).json({ error: 'latitude y longitude deben ser números válidos' });
      }

      const where = {
        storeId,
        statusId: 1,
      };

      if (headquarterId !== undefined && headquarterId !== null) {
        const parsedHeadquarterId = Number(headquarterId);

        if (!Number.isInteger(parsedHeadquarterId) || parsedHeadquarterId <= 0) {
          return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
        }

        const headquarter = await Headquarter.findOne({
          where: { id: parsedHeadquarterId, storeId },
        });

        if (!headquarter) {
          return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
        }

        where.headquarterId = parsedHeadquarterId;
      }

      const zones = await DeliveryZone.findAll({
        where,
        include: [
          { model: Headquarter, attributes: ['id', 'name', 'location'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
        order: [['id', 'ASC']],
      });

      const matchedZone = zones.find(zone => isPointInPolygon(parsedLatitude, parsedLongitude, zone.polygon));

      if (!matchedZone) {
        return res.status(200).json({
          valid: false,
          message: 'La dirección está fuera de las zonas de entrega disponibles',
          coordinates: {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
          },
        });
      }

      return res.status(200).json({
        valid: true,
        message: 'La dirección está dentro de una zona de entrega válida',
        coordinates: {
          latitude: parsedLatitude,
          longitude: parsedLongitude,
        },
        zone: matchedZone,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener una zona de entrega por ID
   * @param {Object} req - Request object con params.id
   * @param {Object} res - Response object
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const zone = await DeliveryZone.findOne({
        where: { id, storeId },
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
          { model: Headquarter, attributes: ['id', 'name'] },
        ],
      });

      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      res.status(200).json(zone);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Actualizar una zona de entrega
   * @param {Object} req - Request object con params.id y body { name, polygon, metadata, zoneid }
   * @param {Object} res - Response object
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { headquarterId, name, polygon, metadata, zoneid } = req.body;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const zone = await DeliveryZone.findOne({ where: { id, storeId } });
      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      if (headquarterId) {
        const headquarter = await Headquarter.findOne({
          where: { id: headquarterId, storeId },
        });
        if (!headquarter) {
          return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
        }
      }

      await zone.update({
        ...(headquarterId && { headquarterId }),
        ...(name && { name }),
        ...(polygon && { polygon }),
        ...(metadata && { metadata }),
        ...(zoneid && { zoneid }),
      });

      const updatedZone = await DeliveryZone.findOne({
        where: { id, storeId },
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
          { model: Headquarter, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(updatedZone);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Cambiar estado de una zona de entrega
   * @param {Object} req - Request object con params.id y body { statusId }
   * @param {Object} res - Response object
   */
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (!statusId) {
        return res.status(400).json({ error: 'statusId es requerido' });
      }

      const zone = await DeliveryZone.findOne({ where: { id, storeId } });
      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      await zone.update({ statusId });

      const updatedZone = await DeliveryZone.findOne({
        where: { id, storeId },
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
          { model: Headquarter, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(updatedZone);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Eliminar una zona de entrega
   * @param {Object} req - Request object con params.id
   * @param {Object} res - Response object
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const zone = await DeliveryZone.findOne({ where: { id, storeId } });
      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      await zone.destroy();

      res.status(200).json({ message: 'Zona de entrega eliminada correctamente' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default DeliveryZoneController;
