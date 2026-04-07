import { PlanPrice, Plan, Status } from '../models/index.js';

class PlanPriceController {
  static async create(req, res) {
    try {
      const { planId, price, currency } = req.body;

      if (!planId) return res.status(400).json({ error: 'planId es requerido' });
      if (!currency) return res.status(400).json({ error: 'currency es requerido' });

      // Validar que el plan existe
      const plan = await Plan.findByPk(planId);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

      const planPrice = await PlanPrice.create({
        planId,
        price,
        currency,
        statusId: 1
      });

      const result = await PlanPrice.findByPk(planPrice.id, {
        include: [
          { model: Plan, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getByPlan(req, res) {
    try {
      const { planId } = req.params;

      if (!planId) return res.status(400).json({ error: 'planId es requerido' });

      const plan = await Plan.findByPk(planId);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

      const prices = await PlanPrice.findAll({
        where: { planId },
        include: [
          { model: Plan, attributes: ['id', 'name', 'slug'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      res.status(200).json(prices);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req, res) {
    try {
      const prices = await PlanPrice.findAndCountAll({
        include: [
          { model: Plan, attributes: ['id', 'name', 'slug'] },
          { model: Status, attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json(prices);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;

      const planPrice = await PlanPrice.findByPk(id, {
        include: [
          { model: Plan, attributes: ['id', 'name', 'slug'] },
          { model: Status, attributes: ['id', 'name'] }
        ]
      });

      if (!planPrice) return res.status(404).json({ error: 'Precio de plan no encontrado' });

      res.status(200).json(planPrice);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { price, currency } = req.body;

      const planPrice = await PlanPrice.findByPk(id);
      if (!planPrice) return res.status(404).json({ error: 'Precio de plan no encontrado' });

      if (price) planPrice.price = price;
      if (currency) planPrice.currency = currency;

      await planPrice.save();

      const updated = await PlanPrice.findByPk(id, {
        include: [
          { model: Plan, attributes: ['id', 'name', 'slug'] },
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
      const { id } = req.params;
      const { statusId } = req.body;

      if (!statusId) return res.status(400).json({ error: 'statusId es requerido' });

      const planPrice = await PlanPrice.findByPk(id);
      if (!planPrice) return res.status(404).json({ error: 'Precio de plan no encontrado' });

      planPrice.statusId = statusId;
      await planPrice.save();

      const updated = await PlanPrice.findByPk(id, {
        include: [
          { model: Plan, attributes: ['id', 'name', 'slug'] },
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
      const { id } = req.params;

      const planPrice = await PlanPrice.findByPk(id);
      if (!planPrice) return res.status(404).json({ error: 'Precio de plan no encontrado' });

      await planPrice.destroy();
      res.status(200).json({ message: 'Precio de plan eliminado' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default PlanPriceController;
