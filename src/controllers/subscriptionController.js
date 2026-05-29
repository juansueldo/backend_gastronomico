import { Subscription, Plan, PlanFeatures, PlanPrice, Store, Status, BillingCycle, User } from '../models/index.js';
import NotificationService from '../services/notificationService.js';
import MercadoPagoSubscriptionService from '../services/mercadoPagoSubscriptionService.js';

const PAYMENT_PENDING = 0;
const PAYMENT_PAID = 1;
const PAYMENT_REJECTED = 2;
const STATUS_ACTIVE = 1;
const STATUS_INACTIVE = 2;

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function getSubscriptionPaymentState(providerStatus) {
    const status = String(providerStatus || '').toLowerCase();
    if (['authorized', 'active', 'approved'].includes(status)) {
        return { payment: PAYMENT_PAID, statusId: STATUS_ACTIVE };
    }
    if (['pending', 'in_process'].includes(status)) {
        return { payment: PAYMENT_PENDING, statusId: STATUS_INACTIVE };
    }
    if (['paused', 'cancelled', 'canceled', 'rejected'].includes(status)) {
        return { payment: PAYMENT_REJECTED, statusId: STATUS_INACTIVE };
    }
    return { payment: PAYMENT_PENDING, statusId: STATUS_INACTIVE };
}

class SubscriptionController {
    static async loadPlan(planId) {
        return Plan.findByPk(planId, {
            include: [
                { model: PlanPrice, where: { statusId: STATUS_ACTIVE }, required: false },
                { model: PlanFeatures, required: false },
                { model: BillingCycle, required: false },
            ]
        });
    }

    static resolvePlanPrice(plan) {
        const prices = plan.PlanPrices || [];
        const price = prices.find((item) => String(item.currency || '').toUpperCase() === 'ARS') || prices[0];
        if (!price) throw new Error('El plan no tiene precio configurado');
        return price;
    }

    static resolveBillingCycle(plan, billingCycleId) {
        if (billingCycleId && Number(billingCycleId) !== Number(plan.billingCycleId)) {
            return BillingCycle.findByPk(billingCycleId);
        }
        if (plan.BillingCycle) return plan.BillingCycle;
        return plan.billingCycleId ? BillingCycle.findByPk(plan.billingCycleId) : null;
    }

    static async findCurrentUsableSubscription(storeId) {
        return Subscription.findOne({
            where: { storeId, statusId: STATUS_ACTIVE, payment: PAYMENT_PAID },
            order: [['createdAt', 'DESC']]
        });
    }

    static async findReusablePendingSubscription(storeId, planId) {
        return Subscription.findOne({
            where: {
                storeId,
                planId,
                provider: 'mercadopago',
                payment: PAYMENT_PENDING,
            },
            order: [['createdAt', 'DESC']]
        });
    }

    static async getStorePayerEmail(storeId, fallbackEmail = null) {
        if (fallbackEmail) return fallbackEmail;
        const user = await User.findOne({ where: { storeId }, order: [['id', 'ASC']] });
        return user?.email || null;
    }

    static async createMercadoPagoPreapprovalForStore({ storeId, planId, billingCycleId, payerEmail }) {
        if (!storeId) throw new Error('storeId requerido en token');
        if (!planId) throw new Error('planId es requerido');

        const plan = await this.loadPlan(planId);
        if (!plan) throw new Error('Plan no encontrado');

        if (plan.isFree) {
            return { subscription: await this.createFreeSubscription({ storeId, plan, billingCycleId }), initPoint: null };
        }

        const usableSubscription = await this.findCurrentUsableSubscription(storeId);
        if (usableSubscription) throw new Error('La tienda ya tiene una suscripción activa');

        const reusablePending = await this.findReusablePendingSubscription(storeId, planId);
        if (reusablePending?.initPoint) {
            return { subscription: reusablePending, initPoint: reusablePending.initPoint };
        }

        const price = this.resolvePlanPrice(plan);
        const billingCycle = await this.resolveBillingCycle(plan, billingCycleId);
        if (!billingCycle) throw new Error('El plan no tiene ciclo de facturación configurado');

        const startDate = new Date();
        const endDate = addDays(startDate, billingCycle.durationInDays || 30);
        const subscription = await Subscription.create({
            storeId,
            planId,
            billingCycleId: billingCycle.id,
            startDate,
            endDate,
            payment: PAYMENT_PENDING,
            statusId: STATUS_INACTIVE,
            provider: 'mercadopago',
            providerStatus: 'pending',
            payerEmail: await this.getStorePayerEmail(storeId, payerEmail),
        });

        const frequency = Math.max(Number(billingCycle.durationInDays) || 30, 1);
        const preapproval = await MercadoPagoSubscriptionService.createPreapproval({
            reason: plan.name,
            external_reference: String(subscription.id),
            back_url: MercadoPagoSubscriptionService.buildBackUrl(subscription.id),
            payer_email: subscription.payerEmail || undefined,
            auto_recurring: {
                frequency,
                frequency_type: 'days',
                transaction_amount: Number(price.price),
                currency_id: price.currency || 'ARS',
            },
        });

        await subscription.update({
            providerSubscriptionId: preapproval.id || null,
            providerStatus: preapproval.status || 'pending',
            initPoint: preapproval.init_point || preapproval.sandbox_init_point || null,
            metadata: preapproval,
        });

        return { subscription, initPoint: subscription.initPoint };
    }

    static async createFreeSubscription({ storeId, plan, billingCycleId }) {
        const existingSubscription = await this.findCurrentUsableSubscription(storeId);
        if (existingSubscription) throw new Error('La tienda ya tiene una suscripción activa');

        const billingCycle = await this.resolveBillingCycle(plan, billingCycleId);
        const startDate = new Date();
        const endDate = addDays(startDate, billingCycle?.durationInDays || 30);
        return Subscription.create({
            storeId,
            planId: plan.id,
            billingCycleId: billingCycle?.id || billingCycleId || plan.billingCycleId,
            startDate,
            endDate,
            payment: PAYMENT_PAID,
            statusId: STATUS_ACTIVE,
        });
    }

    static async create(req, res) {
        try {
            const { planId, billingCycleId } = req.body;
            const storeId = req.user?.storeId;

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });
            if (!planId) return res.status(400).json({ error: 'planId es requerido' });

            const plan = await SubscriptionController.loadPlan(planId);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

            const created = plan.isFree
                ? { subscription: await SubscriptionController.createFreeSubscription({ storeId, plan, billingCycleId }), initPoint: null }
                : await SubscriptionController.createMercadoPagoPreapprovalForStore({ storeId, planId, billingCycleId });

            const result = await Subscription.findByPk(created.subscription.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Plan, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });

            res.status(201).json(created.initPoint ? { subscription: result, initPoint: created.initPoint } : result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async createMercadoPagoPreapproval(req, res) {
        try {
            const storeId = req.user?.storeId;
            const { planId, billingCycleId, payerEmail } = req.body;
            const result = await SubscriptionController.createMercadoPagoPreapprovalForStore({
                storeId,
                planId,
                billingCycleId,
                payerEmail,
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
                    { model: Plan, attributes: ['id', 'name', 'description', 'isFree', 'billingCycleId'] },
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

    static async cancel(req, res) {
        try {
            const storeId = req.user?.storeId;
            const { id } = req.params;

            if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

            const subscription = await Subscription.findByPk(id);
            if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' });
            if (subscription.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes acceso a esta suscripción' });
            }

            if (subscription.provider === 'mercadopago' && subscription.providerSubscriptionId) {
                await MercadoPagoSubscriptionService.updatePreapproval(subscription.providerSubscriptionId, { status: 'cancelled' });
            }

            await subscription.update({
                payment: PAYMENT_REJECTED,
                statusId: STATUS_INACTIVE,
                providerStatus: 'cancelled',
                cancelledAt: new Date(),
            });

            NotificationService.notifySubscriptionUpdated(storeId, subscription);
            res.status(200).json({ ok: true, subscription });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async mercadoPagoWebhook(req, res) {
        try {
            if (!MercadoPagoSubscriptionService.verifyWebhookSignature(req)) {
                return res.status(401).json({ error: 'Firma inválida' });
            }

            const eventType = req.body?.type || req.body?.topic || req.query?.type || req.query?.topic;
            const dataId = req.body?.data?.id || req.body?.id || req.query?.['data.id'] || req.query?.id;
            if (!dataId) return res.status(200).json({ ok: true, ignored: 'missing_data_id' });

            let preapproval = null;
            let lastPaymentId = null;

            if (eventType === 'subscription_authorized_payment') {
                const authorizedPayment = await MercadoPagoSubscriptionService.getAuthorizedPayment(dataId);
                lastPaymentId = String(authorizedPayment.id || dataId);
                const preapprovalId = authorizedPayment.preapproval_id || authorizedPayment.preapprovalId;
                if (preapprovalId) {
                    preapproval = await MercadoPagoSubscriptionService.getPreapproval(preapprovalId);
                }
            } else {
                preapproval = await MercadoPagoSubscriptionService.getPreapproval(dataId);
            }

            if (!preapproval) return res.status(200).json({ ok: true, ignored: 'unsupported_event' });

            const subscription = await Subscription.findOne({
                where: {
                    provider: 'mercadopago',
                    providerSubscriptionId: preapproval.id,
                },
            }) || await Subscription.findByPk(Number(preapproval.external_reference));

            if (!subscription) return res.status(200).json({ ok: true, ignored: 'subscription_not_found' });

            const nextState = getSubscriptionPaymentState(preapproval.status);
            await subscription.update({
                ...nextState,
                providerStatus: preapproval.status || subscription.providerStatus,
                providerSubscriptionId: preapproval.id || subscription.providerSubscriptionId,
                lastPaymentId: lastPaymentId || subscription.lastPaymentId,
                lastWebhookAt: new Date(),
                cancelledAt: ['cancelled', 'canceled'].includes(String(preapproval.status || '').toLowerCase())
                    ? new Date()
                    : subscription.cancelledAt,
                metadata: {
                    ...(subscription.metadata || {}),
                    lastWebhook: req.body,
                    preapproval,
                },
            });

            NotificationService.notifySubscriptionUpdated(subscription.storeId, subscription);
            res.status(200).json({ ok: true });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default SubscriptionController;
