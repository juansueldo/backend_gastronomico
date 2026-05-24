import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Customer from './customer.js';
import Contact from './contact.js';
import MessagingAccount from './messagingAccount.js';

const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  channel: {
    type: DataTypes.ENUM,
    values: ['whatsapp'],
    allowNull: false,
    defaultValue: 'whatsapp',
  },
  externalChatId: { type: DataTypes.STRING, allowNull: false },
  lastMessageAt: { type: DataTypes.DATE, allowNull: true },
  lastMessagePreview: { type: DataTypes.STRING, allowNull: true },
  unreadCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM,
    values: ['open', 'archived', 'blocked'],
    allowNull: false,
    defaultValue: 'open',
  },
});

Conversation.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
Conversation.belongsTo(Customer, { foreignKey: 'customerId', allowNull: true });
Conversation.belongsTo(Contact, { foreignKey: 'contactId', allowNull: true });
Conversation.belongsTo(MessagingAccount, { foreignKey: 'messagingAccountId', allowNull: false });

export default Conversation;
