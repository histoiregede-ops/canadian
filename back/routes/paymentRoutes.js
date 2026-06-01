const express = require('express');
const router = express.Router();
const { Order, CashTransaction, Payment } = require('../models');
const sequelize = require('../config/database');
const { authenticate } = require('../utils/auth');
const pawaPay = require('../services/paymentProvider');
const PAWAPAY_WEBHOOK_SECRET = process.env.PAWAPAY_WEBHOOK_SECRET;

const validateWebhookSecret = (req) => {
  if (!PAWAPAY_WEBHOOK_SECRET) return true;
  const incomingSecret = req.headers['x-pawapay-signature'] || req.headers['x-webhook-secret'] || req.headers.authorization?.split(' ')[1];
  return incomingSecret === PAWAPAY_WEBHOOK_SECRET;
};

// Initiate a mobile money payment via PawaPay
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, phoneNumber, customerId } = req.body;

    if (!orderId) return res.status(400).json({ error: 'orderId requis' });
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    const requestedAmount = Number(amount);
    const expectedAmount = Number(order.totalAmount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    if (requestedAmount !== expectedAmount) {
      return res.status(400).json({ error: 'Montant de paiement différent du total de la commande' });
    }

    if (!phoneNumber) return res.status(400).json({ error: 'Numéro de téléphone requis' });
    if (!['orange_money', 'moov_money', 'wave'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Moyen de paiement invalide' });
    }

    const result = await pawaPay.initiateDeposit({
      amount: requestedAmount,
      phoneNumber,
      providerMethod: paymentMethod,
      orderId: orderId,
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
    if (!validateWebhookSecret(req)) {
      return res.status(403).json({ error: 'Webhook non autorisé' });
    }

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
router.get('/status/:depositId', authenticate, async (req, res) => {
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
    if (!orderId) {
      await t.rollback();
      return res.status(400).json({ error: 'orderId requis' });
    }
    const order = await Order.findByPk(orderId, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const requestedAmount = Number(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const transactionId = `txn_${Date.now()}`;

    const payment = await Payment.create({
      orderId, amount: requestedAmount, paymentMethod, currency, status, transactionId, notes
    }, { transaction: t });

    await order.update({ status: 'paid', paidAmount: requestedAmount }, { transaction: t });
    await CashTransaction.create({
      type: 'income', amount: requestedAmount,
      description: `Paiement ${order.orderNumber}`,
      category: 'Sales', date: new Date()
    }, { transaction: t });

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
  const payments = await Payment.findAll({ where: { orderId: req.params.orderId } });
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
  try {
    const { transactionId, phoneNumber } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'transactionId requis' });

    const payment = await Payment.findOne({ where: { transactionId } });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable', success: false });

    res.json({
      success: payment.status === 'completed',
      transactionId: payment.transactionId,
      phoneNumber,
      status: payment.status,
      amount: payment.amount,
      timestamp: payment.updatedAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
