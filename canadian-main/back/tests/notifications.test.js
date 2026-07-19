const request = require('supertest');
const app = require('../index');

describe('Notifications API', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/notifications', () => {
    it('should return notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
