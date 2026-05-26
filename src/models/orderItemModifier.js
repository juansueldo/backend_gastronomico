import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import OrderItem from './orderItem.js';
import InventoryItem from './inventoryItem.js';
import ProductIngredientOption from './productIngredientOption.js';

const OrderItemModifier = sequelize.define('OrderItemModifier', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.ENUM, values: ['removed', 'extra'], allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
  unit: { type: DataTypes.STRING, allowNull: false, defaultValue: 'unidad' },
  priceDelta: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
});

OrderItemModifier.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
OrderItemModifier.belongsTo(Store, { foreignKey: 'storeId' });
OrderItemModifier.belongsTo(OrderItem, { foreignKey: 'orderItemId' });
OrderItemModifier.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });
OrderItemModifier.belongsTo(ProductIngredientOption, { foreignKey: 'productIngredientOptionId' });

export default OrderItemModifier;
