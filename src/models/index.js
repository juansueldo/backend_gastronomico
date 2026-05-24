
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

MessagingAccount.hasMany(Conversation, { foreignKey: 'messagingAccountId' });
Conversation.belongsTo(MessagingAccount, { foreignKey: 'messagingAccountId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

MessagingAccount.hasMany(Message, { foreignKey: 'messagingAccountId' });
Message.belongsTo(MessagingAccount, { foreignKey: 'messagingAccountId' });

Customer.hasMany(Conversation, { foreignKey: 'customerId' });
Contact.hasMany(Conversation, { foreignKey: 'contactId' });
// Sincroniza todos los modelos
export async function syncModels() {
  await sequelize.sync({ alter: true });
}
