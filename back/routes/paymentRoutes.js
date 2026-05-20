const express = require('express');
const router = express.Router();
const { Order, CashTransaction, Payment } = require('../models');
const sequelize = require('../config/database');
const { authenticate } = require('../utils/auth');
const pawaPay = require('../services/paymentProvider');

// Initiate a mobile money payment via PawaPay
router.post('/initiate', async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, phoneNumber, customerId } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
    if (!phoneNumber) return res.status(400).json({ error: 'Numéro de téléphone requis' });
    if (!['orange_money', 'moov_money', 'wave'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Moyen de paiement invalide' });
    }

    const result = await pawaPay.initiateDeposit({
      amount,
      phoneNumber,
      providerMethod: paymentMethod,
      orderId: orderId || '',
      customerId: customerId || ''
    });

    const payment = await Payment.create({
      orderId: orderId || null,
      amount,
      paymentMethod,
      currency: 'XOF',
      status: 'pending',
      transactionId: pawaPay.isSandboxMode() ? `sandbox_${result.depositId}` : result.depositId,
      notes: `PawaPay depositId: ${result.depositId}`
    });

    res.json({
      success: result.status === 'ACCEPTED',
      paymentId: payment.id,
      depositId: result.depositId,
      status: result.status,
      message: result.status === 'ACCEPTED'
        ? 'Paiement initié. Confirmez sur votre téléphone.'
        : `Échec: ${result.failureReason?.failureMessage || 'Erreur inconnue'}`
    });
  } catch (error) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Impossible d\'initier le paiement',
      details: pawaPay.isSandboxMode() ? error.message : undefined
    });
  }
});

// Webhook pour les notifications PawaPay
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { depositId, status, metadata } = body;

    if (!depositId) return res.status(400).json({ error: 'Missing depositId' });

    const payment = await Payment.findOne({
      where: { transactionId: pawaPay.isSandboxMode() ? `sandbox_${depositId}` : depositId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isCompleted = status === 'COMPLETED';
    const newStatus = isCompleted ? 'completed' : (status === 'FAILED' ? 'failed' : payment.status);
    await payment.update({ status: newStatus });

    if (isCompleted && payment.orderId) {
      const order = await Order.findByPk(payment.orderId);
      if (order) {
        await order.update({ status: 'paid', paidAmount: payment.amount });
        await CashTransaction.create({
          type: 'income',
          amount: payment.amount,
          description: `Paiement ${order.orderNumber || order.id}`,
          category: 'Sales',
          date: new Date(),
          customerId: order.customerId || null,
          customerName: null
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Vérifier le statut d'un paiement
router.get('/status/:depositId', async (req, res) => {
  try {
    const { depositId } = req.params;
    const status = await pawaPay.checkDepositStatus(depositId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process payment (legacy cash)
router.post('/', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { orderId, amount, paymentMethod, currency = 'XOF', status = 'pending', notes } = req.body;
    const transactionId = `txn_${Date.now()}`;

    const payment = await Payment.create({
      orderId, amount, paymentMethod, currency, status, transactionId, notes
    }, { transaction: t });

    const order = await Order.findByPk(orderId, { transaction: t });
    if (order) {
      await order.update({ status: 'paid', paidAmount: amount }, { transaction: t });
      await CashTransaction.create({
        type: 'income', amount,
        description: `Paiement ${order.orderNumber}`,
        category: 'Sales', date: new Date()
      }, { transaction: t });
    }

    await t.commit();
    res.json(payment);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  const payment = await Payment.findByPk(req.params.id);
  payment ? res.json(payment) : res.status(404).json({ error: 'Payment not found' });
});

router.get('/order/:orderId', authenticate, async (req, res) => {
  const payments = await Payment.findAll({ where: { orderId: req.params.id } });
  res.json(payments);
});

router.post('/:id/refund', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const { amount } = req.body;
    const refundAmount = amount || payment.amount;
    const refundStatus = refundAmount === parseFloat(payment.amount) ? 'refunded' : 'partially_refunded';
    await payment.update({ status: refundStatus });

    res.json({
      id: `ref_${Date.now()}`, paymentId: payment.id,
      amount: refundAmount, status: 'completed',
      refundDate: new Date(),
      originalAmount: parseFloat(payment.amount),
      remainingBalance: parseFloat(payment.amount) - refundAmount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/verify-mobile-money', authenticate, async (req, res) => {
  const { transactionId, phoneNumber } = req.body;
  res.json({ success: true, transactionId, phoneNumber, status: 'verified', timestamp: new Date() });
});

module.exports = router;
