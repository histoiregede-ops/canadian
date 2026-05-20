'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      orderNumber: {
        type: Sequelize.STRING,
        unique: true
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      paidAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'partially_paid', 'cancelled', 'shipped', 'delivered'),
        defaultValue: 'pending'
      },
      paymentMethod: {
        type: Sequelize.STRING
      },
      tax: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      deliveryAddress: {
        type: Sequelize.TEXT
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

    await queryInterface.createTable('OrderItems', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      totalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      orderId: {
        type: Sequelize.UUID,
        references: { model: 'Orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        references: { model: 'Products', key: 'id' },
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
    await queryInterface.dropTable('OrderItems');
    await queryInterface.dropTable('Orders');
  }
};
