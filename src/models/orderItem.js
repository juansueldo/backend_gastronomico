import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Product from './product.js';
import Headquarter from './headquarter.js';

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  price: { type: DataTypes.FLOAT, allowNull: false },
});

 // usar alias consistente
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
OrderItem.belongsTo(Store, { foreignKey: 'storeId' });
OrderItem.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
OrderItem.belongsTo(Headquarter, { foreignKey: 'headquarterId', allowNull: false }); // Cada item de orden debe pertenecer a una sede

export default OrderItem;
