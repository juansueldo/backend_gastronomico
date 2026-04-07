import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Product from './product.js';

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
});

Recipe.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Recipe.belongsTo(Store, { foreignKey: 'storeId' });
Recipe.belongsTo(Product, {  foreignKey: 'productId' });

export default Recipe;