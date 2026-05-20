'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add email to Users (safe: skips if already exists)
    try {
      await queryInterface.addColumn('Users', 'email', { type: Sequelize.STRING, allowNull: true, unique: true });
    } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }

    // Add customerId, customerName, comment to CashTransactions
    try { await queryInterface.addColumn('CashTransactions', 'customerId', { type: Sequelize.STRING, allowNull: true }); } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }
    try { await queryInterface.addColumn('CashTransactions', 'customerName', { type: Sequelize.STRING, allowNull: true }); } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }
    try { await queryInterface.addColumn('CashTransactions', 'comment', { type: Sequelize.TEXT, allowNull: true }); } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }

    // Create Payments table (safe: IF NOT EXISTS, no FK to avoid charset mismatch)
    await queryInterface.sequelize.query(`CREATE TABLE IF NOT EXISTS Payments (
      id CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
      orderId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin DEFAULT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paymentMethod VARCHAR(255) NOT NULL,
      currency VARCHAR(255) DEFAULT 'FCFA',
      status ENUM('pending','completed','refunded','partially_refunded','failed') DEFAULT 'pending',
      transactionId VARCHAR(255) DEFAULT NULL,
      paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`);

    // Create ProductReviews table (safe: IF NOT EXISTS, matching existing charset)
    await queryInterface.sequelize.query(`CREATE TABLE IF NOT EXISTS ProductReviews (
      id CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
      productId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
      customerId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
      customerName VARCHAR(255) NOT NULL,
      rating INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      comment TEXT NOT NULL,
      isVerified TINYINT(1) DEFAULT 0,
      helpful INT DEFAULT 0,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY productId (productId),
      KEY customerId (customerId),
      KEY productRating (productId, rating)
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ProductReviews');
    await queryInterface.dropTable('Payments');
    try { await queryInterface.removeColumn('CashTransactions', 'comment'); } catch (e) {}
    try { await queryInterface.removeColumn('CashTransactions', 'customerName'); } catch (e) {}
    try { await queryInterface.removeColumn('CashTransactions', 'customerId'); } catch (e) {}
    try { await queryInterface.removeColumn('Users', 'email'); } catch (e) {}
  }
};
