import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Recipe from './recipe.js';
import InventoryItem from './inventoryItem.js';

const RecipeItem = sequelize.define('RecipeItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
}); 


RecipeItem.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
RecipeItem.belongsTo(Store, { foreignKey: 'storeId' });
RecipeItem.belongsTo(Recipe, { foreignKey: 'recipeId' });
RecipeItem.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });

export default RecipeItem;