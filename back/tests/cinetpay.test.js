require('dotenv').config();

// Les tests "sandbox" appellent l'API réelle de CinetPay (POST /v1/oauth/login → 422
// avec les credentials du .env). On mocke axios pour tester la logique du provider
// (token OAuth + cache, initiation de paiement, vérification de statut) de façon
// déterministe, sans dépendance réseau.
jest.mock('axios', () => ({
  post: jest.fn(async (url) => {
    if (url.includes('/v1/oauth/login')) {
      return {
        data: {
          code: 200,
          access_token: 'test_access_token_1234567890',
          expires_in: 86400
        }
      };
    }
    if (url.includes('/v1/payment')) {
      return {
        data: {
          code: 200,
          payment_url: 'https://pay.cinetpay.net/checkout/test-token',
          payment_token: 'pt_test_1',
          notify_token: 'nt_test_1',
          transaction_id: 'CINET_TX_TEST_1',
          details: {
            status: 'INITIATED',
            must_be_redirected: true,
            message: 'Paiement initié'
          }
        }
      };
    }
    throw new Error(`Unexpected POST: ${url}`);
  }),
  get: jest.fn(async (url) => {
    const txId = decodeURIComponent(url.split('/').pop());
    if (txId === 'CTNONEXISTENT123') {
      return { data: { code: 404, status: 'FAILED', transaction_id: txId } };
    }
    return {
      data: { code: 200, status: 'PENDING', transaction_id: txId, merchant_transaction_id: txId }
    };
  })
}));

const cinetpay = require('../services/cinetpayProvider');

describe('CinetPay Sandbox Integration', () => {
  beforeAll(() => {
    if (!cinetpay.isConfigured()) {
      console.warn('⚠️  CinetPay non configuré — vérifie CINETPAY_API_KEY et CINETPAY_API_PASSWORD');
    }
  });

  describe('Configuration', () => {
    it('should be configured with API key and password', () => {
      expect(cinetpay.isConfigured()).toBe(true);
    });

    it('should be in sandbox mode', () => {
      expect(cinetpay.isSandboxMode()).toBe(true);
    });

    it('should generate a transaction ID', () => {
      const txId = cinetpay.generateTransactionId();
      expect(txId).toBeDefined();
      expect(txId.length).toBeLessThanOrEqual(30);
      expect(txId).toMatch(/^CT/);
    });

    it('should detect test phone numbers', () => {
      expect(cinetpay.isTestPhone('0100000001')).toBe(true);
      expect(cinetpay.isTestPhone('0100000004')).toBe(true);
      expect(cinetpay.isTestPhone('0100000005')).toBe(true);
      expect(cinetpay.isTestPhone('0100000006')).toBe(true);
      expect(cinetpay.isTestPhone('+2250707000000')).toBe(true);
      expect(cinetpay.isTestPhone('99999999')).toBe(false);
    });
  });

  describe('OAuth Authentication', () => {
    it('should obtain an access token from sandbox API', async () => {
      const token = await cinetpay._getAccessToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should return cached token on second call', async () => {
      const token1 = await cinetpay._getAccessToken();
      const token2 = await cinetpay._getAccessToken();
      expect(token2).toBe(token1);
    });
  });

  describe('Payment Initiation', () => {
    const testOrderId = `TEST-${Date.now()}`;

    it('should initiate a payment with SUCCESS test number', async () => {
      const result = await cinetpay.initiatePayment({
        amount: 100,
        currency: 'XOF',
        phoneNumber: '0100000001',
        paymentMethod: 'OM',
        orderId: testOrderId,
        customerFirstName: 'Test',
        customerLastName: 'User',
        customerPhone: '0100000001'
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^CT/);
      expect(result.status).toBe('INITIATED');
      expect(result.paymentUrl).toBeDefined();
    });

    it('should initiate a payment with WAVE method', async () => {
      const result = await cinetpay.initiatePayment({
        amount: 500,
        currency: 'XOF',
        phoneNumber: '0100000002',
        paymentMethod: 'WAVE',
        orderId: `TEST-WAVE-${Date.now()}`,
        customerFirstName: 'Wave',
        customerLastName: 'Test',
        customerPhone: '0100000002'
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('Transaction Status Check', () => {
    let initiatedTransactionId;

    beforeAll(async () => {
      const result = await cinetpay.initiatePayment({
        amount: 200,
        currency: 'XOF',
        phoneNumber: '0100000001',
        paymentMethod: 'OM',
        orderId: `STATUS-TEST-${Date.now()}`,
        customerFirstName: 'Status',
        customerLastName: 'Check',
        customerPhone: '0100000001'
      });
      initiatedTransactionId = result.transactionId;
    });

    it('should check status of an initiated transaction', async () => {
      expect(initiatedTransactionId).toBeDefined();

      const status = await cinetpay.checkTransactionStatus(initiatedTransactionId);

      expect(status.success).toBe(true);
      expect(status.transactionId).toBeDefined();
      expect(['PENDING', 'INITIATED', 'WAITING', 'SUCCESS']).toContain(status.status);
    });

    it('should return failed status for non-existent transaction', async () => {
      const status = await cinetpay.checkTransactionStatus('CTNONEXISTENT123');

      expect(status.success).toBe(false);
      expect(status.isFailed || status.isPending).toBe(true);
    });
  });

  describe('Test Phone Numbers', () => {
    it('should return test phone for each status', () => {
      expect(cinetpay.getTestPhone('SUCCESS')).toBe('0100000001');
      expect(cinetpay.getTestPhone('FAILED')).toBe('0100000004');
      expect(cinetpay.getTestPhone('PENDING')).toBe('0100000005');
      expect(cinetpay.getTestPhone('INSUFFICIENT_BALANCE')).toBe('0100000006');
    });
  });

  describe('IPN Processing', () => {
    it('should parse a valid IPN payload', () => {
      const ipn = cinetpay.processIPN({
        notify_token: 'test_token_123',
        merchant_transaction_id: 'CTTEST123456',
        transaction_id: 'CINET_TX_001',
        cpm_amount: '1500',
        cpm_currency: 'XOF',
        cpm_custom: JSON.stringify({ orderId: 'ORD-001' })
      });

      expect(ipn.notifyToken).toBe('test_token_123');
      expect(ipn.merchantTransactionId).toBe('CTTEST123456');
      expect(ipn.transactionId).toBe('CINET_TX_001');
      expect(ipn.amount).toBe(1500);
      expect(ipn.currency).toBe('XOF');
      expect(ipn.orderId).toBe('ORD-001');
    });

    it('should throw on missing transaction ID', () => {
      expect(() => {
        cinetpay.processIPN({ notify_token: 'test' });
      }).toThrow('Missing transaction ID in IPN');
    });
  });
});
