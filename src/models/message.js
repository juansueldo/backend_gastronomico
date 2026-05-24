import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Conversation from './conversation.js';
import MessagingAccount from './messagingAccount.js';

const Message = sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  provider: {
    type: DataTypes.ENUM,
    values: ['whatsapp_web', 'whatsapp_cloud'],
    allowNull: false,
    defaultValue: 'whatsapp_web',
  },
  providerMessageId: { type: DataTypes.STRING, allowNull: true },
  direction: {
    type: DataTypes.ENUM,
    values: ['inbound', 'outbound'],
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM,
    values: ['text', 'image', 'audio', 'video', 'document', 'location', 'unknown'],
    allowNull: false,
    defaultValue: 'text',
  },
  body: { type: DataTypes.TEXT, allowNull: true },
  mediaUrl: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM,
    values: ['pending', 'sent', 'delivered', 'read', 'failed', 'received'],
    allowNull: false,
    defaultValue: 'pending',
  },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  deliveredAt: { type: DataTypes.DATE, allowNull: true },
  readAt: { type: DataTypes.DATE, allowNull: true },
  rawPayload: { type: DataTypes.JSON, allowNull: true },
});

Message.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', allowNull: false });
Message.belongsTo(MessagingAccount, { foreignKey: 'messagingAccountId', allowNull: false });

export default Message;
