import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Status from './status.js';
import Headquarter from './headquarter.js';

const Waiter = sequelize.define('Waiter', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  firstname: { type: DataTypes.STRING, allowNull: false },
  lastname: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  identification: { type: DataTypes.STRING, allowNull: true },
  salary: { type: DataTypes.FLOAT, allowNull: true },
  hire_date: { type: DataTypes.DATE, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
});

Waiter.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
Waiter.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Waiter.belongsTo(Headquarter, { foreignKey: 'headquarterId', allowNull: true });

export default Waiter;
