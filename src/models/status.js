
import { DataTypes } from 'sequelize';
import sequelize from './db.js';

const Status = sequelize.define('Status', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
});


export default Status;