const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { authenticate, authorize } = require('../utils/auth');
const { Op } = require('sequelize');

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const filters = [];
    const replacements = [];

    if (req.query.userId) {
      filters.push('userId = ?');
      replacements.push(req.query.userId);
    }
    if (req.query.entityType) {
      filters.push('entityType = ?');
      replacements.push(req.query.entityType);
    }
    if (req.query.action) {
      filters.push('action = ?');
      replacements.push(req.query.action);
    }
    if (req.query.startDate) {
      filters.push('createdAt >= ?');
      replacements.push(req.query.startDate);
    }
    if (req.query.endDate) {
      filters.push('createdAt <= ?');
      replacements.push(req.query.endDate + ' 23:59:59');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const query = `SELECT * FROM AuditLogs ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    replacements.push(limit, offset);
    const [logs] = await AuditLog.sequelize.query(query, { replacements, raw: true });
    const [countResult] = await AuditLog.sequelize.query(`SELECT COUNT(*) as total FROM AuditLogs ${whereClause}`, { replacements: replacements.slice(0, -2) });
    const total = countResult?.[0]?.total || 0;

    res.json({
      data: logs,
      total: Number(total),
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
