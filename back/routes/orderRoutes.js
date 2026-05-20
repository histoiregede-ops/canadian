const express = require('express');
const router = express.Router();
const { Order, OrderItem, Product, CashTransaction, Customer } = require('../models');
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

router.post('/', async (req, res) => {
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
        // Log stock movement outside transaction to avoid deadlocks
        await sequelize.query(
          'INSERT INTO stock_movements (productId, previousQuantity, newQuantity, changeAmount, reason, reference, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          { replacements: [item.productId, prev, product.stockQuantity, product.stockQuantity - prev, 'sale', order.orderNumber] }
        ).catch(() => {});
        // Broadcast low stock alert
        if (product.stockQuantity <= 15 && product.stockQuantity > 0 && global.broadcastNotification) {
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
        body: `Une nouvelle commande (${order.orderNumber}) a été enregistrée.`
      });
    }

    res.status(201).json(order);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

// Get single order with items
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'products' },
        { model: Customer }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a customer
router.get('/customer/:customerId', async (req, res) => {
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

    await order.update(req.body);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
