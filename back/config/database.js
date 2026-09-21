require('dotenv').config();
const { Sequelize } = require('sequelize');

const dialect = process.env.DB_DIALECT || (process.env.DB_HOST ? 'mysql' : 'sqlite');
const sslEnabled = process.env.DB_SSL === 'true';

let sequelize;

if (dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false,
    define: {
      timestamps: true
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'solar_erp',
    process.env.DB_USER,
    process.env.DB_PASS || undefined,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect,
      logging: false,
      pool: { max: 20, min: 2, acquire: 30000, idle: 10000, evict: 1000 },
      ...(sslEnabled && {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      }),
      define: {
        timestamps: true
      }
    }
  );
}

module.exports = sequelize;
