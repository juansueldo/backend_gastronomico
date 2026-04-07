
import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';

const Store = sequelize.define('Store', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  timezone: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING },
});

Store.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 }); // Asignar statusId por defecto a 1 (Activo)

export default Store;