'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const hashedCashier = await bcrypt.hash('cashier123', 10);
    const hashedTech = await bcrypt.hash('password', 10);

    const users = [
      { id: 'a0000001-0000-0000-0000-000000000001', username: 'admin', password: hashedPassword, role: 'admin', fullName: 'Administrateur', email: 'admin@solarerp.com' },
      { id: 'a0000001-0000-0000-0000-000000000002', username: 'cashier1', password: hashedCashier, role: 'cashier', fullName: 'Caissier Principal', email: 'cashier@solarerp.com' },
      { id: 'a0000001-0000-0000-0000-000000000003', username: 'tech1', password: hashedTech, role: 'technician', fullName: 'Amadou Diallo', email: 'tech1@solarerp.com' }
    ];
    const now = new Date();
    for (const u of users) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = ? LIMIT 1`,
        { replacements: [u.username], type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO Users (id, username, password, role, fullName, email, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          { replacements: [u.id, u.username, u.password, u.role, u.fullName, u.email, now, now] }
        );
      }
    }

    const categories = [
      { id: 'b0000001-0000-0000-0000-000000000001', name: 'Solaire', type: 'solar' },
      { id: 'b0000001-0000-0000-0000-000000000002', name: 'Électronique', type: 'electronics' },
      { id: 'b0000001-0000-0000-0000-000000000003', name: 'Accessoires', type: 'accessory' }
    ];
    for (const c of categories) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Categories WHERE name = ? LIMIT 1`,
        { replacements: [c.name], type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO Categories (id, name, type, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
          { replacements: [c.id, c.name, c.type, now, now] }
        );
      }
    }

    const products = [
      { id: 'c0000001-0000-0000-0000-000000000001', name: 'Panneau Solaire 400W Monocristallin', description: 'Haute efficacité, garantie 25 ans.', price: 150000, stock: 15, catId: 'b0000001-0000-0000-0000-000000000001' },
      { id: 'c0000001-0000-0000-0000-000000000002', name: 'Batterie Lithium LiFePO4 12V 100Ah', description: 'Cycle profond, 6000 cycles.', price: 450000, stock: 5, catId: 'b0000001-0000-0000-0000-000000000001' },
      { id: 'c0000001-0000-0000-0000-000000000003', name: 'iPhone 14 Pro 256GB', description: 'Noir Sidéral, Neuf scellé.', price: 850000, stock: 2, catId: 'b0000001-0000-0000-0000-000000000002' }
    ];
    for (const p of products) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Products WHERE name = ? LIMIT 1`,
        { replacements: [p.name], type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO Products (id, name, description, price, stockQuantity, status, categoryId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 'available', ?, ?, ?)`,
          { replacements: [p.id, p.name, p.description, p.price, p.stock, p.catId, now, now] }
        );
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Products', null, {});
    await queryInterface.bulkDelete('Categories', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
