import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Admin from './admin.js';

const AdminTodo = sequelize.define('AdminTodo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  priority: { type: DataTypes.STRING, allowNull: false, defaultValue: 'medium' },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
});

AdminTodo.belongsTo(Admin, { foreignKey: 'adminId' });

export default AdminTodo;
