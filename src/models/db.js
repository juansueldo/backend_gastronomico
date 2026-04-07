import 'dotenv/config';
import { setDefaultResultOrder } from 'node:dns';
import { Sequelize } from 'sequelize';
import pg from 'pg';

setDefaultResultOrder('ipv4first');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

export default sequelize;
