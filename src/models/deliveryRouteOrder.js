import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Order from './order.js';
import DeliveryRoute from './deliveryRoute.js';

const DeliveryRouteOrder = sequelize.define('DeliveryRouteOrder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  status: {
    type: DataTypes.ENUM,
    values: ['assigned', 'picked_up', 'delivered', 'failed'],
    allowNull: false,
    defaultValue: 'assigned',
  },
  printedAt: { type: DataTypes.DATE, allowNull: true },
});

DeliveryRouteOrder.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
DeliveryRouteOrder.belongsTo(Order, { foreignKey: 'orderId', allowNull: false });
DeliveryRouteOrder.belongsTo(DeliveryRoute, { foreignKey: 'routeId', allowNull: false });

export default DeliveryRouteOrder;
