const request = require('supertest');
const app = require('../index');

describe('Customers API', () => {
  let authToken;
  let createdCustomerId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/customers', () => {
    it('should return all customers', async () => {
      const res = await request(app)
        .get('/api/customers')
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test Customer ' + Date.now(),
          email: 'customer_' + Date.now() + '@test.com',
          phone: '987654321',
          city: 'Lyon',
          country: 'France'
        })
        .expect(201);
      
      createdCustomerId = res.body.id;
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('email');
    });
  });

  describe('GET /api/customers/:id/loyalty', () => {
    it('should return customer loyalty data', async () => {
      if (!createdCustomerId) return;
      
      const res = await request(app)
        .get('/api/customers/' + createdCustomerId + '/loyalty')
        .expect(200);
      
      expect(res.body).toHaveProperty('points');
      expect(res.body).toHaveProperty('loyaltyLevel');
    });
  });
});
