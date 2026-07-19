const express = require('express');
const router = express.Router();
const { Order, OrderItem, Product, Repair, Installation, User, Category } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../utils/auth');

router.get('/dashboard', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const now = new Date();

    const monthlyOrders = await Order.sum('totalAmount', {
      where: { createdAt: { [Op.gte]: monthStart }, status: { [Op.notIn]: ['cancelled'] } }
    }) || 0;

    const topProducts = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
        [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
      ],
      include: [{ model: Product, attributes: ['name', 'photo', 'price'] }],
      group: ['productId'],
      order: [[sequelize.literal('totalSold'), 'DESC']],
      limit: 10
    });

    const technicianPerformance = await Installation.findAll({
      attributes: [
        'technicianId',
        [sequelize.fn('COUNT', sequelize.col('Installation.id')), 'totalInstallations']
      ],
      include: [{ model: User, as: 'Technician', attributes: ['fullName', 'username'] }],
      group: ['technicianId'],
      order: [[sequelize.literal('totalInstallations'), 'DESC']]
    });

    const monthlyRevenue = await Order.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('Order.id')), 'orderCount']
      ],
      where: { status: { [Op.notIn]: ['cancelled'] } },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
      limit: 12
    });

    const categoryDistribution = await Product.findAll({
      attributes: [
        'categoryId',
        [sequelize.fn('COUNT', sequelize.col('Product.id')), 'count']
      ],
      include: [{ model: Category, attributes: ['name'] }],
      group: ['categoryId']
    });

    res.json({
      monthlyRevenue: monthlyOrders,
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        name: p.Product?.name || 'Inconnu',
        photo: p.Product?.photo || null,
        price: p.Product?.price || 0,
        totalSold: parseInt(p.dataValues.totalSold) || 0,
        totalRevenue: parseFloat(p.dataValues.totalRevenue) || 0
      })),
      technicianPerformance: technicianPerformance.map(t => ({
        technicianId: t.technicianId,
        fullName: t.Technician?.fullName || t.Technician?.username || 'Inconnu',
        totalInstallations: parseInt(t.dataValues.totalInstallations) || 0,
        totalRevenue: 0
      })),
      revenueEvolution: monthlyRevenue.map(r => ({
        month: r.dataValues.month,
        revenue: parseFloat(r.dataValues.revenue) || 0,
        orderCount: parseInt(r.dataValues.orderCount) || 0
      })),
      categoryDistribution: categoryDistribution.map(c => ({
        categoryId: c.categoryId,
        name: c.Category?.name || 'Inconnu',
        count: parseInt(c.dataValues.count) || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
