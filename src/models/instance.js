
import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Network from './network.js';

const Instance = sequelize.define('Instance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  connection: { type: DataTypes.INTEGER, defaultValue: 0 }, // 1 - Conectado, 2- Conectando, 0 - Desconectado, 
});

Instance.belongsTo(Store, { foreignKey: 'storeId', allowNull: false });
Instance.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
Instance.belongsTo(Network, { foreignKey: 'networkId', allowNull: false });

export default Instance;