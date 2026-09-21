const express = require('express');
const router = express.Router();
const { Repair, Customer } = require('../models');
const { authenticate, authorize } = require('../utils/auth');

// Cache 30s - 1152ms vu dans kilo.txt
const repairCache = new Map();
const REP_TTL = 30000;
const repGet = (k) => { const e = repairCache.get(k); if (e && e.expiry > Date.now()) return e.data; if (e) repairCache.delete(k); return null; };
const repSet = (k,d) => { if (repairCache.size>50) repairCache.delete(repairCache.keys().next().value); repairCache.set(k,{data:d,expiry:Date.now()+REP_TTL}); };
const repClear = () => repairCache.clear();

// Get all repairs
router.get('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const cacheKey = `rep:${page}:${limit}`;
    const cached = repGet(cacheKey);
    if (cached) { res.set('X-Cache','HIT'); res.set('Cache-Control','public, max-age=30'); return res.json(cached); }
    const offset = (page - 1) * limit;
    const { count, rows } = await Repair.findAndCountAll({ 
      include: [Customer],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    const payload = { data: rows, total: count, page, pages: Math.ceil(count / limit) };
    repSet(cacheKey, payload);
    res.set('X-Cache','MISS'); res.set('Cache-Control','public, max-age=30');
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single repair
router.get('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const repair = await Repair.findByPk(req.params.id, { include: [Customer] });
    if (!repair) return res.status(404).json({ message: 'Repair not found' });
    res.json(repair);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create repair
router.post('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const allowedFields = ['customerId', 'deviceType', 'brand', 'serialNumber', 'reportedIssue', 'diagnosis', 'resolution',
      'estimatedCost', 'finalCost', 'status', 'priority', 'receivedAt', 'completedAt', 'notes'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const repair = await Repair.create(data);
    repClear();
    res.status(201).json(repair);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update repair
router.put('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const allowedFields = ['deviceType', 'brand', 'serialNumber', 'reportedIssue', 'diagnosis', 'resolution',
      'estimatedCost', 'finalCost', 'status', 'priority', 'receivedAt', 'completedAt', 'notes'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const [updated] = await Repair.update(data, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: 'Repair not found' });
    repClear();
    const updatedRepair = await Repair.findByPk(req.params.id);
    res.json(updatedRepair);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete repair
router.delete('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const deleted = await Repair.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ message: 'Repair not found' });
    repClear();
    res.json({ message: 'Repair deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
