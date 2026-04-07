import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Addon from './addon.js';

const AddonPrice = sequelize.define('AddonPrice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  price: { type: DataTypes.FLOAT, allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false },
});

AddonPrice.belongsTo(Addon, { foreignKey: 'addonId' });
AddonPrice.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default AddonPrice;
