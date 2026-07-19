'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Repairs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      deviceType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      brand: {
        type: Sequelize.STRING
      },
      serialNumber: {
        type: Sequelize.STRING
      },
      reportedIssue: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      diagnosis: {
        type: Sequelize.TEXT
      },
      resolution: {
        type: Sequelize.TEXT
      },
      estimatedCost: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      finalCost: {
        type: Sequelize.DECIMAL(10, 2)
      },
      status: {
        type: Sequelize.ENUM('received', 'diagnosing', 'waiting_parts', 'repairing', 'ready', 'delivered', 'cancelled'),
        defaultValue: 'received'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal'
      },
      receivedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      completedAt: {
        type: Sequelize.DATE
      },
      customerId: {
        type: Sequelize.UUID,
        references: { model: 'Customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    await queryInterface.dropTable('Repairs');
  }
};
