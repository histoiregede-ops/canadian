const express = require('express');
const router = express.Router();
const { Product, Order, OrderItem, Customer, Repair, Installation, CashTransaction } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../utils/auth');

// cache 30s pour dashboard (6 COUNT en parallèle sinon ~2.5s comme vu dans kilo.txt)
const statsCache = new Map();
const STATS_TTL = 30000;
router.get('/dashboard', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const cacheKey = 'dashboard';
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=30');
      return res.json(cached.data);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t0 = Date.now();
    const [dailyIncome, dailyExpense, dailyOrders, activeRepairs, plannedInstallations, lowStockProducts] = await Promise.all([
      CashTransaction.sum('amount', { where: { type: 'income', date: { [Op.gte]: today } } }) || 0,
      CashTransaction.sum('amount', { where: { type: 'expense', date: { [Op.gte]: today } } }) || 0,
      Order.count({ where: { createdAt: { [Op.gte]: today } } }),
      Repair.count({ where: { status: { [Op.notIn]: ['delivered', 'cancelled'] } } }),
      Installation.count({ where: { status: 'planned' } }),
      Product.count({ where: { stockQuantity: { [Op.lte]: 1 } } })
    ]);
    const data = { dailyIncome: dailyIncome || 0, dailyExpense: dailyExpense || 0, dailyOrders, activeRepairs, plannedInstallations, lowStockProducts };
    statsCache.set(cacheKey, { data, expiry: Date.now() + STATS_TTL });
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'public, max-age=30');
    console.log(`[PERF] GET /api/stats/dashboard TOTAL=${Date.now() - t0}ms (6 queries parallèles)`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/recent-orders', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: Customer, attributes: ['name'] },
        { model: OrderItem, as: 'products', include: [{ model: Product, attributes: ['name'] }] },
        { model: Installation, attributes: ['id', 'status', 'location'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const formatted = orders.map(order => {
      const items = order.products || [];
      const firstProduct = items[0];
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.Customer ? order.Customer.name : 'Client',
        productName: firstProduct ? (firstProduct.Product ? firstProduct.Product.name : 'Produit') : 'Produit',
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        Installations: order.Installations || []
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/urgent-repairs', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const repairs = await Repair.findAll({
      include: [{ model: Customer, attributes: ['name'] }],
      where: {
        status: { [Op.notIn]: ['delivered', 'cancelled'] }
      },
      order: [
        [Customer, 'name', 'ASC']
      ],
      limit: 10
    });

    const formatted = repairs.map(repair => ({
      id: repair.id,
      deviceType: repair.deviceType,
      brand: repair.brand,
      reportedIssue: repair.reportedIssue,
      status: repair.status,
      priority: repair.priority,
      customerName: repair.Customer ? repair.Customer.name : 'Client',
      receivedAt: repair.receivedAt,
      estimatedCost: repair.estimatedCost
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
