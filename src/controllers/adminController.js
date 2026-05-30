import bcrypt from 'bcrypt';
import {
  Admin,
  Addon,
  AddonPrice,
  BillingCycle,
  Plan,
  PlanPrice,
  Role,
  Status,
  Store,
  Subscription,
  User,
  Headquarter,
  sequelize,
} from '../models/index.js';
import { generateAdminToken } from '../middleware/token.js';

const ACTIVE_STATUS_ID = 1;
const PAID_PAYMENT = 1;

function serializeAdmin(admin) {
  return {
    id: admin.id,
    firstname: admin.firstname,
    lastname: admin.lastname,
    email: admin.email,
    role: admin.role,
    statusId: admin.statusId,
    createdAt: admin.createdAt,
  };
}

class AdminController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contrasena son requeridos' });
      }

      const admin = await Admin.findOne({ where: { email } });
      if (!admin || admin.statusId !== ACTIVE_STATUS_ID) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }

      const token = await generateAdminToken(admin);
      return res.json({ admin: serializeAdmin(admin), token });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async me(req, res) {
    try {
      const admin = await Admin.findByPk(req.admin.id);
      if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });
      return res.json({ admin: serializeAdmin(admin) });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { firstname, lastname, email, password, role = 'admin' } = req.body;

      if (!firstname || !lastname || !email || !password) {
        return res.status(400).json({ error: 'firstname, lastname, email y password son requeridos' });
      }

      const existing = await Admin.findOne({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Ya existe un administrador con ese email' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await Admin.create({
        firstname,
        lastname,
        email,
        password: hashedPassword,
        role,
        statusId: ACTIVE_STATUS_ID,
      });

      return res.status(201).json({ admin: serializeAdmin(admin) });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      const { firstname, lastname, email, password, role, statusId } = req.body;
      const admin = await Admin.findByPk(id);
      if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });

      const updates = {
        ...(firstname && { firstname }),
        ...(lastname && { lastname }),
        ...(email && { email }),
        ...(role && { role }),
        ...(statusId && { statusId }),
      };
      if (password) updates.password = await bcrypt.hash(password, 10);

      await admin.update(updates);
      return res.json({ admin: serializeAdmin(admin) });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async deleteAdmin(req, res) {
    try {
      const { id } = req.params;
      if (Number(id) === Number(req.admin.id)) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio administrador' });
      }
      const admin = await Admin.findByPk(id);
      if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });
      await admin.destroy();
      return res.json({ ok: true });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async createAccount(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        storename,
        slug,
        timezone = 'America/Argentina/Buenos_Aires',
        location = '',
        firstname,
        lastname,
        username,
        email,
        password,
        roleId = 1,
        planId,
        billingCycleId,
      } = req.body;

      if (!storename || !slug || !firstname || !lastname || !username || !email || !password) {
        throw new Error('storename, slug, firstname, lastname, username, email y password son requeridos');
      }

      const existingStore = await Store.findOne({ where: { slug }, transaction });
      if (existingStore) throw new Error('Ya existe una cuenta con ese slug');

      const existingUser = await User.findOne({ where: { email }, transaction });
      if (existingUser) throw new Error('Ya existe un usuario con ese email');

      const existingUsername = await User.findOne({ where: { username }, transaction });
      if (existingUsername) throw new Error('Ya existe un usuario con ese username');

      const store = await Store.create({ name: storename, slug, timezone, location, statusId: ACTIVE_STATUS_ID }, { transaction });
      const headquarter = await Headquarter.create({
        name: 'Central',
        phone: '',
        location,
        storeId: store.id,
        statusId: ACTIVE_STATUS_ID,
      }, { transaction });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        firstname,
        lastname,
        username,
        email,
        password: hashedPassword,
        storeId: store.id,
        headquarterId: headquarter.id,
        roleId,
        statusId: ACTIVE_STATUS_ID,
      }, { transaction });

      let subscription = null;
      if (planId) {
        const plan = await Plan.findByPk(planId, { transaction });
        if (!plan) throw new Error('Plan no encontrado');

        const cycleId = billingCycleId || plan.billingCycleId;
        const cycle = cycleId ? await BillingCycle.findByPk(cycleId, { transaction }) : null;
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (cycle?.durationInDays || 30));

        subscription = await Subscription.create({
          storeId: store.id,
          planId,
          billingCycleId: cycle?.id || cycleId || null,
          startDate,
          endDate,
          payment: PAID_PAYMENT,
          statusId: ACTIVE_STATUS_ID,
          provider: 'admin',
          providerStatus: 'active',
        }, { transaction });
      }

      await transaction.commit();
      return res.status(201).json({ store, user, subscription });
    } catch (err) {
      await transaction.rollback();
      return res.status(400).json({ error: err.message });
    }
  }

  static async assignPlan(req, res) {
    try {
      const { storeId, planId, billingCycleId, payment = PAID_PAYMENT, statusId = ACTIVE_STATUS_ID } = req.body;
      if (!storeId || !planId) return res.status(400).json({ error: 'storeId y planId son requeridos' });

      const [store, plan] = await Promise.all([Store.findByPk(storeId), Plan.findByPk(planId)]);
      if (!store) return res.status(404).json({ error: 'Cuenta no encontrada' });
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

      const cycleId = billingCycleId || plan.billingCycleId;
      const cycle = cycleId ? await BillingCycle.findByPk(cycleId) : null;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (cycle?.durationInDays || 30));

      const subscription = await Subscription.create({
        storeId,
        planId,
        billingCycleId: cycle?.id || cycleId || null,
        startDate,
        endDate,
        payment,
        statusId,
        provider: 'admin',
        providerStatus: payment === PAID_PAYMENT ? 'active' : 'pending',
      });

      const result = await Subscription.findByPk(subscription.id, {
        include: [
          { model: Store, attributes: ['id', 'name', 'slug'] },
          { model: Plan, attributes: ['id', 'name', 'description'] },
          { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
        ],
      });

      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async updateAccount(req, res) {
    try {
      const { id } = req.params;
      const { name, slug, timezone, location, statusId } = req.body;
      const store = await Store.findByPk(id);
      if (!store) return res.status(404).json({ error: 'Cuenta no encontrada' });
      await store.update({
        ...(name && { name }),
        ...(slug && { slug }),
        ...(timezone && { timezone }),
        ...(location !== undefined && { location }),
        ...(statusId && { statusId }),
      });
      return res.json(store);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async list(req, res) {
    try {
      const admins = await Admin.findAll({ order: [['createdAt', 'DESC']] });
      return res.json({ count: admins.length, rows: admins.map(serializeAdmin) });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async dashboard(req, res) {
    try {
      const [users, stores, plans, activeSubscriptions, subscriptions, activeSubscriptionsWithPlans] = await Promise.all([
        User.count(),
        Store.count(),
        Plan.count({ where: { statusId: ACTIVE_STATUS_ID } }),
        Subscription.count({ where: { statusId: ACTIVE_STATUS_ID, payment: PAID_PAYMENT } }),
        Subscription.findAll({
          include: [
            { model: Store, attributes: ['id', 'name'] },
            { model: Plan, attributes: ['id', 'name'] },
            { model: BillingCycle, attributes: ['id', 'name'] },
          ],
          order: [['createdAt', 'DESC']],
          limit: 8,
        }),
        Subscription.findAll({
          where: { statusId: ACTIVE_STATUS_ID, payment: PAID_PAYMENT },
          include: [
            {
              model: Plan,
              attributes: ['id', 'name'],
              include: [{ model: PlanPrice, where: { statusId: ACTIVE_STATUS_ID }, required: false }],
            },
          ],
        }),
      ]);

      const mrr = activeSubscriptionsWithPlans.reduce((total, subscription) => {
        const prices = subscription.Plan?.PlanPrices || [];
        const price = prices.find((item) => String(item.currency || '').toUpperCase() === 'ARS') || prices[0];
        return total + Number(price?.price || 0);
      }, 0);

      return res.json({
        metrics: {
          users,
          stores,
          activePlans: plans,
          activeSubscriptions,
          mrr,
          conversion: stores ? Number(((activeSubscriptions / stores) * 100).toFixed(1)) : 0,
        },
        subscriptions,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async subscriptions(req, res) {
    try {
      const subscriptions = await Subscription.findAndCountAll({
        include: [
          { model: Store, attributes: ['id', 'name', 'slug'] },
          { model: Plan, attributes: ['id', 'name', 'description'] },
          { model: BillingCycle, attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json(subscriptions);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async accounts(req, res) {
    try {
      const accounts = await Store.findAndCountAll({
        include: [
          { model: Status, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstname', 'lastname', 'email', 'roleId'], required: false },
          {
            model: Subscription,
            required: false,
            include: [
              { model: Plan, attributes: ['id', 'name'] },
              { model: BillingCycle, attributes: ['id', 'name', 'durationInDays'] },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json(accounts);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async users(req, res) {
    try {
      const users = await User.findAndCountAll({
        attributes: ['id', 'firstname', 'lastname', 'email', 'username', 'storeId', 'roleId', 'statusId', 'createdAt'],
        include: [
          { model: Store, attributes: ['id', 'name', 'slug'], required: false },
          { model: Status, attributes: ['id', 'name'], required: false },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json(users);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstname, lastname, email, username, roleId, statusId, password } = req.body;
      const user = await User.findByPk(id);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const updates = {
        ...(firstname && { firstname }),
        ...(lastname && { lastname }),
        ...(email && { email }),
        ...(username && { username }),
        ...(roleId && { roleId }),
        ...(statusId && { statusId }),
      };
      if (password) updates.password = await bcrypt.hash(password, 10);

      await user.update(updates);
      const result = await User.findByPk(id, {
        attributes: ['id', 'firstname', 'lastname', 'email', 'username', 'storeId', 'roleId', 'statusId', 'createdAt'],
        include: [
          { model: Store, attributes: ['id', 'name', 'slug'], required: false },
          { model: Status, attributes: ['id', 'name'], required: false },
        ],
      });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async roles(req, res) {
    try {
      const roles = await Role.findAndCountAll({
        include: [{ model: Status, attributes: ['id', 'name'] }],
        order: [['id', 'ASC']],
      });
      return res.json(roles);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async createRole(req, res) {
    try {
      const { name, statusId = ACTIVE_STATUS_ID } = req.body;
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      const role = await Role.create({ name, statusId });
      return res.status(201).json(role);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async statuses(req, res) {
    try {
      const statuses = await Status.findAndCountAll({ order: [['id', 'ASC']] });
      return res.json(statuses);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async createStatus(req, res) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      const status = await Status.create({ name });
      return res.status(201).json(status);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async billingCycles(req, res) {
    try {
      const cycles = await BillingCycle.findAndCountAll({
        include: [{ model: Status, attributes: ['id', 'name'] }],
        order: [['durationInDays', 'ASC']],
      });

      return res.json(cycles);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async addons(req, res) {
    try {
      const addons = await Addon.findAndCountAll({
        include: [
          { model: Plan, attributes: ['id', 'name'], required: false },
          { model: BillingCycle, attributes: ['id', 'name'], required: false },
          { model: Status, attributes: ['id', 'name'], required: false },
          { model: AddonPrice, required: false },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json(addons);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async createAddon(req, res) {
    try {
      const { feature, description, key, value, planId, billingCycleId, price, currency = 'ARS' } = req.body;
      if (!feature || !key || !value) {
        return res.status(400).json({ error: 'feature, key y value son requeridos' });
      }

      const addon = await Addon.create({
        feature,
        description: description || null,
        key,
        value,
        planId: planId || null,
        billingCycleId: billingCycleId || null,
        statusId: ACTIVE_STATUS_ID,
      });

      if (price !== undefined && price !== null && price !== '') {
        await AddonPrice.create({
          addonId: addon.id,
          price,
          currency,
          statusId: ACTIVE_STATUS_ID,
        });
      }

      const result = await Addon.findByPk(addon.id, {
        include: [
          { model: Plan, attributes: ['id', 'name'], required: false },
          { model: BillingCycle, attributes: ['id', 'name'], required: false },
          { model: AddonPrice, required: false },
        ],
      });

      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export default AdminController;
