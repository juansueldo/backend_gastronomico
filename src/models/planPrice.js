import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Plan from './plan.js';

const PlanPrice = sequelize.define('PlanPrice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  price: { type: DataTypes.FLOAT, allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false },
});

PlanPrice.belongsTo(Plan, { foreignKey: 'planId' });
PlanPrice.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default PlanPrice;
