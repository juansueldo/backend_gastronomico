import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Category from './category.js';
import InventoryItem from './inventoryItem.js';

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  price: { type: DataTypes.FLOAT, allowNull: false },
  type: { type: DataTypes.ENUM, values: ['simple', 'recipe'], allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: true },
});

Product.belongsTo(Store, { foreignKey: 'storeId' });
Product.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

export default Product;