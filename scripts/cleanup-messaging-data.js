import sequelize from '../src/models/db.js';
import {
  Contact,
  Conversation,
  Customer,
  Instance,
  Message,
  MessagingAccount,
  Notification,
  Order,
} from '../src/models/index.js';
import { Op } from 'sequelize';

const args = new Set(process.argv.slice(2));
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const confirmed = args.has('--confirm');
const includeAccounts = args.has('--include-accounts');
const storeId = getArgValue('--store-id');
const scopedWhere = storeId ? { storeId: Number(storeId) } : {};

if (storeId && (!Number.isInteger(Number(storeId)) || Number(storeId) <= 0)) {
  throw new Error('--store-id debe ser un entero positivo');
}

const messageNotificationWhere = {
  ...scopedWhere,
  [Op.or]: [
    { icon: 'message-icon' },
    { title: { [Op.iLike]: '%WhatsApp%' } },
    { message: { [Op.iLike]: '%WhatsApp%' } },
  ],
};

async function getCleanupTargets() {
  const contacts = await Contact.findAll({ where: scopedWhere, attributes: ['id', 'customerId'] });
  const contactCustomerIds = Array.from(new Set(contacts.map((contact) => contact.customerId).filter(Boolean)));

  const candidateCustomers = await Customer.findAll({
    where: {
      ...scopedWhere,
      statusId: 1,
      [Op.or]: [
        { id: { [Op.in]: contactCustomerIds.length ? contactCustomerIds : [0] } },
        { name: { [Op.iLike]: 'Mesa %' } },
      ],
    },
  });

  const customers = candidateCustomers.filter((customer) => {
    const metadata = customer.metadata || {};
    return contactCustomerIds.includes(customer.id)
      || /^mesa\s+\d+$/i.test(String(customer.name || '').trim())
      || Boolean(metadata.whatsappExternalChatId || metadata.whatsappProfileImageUrl);
  });

  const customerIds = customers.map((customer) => customer.id);
  const ordersByCustomer = customerIds.length
    ? await Order.findAll({
      where: { ...scopedWhere, customerId: { [Op.in]: customerIds } },
      attributes: ['customerId'],
    })
    : [];
  const customerIdsWithOrders = new Set(ordersByCustomer.map((order) => order.customerId));

  return {
    messageCount: await Message.count({ where: scopedWhere }),
    conversationCount: await Conversation.count({ where: scopedWhere }),
    contactCount: await Contact.count({ where: scopedWhere }),
    accountCount: await MessagingAccount.count({ where: scopedWhere }),
    notificationCount: await Notification.count({ where: messageNotificationWhere }),
    customersToDelete: customers.filter((customer) => !customerIdsWithOrders.has(customer.id)),
    customersToDeactivate: customers.filter((customer) => customerIdsWithOrders.has(customer.id)),
  };
}

async function main() {
  await sequelize.authenticate();
  const targets = await getCleanupTargets();

  console.log(JSON.stringify({
    mode: confirmed ? 'confirm' : 'dry-run',
    storeId: storeId ? Number(storeId) : 'all',
    includeAccounts,
    messages: targets.messageCount,
    conversations: targets.conversationCount,
    contacts: targets.contactCount,
    messagingAccounts: includeAccounts ? targets.accountCount : 0,
    messageNotifications: targets.notificationCount,
    customersToDelete: targets.customersToDelete.length,
    customersToDeactivate: targets.customersToDeactivate.length,
  }, null, 2));

  if (!confirmed) {
    console.log('Dry-run solamente. Ejecuta con --confirm para aplicar la limpieza.');
    return;
  }

  await sequelize.transaction(async (transaction) => {
    await Message.destroy({ where: scopedWhere, transaction });
    await Conversation.destroy({ where: scopedWhere, transaction });
    await Contact.destroy({ where: scopedWhere, transaction });
    await Notification.destroy({ where: messageNotificationWhere, transaction });

    const deleteIds = targets.customersToDelete.map((customer) => customer.id);
    if (deleteIds.length > 0) {
      await Customer.destroy({ where: { id: { [Op.in]: deleteIds }, ...scopedWhere }, transaction });
    }

    const deactivateIds = targets.customersToDeactivate.map((customer) => customer.id);
    if (deactivateIds.length > 0) {
      await Promise.all(targets.customersToDeactivate.map((customer) => customer.update({
        statusId: 2,
        metadata: {
          ...(customer.metadata || {}),
          cleanupReason: 'messaging-reset',
        },
      }, { transaction })));
    }

    const accounts = await MessagingAccount.findAll({ where: scopedWhere, transaction });
    const instanceIds = accounts.map((account) => account.instanceId).filter(Boolean);

    if (includeAccounts) {
      await MessagingAccount.destroy({ where: scopedWhere, transaction });
    } else {
      await MessagingAccount.update(
        { status: 'disconnected', qrCode: null, metadata: null },
        { where: scopedWhere, transaction },
      );
    }

    if (instanceIds.length > 0) {
      await Instance.update(
        { connection: 0 },
        { where: { id: { [Op.in]: instanceIds }, ...scopedWhere }, transaction },
      );
    }
  });

  console.log('Limpieza de mensajería aplicada.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
