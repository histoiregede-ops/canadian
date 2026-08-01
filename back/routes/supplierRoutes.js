const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');

router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await Supplier.findAndCountAll({ 
      order: [['name', 'ASC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, pages: Math.ceil(count / limit) });
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
    const supplier = await Supplier.create(data);
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
    await supplier.update(data);
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
    await logAudit(req, 'Supplier', req.params.id, 'delete', { supplier: supplier.name });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
