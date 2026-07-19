const sequelize = require('../config/database');

module.exports = async () => {
  await sequelize.close();
  console.log('Test database disconnected');
};
