
import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Status from './status.js';
import Role from './role.js';
import Headquarter from './headquarter.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  firstname: { type: DataTypes.STRING, allowNull: false },
  lastname: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  profile_image_url: { type: DataTypes.STRING, allowNull: true },
  presenceStatus: {
    type: DataTypes.ENUM('active', 'away', 'busy', 'offline'),
    allowNull: false,
    defaultValue: 'offline',
  },
  lastPresenceAt: { type: DataTypes.DATE, allowNull: true },
  sessionVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

});

User.belongsTo(Store, { foreignKey: 'storeId' });
User.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
User.belongsTo(Role, { foreignKey: 'roleId', defaultValue: 1 });
User.belongsTo(Headquarter, { foreignKey: 'headquarterId' });

export default User;
