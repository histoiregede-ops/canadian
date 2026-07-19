const express = require('express');
const router = express.Router();
const { Order, OrderItem, Product, Category, CashTransaction, Customer, Installation } = require('../models');
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

const computeLoyaltyLevel = (points) => {
  if (points >= 1000) return 'platinum';
  if (points >= 500) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
};

const normalizeCustomerData = async (customerId, customerData, transaction) => {
  if (customerId) return customerId;
  if (!customerData) return null;

  let customer = null;
  if (customerData.email) {
    customer = await Customer.findOne({ where: { email: customerData.email }, transaction });
  }

  if (!customer) {
    const email = customerData.email || `guest_${Date.now()}@example.com`;
    customer = await Customer.create({
      name: customerData.fullName || customerData.name || 'Client',
      email,
      phone: customerData.phone,
      address: customerData.address,
      city: customerData.city,
      country: customerData.country || 'France',
      points: 0,
      loyaltyLevel: 'bronze'
    }, { transaction });
  }

  return customer.id;
};

router.post('/', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, customerId, customer, paymentMethod, discount = 0, tax = 0, subtotal = 0, totalAmount = 0, paidAmount = 0, deliveryAddress = '' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'La commande doit contenir au moins un article' });
    }
    for (const item of items) {
      if (!item.productId) {
        await t.rollback();
        return res.status(400).json({ error: 'Chaque article doit avoir un productId' });
      }
      if (!item.quantity || item.quantity <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'La quantité doit être supérieure à 0' });
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Le prix unitaire doit être supérieur à 0' });
      }
    }
    const resolvedCustomerId = await normalizeCustomerData(customerId, customer, t);
    const status = paidAmount >= totalAmount && totalAmount > 0
      ? 'paid'
      : paidAmount > 0
        ? 'partially_paid'
        : 'pending';

    const order = await Order.create({
      orderNumber: `ORD-${Date.now()}`,
      customerId: resolvedCustomerId,
      paymentMethod,
      discount,
      tax,
      subtotal,
      totalAmount,
      paidAmount,
      status,
      deliveryAddress
    }, { transaction: t });

    for (const item of items) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice
      }, { transaction: t });

      const product = await Product.findByPk(item.productId);
      if (product) {
        const prev = product.stockQuantity;
        product.stockQuantity -= item.quantity;
        if (product.stockQuantity < 0) product.stockQuantity = 0;
        await product.save({ transaction: t });
        const threshold = product.lowStockThreshold || 15;
        await sequelize.query(
          'INSERT INTO stock_movements (productId, previousQuantity, newQuantity, changeAmount, reason, reference, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          { replacements: [item.productId, prev, product.stockQuantity, product.stockQuantity - prev, 'sale', order.orderNumber] }
        ).catch(err => console.error('Failed to log stock movement:', err));
        if (product.stockQuantity <= threshold && product.stockQuantity > 0 && global.broadcastNotification) {
          global.broadcastNotification({
            title: 'Stock faible',
            body: `${product.name}: ${product.stockQuantity} unité(s) restante(s)`,
            type: 'low_stock'
          });
        } else if (product.stockQuantity === 0 && global.broadcastNotification) {
          global.broadcastNotification({
            title: 'Rupture de stock',
            body: `${product.name} est en rupture de stock`,
            type: 'out_of_stock'
          });
        }
      }
    }

    if (paidAmount > 0) {
      let customerName = null;
      if (resolvedCustomerId) {
        const c = await Customer.findByPk(resolvedCustomerId, { transaction: t });
        customerName = c ? (c.fullName || c.name) : null;
      }
      await CashTransaction.create({
        type: 'income',
        amount: paidAmount,
        description: `Vente ${order.orderNumber}`,
        category: 'Sales',
        date: new Date(),
        customerId: resolvedCustomerId,
        customerName
      }, { transaction: t });
    }

    if (resolvedCustomerId && totalAmount > 0) {
      const customerRecord = await Customer.findByPk(resolvedCustomerId, { transaction: t });
      if (customerRecord) {
        const pointsEarned = Math.max(0, Math.round(totalAmount / 100));
        const newPoints = (customerRecord.points || 0) + pointsEarned;
        await customerRecord.update({
          points: newPoints,
          loyaltyLevel: computeLoyaltyLevel(newPoints)
        }, { transaction: t });
      }
    }

    await t.commit();

    // Auto-create installation for solar kit orders
    try {
      const orderItems = await OrderItem.findAll({
        where: { orderId: order.id },
        include: [{ model: Product, include: [Category] }]
      });
      const solarItems = orderItems.filter(item => {
        const cat = item.Product?.Category;
        return cat && (cat.type === 'solar' || (cat.name && cat.name.toLowerCase().includes('solaire')));
      });
      if (solarItems.length > 0 && resolvedCustomerId) {
        const [techs] = await sequelize.query(`
          SELECT u.id, u."fullName", COUNT(i.id) as activeJobs
          FROM Users u
          LEFT JOIN Installations i ON i.technicianId = u.id AND i.status IN ('survey', 'planned', 'in_progress')
          WHERE u.role = 'technician'
          GROUP BY u.id
          ORDER BY activeJobs ASC
          LIMIT 1
        `);
        if (techs.length > 0) {
          const tech = techs[0];
          const customer = await Customer.findByPk(resolvedCustomerId);
          await Installation.create({
            orderId: order.id,
            location: customer?.address || 'À définir',
            kitType: solarItems.map(i => i.Product?.name || 'Kit Solaire').join(', '),
            status: 'survey',
            customerId: resolvedCustomerId,
            technicianId: tech.id,
            notes: `Installation auto-générée suite à la commande ${order.orderNumber}`,
            scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
          if (global.broadcastNotification) {
            global.broadcastNotification({
              title: 'Installation planifiée',
              body: `Installation auto-assignée à ${tech.fullName || tech.id} pour commande ${order.orderNumber}`,
              type: 'info'
            });
          }
        }
      }
    } catch (installErr) {
      console.error('Error auto-creating installation:', installErr.message);
    }

    if (global.sendWebSocketNotification && resolvedCustomerId) {
      global.sendWebSocketNotification(resolvedCustomerId, {
        title: 'Commande enregistrée',
        body: `Votre commande ${order.orderNumber} a bien été créée.`,
        type: 'order'
      });
    }

    if (global.broadcastNotification) {
      global.broadcastNotification({
        title: 'Nouvelle commande',
        body: `Une nouvelle commande (${order.orderNumber}) a été enregistrée.`,
        type: 'order'
      });
    }

    res.status(201).json(order);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

// Get all orders
router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: OrderItem, as: 'products' },
        { model: Customer, attributes: ['id', 'name', 'phone'] },
        { model: Installation, attributes: ['id', 'status', 'location'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'products' },
        { model: Customer },
        { model: Installation, attributes: ['id', 'status', 'location', 'scheduledDate'] }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a customer
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.params.customerId },
      include: [{ model: OrderItem, as: 'products' }],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const allowedOrderFields = ['paymentMethod', 'deliveryAddress', 'status'];
    const safeData = {};
    allowedOrderFields.forEach(f => { if (req.body[f] !== undefined) safeData[f] = req.body[f]; });
    await order.update(safeData);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderItems = await OrderItem.findAll({ where: { orderId: order.id }, transaction: t });
    for (const item of orderItems) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (product) {
        const prev = product.stockQuantity;
        product.stockQuantity += item.quantity;
        await product.save({ transaction: t });
        await sequelize.query(
          'INSERT INTO stock_movements (productId, previousQuantity, newQuantity, changeAmount, reason, reference, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          { replacements: [item.productId, prev, product.stockQuantity, product.stockQuantity - prev, 'return', order.orderNumber] }
        ).catch(err => console.error('Failed to log stock movement:', err));
      }
      await item.destroy({ transaction: t });
    }

    if (order.paidAmount > 0) {
      let customerName = null;
      if (order.customerId) {
        const c = await Customer.findByPk(order.customerId, { transaction: t });
        customerName = c ? (c.fullName || c.name) : null;
      }
      await CashTransaction.create({
        type: 'expense',
        amount: order.paidAmount,
        description: `Remboursement annulation ${order.orderNumber}`,
        category: 'Refunds',
        date: new Date(),
        customerId: order.customerId,
        customerName
      }, { transaction: t });
    }

    await order.destroy({ transaction: t });
    await t.commit();

    if (global.broadcastNotification) {
      global.broadcastNotification({
        title: 'Commande annulée',
        body: `La commande ${order.orderNumber} a été annulée et le stock restauré.`,
        type: 'info'
      });
    }

    res.json({ message: 'Order cancelled', orderNumber: order.orderNumber });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
