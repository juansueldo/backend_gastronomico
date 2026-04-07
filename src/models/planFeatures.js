import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Plan from './plan.js';

const PlanFeatures = sequelize.define('PlanFeatures', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  feature: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  key: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.STRING, allowNull: false },
});

PlanFeatures.belongsTo(Plan, { foreignKey: 'planId' });
PlanFeatures.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default PlanFeatures;
