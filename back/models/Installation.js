const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Installation = sequelize.define('Installation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gpsCoordinates: {
    type: DataTypes.STRING
  },
  kitType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  components: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('components');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('components', JSON.stringify(value));
    }
  },
  powerCapacity: {
    type: DataTypes.STRING
  },
  roofType: {
    type: DataTypes.STRING
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  status: {
    type: DataTypes.ENUM('survey', 'planned', 'in_progress', 'testing', 'completed', 'cancelled'),
    defaultValue: 'planned'
  },
  scheduledDate: {
    type: DataTypes.DATE
  },
  completionDate: {
    type: DataTypes.DATE
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2)
  },
  notes: {
    type: DataTypes.TEXT
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

module.exports = Installation;
