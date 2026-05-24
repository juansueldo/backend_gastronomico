import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Instance from './instance.js';

const MessagingAccount = sequelize.define('MessagingAccount', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  provider: {
    type: DataTypes.ENUM,
    values: ['whatsapp_web', 'whatsapp_cloud'],
    allowNull: false,
    defaultValue: 'whatsapp_web',
  },
  status: {
    type: DataTypes.ENUM,
    values: ['disconnected', 'connecting', 'pending_qr', 'authenticated', 'ready', 'failed'],
    allowNull: false,
    defaultValue: 'disconnected',
  },
  phone: { type: DataTypes.STRING, allowNull: true },
  displayName: { type: DataTypes.STRING, allowNull: true },
  sessionId: { type: DataTypes.STRING, allowNull: false },
  qrCode: { type: DataTypes.TEXT, allowNull: true },
  lastQrAt: { type: DataTypes.DATE, allowNull: true },
  lastConnectedAt: { type: DataTypes.DATE, allowNull: true },
  lastDisconnectedAt: { type: DataTypes.DATE, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
});

MessagingAccount.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
MessagingAccount.belongsTo(Instance, { foreignKey: 'instanceId', allowNull: true });

export default MessagingAccount;
