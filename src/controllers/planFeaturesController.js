import { PlanFeatures, Plan, Status } from "../models/index.js";

class PlanFeaturesController {

    static async create(req, res) {
        try {
            const { planId, feature, description, key, value } = req.body;
            if (!planId) return res.status(400).json({ error: 'planId es requerido' });
            if (!feature) return res.status(400).json({ error: 'feature es requerido' });
            if (!key) return res.status(400).json({ error: 'key es requerido' });
            if (!value) return res.status(400).json({ error: 'value es requerido' });

            const plan = await Plan.findByPk(planId);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

            const planFeature = await PlanFeatures.create({ planId, feature, description: description || null, key, value, statusId: 1 });
            const withRel = await PlanFeatures.findByPk(planFeature.id, {
                include: [
                    { model: Plan, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                ]
            });
            res.status(201).json(withRel);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getByPlan(req, res) {
        try {
            const { planId } = req.params;
            const plan = await Plan.findByPk(planId);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

            const features = await PlanFeatures.findAndCountAll({
                where: { planId },
                include: [
                    { model: Plan, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                ]
            });
            res.status(200).json(features);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const feature = await PlanFeatures.findByPk(req.params.id, {
                include: [
                    { model: Plan, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                ]
            });
            if (!feature) return res.status(404).json({ error: 'Característica no encontrada' });
            res.status(200).json(feature);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { feature, description, key, value } = req.body;
            const pf = await PlanFeatures.findByPk(req.params.id);
            if (!pf) return res.status(404).json({ error: 'Característica no encontrada' });
            
            await pf.update({
                ...(feature && { feature }),
                ...(description && { description }),
                ...(key && { key }),
                ...(value && { value }),
            });
            
            const updated = await PlanFeatures.findByPk(req.params.id, {
                include: [
                    { model: Plan, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                ]
            });
            res.json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            const { statusId } = req.body;
            if (!statusId) return res.status(400).json({ error: 'statusId es requerido' });
            
            const pf = await PlanFeatures.findByPk(req.params.id);
            if (!pf) return res.status(404).json({ error: 'Característica no encontrada' });
            
            await pf.update({ statusId });
            const updated = await PlanFeatures.findByPk(req.params.id, {
                include: [
                    { model: Plan, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                ]
            });
            res.json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const pf = await PlanFeatures.findByPk(req.params.id);
            if (!pf) return res.status(404).json({ error: 'Característica no encontrada' });
            await pf.destroy();
            res.json({ message: 'Característica eliminada' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default PlanFeaturesController;