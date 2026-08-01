'use strict';

const SEQUELIZE_DIALECT = process.env.DB_DIALECT || 'mysql';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing columns to Installations table
    try {
      let columnNames = [];
      if (SEQUELIZE_DIALECT === 'mysql') {
        const [columns] = await queryInterface.sequelize.query(
          "SHOW COLUMNS FROM Installations"
        );
        columnNames = columns.map(c => c.Field);
      } else {
        const [columns] = await queryInterface.sequelize.query(
          "PRAGMA table_info('Installations')"
        );
        columnNames = columns.map(c => c.name);
      }

      if (!columnNames.includes('priority')) {
        await queryInterface.addColumn('Installations', 'priority', {
          type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
          defaultValue: 'normal'
        });
        console.log('✅ Added priority column to Installations');
      } else {
        console.log('ℹ️ priority column already exists');
      }

      if (!columnNames.includes('orderId')) {
        await queryInterface.addColumn('Installations', 'orderId', {
          type: Sequelize.UUID,
          allowNull: true
        });
        console.log('✅ Added orderId column to Installations');
      } else {
        console.log('ℹ️ orderId column already exists');
      }
    } catch (err) {
      console.error('Error checking/adding Installations columns:', err.message);
      throw err;
    }

    // Create Suppliers table if it doesn't exist
    try {
      let tableExists = false;
      if (SEQUELIZE_DIALECT === 'mysql') {
        const [results] = await queryInterface.sequelize.query(
          "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Suppliers'"
        );
        tableExists = results.length > 0;
      } else {
        const [results] = await queryInterface.sequelize.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='Suppliers'"
        );
        tableExists = results.length > 0;
      }

      if (!tableExists) {
        await queryInterface.createTable('Suppliers', {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
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
            type: Sequelize.STRING
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
            type: Sequelize.STRING
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
        console.log('✅ Created Suppliers table');
      } else {
        console.log('ℹ️ Suppliers table already exists');
      }
    } catch (err) {
      console.error('Error checking/creating Suppliers table:', err.message);
    }

    // Create PurchaseOrders table if it doesn't exist
    try {
      let tableExists = false;
      if (SEQUELIZE_DIALECT === 'mysql') {
        const [results] = await queryInterface.sequelize.query(
          "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PurchaseOrders'"
        );
        tableExists = results.length > 0;
      } else {
        const [results] = await queryInterface.sequelize.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='PurchaseOrders'"
        );
        tableExists = results.length > 0;
      }

      if (!tableExists) {
        await queryInterface.createTable('PurchaseOrders', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
          },
          supplierId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Suppliers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
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
        console.log('✅ Created PurchaseOrders table');
      } else {
        console.log('ℹ️ PurchaseOrders table already exists');
      }
    } catch (err) {
      console.error('Error checking/creating PurchaseOrders table:', err.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('Installations', 'priority');
    } catch (err) {
      console.log('ℹ️ priority column not found');
    }
    try {
      await queryInterface.removeColumn('Installations', 'orderId');
    } catch (err) {
      console.log('ℹ️ orderId column not found');
    }
  }
};
