import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import InventoryItem from './inventoryItem.js';
import  Headquarter  from './headquarter.js';

const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  type: { type: DataTypes.ENUM, values: ['in', 'out'], allowNull: false },
  reason: { type: DataTypes.STRING },
});

StockMovement.belongsTo(Store, { foreignKey: 'storeId' });
StockMovement.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
StockMovement.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });
StockMovement.belongsTo(Headquarter, { foreignKey: 'headquarterId', allowNull: false }); // Cada movimiento de stock debe pertenecer a una sede

export default StockMovement;
