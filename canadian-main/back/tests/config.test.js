const request = require('supertest');
const app = require('../index');

describe('Config API', () => {
  describe('GET /api/config/payment-methods', () => {
    it('should return payment methods', async () => {
      const res = await request(app)
        .get('/api/config/payment-methods')
        .expect(200);
      
      expect(Array.isArray(res.body.methods)).toBe(true);
      expect(res.body).toHaveProperty('whatsapp');
    });
  });
});
