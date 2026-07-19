const request = require('supertest');
const app = require('../index');

describe('Root and Health', () => {
  describe('GET /', () => {
    it('should return API info', async () => {
      const res = await request(app)
        .get('/')
        .expect(200);
      
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('documentation');
    });
  });
});
