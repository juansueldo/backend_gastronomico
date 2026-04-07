
import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';

const Network = sequelize.define('Network', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
});

Network.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default Network;