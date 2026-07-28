const express = require('express');
const router = express.Router();
const { Order, CashTransaction, Payment } = require('../models');
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const cinetpay = require('../services/cinetpayProvider');

// =============================================
// Routes Paiement — CinetPay
// =============================================

/**
 * Initier un paiement mobile money via CinetPay
 * POST /api/payments/initiate
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, phoneNumber, customerId, customerName, customerEmail } = req.body;

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

    // Carte des canaux CinetPay selon le mode de paiement
    const CHANNEL_MAP = {
      orange_money: 'MOBILE_MONEY',
      moov_money: 'MOBILE_MONEY',
      wave: 'MOBILE_MONEY'
    };

    const result = await cinetpay.initiatePayment({
      amount: requestedAmount,
      phoneNumber,
      channel: CHANNEL_MAP[paymentMethod] || 'MOBILE_MONEY',
      orderId,
      customerName: customerName || '',
      customerEmail: customerEmail || '',
      notifyUrl: `${req.protocol}://${req.get('host')}/api/payments/webhook`
    });

    // Sauvegarder la transaction en base
    const payment = await Payment.create({
      orderId: orderId || null,
      amount,
      paymentMethod,
      currency: 'XOF',
      status: 'pending',
      transactionId: result.transactionId,
      notes: `CinetPay transId: ${result.transactionId} | canal: ${paymentMethod} | notifyToken: ${result.notifyToken || ''}`
    });

    res.json({
      success: result.success,
      paymentId: payment.id,
      transactionId: result.transactionId,
      paymentUrl: result.paymentUrl,
      token: result.token,
      status: result.status,
      message: result.success
        ? 'Paiement initié. Confirmez sur votre téléphone.'
        : `Échec: ${result.message}`
    });
  } catch (error) {
    console.error('[CinetPay] Erreur initiation:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Impossible d'initier le paiement",
      details: cinetpay.isSandboxMode() ? error.message : undefined
    });
  }
});

/**
 * Webhook IPN CinetPay — notification de statut
 * POST /api/payments/webhook
 *
 * 🔒 RÈGLE DE SÉCURITÉ (doc CinetPay) :
 *    Ne JAMAIS faire confiance au payload entrant.
 *    Répondre 200 OK immédiatement, puis re-vérifier
 *    le statut canonique via GET /v1/payment/{id}.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // 1. Parser le body (JSON ou form-urlencoded)
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const ipnResult = cinetpay.processIPN(body);

    if (!ipnResult.merchantTransactionId) {
      return res.status(400).json({ error: 'Missing transaction ID' });
    }

    // 2. Répondre 200 immédiatement — CinetPay attend une réponse < 10s
    res.json({ received: true });

    // 3. Traiter la transaction en arrière-plan (asynchrone)
    setImmediate(async () => {
      try {
        await processCinetPayNotification(ipnResult);
      } catch (err) {
        console.error('[CinetPay IPN] Erreur traitement différé:', err.message);
      }
    });
  } catch (error) {
    // 4. Même en cas d'erreur, répondre 200 pour éviter les retries inutiles
    console.error('[CinetPay IPN] Erreur:', error.message);
    res.json({ received: true, error: error.message });
  }
});

/**
 * Traitement sécurisé d'une notification CinetPay.
 * Re-vérifie TOUJOURS le statut via l'API CinetPay
 * avant de modifier la commande.
 */
async function processCinetPayNotification(ipnResult) {
  const { merchantTransactionId, orderId: metaOrderId } = ipnResult;

  // ── Idempotence : déjà traité ? ──────────
  const existing = await Payment.findOne({
    where: { transactionId: merchantTransactionId }
  });
  if (!existing) {
    console.warn('[CinetPay] Paiement introuvable pour transId:', merchantTransactionId);
    return;
  }
  if (existing.status !== 'pending') {
    // Déjà traité (completed, failed...) → ignorer
    return;
  }

  // ── Vérifier le notify_token (authenticité du webhook) ──
  const storedToken = extractNotifyToken(existing.notes);
  if (storedToken && ipnResult.notifyToken && storedToken !== ipnResult.notifyToken) {
    console.warn('[CinetPay] notify_token mismatch pour transId:', merchantTransactionId);
    return; // Attaque potentielle → on ignore et on attend le prochain webhook valide
  }

  // ── Re-vérifier le statut via l'API CinetPay (source de vérité) ──
  let liveStatus;
  try {
    liveStatus = await cinetpay.checkTransactionStatus(merchantTransactionId);
  } catch (err) {
    console.error('[CinetPay] Échec vérification statut API:', err.message);
    return; // On réessaiera au prochain webhook ou polling
  }

  // ── Mettre à jour selon le statut réel ───
  const newStatus = liveStatus.isCompleted ? 'completed'
                  : liveStatus.isFailed    ? 'failed'
                  : 'pending';

  if (newStatus === 'pending') {
    // Statut toujours en attente → ne rien faire
    return;
  }

  await existing.update({
    status: newStatus,
    notes: (existing.notes || '') + ` | API check: ${liveStatus.status}`
  });

  if (liveStatus.isCompleted && existing.orderId) {
    const order = await Order.findByPk(existing.orderId);
    if (order) {
      await order.update({
        status: 'paid',
        paidAmount: liveStatus.amount || existing.amount
      });

      await CashTransaction.create({
        type: 'income',
        amount: liveStatus.amount || existing.amount,
        description: `Paiement CinetPay ${order.orderNumber || order.id}`,
        category: 'Sales',
        date: new Date(),
        customerId: order.customerId || null,
        customerName: null
      });

      if (global.broadcastNotification) {
        global.broadcastNotification({
          title: 'Paiement confirmé',
          body: `Paiement de ${(liveStatus.amount || existing.amount).toLocaleString()} FCFA confirmé pour ${order.orderNumber || order.id}`,
          type: 'payment_success'
        });
      }

      if (global.sendWebSocketNotification && order.customerId) {
        global.sendWebSocketNotification(order.customerId, {
          title: 'Paiement confirmé',
          body: `Votre paiement de ${(liveStatus.amount || existing.amount).toLocaleString()} FCFA a été confirmé.`,
          type: 'payment_success'
        });
      }
    }
  }
}

/**
 * Vérifier le statut d'une transaction CinetPay
 * GET /api/payments/status/:transactionId
 */
router.get('/status/:transactionId', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const status = await cinetpay.checkTransactionStatus(transactionId);
    res.json(status);
  } catch (error) {
    console.error('[CinetPay] Erreur check status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Créer un paiement (cash / legacy)
 * POST /api/payments
 */
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

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const payment = await Payment.create({
      orderId, amount: requestedAmount, paymentMethod, currency, status,
      transactionId, notes
    }, { transaction: t });

    await order.update({ status: 'paid', paidAmount: requestedAmount }, { transaction: t });

    await CashTransaction.create({
      type: 'income', amount: requestedAmount,
      description: `Paiement ${order.orderNumber || order.id}`,
      category: 'Sales', date: new Date()
    }, { transaction: t });

    await t.commit();
    res.json(payment);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

/**
 * Récupérer un paiement par ID
 * GET /api/payments/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  const payment = await Payment.findByPk(req.params.id);
  payment ? res.json(payment) : res.status(404).json({ error: 'Payment not found' });
});

/**
 * Récupérer les paiements d'une commande
 * GET /api/payments/order/:orderId
 */
router.get('/order/:orderId', authenticate, async (req, res) => {
  const payments = await Payment.findAll({ where: { orderId: req.params.orderId } });
  res.json(payments);
});

/**
 * Rembourser un paiement (admin only)
 * POST /api/payments/:id/refund
 */
router.post('/:id/refund', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const { amount } = req.body;
    const refundAmount = amount || payment.amount;
    const refundStatus = refundAmount === parseFloat(payment.amount) ? 'refunded' : 'partially_refunded';
    await payment.update({ status: refundStatus });

    res.json({
      id: `REF-${Date.now()}`,
      paymentId: payment.id,
      amount: refundAmount,
      status: 'completed',
      refundDate: new Date(),
      originalAmount: parseFloat(payment.amount),
      remainingBalance: parseFloat(payment.amount) - refundAmount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Vérifier un paiement mobile money
 * POST /api/payments/verify-mobile-money
 */
router.post('/verify-mobile-money', authenticate, async (req, res) => {
  try {
    const { transactionId, phoneNumber } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'transactionId requis' });

    const payment = await Payment.findOne({ where: { transactionId } });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable', success: false });

    // Vérifier le statut en temps réel via CinetPay
    const liveStatus = await cinetpay.checkTransactionStatus(transactionId);

    // Mettre à jour si nécessaire
    if (liveStatus.isCompleted && payment.status === 'pending') {
      await payment.update({ status: 'completed' });
      if (payment.orderId) {
        const order = await Order.findByPk(payment.orderId);
        if (order) {
          await order.update({ status: 'paid', paidAmount: payment.amount });
        }
      }
    } else if (liveStatus.isFailed && payment.status === 'pending') {
      await payment.update({ status: 'failed' });
    }

    res.json({
      success: payment.status === 'completed' || liveStatus.isCompleted,
      transactionId: payment.transactionId,
      phoneNumber,
      status: payment.status,
      liveStatus: liveStatus.status,
      amount: payment.amount,
      timestamp: payment.updatedAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Helper : extraire notify_token des notes ─────────────
function extractNotifyToken(notes) {
  if (!notes) return '';
  const match = notes.match(/notifyToken:\s*(\S+)/);
  return match ? match[1] : '';
}

module.exports = router;
