const express = require('express');
const router = express.Router();
const { Product, Order, Repair, Installation, CashTransaction } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../utils/auth');

router.get('/dashboard', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // CA du jour
    const dailyIncome = await CashTransaction.sum('amount', {
      where: {
        type: 'income',
        date: { [Op.gte]: today }
      }
    }) || 0;

    // Dépenses du jour
    const dailyExpense = await CashTransaction.sum('amount', {
      where: {
        type: 'expense',
        date: { [Op.gte]: today }
      }
    }) || 0;

    // Ventes du jour
    const dailyOrders = await Order.count({
      where: {
        createdAt: { [Op.gte]: today }
      }
    });

    // Réparations en cours
    const activeRepairs = await Repair.count({
      where: {
        status: { [Op.notIn]: ['delivered', 'cancelled'] }
      }
    });

    // Installations planifiées
    const plannedInstallations = await Installation.count({
      where: {
        status: 'planned'
      }
    });

    // Stock faible
    const lowStockProducts = await Product.count({
      where: {
        // Seuil de stock faible fixé à 5. Vous pouvez ajuster cette valeur.
        stockQuantity: { [Op.lte]: 5 }
      }
    });

    res.json({
      dailyIncome,
      dailyExpense,
      dailyOrders,
      activeRepairs,
      plannedInstallations,
      lowStockProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
