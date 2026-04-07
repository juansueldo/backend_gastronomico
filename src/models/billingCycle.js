import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';

const BillingCycle = sequelize.define('BillingCycle', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  durationInDays: { type: DataTypes.INTEGER, allowNull: false },
});

BillingCycle.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default BillingCycle;