import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Status from './status.js';

const Table = sequelize.define('Table', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  table_number: { type: DataTypes.INTEGER, allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
  location: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
});

Table.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
Table.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default Table;
