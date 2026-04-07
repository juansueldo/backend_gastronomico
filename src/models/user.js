
import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Status from './status.js';
import Role from './role.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  firstname: { type: DataTypes.STRING, allowNull: false },
  lastname: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },

});

User.belongsTo(Store, { foreignKey: 'storeId' });
User.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
User.belongsTo(Role, { foreignKey: 'roleId', defaultValue: 1 });

export default User;