'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const catRows = await queryInterface.sequelize.query(
      `SELECT id, type FROM Categories`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const catMap = {};
    catRows.forEach(c => { catMap[c.type] = c.id; });

    const products = [
      { name: 'Panneau Solaire 400W Mono', price: 150000, type: 'solar', stock: 20 },
      { name: 'Batterie Gel 200Ah', price: 280000, type: 'solar', stock: 8 },
      { name: 'Onduleur Hybride 5KW', price: 650000, type: 'solar', stock: 3 },
      { name: 'Régulateur MPPT 60A', price: 85000, type: 'solar', stock: 12 },
      { name: 'Kit Solaire 500W', price: 450000, type: 'solar', stock: 5 },
      { name: 'Câble Solaire 6mm2 (mètre)', price: 1200, type: 'solar', stock: 200 },
      { name: 'Support Panneau Toit', price: 15000, type: 'solar', stock: 40 },
      { name: 'Projecteur LED Solaire', price: 45000, type: 'solar', stock: 25 },
      { name: 'Ventilateur Rechargeable', price: 35000, type: 'solar', stock: 18 },
      { name: 'Station Energie Portable 500W', price: 250000, type: 'solar', stock: 4 },
      { name: 'iPhone 15 Pro 256GB', price: 950000, type: 'electronics', stock: 4 },
      { name: 'Samsung Galaxy S23 Ultra', price: 780000, type: 'electronics', stock: 6 },
      { name: 'MacBook Air M2', price: 1200000, type: 'electronics', stock: 2 },
      { name: 'Écran LED 32"', price: 125000, type: 'electronics', stock: 15 },
      { name: 'Powerbank 20000mAh', price: 25000, type: 'electronics', stock: 50 },
      { name: 'Routeur 4G Huawei', price: 65000, type: 'electronics', stock: 10 },
      { name: 'Souris Sans Fil', price: 15000, type: 'electronics', stock: 30 },
      { name: 'Clavier Mécanique RGB', price: 45000, type: 'electronics', stock: 12 },
      { name: 'Casque Bluetooth JBL', price: 55000, type: 'electronics', stock: 8 },
      { name: 'Tablette iPad 10e Gen', price: 450000, type: 'electronics', stock: 7 }
    ];

    for (const p of products) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Products WHERE name = '${p.name.replace(/'/g, "''")}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        const id = uuidv4();
        await queryInterface.sequelize.query(
          `INSERT INTO Products (id, name, description, price, stockQuantity, status, categoryId, createdAt, updatedAt)
           VALUES ('${id}', '${p.name.replace(/'/g, "''")}', 'Description pour ${p.name.replace(/'/g, "''")}', ${p.price}, ${p.stock}, 'available', '${catMap[p.type]}', NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Products', null, {});
  }
};
