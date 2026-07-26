/**
 * Service d'intégration CinetPay
 * https://docs.cinetpay.com/
 * 
 * Configuration .env :
 *   CINETPAY_API_KEY=votre_clé_api
 *   CINETPAY_SITE_ID=votre_site_id
 *   CINETPAY_SANDBOX=true|false
 *   CINETPAY_WEBHOOK_SECRET=votre_secret (optionnel)
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const SANDBOX_PAYMENT_URL = 'https://api-checkout.cinetpay.com/sandbox/v2/payment';
const PRODUCTION_PAYMENT_URL = 'https://api-checkout.cinetpay.com/v2/payment';
const CHECK_STATUS_URL = 'https://api.cinetpay.com/v1/';

class CinetPayClient {
  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY || '';
    this.siteId = process.env.CINETPAY_SITE_ID || '';
    this.isSandbox = process.env.CINETPAY_SANDBOX !== 'false';
    this.paymentUrl = this.isSandbox ? SANDBOX_PAYMENT_URL : PRODUCTION_PAYMENT_URL;
    this.webhookSecret = process.env.CINETPAY_WEBHOOK_SECRET || '';
  }

  /**
   * Génère un ID de transaction unique
   */
  generateTransactionId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().substring(0, 8).toUpperCase();
    return `CINET-${timestamp}-${random}`;
  }

  /**
   * Signature pour vérifier les webhooks CinetPay
   * Signature = SHA256(apiKey + siteId + transactionId + amount + currency)
   */
  generateSignature(transactionId, amount, currency = 'XOF') {
    const str = this.apiKey + this.siteId + transactionId + String(Math.round(amount)) + currency;
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Vérifie la signature d'un webhook IPN CinetPay
   */
  verifyWebhookSignature(transId, amount, currency, signature) {
    const expected = this.generateSignature(transId, amount, currency);
    return expected === signature;
  }

  /**
   * Initie un paiement mobile money via CinetPay
   * 
   * @param {Object} params
   * @param {number} params.amount - Montant en FCFA
   * @param {string} params.currency - Devise (XOF par défaut)
   * @param {string} params.phoneNumber - Numéro de téléphone du client
   * @param {string} params.channel - canal: 'MOBILE_MONEY' | 'CARD' | etc.
   * @param {string} params.orderId - ID de la commande
   * @param {string} params.customerName - Nom du client
   * @param {string} params.customerEmail - Email du client
   * @param {string} params.notifyUrl - URL de notification IPN
   * @param {string} params.returnUrl - URL de retour après paiement
   * @returns {Promise<Object>}
   */
  async initiatePayment({
    amount,
    currency = 'XOF',
    phoneNumber,
    channel = 'MOBILE_MONEY',
    orderId,
    customerName = '',
    customerEmail = '',
    notifyUrl = '',
    returnUrl = ''
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
      channels: channel,
      customer_name: customerName || 'Client',
      customer_surname: '',
      customer_email: customerEmail || 'client@email.com',
      customer_phone_number: cleanPhone,
      metadata: JSON.stringify({ orderId: orderId || '' })
    };

    const response = await axios.post(this.paymentUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const body = response.data;

    // CinetPay returns code "00" for success
    const isSuccess = body.code === '00';

    return {
      success: isSuccess,
      transactionId,
      paymentUrl: body.data?.payment_url || '',
      paymentMethod: body.data?.payment_method || 'SMS',
      token: body.data?.token || '',
      status: isSuccess ? 'ACCEPTED' : 'FAILED',
      message: body.message || (isSuccess ? 'Paiement initié' : 'Échec de l\'initiation'),
      raw: body
    };
  }

  /**
   * Vérifie le statut d'une transaction CinetPay
   * 
   * @param {string} transactionId - L'ID de transaction généré lors de l'initiation
   * @returns {Promise<Object>}
   */
  async checkTransactionStatus(transactionId) {
    const payload = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: transactionId
    };

    const response = await axios.post(`${CHECK_STATUS_URL}?method=checkStatus`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const body = response.data;

    // CinetPay status can be: 'ACCEPTED', 'REFUSED', 'PENDING'
    const status = body.data?.status || 'PENDING';

    return {
      success: body.code === '00',
      status,
      isCompleted: status === 'ACCEPTED',
      isFailed: status === 'REFUSED',
      isPending: status === 'PENDING',
      amount: body.data?.amount,
      currency: body.data?.currency,
      transactionId: body.data?.transaction_id || transactionId,
      paymentMethod: body.data?.payment_method || '',
      phoneNumber: body.data?.phone || '',
      message: body.message || '',
      raw: body
    };
  }

  /**
   * Traite la notification IPN (webhook) de CinetPay
   * 
   * @param {Object} body - Corps de la requête webhook
   * @returns {Object} - Résultat du traitement
   */
  processIPN(body) {
    const {
      cpm_trans_id: transactionId,
      cpm_amount: amount,
      cpm_currency: currency,
      cpm_status: status,
      cpm_error_message: errorMessage,
      signature,
      cpm_custom: metadata
    } = body;

    if (!transactionId) {
      throw new Error('Missing transaction ID in IPN');
    }

    // Vérification de la signature
    const isValid = this.verifyWebhookSignature(
      transactionId,
      amount,
      currency || 'XOF',
      signature
    );

    if (!isValid) {
      console.error('[CinetPay IPN] Signature invalide pour transaction:', transactionId);
    }

    const isCompleted = status === 'ACCEPTED';
    const isFailed = status === 'REFUSED' || status === 'CANCELLED';

    let orderId = '';
    try {
      const parsed = JSON.parse(metadata || '{}');
      orderId = parsed.orderId || '';
    } catch (e) {
      // metadata might not be JSON
    }

    return {
      valid: isValid,
      transactionId,
      amount: parseFloat(amount),
      currency: currency || 'XOF',
      status,
      isCompleted,
      isFailed,
      errorMessage,
      orderId,
      raw: body
    };
  }

  /**
   * Mode sandbox actif ?
   */
  isSandboxMode() {
    return this.isSandbox;
  }

  /**
   * Vérifie que la configuration est valide
   */
  isConfigured() {
    return !!(this.apiKey && this.siteId);
  }
}

module.exports = new CinetPayClient();
