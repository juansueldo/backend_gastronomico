import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import BillingCycle from './billingCycle.js';
import Plan from './plan.js';

const Addon = sequelize.define('Addon', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  feature: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  key: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.STRING, allowNull: false },
});

Addon.belongsTo(Plan, { foreignKey: 'planId' });
Addon.belongsTo(BillingCycle, { foreignKey: 'billingCycleId' });
Addon.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default Addon;