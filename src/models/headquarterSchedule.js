import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Headquarter from './headquarter.js';

const HeadquarterSchedule = sequelize.define('HeadquarterSchedule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  day_of_week: {
    type: DataTypes.ENUM(
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ),
    allowNull: false,
  },

  open_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },

  close_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },

  is_closed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

Headquarter.hasMany(HeadquarterSchedule, { foreignKey: 'headquarterId', as: 'schedules' });

HeadquarterSchedule.belongsTo(Headquarter, {foreignKey: 'headquarterId',});

export default HeadquarterSchedule;