import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import User from './user.js';
import DeliveryZone from './deliveryZone.js';

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    order_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    total_amount: { type: DataTypes.FLOAT, allowNull: false },
    order_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    type: { type: DataTypes.ENUM, values: ['dine-in', 'takeaway', 'delivery'], allowNull: false },
    delivery_address: { type: DataTypes.STRING, allowNull: true },
    delivery_latitude: { type: DataTypes.FLOAT, allowNull: true },
    delivery_longitude: { type: DataTypes.FLOAT, allowNull: true },
    delivery_date: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM, values: ['pending', 'processing', 'completed', 'cancelled'], allowNull: false, defaultValue: 'pending' },
    tableId: { type: DataTypes.INTEGER, allowNull: true },
    waiterId: { type: DataTypes.INTEGER, allowNull: true },
});

Order.belongsTo(Store, { foreignKey: 'storeId' });
Order.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(DeliveryZone, { foreignKey: 'deliveryZoneId', allowNull: true });

export default Order;