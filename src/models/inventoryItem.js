import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';

const InventoryItem = sequelize.define('InventoryItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  unit: { type: DataTypes.ENUM, values: ['kg', 'gr', 'lt', 'ml'], allowNull: false }, 
  stock: { type: DataTypes.FLOAT, allowNull: false },
  min_stock: { type: DataTypes.FLOAT, allowNull: false },
});

InventoryItem.belongsTo(Store, { foreignKey: 'storeId' });
InventoryItem.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default InventoryItem;