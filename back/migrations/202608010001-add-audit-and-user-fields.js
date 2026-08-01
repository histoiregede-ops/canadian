'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableNames = await queryInterface.showAllTables();

    if (!tableNames.includes('AuditLogs')) {
      await queryInterface.createTable('AuditLogs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        username: {
          type: Sequelize.STRING,
          allowNull: true
        },
        role: {
          type: Sequelize.STRING,
          allowNull: true
        },
        entityType: {
          type: Sequelize.STRING,
          allowNull: false
        },
        entityId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        action: {
          type: Sequelize.STRING,
          allowNull: false
        },
        details: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
    }

    const addColumnIfMissing = async (table, column, definition) => {
      const tableInfo = await queryInterface.describeTable(table);
      if (!tableInfo[column]) {
        await queryInterface.addColumn(table, column, definition);
      }
    };

    await addColumnIfMissing('CashTransactions', 'userId', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('CashTransactions', 'username', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('CashTransactions', 'role', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('CashTransactions', 'referenceId', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('CashTransactions', 'referenceType', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('CashTransactions', 'notes', { type: Sequelize.TEXT, allowNull: true });

    await addColumnIfMissing('stock_movements', 'createdBy', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('stock_movements', 'createdByRole', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('stock_movements', 'userId', { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing('stock_movements', 'referenceType', { type: Sequelize.STRING, allowNull: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('AuditLogs');

    const removeColumnIfExists = async (table, column) => {
      const tableInfo = await queryInterface.describeTable(table);
      if (tableInfo[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('CashTransactions', 'userId');
    await removeColumnIfExists('CashTransactions', 'username');
    await removeColumnIfExists('CashTransactions', 'role');
    await removeColumnIfExists('CashTransactions', 'referenceId');
    await removeColumnIfExists('CashTransactions', 'referenceType');
    await removeColumnIfExists('CashTransactions', 'notes');

    await removeColumnIfExists('stock_movements', 'createdBy');
    await removeColumnIfExists('stock_movements', 'createdByRole');
    await removeColumnIfExists('stock_movements', 'userId');
    await removeColumnIfExists('stock_movements', 'referenceType');
  }
};
