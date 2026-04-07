import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  icon: { type: DataTypes.STRING },
});

Category.belongsTo(Store, { foreignKey: 'storeId' });
Category.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default Category;