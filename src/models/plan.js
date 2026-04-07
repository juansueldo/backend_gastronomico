import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import BillingCycle from './billingCycle.js';

const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  isFree: { type: DataTypes.BOOLEAN, defaultValue: false },
});

Plan.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Plan.belongsTo(BillingCycle, { foreignKey: 'billingCycleId' });

export default Plan;