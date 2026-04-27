
import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';

const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
});

Customer.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Customer.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });

export default Customer;