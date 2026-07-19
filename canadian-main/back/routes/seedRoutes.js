const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const path = require('path');
const { authenticate, authorize } = require('../utils/auth');

router.get('/seed', authenticate, authorize('admin'), async (req, res) => {
  try {
    await sequelize.sync({ force: true });
    const seeders = [
      '202605200001-default-data',
    ];
    for (const seeder of seeders) {
      const seed = require(path.join(__dirname, '..', 'seeders', seeder));
      await seed.up(sequelize.getQueryInterface());
    }
    res.json({ message: 'Base de données initialisée avec les données de base', users: 'admin/admin123, cashier1/cashier123, tech1/password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seed-all', authenticate, authorize('admin'), async (req, res) => {
  try {
    await sequelize.sync({ force: true });
    const seedFiles = [
      '20260520000001-users',
      '20260520000002-categories',
      '20260520000003-products',
      '20260520000004-customers',
      '20260520000005-orders',
      '20260520000006-repairs',
      '20260520000007-installations',
      '20260520000008-transactions',
      '20260520000009-reviews',
      '20260520000010-payments',
    ];
    for (const file of seedFiles) {
      const seed = require(path.join(__dirname, '..', 'seeders', file));
      await seed.up(sequelize.getQueryInterface());
    }
    res.json({
      message: 'Base de données initialisée avec toutes les données de démonstration',
      users: 'admin/admin123, caissier1/caisse123, amadou/tech123, jean/tech123, sarah/tech123',
      count: { users: 5, categories: 4, products: 20, customers: 5, orders: 3, repairs: 3, installations: 3, transactions: 5, reviews: 6, payments: 3 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
