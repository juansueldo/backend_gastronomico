import { Plan, PlanPrice, PlanFeatures, Status, BillingCycle } from '../models/index.js';

class PlanController {

    static async create(req, res) {
        try {
            const { name, description, isFree, billingCycleId } = req.body;
            if (!name) return res.status(400).json({ error: 'name es requerido' });
            if (!billingCycleId) return res.status(400).json({ error: 'billingCycleId es requerido' });
            
            const plan = await Plan.create({ 
                name, 
                description: description || null, 
                isFree: isFree || false,
                billingCycleId,
                statusId: 1 
            });
            
            const planWithRel = await Plan.findByPk(plan.id, {
                include: [
                    { model: Status, attributes: ['id', 'name'] },
                    { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
                ]
            });
            res.status(201).json(planWithRel);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const plans = await Plan.findAndCountAll({ 
                include: [
                    { model: Status, attributes: ['id', 'name'] },
                    { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
                    PlanPrice, 
                    PlanFeatures
                ] 
            });
            res.json(plans);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const plan = await Plan.findByPk(req.params.id, { 
                include: [
                    { model: Status, attributes: ['id', 'name'] },
                    { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
                    PlanPrice, 
                    PlanFeatures
                ] 
            });
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
            res.json(plan);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { name, description, isFree, billingCycleId } = req.body;
            const plan = await Plan.findByPk(req.params.id);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
            
            await plan.update({
                ...(name && { name }),
                ...(description && { description }),
                ...(isFree !== undefined && { isFree }),
                ...(billingCycleId && { billingCycleId }),
            });
            
            const updated = await Plan.findByPk(req.params.id, {
                include: [
                    { model: Status, attributes: ['id', 'name'] },
                    { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
                ]
            });
            res.json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const plan = await Plan.findByPk(req.params.id);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
            await plan.destroy();
            res.json({ message: 'Plan eliminado' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            const { statusId } = req.body;
            if (!statusId) return res.status(400).json({ error: 'statusId es requerido' });

            const plan = await Plan.findByPk(req.params.id);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

            await plan.update({ statusId });

            const updated = await Plan.findByPk(req.params.id, {
                include: [
                    { model: Status, attributes: ['id', 'name'] },
                    { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
                ]
            });
            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default PlanController;
