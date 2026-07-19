const request = require('supertest');
const app = require('../index');

describe('Reports API', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/reports/dashboard', () => {
    it('should return reports data', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(res.body).toHaveProperty('revenueEvolution');
      expect(res.body).toHaveProperty('topProducts');
      expect(res.body).toHaveProperty('categoryBreakdown');
    });
  });
});
