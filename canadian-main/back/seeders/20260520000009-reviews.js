'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const count = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM ProductReviews`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (parseInt(count[0]?.cnt) > 0) return;

    const customers = await queryInterface.sequelize.query(
      `SELECT id, name FROM Customers LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const products = await queryInterface.sequelize.query(
      `SELECT id FROM Products LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const titles = ['Excellent produit', 'Bon rapport qualité/prix', 'Satisfait', 'Très bien', 'Conforme à mes attentes'];
    const comments = [
      'Produit de très bonne qualité, livraison rapide. Je recommande.',
      'Fonctionne parfaitement depuis plusieurs semaines. Ravi de mon achat.',
      'Bon produit pour le prix. Quelques petites imperfections mais globalement satisfaisant.',
      'Installation facile et résultats immédiats. Très content.',
      'Correspond parfaitement à la description. Service client réactif.'
    ];

    for (let i = 0; i < 15; i++) {
      const cust = customers[i % customers.length];
      const prod = products[i % products.length];
      if (!cust || !prod) continue;
      await queryInterface.sequelize.query(
        `INSERT INTO ProductReviews (id, productId, customerId, customerName, rating, title, comment, isVerified, helpful, createdAt, updatedAt)
         VALUES ('${uuidv4()}', '${prod.id}', '${cust.id}', '${cust.name}', ${3 + (i % 3)}, '${titles[i % titles.length]}', '${comments[i % comments.length]}', ${i < 10 ? 1 : 0}, ${Math.floor(Math.random() * 20)}, DATE_SUB(NOW(), INTERVAL ${i * 7} DAY), NOW())`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ProductReviews', null, {});
  }
};
