const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Category = require('./Category'); // Assuming Category model exists
const Supplier = require('./Supplier');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('available', 'out_of_stock', 'on_order'),
    defaultValue: 'available'
  },
  photo: { // New field for image path
    type: DataTypes.STRING,
    allowNull: true // Image is optional
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lowStockThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

// Associations
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(Product, { foreignKey: 'supplierId' });

module.exports = Product;