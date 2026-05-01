import { DeliveryZone, Headquarter, Status, Store } from '../models/index.js';

// Normaliza cualquier formato de polígono a [[lng, lat], ...]
function normalizePolygon(polygon) {
  if (!polygon) return null;

  let raw = polygon;

  if (typeof polygon === 'string') {
    try {
      raw = JSON.parse(polygon);
    } catch {
      return null;
    }
  }

  // Array de objetos {lat, lng} → [[lng, lat]]
  if (Array.isArray(raw) && raw[0]?.lat !== undefined && raw[0]?.lng !== undefined) {
    return raw.map(p => [p.lng, p.lat]);
  }

  // Array de arrays [[lng, lat]] o [[lat, lng]] — ya normalizado
  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    return raw;
  }

  // GeoJSON Polygon
  if (raw?.type === 'Polygon') {
    return raw.coordinates?.[0] || null;
  }

  // GeoJSON Feature
  if (raw?.type === 'Feature' && raw.geometry?.type === 'Polygon') {
    return raw.geometry.coordinates?.[0] || null;
  }

  return null;
}

// Ray-casting algorithm
// Espera coordenadas en [[lng, lat], ...] donde xi = lng, yi = lat
function isPointInPolygon(lat, lon, polygon) {
  const coordinates = normalizePolygon(polygon);

  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i]; // xi = lng, yi = lat
    const [xj, yj] = coordinates[j];

    // Verificar si el punto está exactamente sobre un segmento vertical del polígono
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
   */
  static async create(req, res) {
    try {
      const { headquarterId, name, polygon, metadata, zoneid } = req.body;

      const storeId = req.user?.storeId;
      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      if (!polygon) return res.status(400).json({ error: 'polygon es requerido (formato GeoJSON o WKT)' });
      if (!headquarterId) return res.status(400).json({ error: 'headquarterId es requerido' });

      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Store no encontrada' });

      const headquarter = await Headquarter.findOne({
        where: { id: headquarterId, storeId },
      });
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      // Validar que el polígono sea parseable antes de guardarlo
      const normalized = normalizePolygon(polygon);
      if (!normalized || normalized.length < 3) {
        return res.status(400).json({ error: 'El polígono no tiene un formato válido o tiene menos de 3 puntos' });
      }

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

  /**
   * Verificar si una dirección está dentro de alguna zona de entrega
   */
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

      const where = { storeId, statusId: 1 };

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

      const matchedZone = zones.find(zone =>
        isPointInPolygon(parsedLatitude, parsedLongitude, zone.polygon)
      );

      if (!matchedZone) {
        return res.status(200).json({
          valid: false,
          message: 'La dirección está fuera de las zonas de entrega disponibles',
          coordinates: { latitude: parsedLatitude, longitude: parsedLongitude },
        });
      }

      return res.status(200).json({
        valid: true,
        message: 'La dirección está dentro de una zona de entrega válida',
        coordinates: { latitude: parsedLatitude, longitude: parsedLongitude },
        zone: matchedZone,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener una zona de entrega por ID
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
        const headquarter = await Headquarter.findOne({ where: { id: headquarterId, storeId } });
        if (!headquarter) {
          return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
        }
      }

      // Validar polígono si se está actualizando
      if (polygon) {
        const normalized = normalizePolygon(polygon);
        if (!normalized || normalized.length < 3) {
          return res.status(400).json({ error: 'El polígono no tiene un formato válido o tiene menos de 3 puntos' });
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