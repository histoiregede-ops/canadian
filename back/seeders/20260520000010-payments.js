'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const count = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM Payments`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (parseInt(count[0]?.cnt) > 0) return;

    const orders = await queryInterface.sequelize.query(
      `SELECT id, totalAmount, paymentMethod FROM Orders LIMIT 5`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const statuses = ['completed', 'pending', 'completed', 'completed', 'failed'];
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      await queryInterface.sequelize.query(
        `INSERT INTO Payments (id, orderId, amount, paymentMethod, currency, status, transactionId, paymentDate, notes, createdAt, updatedAt)
         VALUES ('${uuidv4()}', '${order.id}', ${parseFloat(order.totalAmount)}, '${order.paymentMethod || ['cash', 'orange_money', 'wave', 'moov_money', 'bank_transfer'][i]}', 'FCFA', '${statuses[i]}', 'txn_${Date.now()}_${i}', DATE_SUB(NOW(), INTERVAL ${i} DAY), NULL, NOW(), NOW())`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Payments', null, {});
  }
};
