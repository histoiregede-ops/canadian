const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unsigned: true,
    references: { model: 'Suppliers', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'partial', 'received', 'cancelled'),
    defaultValue: 'pending'
  },
  orderDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  expectedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  receivedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  /** JSON array: [{ productName, description, quantity, unitPrice, receivedQuantity }] */
  items: {
    type: DataTypes.TEXT,
    get() {
      const raw = this.getDataValue('items');
      return raw ? JSON.parse(raw) : [];
    },
    set(value) {
      this.setDataValue('items', JSON.stringify(value));
    }
  },
  /** Dernière date de relance (pour savoir quand relancer à nouveau) */
  lastReminderSent: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  engine: 'InnoDB'
});

module.exports = PurchaseOrder;
