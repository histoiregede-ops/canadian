'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const rows = [
      { name: 'Moussa Traoré', email: 'client1@example.com', phone: '+223 70 10 20 30', city: 'Bamako' },
      { name: 'Alice Yao', email: 'client2@example.com', phone: '+223 71 11 21 31', city: 'Sikasso' },
      { name: 'Koffi Gado', email: 'client3@example.com', phone: '+223 72 12 22 32', city: 'Bamako' },
      { name: 'Sika Aménou', email: 'client4@example.com', phone: '+223 73 13 23 33', city: 'Sikasso' },
      { name: 'John Doe', email: 'client5@example.com', phone: '+223 74 14 24 34', city: 'Bamako' },
      { name: 'Marie Curie', email: 'client6@example.com', phone: '+223 75 15 25 35', city: 'Sikasso' },
      { name: 'Robert Smith', email: 'client7@example.com', phone: '+223 76 16 26 36', city: 'Bamako' },
      { name: 'Fatima Sow', email: 'client8@example.com', phone: '+223 77 17 27 37', city: 'Sikasso' },
      { name: 'Ousmane Sy', email: 'client9@example.com', phone: '+223 78 18 28 38', city: 'Bamako' },
      { name: 'Tunde Folawiyo', email: 'client10@example.com', phone: '+223 79 19 29 39', city: 'Sikasso' },
      { name: 'Aliko Dangote', email: 'client11@example.com', phone: '+223 80 20 30 40', city: 'Bamako' },
      { name: 'Tony Elumelu', email: 'client12@example.com', phone: '+223 81 21 31 41', city: 'Sikasso' },
      { name: 'Strive Masiyiwa', email: 'client13@example.com', phone: '+223 82 22 32 42', city: 'Bamako' },
      { name: 'Patrice Motsepe', email: 'client14@example.com', phone: '+223 83 23 33 43', city: 'Sikasso' },
      { name: 'Folorunsho Alakija', email: 'client15@example.com', phone: '+223 84 24 34 44', city: 'Bamako' }
    ];

    for (const r of rows) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Customers WHERE email = '${r.email}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        const id = uuidv4();
        const address = r.city === 'Bamako' ? 'Bamako, Mali' : 'Sikasso, Mali';
        const loyalty = rows.indexOf(r) > 10 ? 'gold' : rows.indexOf(r) > 5 ? 'silver' : 'bronze';
        await queryInterface.sequelize.query(
          `INSERT INTO Customers (id, name, email, phone, password, address, city, country, points, loyaltyLevel, isActive, lastLogin, createdAt, updatedAt)
           VALUES ('${id}', '${r.name}', '${r.email}', '${r.phone}', NULL, '${address}', '${r.city}', 'Mali', ${100 + rows.indexOf(r) * 10}, '${loyalty}', true, ${rows.indexOf(r) % 3 === 0 ? `DATE_SUB(NOW(), INTERVAL ${rows.indexOf(r)} DAY)` : 'NULL'}, NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Customers', null, {});
  }
};
