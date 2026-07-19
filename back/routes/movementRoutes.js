const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { productId, reason, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM stock_movements WHERE 1=1';
    const replacements = [];

    if (productId) {
      query += ' AND productId = ?';
      replacements.push(productId);
    }
    if (reason) {
      query += ' AND reason = ?';
      replacements.push(reason);
    }
    if (startDate) {
      query += ' AND createdAt >= ?';
      replacements.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      replacements.push(endDate + ' 23:59:59');
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    replacements.push(Number(limit), Number(offset));

    const [movements] = await sequelize.query(query, { replacements });

    const [countResult] = await sequelize.query(
      'SELECT COUNT(*) as total FROM stock_movements WHERE 1=1' +
      (productId ? ' AND productId = ?' : '') +
      (reason ? ' AND reason = ?' : '') +
      (startDate ? ' AND createdAt >= ?' : '') +
      (endDate ? ' AND createdAt <= ?' : ''),
      { replacements: replacements.slice(0, -2) }
    );

    const total = countResult?.[0]?.total || 0;

    res.json({
      movements,
      total: Number(total),
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { productId, reason, startDate, endDate } = req.query;

    let query = 'SELECT * FROM stock_movements WHERE 1=1';
    const replacements = [];

    if (productId) {
      query += ' AND productId = ?';
      replacements.push(productId);
    }
    if (reason) {
      query += ' AND reason = ?';
      replacements.push(reason);
    }
    if (startDate) {
      query += ' AND createdAt >= ?';
      replacements.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      replacements.push(endDate + ' 23:59:59');
    }

    const [movements] = await sequelize.query(query, { replacements });

    const byReason = {};
    const byProduct = {};

    movements.forEach((m) => {
      byReason[m.reason] = (byReason[m.reason] || 0) + 1;

      const key = m.productId;
      if (!byProduct[key]) {
        byProduct[key] = { productId: m.productId, productName: m.productId, count: 0 };
      }
      byProduct[key].count++;
    });

    const dateRange = movements.length > 0 ? {
      start: movements[movements.length - 1].createdAt,
      end: movements[0].createdAt
    } : { start: null, end: null };

    res.json({
      total: movements.length,
      byReason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })),
      byProduct: Object.values(byProduct),
      dateRange
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reasons', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const [reasons] = await sequelize.query(
      'SELECT DISTINCT reason FROM stock_movements ORDER BY reason'
    );
    res.json(reasons.map((r) => r.reason));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/product/:productId', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const [movements] = await sequelize.query(
      'SELECT * FROM stock_movements WHERE productId = ? ORDER BY createdAt DESC LIMIT 100',
      { replacements: [req.params.productId] }
    );
    res.json({
      movements,
      total: movements.length,
      page: 1,
      pages: 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
