import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Headquarter from './headquarter.js';
import Status from './status.js';
import Store from './store.js';
import User from './user.js';

const CashRegisterMovement = sequelize.define('CashRegisterMovement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: {
    type: DataTypes.ENUM,
    values: ['opening', 'income', 'expense', 'adjustment', 'closing'],
    allowNull: false,
  },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  reference: { type: DataTypes.STRING, allowNull: true },
  movementDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  metadata: { type: DataTypes.JSON, allowNull: true },
});

CashRegisterMovement.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
CashRegisterMovement.belongsTo(Headquarter, { foreignKey: 'headquarterId', allowNull: false });
CashRegisterMovement.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
CashRegisterMovement.belongsTo(User, {
  foreignKey: 'createdByUserId',
  allowNull: true,
  as: 'createdBy',
});

export default CashRegisterMovement;
