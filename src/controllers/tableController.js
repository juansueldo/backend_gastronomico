import { Table, Store, Status, Headquarter } from '../models/index.js';

class TableController {
  static async create(req, res) {
    try {
      const { name, table_number, capacity, location, description, metadata, headquarterId } = req.body;
      const storeId = req.user?.storeId;
      const normalizedHeadquarterId = Number(headquarterId);

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      if (!table_number) return res.status(400).json({ error: 'table_number es requerido' });
      if (!headquarterId) return res.status(400).json({ error: 'headquarterId es requerido' });
      if (!Number.isInteger(normalizedHeadquarterId) || normalizedHeadquarterId <= 0) {
        return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
      }

      // Validar que la tienda existe
      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

      // Validar que la sede exista y pertenezca a la tienda
      const headquarter = await Headquarter.findOne({
        where: { id: normalizedHeadquarterId, storeId }
      });
      if (!headquarter) return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });

      // Validar que no exista mesa con el mismo número en la sede
      const existingTable = await Table.findOne({
        where: { storeId, headquarterId: normalizedHeadquarterId, table_number }
      });
      if (existingTable) {
        return res.status(400).json({ error: `Mesa ${table_number} ya existe en esta sede` });
      }

      const table = await Table.create({
        storeId,
        name,
        table_number,
        capacity: capacity || 4,
        location,
        description,
        metadata,
        statusId: 1,
        headquarterId: normalizedHeadquarterId
      });

      const result = await Table.findByPk(table.id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req, res) {
    try {
      const storeId = req.user?.storeId;
      const rawHeadquarterId = req.query.headquarterId ?? req.user?.headquarterId;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
      if (rawHeadquarterId === undefined || rawHeadquarterId === null || rawHeadquarterId === '') {
        return res.status(400).json({ error: 'headquarterId es requerido' });
      }

      const headquarterId = Number(rawHeadquarterId);
      if (!Number.isInteger(headquarterId) || headquarterId <= 0) {
        return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
      }

      const tables = await Table.findAndCountAll({
        where: { storeId, headquarterId },
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ],
        order: [['table_number', 'ASC']]
      });

      res.status(200).json(tables);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const table = await Table.findByPk(id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
      if (table.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a esta mesa' });
      }

      res.status(200).json(table);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;
      const { name, table_number, capacity, location, description, metadata } = req.body;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const table = await Table.findByPk(id);
      if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
      if (table.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a esta mesa' });
      }

      // Si se intenta cambiar el número de mesa, validar que no exista otra con ese número
      if (table_number && table_number !== table.table_number) {
        const existingTable = await Table.findOne({
          where: { storeId, headquarterId: table.headquarterId, table_number }
        });
        if (existingTable) {
          return res.status(400).json({ error: `Mesa ${table_number} ya existe en esta sede` });
        }
      }

      if (name) table.name = name;
      if (table_number) table.table_number = table_number;
      if (capacity) table.capacity = capacity;
      if (location) table.location = location;
      if (description) table.description = description;
      if (metadata) table.metadata = metadata;

      await table.save();

      const updated = await Table.findByPk(id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      res.status(200).json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;
      const { statusId } = req.body;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
      if (!statusId) return res.status(400).json({ error: 'statusId es requerido' });

      const table = await Table.findByPk(id);
      if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
      if (table.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a esta mesa' });
      }

      table.statusId = statusId;
      await table.save();

      const updated = await Table.findByPk(id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      res.status(200).json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const table = await Table.findByPk(id);
      if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
      if (table.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a esta mesa' });
      }

      await table.destroy();
      res.status(200).json({ message: 'Mesa eliminada' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default TableController;
