import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';

const DeliveryDriver = sequelize.define('DeliveryDriver', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  vehicleType: {
    type: DataTypes.ENUM,
    values: ['motorcycle', 'bicycle', 'car', 'other'],
    allowNull: false,
    defaultValue: 'motorcycle',
  },
  plate: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM,
    values: ['active', 'inactive', 'busy'],
    allowNull: false,
    defaultValue: 'active',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
});

DeliveryDriver.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });

export default DeliveryDriver;
