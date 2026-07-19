const request = require('supertest');
const app = require('../index');

describe('Orders API', () => {
  let authToken;
  let createdOrderId;
  let testCustomerId;
  let testProductId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;

    const customerRes = await request(app)
      .post('/api/customers')
      .set('Authorization', 'Bearer ' + authToken)
      .send({
        name: 'Order Test Customer',
        email: 'order_test@example.com',
        phone: '111111111'
      });
    testCustomerId = customerRes.body.id;

    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer ' + authToken)
      .send({
        name: 'Test Order Product',
        price: 5000,
        stockQuantity: 100,
        status: 'available'
      });
    testProductId = productRes.body.id;
  });

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          items: [
            {
              productId: testProductId,
              quantity: 2,
              unitPrice: 5000
            }
          ],
          customerId: testCustomerId,
          paymentMethod: 'cash',
          totalAmount: 10000,
          paidAmount: 10000
        })
        .expect(201);
      
      createdOrderId = res.body.id;
      expect(res.body).toHaveProperty('orderNumber');
      expect(res.body).toHaveProperty('status', 'paid');
    });

    it('should reject order without items', async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          customerId: testCustomerId
        })
        .expect(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return a specific order', async () => {
      if (!createdOrderId) return;
      
      const res = await request(app)
        .get('/api/orders/' + createdOrderId)
        .expect(200);
      
      expect(res.body).toHaveProperty('id', createdOrderId);
    });
  });
});
