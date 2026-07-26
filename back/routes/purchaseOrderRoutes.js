const express = require('express');
const router = express.Router();
const { PurchaseOrder, Supplier } = require('../models');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../utils/auth');

// Helper to generate order number
async function generateOrderNumber() {
  const count = await PurchaseOrder.count();
  const year = new Date().getFullYear();
  const num = String(count + 1).padStart(4, '0');
  return `PO-${year}-${num}`;
}

// GET /api/purchase-orders — list all
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      include: [{ model: Supplier, attributes: ['id', 'name', 'phone', 'contactName'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchase-orders/overdue — orders past expected date (for reminders)
router.get('/overdue', authenticate, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const orders = await PurchaseOrder.findAll({
      where: {
        status: { [Op.in]: ['pending', 'confirmed', 'partial'] },
        expectedDate: { [Op.lt]: today.toISOString().split('T')[0] }
      },
      include: [{ model: Supplier, attributes: ['id', 'name', 'phone', 'contactName'] }],
      order: [['expectedDate', 'ASC']]
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: Supplier, attributes: ['id', 'name', 'phone', 'contactName', 'email'] }]
    });
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const orderNumber = await generateOrderNumber();
    const allowedFields = ['supplierId', 'expectedDate', 'notes', 'items', 'totalAmount'];
    const data = { orderNumber, status: 'pending' };
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const order = await PurchaseOrder.create(data);
    const full = await PurchaseOrder.findByPk(order.id, {
      include: [{ model: Supplier, attributes: ['id', 'name', 'phone', 'contactName'] }]
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/purchase-orders/:id — update (status, dates, items, etc.)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });

    const allowedFields = ['status', 'expectedDate', 'receivedDate', 'totalAmount', 'notes', 'items', 'lastReminderSent'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

    await order.update(data);
    const updated = await PurchaseOrder.findByPk(order.id, {
      include: [{ model: Supplier, attributes: ['id', 'name', 'phone', 'contactName'] }]
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/receive — mark as received/partial
router.post('/:id/receive', authenticate, authorize('admin'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });

    const { items } = req.body;
    const allReceived = items.every(item => item.receivedQuantity >= item.quantity);
    const anyReceived = items.some(item => item.receivedQuantity > 0);

    await order.update({
      items,
      status: allReceived ? 'received' : anyReceived ? 'partial' : order.status,
      receivedDate: allReceived ? new Date().toISOString().split('T')[0] : null
    });

    const updated = await PurchaseOrder.findByPk(order.id, {
      include: [{ model: Supplier, attributes: ['id', 'name', 'phone', 'contactName'] }]
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/remind — mark reminder sent
router.post('/:id/remind', authenticate, authorize('admin'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });

    const today = new Date().toISOString().split('T')[0];
    await order.update({ lastReminderSent: today });

    const supplier = await Supplier.findByPk(order.supplierId);
    res.json({
      message: 'Relance enregistrée',
      order,
      supplier: supplier ? { name: supplier.name, phone: supplier.phone } : null,
      whatsappLink: supplier?.phone
        ? `https://wa.me/${supplier.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Bonjour ${supplier.contactName || supplier.name}, nous vous relançons concernant notre commande ${order.orderNumber} du ${order.orderDate}. Merci de nous tenir informé de l'état d'avancement. Cordialement.`
          )}`
        : null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/purchase-orders/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deleted = await PurchaseOrder.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Purchase order not found' });
    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
