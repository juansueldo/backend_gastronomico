import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import DeliveryDriver from './deliveryDriver.js';

const DriverPushToken = sequelize.define('DriverPushToken', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  token: { type: DataTypes.STRING, allowNull: false, unique: true },
  platform: {
    type: DataTypes.ENUM,
    values: ['ios', 'android', 'web', 'unknown'],
    allowNull: false,
    defaultValue: 'unknown',
  },
  deviceId: { type: DataTypes.STRING, allowNull: true },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastRegisteredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  lastUsedAt: { type: DataTypes.DATE, allowNull: true },
  disabledAt: { type: DataTypes.DATE, allowNull: true },
});

DriverPushToken.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
DriverPushToken.belongsTo(DeliveryDriver, { foreignKey: 'driverId', allowNull: false });

export default DriverPushToken;
