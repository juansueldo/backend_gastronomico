import { DataTypes } from 'sequelize';
import sequelize from './db.js';
import Status from './status.js';
import Store from './store.js';
import Headquarter from './headquarter.js';

const DeliveryZone = sequelize.define('DeliveryZone', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  polygon: { type: DataTypes.JSON, allowNull: false }, // GeoJSON format
  metadata: { type: DataTypes.JSON, allowNull: true },
  zoneid: { type: DataTypes.STRING, allowNull: true },
});

DeliveryZone.belongsTo(Store, { foreignKey: 'storeId' });
DeliveryZone.belongsTo(Status, { foreignKey: 'statusId', defaultValue: 1 });
DeliveryZone.belongsTo(Headquarter, { foreignKey: 'headquarterId', allowNull: false }); // Cada zona de entrega debe pertenecer a una sede
export default DeliveryZone;
