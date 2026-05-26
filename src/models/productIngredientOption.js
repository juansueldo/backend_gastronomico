import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Product from './product.js';
import InventoryItem from './inventoryItem.js';

const ProductIngredientOption = sequelize.define('ProductIngredientOption', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  isRemovable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  isAddable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  defaultIncluded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  extraPrice: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  extraQuantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
  maxExtraQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
});

ProductIngredientOption.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
ProductIngredientOption.belongsTo(Store, { foreignKey: 'storeId' });
ProductIngredientOption.belongsTo(Product, { foreignKey: 'productId' });
ProductIngredientOption.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });

export default ProductIngredientOption;
