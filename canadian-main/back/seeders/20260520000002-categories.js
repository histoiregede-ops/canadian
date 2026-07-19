'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const rows = [
      { name: 'Énergie Solaire', type: 'solar' },
      { name: 'Électronique & Mobile', type: 'electronics' },
      { name: 'Accessoires', type: 'accessory' },
      { name: 'Autres', type: 'other' }
    ];
    for (const r of rows) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Categories WHERE name = '${r.name}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO Categories (id, name, type, createdAt, updatedAt) VALUES ('${uuidv4()}', '${r.name}', '${r.type}', NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Categories', null, {});
  }
};
