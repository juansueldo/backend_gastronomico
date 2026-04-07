import { Subscription, Plan, PlanFeatures, PlanPrice, Store, Status } from '../models/index.js';

class SubscriptionController {

    static async create(req, res) {
        try {
            const { planId, billingCycleId } = req.body;
            const storeId = req.user?.storeId;

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
            if (!planId) return res.status(400).json({ error: 'planId es requerido' });

            // Validar que el plan existe
            const plan = await Plan.findByPk(planId, {
                include: [{ model: PlanPrice }, { model: PlanFeatures }]
            });
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

            // Validar que no exista una suscripción activa para esta tienda
            const existingSubscription = await Subscription.findOne({
                where: { storeId, statusId: 1 }
            });

            if (existingSubscription) {
                return res.status(400).json({ error: 'La tienda ya tiene una suscripción activa' });
            }

            // Calcular fechas
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // Por defecto 1 mes
            let payment = 0; // pendiente
            if(plan.isFree) {
                payment = 1; // pagado
            }
            const subscription = await Subscription.create({
                storeId,
                planId,
                billingCycleId,
                startDate,
                endDate,
                payment: payment, // pendiente
                statusId: 1 // activo
            });

            const result = await Subscription.findByPk(subscription.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name'] },
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

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

            const subscriptions = await Subscription.findAndCountAll({
                where: { storeId },
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name', 'price'] },
                    { model: Status, attributes: ['id', 'name'] }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json(subscriptions);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const storeId = req.user?.storeId;
            const { id } = req.params;

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

            const subscription = await Subscription.findByPk(id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name', 'price'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });

            if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' });
            if (subscription.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes acceso a esta suscripción' });
            }

            res.status(200).json(subscription);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const storeId = req.user?.storeId;
            const { id } = req.params;
            const { planId, billingCycleId, endDate } = req.body;

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

            const subscription = await Subscription.findByPk(id);
            if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' });
            if (subscription.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes acceso a esta suscripción' });
            }

            if (planId) {
                const plan = await Plan.findByPk(planId);
                if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
                subscription.planId = planId;
            }

            if (billingCycleId) subscription.billingCycleId = billingCycleId;
            if (endDate) subscription.endDate = new Date(endDate);

            await subscription.save();

            const updated = await Subscription.findByPk(id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name', 'price'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });

            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async updatePaymentStatus(req, res) {
        try {
            const storeId = req.user?.storeId;
            const { id } = req.params;
            const { payment } = req.body;

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
            if (payment === undefined || ![0, 1, 2].includes(payment)) {
                return res.status(400).json({ error: 'payment debe ser: 0 (pendiente), 1 (pagado), 2 (rechazado)' });
            }

            const subscription = await Subscription.findByPk(id);
            if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' });
            if (subscription.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes acceso a esta suscripción' });
            }

            subscription.payment = payment;
            await subscription.save();

            const updated = await Subscription.findByPk(id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name', 'price'] },
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

            const subscription = await Subscription.findByPk(id);
            if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' });
            if (subscription.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes acceso a esta suscripción' });
            }

            subscription.statusId = statusId;
            await subscription.save();

            const updated = await Subscription.findByPk(id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name', 'price'] },
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

            const subscription = await Subscription.findByPk(id);
            if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' });
            if (subscription.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes acceso a esta suscripción' });
            }

            await subscription.destroy();
            res.status(200).json({ message: 'Suscripción eliminada' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default SubscriptionController;