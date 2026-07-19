'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await Promise.all([
      { username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin', fullName: 'Administrateur Système', email: 'admin@electrocanadien.ma' },
      { username: 'caissier1', password: bcrypt.hashSync('caisse123', 10), role: 'cashier', fullName: 'Koffi Amégnigan', email: 'koffi@electrocanadien.ma' },
      { username: 'amadou', password: bcrypt.hashSync('tech123', 10), role: 'technician', fullName: 'Amadou Diallo', email: 'amadou@electrocanadien.ma' },
      { username: 'jean', password: bcrypt.hashSync('tech123', 10), role: 'technician', fullName: 'Jean Koffi', email: 'jean@electrocanadien.ma' },
      { username: 'sarah', password: bcrypt.hashSync('tech123', 10), role: 'technician', fullName: 'Sarah Mensah', email: 'sarah@electrocanadien.ma' }
    ]);

    for (const user of users) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = '${user.username}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO Users (id, username, password, role, fullName, email, createdAt, updatedAt)
           VALUES ('${uuidv4()}', '${user.username}', '${user.password}', '${user.role}', '${user.fullName}', '${user.email}', NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
