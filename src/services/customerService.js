import { Customer } from '../models/index.js';

export function normalizeCustomerPhone(phone) {
  const normalized = String(phone ?? '').trim();
  return normalized || null;
}

export function normalizeCustomerName(name) {
  const normalized = String(name ?? '').trim();
  return normalized || null;
}

export default class CustomerService {
  static async findOrCreateByPhone({ storeId, name, phone, email, metadata, statusId = 1, transaction }) {
    const normalizedPhone = normalizeCustomerPhone(phone);
    const normalizedName = normalizeCustomerName(name);

    if (!storeId) throw new Error('storeId es requerido');
    if (!normalizedPhone) throw new Error('phone es requerido');
    if (!normalizedName) throw new Error('name es requerido');

    const customer = await Customer.findOne({
      where: { storeId, phone: normalizedPhone },
      transaction,
    });

    if (!customer) {
      return Customer.create({
        name: normalizedName,
        phone: normalizedPhone,
        email,
        metadata,
        storeId,
        statusId,
      }, { transaction });
    }

    const updates = {};
    if (customer.name !== normalizedName) updates.name = normalizedName;
    if (email !== undefined && customer.email !== email) updates.email = email;
    if (metadata !== undefined) updates.metadata = metadata;
    if (customer.statusId !== statusId && statusId !== undefined) updates.statusId = statusId;

    if (Object.keys(updates).length > 0) {
      await customer.update(updates, { transaction });
    }

    return customer;
  }
}
