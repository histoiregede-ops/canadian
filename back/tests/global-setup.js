const sequelize = require('../config/database');

module.exports = async () => {
  await sequelize.authenticate();
  console.log('Test database connected');
};
