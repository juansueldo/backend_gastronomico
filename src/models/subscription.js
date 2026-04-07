import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Plan from './plan.js';
import Store from './store.js';

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: false },
  payment: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 }, // 0: pendiente, 1: pagado, 2: rechazado
});

Subscription.belongsTo(Plan, { foreignKey: 'planId' });
Subscription.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Subscription.belongsTo(Store, { foreignKey: 'storeId' });

export default Subscription;