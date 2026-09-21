const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Supplier = require('../models/Supplier');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');

// Cache 30s pour éviter le 1590ms vu dans kilo.txt
const supplierCache = new Map();
const SUP_TTL = 30000;
const supGet = (k) => { const e = supplierCache.get(k); if (e && e.expiry > Date.now()) return e.data; if (e) supplierCache.delete(k); return null; };
const supSet = (k, d) => { if (supplierCache.size > 50) supplierCache.delete(supplierCache.keys().next().value); supplierCache.set(k, { data: d, expiry: Date.now() + SUP_TTL }); };
const supClear = () => supplierCache.clear();

router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const cacheKey = `sup:${page}:${limit}`;
    const cached = supGet(cacheKey);
    if (cached) { res.set('X-Cache','HIT'); res.set('Cache-Control','public, max-age=30'); return res.json(cached); }
    const offset = (page - 1) * limit;
    const { count, rows } = await Supplier.findAndCountAll({ 
      order: [['name', 'ASC']],
      limit,
      offset
    });
    const payload = { data: rows, total: count, page, pages: Math.ceil(count / limit) };
    supSet(cacheKey, payload);
    res.set('X-Cache','MISS'); res.set('Cache-Control','public, max-age=30');
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'country', 'contactName', 'contactPerson', 'productTypes', 'isActive', 'notes'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (!data.contactName && req.body.contactPerson) data.contactName = req.body.contactPerson;

    const email = data.email ? String(data.email).trim().toLowerCase() : null;
    if (email) {
      const existing = await Supplier.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Un fournisseur avec cet email existe déjà.' });
      }
    }

    const supplier = await Supplier.create({ ...data, email });
    supClear();
    await logAudit(req, 'Supplier', supplier.id, 'create', { supplier: supplier.name });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'country', 'contactName', 'contactPerson', 'productTypes', 'isActive', 'notes'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (!data.contactName && req.body.contactPerson) data.contactName = req.body.contactPerson;

    const email = data.email ? String(data.email).trim().toLowerCase() : null;
    if (email) {
      const existing = await Supplier.findOne({ where: { email, id: { [Op.ne]: supplier.id } } });
      if (existing) {
        return res.status(409).json({ error: 'Un fournisseur avec cet email existe déjà.' });
      }
    }

    await supplier.update({ ...data, email });
    supClear();
    await logAudit(req, 'Supplier', supplier.id, 'update', data);
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    await supplier.destroy();
    supClear();
    await logAudit(req, 'Supplier', req.params.id, 'delete', { supplier: supplier.name });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
