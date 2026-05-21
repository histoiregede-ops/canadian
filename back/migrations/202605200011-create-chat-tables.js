'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Conversations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      clientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
      },
      adminId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' }
      },
      clientEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('open', 'closed'),
        defaultValue: 'open'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('ChatMessages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      conversationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Conversations', key: 'id', onDelete: 'CASCADE' }
      },
      senderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
      },
      senderRole: {
        type: Sequelize.ENUM('client', 'admin'),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('Conversations', ['clientId']);
    await queryInterface.addIndex('Conversations', ['adminId']);
    await queryInterface.addIndex('Conversations', ['status']);
    await queryInterface.addIndex('ChatMessages', ['conversationId']);
    await queryInterface.addIndex('ChatMessages', ['senderId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ChatMessages');
    await queryInterface.dropTable('Conversations');
  }
};
