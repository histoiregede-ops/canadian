const request = require('supertest');
const app = require('../index');

describe('Stats API', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/stats/dashboard', () => {
    it('should return dashboard stats', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      // Clés du contrat actuel de /api/stats/dashboard
      expect(res.body).toHaveProperty('dailyIncome');
      expect(res.body).toHaveProperty('dailyOrders');
      expect(res.body).toHaveProperty('lowStockProducts');
    });
  });

  describe('GET /api/stats/dashboard/recent-orders', () => {
    it('should return recent orders', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard/recent-orders')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/stats/dashboard/urgent-repairs', () => {
    it('should return urgent repairs', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard/urgent-repairs')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
