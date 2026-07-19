const request = require('supertest');
const app = require('../index');

describe('Stats API', () => {
  describe('GET /api/stats/dashboard', () => {
    it('should return dashboard stats', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard')
        .expect(200);
      
      expect(res.body).toHaveProperty('totalProducts');
      expect(res.body).toHaveProperty('totalOrders');
      expect(res.body).toHaveProperty('totalRevenue');
    });
  });

  describe('GET /api/stats/dashboard/recent-orders', () => {
    it('should return recent orders', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard/recent-orders')
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/stats/dashboard/urgent-repairs', () => {
    it('should return urgent repairs', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard/urgent-repairs')
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
