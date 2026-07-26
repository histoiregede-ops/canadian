const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    unsigned: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactName: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  city: {
    type: DataTypes.STRING
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'France'
  },
  productTypes: {
    type: DataTypes.STRING,
    comment: 'Types de produits fournis (solar, electronics, accessory)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  engine: 'InnoDB'
});

module.exports = Supplier;
