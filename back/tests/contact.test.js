const request = require('supertest');
const app = require('../index');

describe('Contact API', () => {
  describe('POST /api/contact', () => {
    it('should submit contact form', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '123456789',
          message: 'Test message'
        })
        .expect(200);
      
      expect(res.body).toHaveProperty('success', true);
    });

    it('should reject contact form without name', async () => {
      await request(app)
        .post('/api/contact')
        .send({
          email: 'test@example.com',
          message: 'Test'
        })
        .expect(400);
    });
  });
});
