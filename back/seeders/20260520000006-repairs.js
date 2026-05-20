'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const count = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM Repairs`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (parseInt(count[0]?.cnt) > 0) return;

    const customers = await queryInterface.sequelize.query(
      `SELECT id FROM Customers LIMIT 15`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const devices = [
      { device: 'iPhone 13', brand: 'Apple', issue: 'Écran cassé' },
      { device: 'Samsung A52', brand: 'Samsung', issue: 'Batterie gonflée' },
      { device: 'Ordinateur HP Pavilion', brand: 'HP', issue: "Ne s'allume pas" },
      { device: 'TV LG 43"', brand: 'LG', issue: "Pas d'image" },
      { device: 'Onduleur APC 1500VA', brand: 'APC', issue: 'Bip continu' },
      { device: 'Radio Solaire', brand: 'Sony', issue: 'Ne charge plus' },
      { device: 'Tablette Huawei MatePad', brand: 'Huawei', issue: 'Écran tactile mort' },
      { device: 'iPhone 11', brand: 'Apple', issue: 'Micro défectueux' },
      { device: 'Dell Latitude 5480', brand: 'Dell', issue: 'Surchauffe' },
      { device: 'MacBook Pro 14"', brand: 'Apple', issue: 'Clavier bloqué' }
    ];

    const statuses = ['received', 'diagnosing', 'repairing', 'ready', 'delivered'];
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i];
      const custId = customers[i % customers.length]?.id || null;
      const status = statuses[i % 5];
      await queryInterface.sequelize.query(
        `INSERT INTO Repairs (id, deviceType, brand, serialNumber, reportedIssue, diagnosis, resolution, status, priority, estimatedCost, finalCost, receivedAt, completedAt, customerId, createdAt, updatedAt)
         VALUES ('${uuidv4()}', '${d.device.replace(/'/g, "''")}', '${d.brand}', 'SN-${1000 + i}', '${d.issue.replace(/'/g, "''")}', ${i > 2 ? "'Problème de circuit de charge / remplacement composant'" : 'NULL'}, ${i > 5 ? "'Réparation effectuée avec succès'" : 'NULL'}, '${status}', ${i % 3 === 0 ? "'high'" : "'normal'"}, ${25000 + i * 5000}, ${i > 3 ? 25000 + i * 5000 : 'NULL'}, DATE_SUB(NOW(), INTERVAL ${i} DAY), ${i > 5 ? `DATE_SUB(NOW(), INTERVAL ${i - 3} DAY)` : 'NULL'}, ${custId ? `'${custId}'` : 'NULL'}, NOW(), NOW())`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Repairs', null, {});
  }
};
