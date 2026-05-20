'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const count = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM CashTransactions`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (parseInt(count[0]?.cnt) > 0) return;

    const customers = await queryInterface.sequelize.query(
      `SELECT id, name FROM Customers LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (let i = 0; i < 20; i++) {
      const isIncome = i % 3 !== 0;
      const cust = customers[i % customers.length];
      await queryInterface.sequelize.query(
        `INSERT INTO CashTransactions (id, type, amount, description, category, date, customerId, customerName, comment, createdAt, updatedAt)
         VALUES ('${uuidv4()}', '${isIncome ? 'income' : 'expense'}', ${10000 + Math.round(Math.random() * 50000)}, '${isIncome ? 'Vente accessoire' : 'Achat consommables'}', '${isIncome ? 'Vente' : 'Achat'}', DATE_SUB(NOW(), INTERVAL ${i * 12} HOUR), ${cust ? `'${cust.id}'` : 'NULL'}, ${cust ? `'${cust.name}'` : 'NULL'}, NULL, NOW(), NOW())`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CashTransactions', null, {});
  }
};
