'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Users
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      username: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      role: { type: Sequelize.ENUM('admin', 'seller', 'cashier', 'technician', 'delivery'), defaultValue: 'seller' },
      fullName: { type: Sequelize.STRING },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 2. Customers
    await queryInterface.createTable('Customers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, unique: true },
      phone: { type: Sequelize.STRING },
      password: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.TEXT },
      city: { type: Sequelize.STRING },
      country: { type: Sequelize.STRING, defaultValue: 'France' },
      points: { type: Sequelize.INTEGER, defaultValue: 0 },
      loyaltyLevel: { type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'), defaultValue: 'bronze' },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      lastLogin: { type: Sequelize.DATE },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 3. Categories
    await queryInterface.createTable('Categories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.ENUM('solar', 'electronics', 'accessory', 'other'), defaultValue: 'other' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 4. Products
    await queryInterface.createTable('Products', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      photo: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      price: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      stockQuantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      lowStockThreshold: { type: Sequelize.INTEGER, defaultValue: 5 },
      status: { type: Sequelize.STRING, defaultValue: 'available' },
      isFeatured: { type: Sequelize.BOOLEAN, defaultValue: false },
      categoryId: { type: Sequelize.UUID, references: { model: 'Categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 5. Repairs
    await queryInterface.createTable('Repairs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      deviceType: { type: Sequelize.STRING, allowNull: false },
      brand: { type: Sequelize.STRING },
      serialNumber: { type: Sequelize.STRING },
      reportedIssue: { type: Sequelize.TEXT, allowNull: false },
      diagnosis: { type: Sequelize.TEXT },
      resolution: { type: Sequelize.TEXT },
      estimatedCost: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      finalCost: { type: Sequelize.DECIMAL(10, 2) },
      status: { type: Sequelize.ENUM('received', 'diagnosing', 'waiting_parts', 'repairing', 'ready', 'delivered', 'cancelled'), defaultValue: 'received' },
      priority: { type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
      receivedAt: { type: Sequelize.DATE },
      completedAt: { type: Sequelize.DATE },
      customerId: { type: Sequelize.UUID, references: { model: 'Customers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 6. Installations
    await queryInterface.createTable('Installations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      location: { type: Sequelize.STRING, allowNull: false },
      gpsCoordinates: { type: Sequelize.STRING },
      kitType: { type: Sequelize.STRING, allowNull: false },
      components: { type: Sequelize.TEXT },
      powerCapacity: { type: Sequelize.STRING },
      roofType: { type: Sequelize.STRING },
      status: { type: Sequelize.ENUM('survey', 'planned', 'in_progress', 'testing', 'completed', 'cancelled'), defaultValue: 'planned' },
      scheduledDate: { type: Sequelize.DATE },
      completionDate: { type: Sequelize.DATE },
      totalPrice: { type: Sequelize.DECIMAL(12, 2) },
      notes: { type: Sequelize.TEXT },
      customerId: { type: Sequelize.UUID, references: { model: 'Customers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      technicianId: { type: Sequelize.UUID, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 7. Orders
    await queryInterface.createTable('Orders', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      orderNumber: { type: Sequelize.STRING, unique: true },
      subtotal: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      totalAmount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      paidAmount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      discount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      tax: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      paymentMethod: { type: Sequelize.STRING },
      paymentStatus: { type: Sequelize.STRING, defaultValue: 'paid' },
      status: { type: Sequelize.ENUM('pending', 'paid', 'partially_paid', 'cancelled', 'shipped', 'delivered'), defaultValue: 'pending' },
      deliveryAddress: { type: Sequelize.TEXT },
      customerId: { type: Sequelize.UUID, references: { model: 'Customers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 8. OrderItems
    await queryInterface.createTable('OrderItems', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unitPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      totalPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      orderId: { type: Sequelize.UUID, references: { model: 'Orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      productId: { type: Sequelize.UUID, references: { model: 'Products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 9. CashTransactions
    await queryInterface.createTable('CashTransactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      type: { type: Sequelize.ENUM('income', 'expense'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      description: { type: Sequelize.STRING },
      category: { type: Sequelize.STRING },
      date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CashTransactions');
    await queryInterface.dropTable('OrderItems');
    await queryInterface.dropTable('Orders');
    await queryInterface.dropTable('Installations');
    await queryInterface.dropTable('Repairs');
    await queryInterface.dropTable('Products');
    await queryInterface.dropTable('Categories');
    await queryInterface.dropTable('Customers');
    await queryInterface.dropTable('Users');
  }
};
