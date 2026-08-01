const express = require('express');
const router = express.Router();
const { Transfer } = require('../models');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const { Op } = require('sequelize');

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.operator) where.operator = req.query.operator;
    if (req.query.type) where.type = req.query.type;
    if (req.query.transferType) where.transferType = req.query.transferType;
    if (req.query.country) where.country = req.query.country;
    if (req.query.status) where.status = req.query.status;
    if (req.query.agentId) where.agentId = req.query.agentId;

    if (req.query.from) {
      const from = new Date(req.query.from);
      from.setHours(0, 0, 0, 0);
      where.createdAt = { [Op.gte]: from };
    }
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      where.createdAt = where.createdAt || {};
      where.createdAt[Op.lte] = to;
    }

    const { count, rows } = await Transfer.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary/daily', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { start, end } = getTodayRange();
    const agentId = req.query.agentId;

    const where = {
      createdAt: { [require('sequelize').Op.gte]: start, [require('sequelize').Op.lte]: end },
      status: 'completed'
    };
    if (agentId) where.agentId = agentId;

    const rows = await Transfer.findAll({ where });

    const summary = {
      totalSent: 0,
      totalReceived: 0,
      totalFees: 0,
      count: rows.length,
      byOperator: {}
    };

    rows.forEach(row => {
      if (row.type === 'sent') summary.totalSent += Number(row.amount);
      if (row.type === 'received') summary.totalReceived += Number(row.amount);
      summary.totalFees += Number(row.fees);

      const op = row.operator;
      if (!summary.byOperator[op]) summary.byOperator[op] = { sent: 0, received: 0, fees: 0, count: 0 };
      summary.byOperator[op][row.type] += Number(row.amount);
      summary.byOperator[op].fees += Number(row.fees);
      summary.byOperator[op].count += 1;
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { operator, type, transferType, country, amount, fees, customerPhone, agentId, agentName, reference, status, note } = req.body;

    if (!operator || !type || amount === undefined) {
      return res.status(400).json({ error: 'Opérateur, type et montant sont requis' });
    }

    const transfer = await Transfer.create({
      operator,
      type,
      transferType: transferType || 'national',
      country: country || 'ML',
      amount,
      fees: fees || 0,
      customerPhone,
      agentId,
      agentName,
      reference,
      status: status || 'pending',
      note
    });
    await logAudit(req, 'Transfer', transfer.id, 'create', { operator, type, amount, fees, status: transfer.status, reference });

    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const transfer = await Transfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfert non trouvé' });

    const allowed = ['operator', 'type', 'transferType', 'country', 'amount', 'fees', 'customerPhone', 'agentId', 'agentName', 'reference', 'status', 'note'];
    const data = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) { transfer[f] = req.body[f]; data[f] = req.body[f]; } });

    await transfer.save();
    await logAudit(req, 'Transfer', transfer.id, 'update', data);
    res.json(transfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const transfer = await Transfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfert non trouvé' });
    await transfer.destroy();
    await logAudit(req, 'Transfer', req.params.id, 'delete', { reference: transfer.reference, amount: transfer.amount, status: transfer.status });
    res.json({ message: 'Transfert supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/confirm', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const transfer = await Transfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfert non trouvé' });
    await transfer.update({ status: 'completed' });
    await logAudit(req, 'Transfer', transfer.id, 'confirm', { reference: transfer.reference, amount: transfer.amount, status: 'completed' });
    res.json(transfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/fail', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const transfer = await Transfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfert non trouvé' });
    await transfer.update({ status: 'failed' });
    await logAudit(req, 'Transfer', transfer.id, 'fail', { reference: transfer.reference, amount: transfer.amount, status: 'failed' });
    res.json(transfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
