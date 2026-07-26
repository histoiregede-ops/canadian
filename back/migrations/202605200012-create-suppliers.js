'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Suppliers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        unsigned: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contactName: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING,
        validate: { isEmail: true }
      },
      phone: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.TEXT
      },
      city: {
        type: Sequelize.STRING
      },
      country: {
        type: Sequelize.STRING,
        defaultValue: 'France'
      },
      productTypes: {
        type: Sequelize.STRING,
        comment: 'Types de produits fournis (solar, electronics, accessory)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    await queryInterface.dropTable('Suppliers');
  }
};
