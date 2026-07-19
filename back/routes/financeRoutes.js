const express = require('express');
const router = express.Router();
const { CashTransaction } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');

const { authenticate, authorize } = require('../utils/auth');

const dateFormat = (colRef) => {
  if (sequelize.getDialect() === 'sqlite') return fn('strftime', '%Y-%m', colRef);
  return fn('DATE_FORMAT', colRef, '%Y-%m');
};

router.get('/transactions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const transactions = await CashTransaction.findAll({ order: [['date', 'DESC']] });

    const data = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      type: t.type,
      amount: parseFloat(t.amount),
      category: t.category,
      customerId: t.customerId,
      customerName: t.customerName,
      comment: t.comment,
      status: 'paid'
    }));

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const summary = {
      revenue: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      paid: totalIncome,
      pending: 0
    };

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyData = await CashTransaction.findAll({
      attributes: [
        [dateFormat(col('date')), 'month'],
        [fn('sum', literal("CASE WHEN type = 'income' THEN amount ELSE 0 END")), 'income'],
        [fn('sum', literal("CASE WHEN type = 'expense' THEN amount ELSE 0 END")), 'expense']
      ],
      where: { date: { [Op.gte]: sixMonthsAgo } },
      group: [dateFormat(col('date'))],
      order: [[dateFormat(col('date')), 'ASC']],
      raw: true
    });

    const evolution = monthlyData.map(m => parseFloat(m.income) || 0);

    const categoryData = await CashTransaction.findAll({
      attributes: [
        'category',
        [fn('sum', col('amount')), 'total']
      ],
      where: { type: 'income' },
      group: ['category'],
      raw: true
    });
    const categoryNames = categoryData.map(c => c.category || 'Autre');
    const categoryValues = categoryData.map(c => parseFloat(c.total) || 0);

    res.json({ data, summary, chartData: { evolution, categories: { labels: categoryNames, values: categoryValues } } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    }
    const transactions = await CashTransaction.findAll({ where });
    let totalIncome = 0, totalExpense = 0;
    for (const t of transactions) {
      const amount = parseFloat(t.amount);
      if (t.type === 'income') totalIncome += amount;
      else totalExpense += amount;
    }
    res.json({ totalIncome, totalExpense, balance: totalIncome - totalExpense });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    }
    const transactions = await CashTransaction.findAll({
      where,
      order: [['date', 'DESC']]
    });

    const grouped = {};
    for (const t of transactions) {
      const dayKey = new Date(t.date).toISOString().split('T')[0];
      if (!grouped[dayKey]) {
        grouped[dayKey] = { date: dayKey, income: 0, expense: 0, balance: 0, transactions: [] };
      }
      const amount = parseFloat(t.amount);
      const d = new Date(t.date);
      grouped[dayKey].transactions.push({
        id: t.id,
        description: t.description,
        type: t.type,
        amount,
        category: t.category,
        customerId: t.customerId,
        customerName: t.customerName,
        comment: t.comment,
        time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: t.date
      });
      if (t.type === 'income') grouped[dayKey].income += amount;
      else grouped[dayKey].expense += amount;
      grouped[dayKey].balance = grouped[dayKey].income - grouped[dayKey].expense;
    }

    const days = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    res.json(days);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/flux-journalier', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate + 'T00:00:00');
      if (endDate) where.date[Op.lte] = new Date(endDate + 'T23:59:59');
    }
    const transactions = await CashTransaction.findAll({
      where,
      order: [['date', 'ASC']]
    });

    let income = 0, expense = 0;
    const items = transactions.map(t => {
      const amount = parseFloat(t.amount);
      if (t.type === 'income') income += amount;
      else expense += amount;
      const d = new Date(t.date);
      return {
        id: t.id,
        time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        description: t.description,
        type: t.type,
        amount,
        category: t.category,
        customerId: t.customerId,
        customerName: t.customerName,
        comment: t.comment
      };
    });

    res.json({
      startDate: startDate || null,
      endDate: endDate || null,
      income,
      expense,
      balance: income - expense,
      transactions: items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/transactions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { customerId, customerName, amount, type } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ error: 'Le montant doit être supérieur à 0' });
    if (!type || !['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Le type doit être income ou expense' });
    const allowedFields = ['type', 'amount', 'description', 'category', 'date', 'comment'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    data.customerId = customerId || null;
    data.customerName = customerName || null;
    const transaction = await CashTransaction.create(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/transactions/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (req.body.amount !== undefined && (isNaN(req.body.amount) || Number(req.body.amount) <= 0)) {
      return res.status(400).json({ error: 'Le montant doit être supérieur à 0' });
    }
    if (req.body.type !== undefined && !['income', 'expense'].includes(req.body.type)) {
      return res.status(400).json({ error: 'Le type doit être income ou expense' });
    }
    const allowedFields = ['type', 'amount', 'description', 'category', 'date', 'comment', 'customerId', 'customerName'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const [updated] = await CashTransaction.update(data, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Transaction not found' });
    const transaction = await CashTransaction.findByPk(req.params.id);
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/transactions/:id/comment', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { comment } = req.body;
    const [updated] = await CashTransaction.update({ comment }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Comment updated', id: req.params.id, comment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/transactions/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deleted = await CashTransaction.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
