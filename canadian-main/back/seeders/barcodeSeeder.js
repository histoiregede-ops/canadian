'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const products = await queryInterface.sequelize.query(
      `SELECT id, name, barcode FROM Products ORDER BY createdAt ASC`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    let counter = 1;
    for (const product of products) {
      if (product.barcode) {
        console.log(`SKIP: ${product.name} already has barcode ${product.barcode}`);
        continue;
      }
      const barcode = `200${String(counter).padStart(7, '0')}`;
      await queryInterface.sequelize.query(
        `UPDATE Products SET barcode = ? WHERE id = ?`,
        { replacements: [barcode, product.id] }
      );
      console.log(`SET: ${product.name} -> barcode ${barcode}`);
      counter++;
    }
    console.log(`Barcode seeding complete. ${counter - 1} products updated.`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE Products SET barcode = NULL WHERE barcode LIKE '200%'`
    );
  }
};
