'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PurchaseOrders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unsigned: true,
        references: { model: 'Suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'partial', 'received', 'cancelled'),
        defaultValue: 'pending'
      },
      orderDate: {
        type: Sequelize.DATEONLY,
        defaultValue: Sequelize.NOW
      },
      expectedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      receivedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      totalAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      items: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lastReminderSent: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PurchaseOrders');
  }
};
