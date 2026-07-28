/**
 * Service d'intégration CinetPay — API v1 (OAuth)
 * https://docs.cinetpay.com/
 *
 * Configuration .env :
 *   CINETPAY_API_KEY=sk_test_...        (account_key)
 *   CINETPAY_API_PASSWORD=xxx           (account_password)
 *   CINETPAY_SANDBOX=true|false
 *
 * 🔒 Sécurité : le webhook n'est jamais une source de vérité.
 *    On l'utilise uniquement comme signal, puis on interroge
 *    GET /v1/payment/{merchant_transaction_id} pour le statut canonique.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ── URLs API v1 ────────────────────────────
const SANDBOX = 'https://api.cinetpay.net';
const PROD   = 'https://api.cinetpay.com';

// ── Numéros de test Sandbox ────────────────
const TEST_PHONE_NUMBERS = {
  SUCCESS:              ['0100000001', '0100000002', '0100000003', '+2250707000000'],
  FAILED:               ['0100000004'],
  PENDING:              ['0100000005'],
  INSUFFICIENT_BALANCE: ['0100000006']
};

const TRANSFER_TEST_PHONE = '+2250707000001';

class CinetPayClient {
  constructor() {
    this.apiKey      = process.env.CINETPAY_API_KEY || '';
    this.apiPassword = process.env.CINETPAY_API_PASSWORD || '';
    this.isSandbox   = process.env.CINETPAY_SANDBOX !== 'false';

    this.baseUrl = this.isSandbox ? SANDBOX : PROD;

    // Cache du token OAuth
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  // ── Helpers ─────────────────────────────

  generateTransactionId() {
    // max 30 caractères (contrainte API)
    const ts = Date.now().toString(36).toUpperCase();
    const rand = uuidv4().substring(0, 6).toUpperCase();
    return `CT${ts}${rand}`.substring(0, 30);
  }

  isSandboxMode() { return this.isSandbox; }

  isConfigured() {
    return !!(this.apiKey && this.apiPassword);
  }

  // ── OAuth : obtenir / rafraîchir le token ─

  async _getAccessToken() {
    // Token encore valide ?
    if (this._token && Date.now() < this._tokenExpiresAt) {
      return this._token;
    }

    const response = await axios.post(`${this.baseUrl}/v1/oauth/login`, {
      api_key:      this.apiKey,
      api_password: this.apiPassword
    }, {
      timeout: 10000
    });

    const body = response.data;

    if (body.code !== 200) {
      throw new Error(`CinetPay OAuth failed: ${body.status || body.message || 'Unknown'}`);
    }

    this._token = body.access_token;
    // expires_in: 86400s (24h) d'après la doc — on rafraîchit à 23h pour marge
    const expiresIn = (body.expires_in || 86400) - 3600;
    this._tokenExpiresAt = Date.now() + expiresIn * 1000;

    return this._token;
  }

  async _authHeaders() {
    const token = await this._getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Initier un paiement web ──────────────
  // POST /v1/payment
  // ─────────────────────────────────────────

  async initiatePayment({
    amount,
    currency = 'XOF',
    phoneNumber,
    paymentMethod = '',       // ex: 'OM', 'WAVE', 'MOOV' – vide = toutes
    orderId,
    customerFirstName = '',
    customerLastName = '',
    customerEmail = '',
    customerPhone = '',
    notifyUrl = '',
    successUrl = '',
    failedUrl = '',
    lang = 'fr',
    directPay = false
  }) {
    const transactionId = this.generateTransactionId();
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    // 30 caractères max pour merchant_transaction_id
    const merchantId = transactionId.substring(0, 30);

    // 120 caractères max pour les URLs
    const truncUrl = (url) => url && url.length > 120 ? url.substring(0, 120) : url;

    const payload = {
      currency,
      merchant_transaction_id: merchantId,
      amount: Math.round(amount),
      lang,
      designation: `Paiement commande ${orderId || merchantId}`.substring(0, 255),
      client_first_name:  customerFirstName || 'Client',
      client_last_name:   customerLastName || 'Client',
      client_email:       customerEmail || 'client@email.com',
      client_phone_number: customerPhone || String(phoneNumber || '').replace(/[^0-9+]/g, ''),
      success_url: truncUrl(successUrl || `${baseUrl}/api/payments/status`),
      failed_url:  truncUrl(failedUrl  || `${baseUrl}/api/payments/status`),
      notify_url:  truncUrl(notifyUrl  || `${baseUrl}/api/payments/webhook`),
      direct_pay: directPay
    };

    // payment_method optionnel (laisse CinetPay choisir si vide)
    if (paymentMethod) payload.payment_method = paymentMethod;

    const headers = await this._authHeaders();

    const response = await axios.post(`${this.baseUrl}/v1/payment`, payload, {
      headers,
      timeout: 20000
    });

    const body = response.data;
    const isSuccess = body.code === 200;

    return {
      success: isSuccess,
      transactionId: merchantId,
      merchantTransactionId: merchantId,
      paymentUrl: body.payment_url || '',
      paymentToken: body.payment_token || '',
      notifyToken: body.notify_token || '',
      transactionIdCinet: body.transaction_id || '',
      status: isSuccess ? (body.details?.status || 'INITIATED') : 'FAILED',
      mustRedirect: body.details?.must_be_redirected !== false,
      message: body.details?.message || (isSuccess ? 'Paiement initié' : "Échec de l'initiation"),
      raw: body
    };
  }

  // ── Vérifier le statut canonique ─────────
  // GET /v1/payment/{merchant_transaction_id}
  // C'est la SEULE source de vérité
  // ─────────────────────────────────────────

  async checkTransactionStatus(transactionId) {
    const headers = await this._authHeaders();
    const encoded = encodeURIComponent(transactionId);

    const response = await axios.get(`${this.baseUrl}/v1/payment/${encoded}`, {
      headers,
      timeout: 15000
    });

    const body = response.data;
    const status = body.status || 'PENDING';

    return {
      success:        body.code === 200 || body.code === 100,
      status,
      isCompleted:    status === 'SUCCESS',
      isFailed:       status === 'FAILED',
      isPending:      status === 'PENDING' || status === 'INITIATED' || status === 'WAITING',
      amount:         body.amount ? parseFloat(body.amount) : 0,
      feeAmount:      body.fee_amount ? parseFloat(body.fee_amount) : 0,
      currency:       body.currency || 'XOF',
      transactionId:  body.transaction_id || transactionId,
      merchantTransactionId: body.merchant_transaction_id || transactionId,
      paymentMethod:  '',
      phoneNumber:    body.user?.phone_number || '',
      customerName:   body.user?.name || '',
      customerEmail:  body.user?.email || '',
      message:        '',
      raw:            body
    };
  }

  // ── Transférer de l'argent ────────────────
  // POST /v1/transfer
  // ─────────────────────────────────────────

  async initiateTransfer({
    amount,
    currency = 'XOF',
    phoneNumber,
    paymentMethod,          // ex: 'OM_CI', 'WAVE_CI', 'MOOV_CI'
    reason = 'Transfert',
    orderId = '',
    notifyUrl = ''
  }) {
    const transactionId = this.generateTransactionId();
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const merchantId = transactionId.substring(0, 30);

    const payload = {
      currency,
      merchant_transaction_id: merchantId,
      amount: Math.round(amount),
      phone_number: String(phoneNumber).replace(/[^0-9+]/g, ''),
      payment_method: paymentMethod,
      reason: reason.substring(0, 255),
      notify_url: notifyUrl || `${baseUrl}/api/payments/transfer-webhook`
    };

    const headers = await this._authHeaders();

    const response = await axios.post(`${this.baseUrl}/v1/transfer`, payload, {
      headers,
      timeout: 20000
    });

    const body = response.data;
    const isSuccess = body.code === 200 || body.code === 100;

    return {
      success: isSuccess,
      transactionId: merchantId,
      merchantTransactionId: merchantId,
      transactionIdCinet: body.transaction_id || '',
      amount: body.amount ? parseFloat(body.amount) : Math.round(amount),
      feeAmount: body.fee_amount ? parseFloat(body.fee_amount) : 0,
      status: body.status || (isSuccess ? 'PENDING' : 'FAILED'),
      customerName: body.user?.name || '',
      customerEmail: body.user?.email || '',
      customerPhone: body.user?.phone_number || '',
      message: body.message || '',
      raw: body
    };
  }

  // ── Vérifier le statut d'un transfert ────
  // GET /v1/transfer/{transaction_id}
  // ─────────────────────────────────────────

  async checkTransferStatus(transactionId) {
    const headers = await this._authHeaders();
    const encoded = encodeURIComponent(transactionId);

    const response = await axios.get(`${this.baseUrl}/v1/transfer/${encoded}`, {
      headers,
      timeout: 15000
    });

    const body = response.data;
    const status = body.status || 'PENDING';

    return {
      success:        body.code === 200 || body.code === 100,
      status,
      isCompleted:    status === 'SUCCESS',
      isFailed:       status === 'FAILED',
      isPending:      status === 'PENDING',
      amount:         body.amount ? parseFloat(body.amount) : 0,
      feeAmount:      body.fee_amount ? parseFloat(body.fee_amount) : 0,
      transactionId:  body.transaction_id || transactionId,
      merchantTransactionId: body.merchant_transaction_id || transactionId,
      customerName:   body.user?.name || '',
      customerEmail:  body.user?.email || '',
      customerPhone:  body.user?.phone_number || '',
      raw:            body
    };
  }

  // ── Traiter une notification webhook ─────
  // ⚠️ Ne PAS se fier au statut du payload !
  //    Utiliser merchant_transaction_id pour appeler checkTransactionStatus()
  // ─────────────────────────────────────────

  processIPN(body) {
    const {
      notify_token: notifyToken,
      merchant_transaction_id: merchantTransactionId,
      transaction_id: transactionId,
      // Ancien format (cpm_*)
      cpm_trans_id,
      cpm_amount,
      cpm_currency,
      cpm_custom: metadata
    } = body;

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

    // Si body.user existe (nouveau format), essayer d'extraire orderId depuis user
    if (!orderId && body.metadata) {
      try {
        const parsed = typeof body.metadata === 'string' ? JSON.parse(body.metadata) : body.metadata;
        orderId = parsed.orderId || '';
      } catch (e) { /* ignore */ }
    }

    return {
      notifyToken,
      merchantTransactionId: id,
      transactionId: txId || id,
      amount: parseFloat(body.cpm_amount || body.amount || 0),
      currency: cpm_currency || 'XOF',
      orderId,
      raw: body
    };
  }

  // ── Numéros de test ─────────────────────

  getTestPhone(status) {
    const numbers = TEST_PHONE_NUMBERS[status] || TEST_PHONE_NUMBERS.SUCCESS;
    return numbers[0];
  }

  isTestPhone(phone) {
    const clean = String(phone).replace(/[^0-9]/g, '');
    return Object.values(TEST_PHONE_NUMBERS).flat().some(n => n.replace(/[^0-9]/g, '') === clean);
  }

  getTransferTestPhone() {
    return TRANSFER_TEST_PHONE;
  }
}

module.exports = new CinetPayClient();