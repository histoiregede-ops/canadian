const request = require('supertest');
const app = require('../index');

describe('Finance API', () => {
  let authToken;
  let createdTransactionId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/finance/transactions', () => {
    it('should return all transactions', async () => {
      const res = await request(app)
        .get('/api/finance/transactions')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('revenue');
      expect(res.body.summary).toHaveProperty('expense');
    });
  });

  describe('POST /api/finance/transactions', () => {
    it('should create a new income transaction', async () => {
      const res = await request(app)
        .post('/api/finance/transactions')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          type: 'income',
          amount: 5000,
          description: 'Test income',
          category: 'Sales'
        })
        .expect(201);
      
      createdTransactionId = res.body.id;
      expect(res.body).toHaveProperty('type', 'income');
      expect(res.body).toHaveProperty('amount', 5000);
    });

    it('should create a new expense transaction', async () => {
      const res = await request(app)
        .post('/api/finance/transactions')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          type: 'expense',
          amount: 1000,
          description: 'Test expense',
          category: 'Supplies'
        })
        .expect(201);
      
      expect(res.body).toHaveProperty('type', 'expense');
    });

    it('should reject transaction with invalid amount', async () => {
      await request(app)
        .post('/api/finance/transactions')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          type: 'income',
          amount: -100
        })
        .expect(400);
    });

    it('should reject transaction with invalid type', async () => {
      await request(app)
        .post('/api/finance/transactions')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          type: 'invalid',
          amount: 1000
        })
        .expect(400);
    });
  });

  describe('GET /api/finance/daily-report', () => {
    it('should return daily report', async () => {
      const res = await request(app)
        .get('/api/finance/daily-report')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
