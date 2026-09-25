const express = require('express');
const router = express.Router();
const { Product, Order, OrderItem, Customer, Repair, Installation, CashTransaction } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../utils/auth');
const { cache: redisCache, isRedisAvailable, initRedis } = require('../config/redis');

initRedis();

// cache 30s pour dashboard (6 COUNT en parallèle sinon ~2.5s comme vu dans kilo.txt)
const statsCache = new Map();
const STATS_TTL = 30000;

// Cache invalidation helper - clears stats cache on data mutation
const invalidateStatsCache = async () => {
  const keys = ['stats:dashboard'];
  statsCache.clear();
  for (const key of keys) {
    if (redisCache && isRedisAvailable()) {
      try {
        await redisCache.del(key);
      } catch (error) {
        console.warn(`[StatsRoutes] Redis DEL error for ${key}:`, error.message);
      }
    }
  }
};

router.get('/dashboard', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const cacheKey = 'stats:dashboard';

    // Try in-memory cache first (faster)
    const memoryResult = statsCache.get(cacheKey);
    if (memoryResult && memoryResult.expiry > Date.now()) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=30');
      return res.json(memoryResult.data);
    }

    // Try Redis cache
    if (redisCache && isRedisAvailable()) {
      try {
        const redisResult = await redisCache.get(cacheKey);
        if (redisResult) {
          statsCache.set(cacheKey, { data: redisResult, expiry: Date.now() + STATS_TTL });
          res.set('X-Cache', 'HIT');
          res.set('Cache-Control', 'public, max-age=30');
          return res.json(redisResult);
        }
      } catch (error) {
        console.warn('[StatsRoutes] Redis GET error:', error.message);
      }
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

    // Store in Redis with 30s TTL
    if (redisCache && isRedisAvailable()) {
      try {
        await redisCache.set(cacheKey, data, 30);
      } catch (error) {
        console.warn('[StatsRoutes] Redis SET error:', error.message);
      }
    }

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
      const cacheKey = 'stats:recent-orders';

      // Try in-memory cache first
      const memoryResult = statsCache.get(cacheKey);
      if (memoryResult && memoryResult.expiry > Date.now()) {
        res.set('X-Cache', 'HIT');
        return res.json(memoryResult.data);
      }

      // Try Redis cache
      if (redisCache && isRedisAvailable()) {
        try {
          const redisResult = await redisCache.get(cacheKey);
          if (redisResult) {
            statsCache.set(cacheKey, { data: redisResult, expiry: Date.now() + STATS_TTL });
            res.set('X-Cache', 'HIT');
            return res.json(redisResult);
          }
        } catch (error) {
          console.warn('[StatsRoutes] Redis GET error:', error.message);
        }
      }

      const orders = await Order.findAll({
        attributes: ['id', 'orderNumber', 'customerId', 'subtotal', 'totalAmount', 'status', 'createdAt'],
        include: [
          { model: Customer, attributes: ['id', 'name'] },
          { model: OrderItem, as: 'products', attributes: ['id', 'productId', 'quantity', 'unitPrice', 'totalPrice'], include: [{ model: Product, attributes: ['id', 'name'] }] },
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

      // Cache the result
      statsCache.set(cacheKey, { data: formatted, expiry: Date.now() + STATS_TTL });
      if (redisCache && isRedisAvailable()) {
        try {
          await redisCache.set(cacheKey, formatted, 30);
        } catch (error) {
          console.warn('[StatsRoutes] Redis SET error:', error.message);
        }
      }

      res.set('X-Cache', 'MISS');
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

router.get('/dashboard/urgent-repairs', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const cacheKey = 'stats:urgent-repairs';

    // Try in-memory cache first
    const memoryResult = statsCache.get(cacheKey);
    if (memoryResult && memoryResult.expiry > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.json(memoryResult.data);
    }

    // Try Redis cache
    if (redisCache && isRedisAvailable()) {
      try {
        const redisResult = await redisCache.get(cacheKey);
        if (redisResult) {
          statsCache.set(cacheKey, { data: redisResult, expiry: Date.now() + STATS_TTL });
          res.set('X-Cache', 'HIT');
          return res.json(redisResult);
        }
      } catch (error) {
        console.warn('[StatsRoutes] Redis GET error:', error.message);
      }
    }

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

    // Cache the result
    statsCache.set(cacheKey, { data: formatted, expiry: Date.now() + STATS_TTL });
    if (redisCache && isRedisAvailable()) {
      try {
        await redisCache.set(cacheKey, formatted, 30);
      } catch (error) {
        console.warn('[StatsRoutes] Redis SET error:', error.message);
      }
    }

    res.set('X-Cache', 'MISS');
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
