import { BillingCycle, Status } from "../models/index.js";

class BillingCycleController {
    static async create(req, res) {
        try {
            const { name, description, durationInDays } = req.body;
            if (!name) return res.status(400).json({ error: 'name es requerido' });
            if (!durationInDays || durationInDays <= 0) {
                return res.status(400).json({ error: 'durationInDays es requerido y debe ser > 0' });
            }

            const billingCycle = await BillingCycle.create({ name, description: description || null, durationInDays, statusId: 1 });
            res.status(201).json(billingCycle);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const cycles = await BillingCycle.findAndCountAll({
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            res.status(200).json(cycles);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const cycle = await BillingCycle.findByPk(req.params.id, {
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            if (!cycle) return res.status(404).json({ error: 'Ciclo de facturación no encontrado' });
            res.status(200).json(cycle);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { name, description, durationInDays } = req.body;
            const cycle = await BillingCycle.findByPk(req.params.id);
            if (!cycle) return res.status(404).json({ error: 'Ciclo de facturación no encontrado' });
            
            await cycle.update({
                ...(name && { name }),
                ...(description && { description }),
                ...(durationInDays && durationInDays > 0 && { durationInDays }),
            });
            
            const updated = await BillingCycle.findByPk(req.params.id, {
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const cycle = await BillingCycle.findByPk(req.params.id);
            if (!cycle) return res.status(404).json({ error: 'Ciclo de facturación no encontrado' });
            await cycle.destroy();
            res.status(200).json({ message: 'Ciclo eliminado' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default BillingCycleController;