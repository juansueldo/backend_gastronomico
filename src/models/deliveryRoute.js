import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import DeliveryDriver from './deliveryDriver.js';

const DeliveryRoute = sequelize.define('DeliveryRoute', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM,
    values: ['planning', 'assigned', 'in_transit', 'completed', 'cancelled'],
    allowNull: false,
    defaultValue: 'assigned',
  },
  scheduledAt: { type: DataTypes.DATE, allowNull: true },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
});

DeliveryRoute.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
DeliveryRoute.belongsTo(DeliveryDriver, { foreignKey: 'driverId', allowNull: false });

export default DeliveryRoute;
