const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const SANDBOX_URL = 'https://api.sandbox.pawapay.io';
const PRODUCTION_URL = 'https://api.pawapay.io';

const PROVIDER_MAP = {
  orange_money: process.env.PAWAPAY_PROVIDER_ORANGE || 'ORANGE_MLI',
  moov_money: process.env.PAWAPAY_PROVIDER_MOOV || 'MOOV_MLI',
  wave: process.env.PAWAPAY_PROVIDER_WAVE || 'WAVE_MLI'
};

class PawaPayClient {
  constructor() {
    this.isSandbox = process.env.PAWAPAY_SANDBOX !== 'false';
    this.baseURL = this.isSandbox ? SANDBOX_URL : PRODUCTION_URL;
    this.apiKey = process.env.PAWAPAY_API_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
  }

  getProviderCode(method) {
    return PROVIDER_MAP[method] || method;
  }

  async initiateDeposit({ amount, currency = 'XOF', phoneNumber, providerMethod, orderId, customerId }) {
    const depositId = uuidv4();
    const provider = this.getProviderCode(providerMethod);
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');

    const payload = {
      depositId,
      amount: String(Math.round(amount)),
      currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: cleanPhone,
          provider
        }
      },
      metadata: [
        { orderId: orderId || '' },
        ...(customerId ? [{ customerId }] : [])
      ]
    };

    const response = await this.client.post('/v2/deposits', payload);
    return { depositId, ...response.data };
  }

  async checkDepositStatus(depositId) {
    const response = await this.client.get(`/v2/deposits/${depositId}`);
    return response.data;
  }

  async predictProvider(phoneNumber) {
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    const response = await this.client.post('/v2/predict-provider', {
      phoneNumber: cleanPhone
    });
    return response.data;
  }

  isSandboxMode() {
    return this.isSandbox;
  }
}

module.exports = new PawaPayClient();
