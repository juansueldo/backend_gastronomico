import { BillingCycle, Plan, PlanFeatures, PlanPrice } from '../models/index.js';

const ACTIVE_STATUS_ID = 1;
const DEFAULT_CURRENCY = 'ARS';

function resolvePlanPrice(plan) {
  if (plan.isFree) {
    return { amount: 0, currency: DEFAULT_CURRENCY };
  }

  const prices = plan.PlanPrices || [];
  const selectedPrice = prices.find((price) =>
    String(price.currency || '').toUpperCase() === DEFAULT_CURRENCY
  ) || prices[0] || null;

  if (!selectedPrice) return null;

  return {
    amount: Number(selectedPrice.price),
    currency: selectedPrice.currency || DEFAULT_CURRENCY,
  };
}

function mapPlan(plan) {
  const price = resolvePlanPrice(plan);
  const billingCycle = plan.BillingCycle
    ? {
        id: plan.BillingCycle.id,
        name: plan.BillingCycle.name,
        durationInDays: plan.BillingCycle.durationInDays,
      }
    : null;

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    isFree: Boolean(plan.isFree),
    billingCycle,
    price,
    features: (plan.PlanFeatures || []).map((feature) => feature.feature),
  };
}

class LandingController {
  static async pricing(req, res) {
    try {
      const plans = await Plan.findAll({
        where: { statusId: ACTIVE_STATUS_ID },
        include: [
          {
            model: BillingCycle,
            attributes: ['id', 'name', 'durationInDays'],
            required: false,
          },
          {
            model: PlanPrice,
            where: { statusId: ACTIVE_STATUS_ID },
            required: false,
          },
          {
            model: PlanFeatures,
            where: { statusId: ACTIVE_STATUS_ID },
            required: false,
          },
        ],
        order: [
          ['id', 'ASC'],
          [PlanPrice, 'id', 'ASC'],
          [PlanFeatures, 'id', 'ASC'],
        ],
      });

      res.status(200).json({ plans: plans.map(mapPlan) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default LandingController;
