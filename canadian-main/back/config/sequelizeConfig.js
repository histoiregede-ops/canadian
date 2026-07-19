require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';

const getConfig = (env) => {
  if (dialect === 'sqlite') {
    return {
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || `./database.${env}.sqlite`,
      logging: false
    };
  }
  return {
    dialect,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'solar_erp',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    logging: false
  };
};

module.exports = {
  development: getConfig('development'),
  production: getConfig('production')
};
