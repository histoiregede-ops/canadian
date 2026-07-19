const express = require('express');
const router = express.Router();
const { Product, Order, OrderItem, Customer, Repair, Installation, CashTransaction } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../utils/auth');

router.get('/dashboard', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyIncome = await CashTransaction.sum('amount', {
      where: {
        type: 'income',
        date: { [Op.gte]: today }
      }
    }) || 0;

    const dailyExpense = await CashTransaction.sum('amount', {
      where: {
        type: 'expense',
        date: { [Op.gte]: today }
      }
    }) || 0;

    const dailyOrders = await Order.count({
      where: {
        createdAt: { [Op.gte]: today }
      }
    });

    const activeRepairs = await Repair.count({
      where: {
        status: { [Op.notIn]: ['delivered', 'cancelled'] }
      }
    });

    const plannedInstallations = await Installation.count({
      where: {
        status: 'planned'
      }
    });

    const lowStockProducts = await Product.count({
      where: {
        stockQuantity: { [Op.lte]: 5 }
      }
    });

    res.json({
      dailyIncome,
      dailyExpense,
      dailyOrders,
      activeRepairs,
      plannedInstallations,
      lowStockProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/recent-orders', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: Customer, attributes: ['name'] },
        { model: OrderItem, as: 'products', include: [{ model: Product, attributes: ['name'] }] },
        { model: Installation, attributes: ['id', 'status', 'location'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const formatted = orders.map(order => {
      const items = order.products || [];
      const firstProduct = items[0];
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.Customer ? order.Customer.name : 'Client',
        productName: firstProduct ? (firstProduct.Product ? firstProduct.Product.name : 'Produit') : 'Produit',
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        Installations: order.Installations || []
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/urgent-repairs', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const repairs = await Repair.findAll({
      include: [{ model: Customer, attributes: ['name'] }],
      where: {
        status: { [Op.notIn]: ['delivered', 'cancelled'] }
      },
      order: [
        [Customer, 'name', 'ASC']
      ],
      limit: 10
    });

    const formatted = repairs.map(repair => ({
      id: repair.id,
      deviceType: repair.deviceType,
      brand: repair.brand,
      reportedIssue: repair.reportedIssue,
      status: repair.status,
      priority: repair.priority,
      customerName: repair.Customer ? repair.Customer.name : 'Client',
      receivedAt: repair.receivedAt,
      estimatedCost: repair.estimatedCost
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
