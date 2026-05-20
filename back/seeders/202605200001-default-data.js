'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const hashedCashier = await bcrypt.hash('cashier123', 10);
    const hashedTech = await bcrypt.hash('password', 10);

    await queryInterface.bulkInsert('Users', [
      { id: 'a0000001-0000-0000-0000-000000000001', username: 'admin', password: hashedPassword, role: 'admin', fullName: 'Administrateur', email: 'admin@solarerp.com', createdAt: new Date(), updatedAt: new Date() },
      { id: 'a0000001-0000-0000-0000-000000000002', username: 'cashier1', password: hashedCashier, role: 'cashier', fullName: 'Caissier Principal', email: 'cashier@solarerp.com', createdAt: new Date(), updatedAt: new Date() },
      { id: 'a0000001-0000-0000-0000-000000000003', username: 'tech1', password: hashedTech, role: 'technician', fullName: 'Amadou Diallo', email: 'tech1@solarerp.com', createdAt: new Date(), updatedAt: new Date() }
    ]);

    await queryInterface.bulkInsert('Categories', [
      { id: 'b0000001-0000-0000-0000-000000000001', name: 'Solaire', type: 'solar', createdAt: new Date(), updatedAt: new Date() },
      { id: 'b0000001-0000-0000-0000-000000000002', name: 'Électronique', type: 'electronics', createdAt: new Date(), updatedAt: new Date() },
      { id: 'b0000001-0000-0000-0000-000000000003', name: 'Accessoires', type: 'accessory', createdAt: new Date(), updatedAt: new Date() }
    ]);

    await queryInterface.bulkInsert('Products', [
      { id: 'c0000001-0000-0000-0000-000000000001', name: 'Panneau Solaire 400W Monocristallin', description: 'Haute efficacité, garantie 25 ans.', price: 150000, stockQuantity: 15, status: 'available', categoryId: 'b0000001-0000-0000-0000-000000000001', createdAt: new Date(), updatedAt: new Date() },
      { id: 'c0000001-0000-0000-0000-000000000002', name: 'Batterie Lithium LiFePO4 12V 100Ah', description: 'Cycle profond, 6000 cycles.', price: 450000, stockQuantity: 5, status: 'available', categoryId: 'b0000001-0000-0000-0000-000000000001', createdAt: new Date(), updatedAt: new Date() },
      { id: 'c0000001-0000-0000-0000-000000000003', name: 'iPhone 14 Pro 256GB', description: 'Noir Sidéral, Neuf scellé.', price: 850000, stockQuantity: 2, status: 'available', categoryId: 'b0000001-0000-0000-0000-000000000002', createdAt: new Date(), updatedAt: new Date() }
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Products', null, {});
    await queryInterface.bulkDelete('Categories', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
