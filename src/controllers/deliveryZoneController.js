import { DeliveryZone, Store, Status } from '../models/index.js';

class DeliveryZoneController {
  /**
   * Crear una nueva zona de entrega
   * @param {Object} req - Request object con { storeId, name, polygon, metadata, zoneid }
   * @param {Object} res - Response object
   */
  static async create(req, res) {
    try {
      const { name, polygon, metadata, zoneid } = req.body;

      // Validaciones
      const storeId = req.user?.storeId;
      if (!storeId) {
          return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      if (!polygon) return res.status(400).json({ error: 'polygon es requerido (formato GeoJSON o WKT)' });

      // Validar que la tienda existe
      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Store no encontrada' });

      // Crear zona de entrega
      const deliveryZone = await DeliveryZone.create({
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
        include: [{ model: Store, attributes: ['id', 'name'] }, { model: Status, attributes: ['id', 'name'] }],
      });

      res.status(200).json(zones);
    } catch (err) {
      res.status(400).json({ error: err.message });
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

      const zone = await DeliveryZone.findByPk(id, {
        include: [{ model: Store, attributes: ['id', 'name'] }, { model: Status, attributes: ['id', 'name'] }],
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
      const { name, polygon, metadata, zoneid } = req.body;

      const zone = await DeliveryZone.findByPk(id);
      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      await zone.update({
        ...(name && { name }),
        ...(polygon && { polygon }),
        ...(metadata && { metadata }),
        ...(zoneid && { zoneid }),
      });

      const updatedZone = await DeliveryZone.findByPk(id, {
        include: [{ model: Store, attributes: ['id', 'name'] }, { model: Status, attributes: ['id', 'name'] }],
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

      if (!statusId) {
        return res.status(400).json({ error: 'statusId es requerido' });
      }

      const zone = await DeliveryZone.findByPk(id);
      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      await zone.update({ statusId });

      const updatedZone = await DeliveryZone.findByPk(id, {
        include: [{ model: Store, attributes: ['id', 'name'] }, { model: Status, attributes: ['id', 'name'] }],
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

      const zone = await DeliveryZone.findByPk(id);
      if (!zone) return res.status(404).json({ error: 'Zona de entrega no encontrada' });

      await zone.destroy();

      res.status(200).json({ message: 'Zona de entrega eliminada correctamente' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default DeliveryZoneController;
