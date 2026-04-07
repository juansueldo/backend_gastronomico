import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Instance from './instance.js';
import Customer from './customer.js';

const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  identifier: { type: DataTypes.STRING, allowNull: false }, // teléfono, email, ID usuario en WhatsApp, etc.
  type: { type: DataTypes.ENUM, values: ['phone', 'email', 'whatsapp', 'telegram', 'other'], allowNull: false },
});

Contact.belongsTo(Customer, { foreignKey: 'customerId', allowNull: false });
Contact.belongsTo(Instance, { foreignKey: 'instanceId', allowNull: false });
Contact.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
Contact.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });

export default Contact;
