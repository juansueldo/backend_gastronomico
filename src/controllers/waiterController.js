import { Waiter, Store, Status } from '../models/index.js';
import NotificationService from '../services/notificationService.js';

class WaiterController {
  static async create(req, res) {
    try {
      const { firstname, lastname, email, phone, identification, salary, hire_date, metadata } = req.body;
      const storeId = req.user?.storeId;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
      if (!firstname) return res.status(400).json({ error: 'firstname es requerido' });
      if (!lastname) return res.status(400).json({ error: 'lastname es requerido' });

      // Validar que la tienda existe
      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

      const waiter = await Waiter.create({
        storeId,
        firstname,
        lastname,
        email,
        phone,
        identification,
        salary,
        hire_date,
        metadata,
        statusId: 1
      });

      const result = await Waiter.findByPk(waiter.id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      NotificationService.notifyWaiterCreated(storeId, result);

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req, res) {
    try {
      const storeId = req.user?.storeId;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const waiters = await Waiter.findAndCountAll({
        where: { storeId },
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ],
        order: [['firstname', 'ASC']]
      });

      res.status(200).json(waiters);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const waiter = await Waiter.findByPk(id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      if (!waiter) return res.status(404).json({ error: 'Mozo no encontrado' });
      if (waiter.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a este mozo' });
      }

      res.status(200).json(waiter);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;
      const { firstname, lastname, email, phone, identification, salary, hire_date, metadata } = req.body;

      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const waiter = await Waiter.findByPk(id);
      if (!waiter) return res.status(404).json({ error: 'Mozo no encontrado' });
      if (waiter.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a este mozo' });
      }

      if (firstname) waiter.firstname = firstname;
      if (lastname) waiter.lastname = lastname;
      if (email) waiter.email = email;
      if (phone) waiter.phone = phone;
      if (identification) waiter.identification = identification;
      if (salary !== undefined) waiter.salary = salary;
      if (hire_date) waiter.hire_date = hire_date;
      if (metadata) waiter.metadata = metadata;

      await waiter.save();

      const updated = await Waiter.findByPk(id, {
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

      const waiter = await Waiter.findByPk(id);
      if (!waiter) return res.status(404).json({ error: 'Mozo no encontrado' });
      if (waiter.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a este mozo' });
      }

      waiter.statusId = statusId;
      await waiter.save();

      const updated = await Waiter.findByPk(id, {
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

      const waiter = await Waiter.findByPk(id);
      if (!waiter) return res.status(404).json({ error: 'Mozo no encontrado' });
      if (waiter.storeId !== storeId) {
        return res.status(403).json({ error: 'No tienes acceso a este mozo' });
      }

      await waiter.destroy();
      res.status(200).json({ message: 'Mozo eliminado' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default WaiterController;
