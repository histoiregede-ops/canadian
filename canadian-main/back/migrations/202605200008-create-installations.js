'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Installations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gpsCoordinates: {
        type: Sequelize.STRING
      },
      kitType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      components: {
        type: Sequelize.TEXT
      },
      powerCapacity: {
        type: Sequelize.STRING
      },
      roofType: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('survey', 'planned', 'in_progress', 'testing', 'completed', 'cancelled'),
        defaultValue: 'planned'
      },
      scheduledDate: {
        type: Sequelize.DATE
      },
      completionDate: {
        type: Sequelize.DATE
      },
      totalPrice: {
        type: Sequelize.DECIMAL(12, 2)
      },
      notes: {
        type: Sequelize.TEXT
      },
      customerId: {
        type: Sequelize.UUID,
        references: { model: 'Customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      technicianId: {
        type: Sequelize.UUID,
        references: { model: 'Users', key: 'id' },
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
    await queryInterface.dropTable('Installations');
  }
};
