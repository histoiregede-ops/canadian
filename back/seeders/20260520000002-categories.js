'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const rows = [
      { name: 'Panneaux Solaires', type: 'solar' },
      { name: 'Batteries & Stockage', type: 'solar' },
      { name: 'Onduleurs & Régulateurs', type: 'solar' },
      { name: 'Kits Solaires Complets', type: 'solar' },
      { name: 'Éclairage Solaire', type: 'solar' },
      { name: 'Smartphones & Tablettes', type: 'electronics' },
      { name: 'Ordinateurs & Périphériques', type: 'electronics' },
      { name: 'TV & Audio', type: 'electronics' },
      { name: 'Accessoires Électronique', type: 'accessory' },
      { name: 'Câbles & Connectiques', type: 'accessory' },
      { name: 'Électroménager', type: 'electronics' },
      { name: 'Vêtements & Mode', type: 'other' }
    ];
    for (const r of rows) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Categories WHERE name = '${r.name.replace(/'/g, "''")}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO Categories (id, name, type, createdAt, updatedAt) VALUES ('${uuidv4()}', '${r.name.replace(/'/g, "''")}', '${r.type}', NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Categories', null, {});
  }
};