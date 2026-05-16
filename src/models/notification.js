import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Store from './store.js';
import Status from './status.js';
import User from './user.js';
import Headquarter from './headquarter.js';

const Notification = sequelize.define('Notification',{
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: {type: DataTypes.STRING},
    message: {type: DataTypes.STRING},
    icon: {type: DataTypes.STRING, allowNull: true},

});

Notification.belongsTo(Store, { foreignKey: 'storeId' });
Notification.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Notification.belongsTo(User, { foreignKey: 'userId'});
Notification.belongsTo(Headquarter, { foreignKey: 'headquarterId' });

export default Notification;