import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';

const Headquarter = sequelize.define('Headquarter', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  closure_periods: { type: DataTypes.JSON, allowNull: true },
});

Headquarter.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 }); // Asignar statusId por defecto a 1 (Activo)
Headquarter.belongsTo(Store, { foreignKey: 'storeId', allowNull: false }); // Cada sede debe pertenecer a una tienda

export default Headquarter;
