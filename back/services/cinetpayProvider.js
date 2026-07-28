/**
 * Service d'intégration CinetPay
 * https://docs.cinetpay.com/
 *
 * Configuration .env :
 *   CINETPAY_API_KEY=votre_clé_api
 *   CINETPAY_SITE_ID=votre_site_id
 *   CINETPAY_SANDBOX=true|false
 *
 * 🔒 Sécurité : le webhook n'est jamais une source de vérité.
 *    On l'utilise uniquement comme signal, puis on interroge
 *    GET /v1/payment/{merchant_transaction_id} pour le statut canonique.
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ── URLs CinetPay ──────────────────────────

const API_BASE_SANDBOX  = 'https://api.cinetpay.net';
const API_BASE_PROD     = 'https://api.cinetpay.com';
const CHECKOUT_BASE_SANDBOX = 'https://api-checkout.cinetpay.com/sandbox/v2';
const CHECKOUT_BASE_PROD    = 'https://api-checkout.cinetpay.com/v2';

// ── Numéros de test Sandbox ────────────────
// https://docs.cinetpay.com/test_numbers
const TEST_PHONE_NUMBERS = {
  SUCCESS:           ['0100000001', '0100000002', '0100000003'],
  FAILED:            ['0100000004'],
  PENDING:           ['0100000005'],
  INSUFFICIENT_BALANCE: ['0100000006']
};

class CinetPayClient {
  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY || '';
    this.siteId = process.env.CINETPAY_SITE_ID || '';
    this.isSandbox = process.env.CINETPAY_SANDBOX !== 'false';

    const base = this.isSandbox ? API_BASE_SANDBOX : API_BASE_PROD;
    const checkoutBase = this.isSandbox ? CHECKOUT_BASE_SANDBOX : CHECKOUT_BASE_PROD;

    this.checkStatusUrl = `${base}/v1/payment`;
    this.paymentUrl = `${checkoutBase}/payment`;
  }

  // ── Helpers ─────────────────────────────

  generateTransactionId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().substring(0, 8).toUpperCase();
    return `CINET-${timestamp}-${random}`;
  }

  /**
   * Signature SHA256 comme décrit dans la doc CinetPay
   */
  generateSignature(transactionId, amount, currency = 'XOF') {
    const str = this.apiKey + this.siteId + transactionId + String(Math.round(amount)) + currency;
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  verifyWebhookSignature(transId, amount, currency, signature) {
    return this.generateSignature(transId, amount, currency) === signature;
  }

  isSandboxMode()   { return this.isSandbox; }
  isConfigured()    { return !!(this.apiKey && this.siteId); }

  // ── Initier un paiement ─────────────────

  async initiatePayment({
    amount,
    currency = 'XOF',
    phoneNumber,
    channel = 'MOBILE_MONEY',
    orderId,
    customerName = '',
    customerEmail = '',
    notifyUrl = '',
    returnUrl = '',
    successUrl = '',
    failedUrl = ''
  }) {
    const transactionId = this.generateTransactionId();
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    const payload = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: transactionId,
      amount: Math.round(amount),
      currency,
      description: `Paiement commande ${orderId || transactionId}`,
      notify_url: notifyUrl || `${baseUrl}/api/payments/webhook`,
      return_url: returnUrl || `${baseUrl}/api/payments/status`,
      success_url: successUrl || `${baseUrl}/api/payments/status`,
      failed_url: failedUrl || `${baseUrl}/api/payments/status`,
      channels: channel,
      customer_name: customerName || 'Client',
      customer_surname: '',
      customer_email: customerEmail || '',
      customer_phone_number: cleanPhone,
      metadata: JSON.stringify({ orderId: orderId || '' })
    };

    const response = await axios.post(this.paymentUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const body = response.data;
    const isSuccess = body.code === '00';

    return {
      success: isSuccess,
      transactionId,
      paymentUrl: body.data?.payment_url || '',
      paymentMethod: body.data?.payment_method || 'SMS',
      token: body.data?.token || '',
      notifyToken: body.data?.notify_token || '',   // ← conservé pour vérification webhook
      status: isSuccess ? 'ACCEPTED' : 'FAILED',
      message: body.message || (isSuccess ? 'Paiement initié' : 'Échec de l\'initiation'),
      raw: body
    };
  }

  // ── Vérifier le statut canonique ─────────
  // GET /v1/payment/{merchant_transaction_id}
  // C'est la SEULE source de vérité (doc CinetPay)
  // ─────────────────────────────────────────

  async checkTransactionStatus(transactionId) {
    const url = `${this.checkStatusUrl}/${encodeURIComponent(transactionId)}`;

    const response = await axios.get(url, {
      params: {
        apikey: this.apiKey,
        site_id: this.siteId
      },
      timeout: 15000
    });

    const body = response.data;

    // Statuts possibles : SUCCESS, FAILED, PENDING, WAITING, EXPIRED, CANCELLED
    const status = body.data?.status || body.status || 'PENDING';

    return {
      success: body.code === '00',
      status,
      isCompleted:      status === 'SUCCESS' || status === 'ACCEPTED',
      isFailed:         status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED',
      isPending:        status === 'PENDING' || status === 'WAITING',
      isInsufficientBalance: body.data?.message?.includes('INSUFFICIENT') ?? false,
      amount:           body.data?.amount,
      currency:         body.data?.currency,
      transactionId:    body.data?.transaction_id || transactionId,
      merchantTransactionId: body.data?.merchant_transaction_id || transactionId,
      paymentMethod:    body.data?.payment_method || '',
      phoneNumber:      body.data?.phone || '',
      message:          body.message || '',
      raw:              body
    };
  }

  // ── Traiter une notification webhook ─────
  // ⚠️ Ne PAS se fier au statut du payload !
  //    Utiliser transaction_id pour appeler checkTransactionStatus()
  // ─────────────────────────────────────────

  processIPN(body) {
    const {
      notify_token: notifyToken,
      merchant_transaction_id: merchantTransactionId,
      transaction_id: transactionId,
      cpm_trans_id,
      cpm_amount,
      cpm_currency,
      cpm_status,
      cpm_error_message,
      signature,
      cpm_custom: metadata
    } = body;

    // Support deux formats : webhook v2 (notify_token) et v1 (cpm_*)
    const id = merchantTransactionId || cpm_trans_id;
    const txId = transactionId || '';

    if (!id) {
      throw new Error('Missing transaction ID in IPN');
    }

    // Extraire orderId des métadonnées
    let orderId = '';
    try {
      const parsed = JSON.parse(metadata || '{}');
      orderId = parsed.orderId || '';
    } catch (e) { /* metadata non JSON */ }

    return {
      notifyToken,
      merchantTransactionId: id,
      transactionId: txId || id,
      amount: parseFloat(body.cpm_amount || body.amount || 0),
      currency: cpm_currency || 'XOF',
      // ⚠️ On ne lit PAS cpm_status ici — on va re-vérifier via API
      orderId,
      raw: body
    };
  }

  // ── Numéros de test ─────────────────────

  getTestNumber(status) {
    const numbers = TEST_PHONE_NUMBERS[status] || TEST_PHONE_NUMBERS.SUCCESS;
    return numbers[0];
  }

  isTestPhoneNumber(phone) {
    const clean = String(phone).replace(/[^0-9]/g, '');
    return Object.values(TEST_PHONE_NUMBERS).flat().includes(clean);
  }
}

module.exports = new CinetPayClient();