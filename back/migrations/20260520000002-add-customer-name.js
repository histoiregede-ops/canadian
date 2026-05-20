'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE ProductReviews ADD COLUMN customerName VARCHAR(255) NOT NULL DEFAULT '' AFTER customerId"
      );
    } catch (e) {
      if (!e.message.includes('Duplicate')) throw e;
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('ALTER TABLE ProductReviews DROP COLUMN customerName');
  }
};
