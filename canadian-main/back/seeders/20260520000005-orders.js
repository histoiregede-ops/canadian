'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const existingOrders = await queryInterface.sequelize.query(
      `SELECT orderNumber FROM Orders WHERE orderNumber LIKE 'ORD-2024%'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (existingOrders.length > 0) return;

    const customers = await queryInterface.sequelize.query(
      `SELECT id FROM Customers LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const products = await queryInterface.sequelize.query(
      `SELECT id, price FROM Products LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (let i = 0; i < 5; i++) {
      const id = uuidv4();
      const orderNum = `ORD-${2024001 + i}`;
      const custId = customers[i % customers.length]?.id || null;
      const subtotal = 25000 + (i * 5000);
      const isPaid = i % 2 === 0;

      await queryInterface.sequelize.query(
        `INSERT INTO Orders (id, orderNumber, subtotal, totalAmount, paidAmount, discount, tax, paymentMethod, status, deliveryAddress, customerId, createdAt, updatedAt)
         VALUES ('${id}', '${orderNum}', ${subtotal}, ${subtotal + 2000}, ${isPaid ? subtotal + 2000 : 0}, 0, 2000, 'cash', '${isPaid ? 'paid' : 'pending'}', 'Adresse client', ${custId ? `'${custId}'` : 'NULL'}, NOW(), NOW())`
      );

      const p1 = products[i % products.length];
      const p2 = products[(i + 1) % products.length];
      if (p1) {
        await queryInterface.sequelize.query(
          `INSERT INTO OrderItems (id, quantity, unitPrice, totalPrice, orderId, productId, createdAt, updatedAt)
           VALUES ('${uuidv4()}', 1, ${parseFloat(p1.price)}, ${parseFloat(p1.price)}, '${id}', '${p1.id}', NOW(), NOW())`
        );
      }
      if (p2) {
        await queryInterface.sequelize.query(
          `INSERT INTO OrderItems (id, quantity, unitPrice, totalPrice, orderId, productId, createdAt, updatedAt)
           VALUES ('${uuidv4()}', 2, ${parseFloat(p2.price)}, ${parseFloat(p2.price) * 2}, '${id}', '${p2.id}', NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('OrderItems', null, {});
    await queryInterface.bulkDelete('Orders', null, {});
  }
};
