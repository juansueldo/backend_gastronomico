
import { DataTypes } from 'sequelize';
import sequelize from './db.js';

import Status from './status.js';
import Customer from './customer.js';
import Headquarter from './headquarter.js';
import Contact from './contact.js';
import User from './user.js';
import Network from './network.js';
import Instance from './instance.js';
import Store from './store.js';
import Plan from './plan.js';
import PlanPrice from './planPrice.js';
import PlanFeatures from './planFeatures.js';
import Subscription from './subscription.js';
import BillingCycle from './billingCycle.js';
import Role from './role.js';
import Category from './category.js';
import Product from './product.js';
import Order from './order.js';
import OrderItem from './orderItem.js';
import InventoryItem from './inventoryItem.js';
import Recipe from './recipe.js';
import RecipeItem from './recipeItem.js';
import ProductIngredientOption from './productIngredientOption.js';
import OrderItemModifier from './orderItemModifier.js';
import DeliveryZone from './deliveryZone.js';
import StockMovement from './stockMovement.js';
import Table from './table.js';
import Waiter from './waiter.js';
import CashRegisterMovement from './cashRegisterMovement.js';
import Notification from './notification.js';
import HeadquarterSchedule from './headquarterSchedule.js';
import MessagingAccount from './messagingAccount.js';
import Conversation from './conversation.js';
import Message from './message.js';

export {
  Status,
  Customer,
  Contact,
  User,
  Network,
  Instance,
  Store,
  Plan,
  PlanPrice,
  PlanFeatures,
  Subscription,
  BillingCycle,
  Role,
  Category,
  Product,
  Order,
  OrderItem,
  InventoryItem,
  Recipe,
  RecipeItem,
  ProductIngredientOption,
  OrderItemModifier,
  DeliveryZone,
  StockMovement,
  Table,
  Waiter,
  Headquarter,
  CashRegisterMovement,
  Notification,
  HeadquarterSchedule,
  MessagingAccount,
  Conversation,
  Message,
  sequelize
};

// Definir relaciones para evitar dependencias circulares
Product.hasMany(InventoryItem, { foreignKey: 'productId' });
InventoryItem.belongsTo(Product, { foreignKey: 'productId' });

Product.hasOne(Recipe, { foreignKey: 'productId' });
Recipe.hasMany(RecipeItem, { foreignKey: 'recipeId' });
InventoryItem.hasMany(RecipeItem, { foreignKey: 'inventoryItemId' });
Product.hasMany(ProductIngredientOption, { foreignKey: 'productId' });
ProductIngredientOption.belongsTo(Product, { foreignKey: 'productId' });
InventoryItem.hasMany(ProductIngredientOption, { foreignKey: 'inventoryItemId' });
ProductIngredientOption.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });

// Relaciones Plan - PlanPrice - PlanFeatures
Plan.hasMany(PlanPrice, { foreignKey: 'planId' });
PlanPrice.belongsTo(Plan, { foreignKey: 'planId' });

Plan.hasMany(PlanFeatures, { foreignKey: 'planId' });
PlanFeatures.belongsTo(Plan, { foreignKey: 'planId' });

// Relaciones Table - Waiter - Order
Waiter.hasMany(Table, { foreignKey: 'waiterId', allowNull: true });
Table.belongsTo(Waiter, { foreignKey: 'waiterId', allowNull: true });

Order.belongsTo(Table, { foreignKey: 'tableId', allowNull: true });
Table.hasMany(Order, { foreignKey: 'tableId' });

Order.belongsTo(Waiter, { foreignKey: 'waiterId', allowNull: true });
Waiter.hasMany(Order, { foreignKey: 'waiterId' });

Order.hasMany(OrderItem, {foreignKey: 'orderId'});

OrderItem.belongsTo(Order, {foreignKey: 'orderId'});
OrderItem.hasMany(OrderItemModifier, { foreignKey: 'orderItemId' });
OrderItemModifier.belongsTo(OrderItem, { foreignKey: 'orderItemId' });
OrderItemModifier.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });
OrderItemModifier.belongsTo(ProductIngredientOption, { foreignKey: 'productIngredientOptionId' });

MessagingAccount.hasMany(Conversation, { foreignKey: 'messagingAccountId' });
Conversation.belongsTo(MessagingAccount, { foreignKey: 'messagingAccountId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

MessagingAccount.hasMany(Message, { foreignKey: 'messagingAccountId' });
Message.belongsTo(MessagingAccount, { foreignKey: 'messagingAccountId' });

Customer.hasMany(Conversation, { foreignKey: 'customerId' });
Contact.hasMany(Conversation, { foreignKey: 'contactId' });

async function ensureSystemStatuses() {
  await Status.findOrCreate({ where: { id: 1 }, defaults: { name: 'Activo' } });
  await Status.findOrCreate({ where: { id: 2 }, defaults: { name: 'Inactivo' } });

  if (sequelize.getDialect() === 'postgres') {
    await sequelize.query(`
      SELECT setval(
        pg_get_serial_sequence('"Statuses"', 'id'),
        COALESCE((SELECT MAX(id) FROM "Statuses"), 1),
        true
      )
    `);
  }
}

async function ensureStoreSalesChannelColumns() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const tableDescription = await queryInterface.describeTable('Stores');

    if (!tableDescription.offers_delivery) {
      await queryInterface.addColumn('Stores', 'offers_delivery', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!tableDescription.offers_pickup) {
      await queryInterface.addColumn('Stores', 'offers_pickup', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!message.includes('No description found') && !message.includes('does not exist')) {
      throw error;
    }
  }
}

// Sincroniza todos los modelos
export async function syncModels() {
  await ensureStoreSalesChannelColumns();
  await sequelize.sync({ alter: true });
  await ensureStoreSalesChannelColumns();
  await ensureSystemStatuses();
}
