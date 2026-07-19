'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const count = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM Installations`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (parseInt(count[0]?.cnt) > 0) return;

    const customers = await queryInterface.sequelize.query(
      `SELECT id FROM Customers LIMIT 8`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const technicians = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE role = 'technician' LIMIT 3`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const quarters = ['Hamdallaye', 'Badalabougou', 'Magnambougou', 'Niamakoro', 'Sogoninko', 'Djelibougou', 'Torokorobougou', 'Yirimadio'];
    const statuses = ['survey', 'planned', 'in_progress', 'completed'];
    const roofTypes = ['Tôle', 'Tuile', 'Béton'];

    for (let i = 0; i < 8; i++) {
      const custId = customers[i % customers.length]?.id || null;
      const techId = technicians[i % technicians.length]?.id || null;
      const kitType = i % 2 === 0 ? 'Kit Résidentiel 3KW' : 'Kit Pompage Solaire';
      const powerCap = i % 2 === 0 ? '3 KVA' : '5 HP';
      const status = statuses[i % 4];
      await queryInterface.sequelize.query(
        `INSERT INTO Installations (id, location, gpsCoordinates, kitType, components, powerCapacity, roofType, status, scheduledDate, completionDate, totalPrice, notes, customerId, technicianId, createdAt, updatedAt)
         VALUES ('${uuidv4()}', 'Quartier ${quarters[i]}, Bamako', '12.6${i}, -8.0${i}', '${kitType}', '["Panneau 400W x4","Batterie 200Ah x2","Onduleur 3KW","Régulateur MPPT 60A"]', '${powerCap}', '${roofTypes[i % 3]}', '${status}', DATE_ADD(NOW(), INTERVAL ${i * 2} DAY), ${i < 3 ? `DATE_SUB(NOW(), INTERVAL ${3 - i} DAY)` : 'NULL'}, ${1200000 + i * 300000}, ${i === 0 ? "'Accès difficile, prévoir échelle'" : 'NULL'}, ${custId ? `'${custId}'` : 'NULL'}, ${techId ? `'${techId}'` : 'NULL'}, NOW(), NOW())`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Installations', null, {});
  }
};
