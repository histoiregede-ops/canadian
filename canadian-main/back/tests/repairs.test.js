const request = require('supertest');
const app = require('../index');

describe('Repairs API', () => {
  let authToken;
  let createdRepairId;
  let testCustomerId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;

    const customerRes = await request(app)
      .post('/api/customers')
      .set('Authorization', 'Bearer ' + authToken)
      .send({
        name: 'Repair Test Customer',
        email: 'repair_test@example.com',
        phone: '222222222'
      });
    testCustomerId = customerRes.body.id;
  });

  describe('GET /api/repairs', () => {
    it('should return all repairs', async () => {
      const res = await request(app)
        .get('/api/repairs')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/repairs', () => {
    it('should create a new repair', async () => {
      const res = await request(app)
        .post('/api/repairs')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          customerId: testCustomerId,
          description: 'Test repair',
          status: 'pending',
          estimatedCost: 5000
        })
        .expect(201);
      
      createdRepairId = res.body.id;
      expect(res.body).toHaveProperty('description', 'Test repair');
    });
  });

  describe('GET /api/repairs/:id', () => {
    it('should return a specific repair', async () => {
      if (!createdRepairId) return;
      
      const res = await request(app)
        .get('/api/repairs/' + createdRepairId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(res.body).toHaveProperty('id', createdRepairId);
    });
  });

  describe('PUT /api/repairs/:id', () => {
    it('should update a repair', async () => {
      if (!createdRepairId) return;
      
      const res = await request(app)
        .put('/api/repairs/' + createdRepairId)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ status: 'in_progress' })
        .expect(200);
      
      expect(res.body).toHaveProperty('status', 'in_progress');
    });
  });

  describe('DELETE /api/repairs/:id', () => {
    it('should delete a repair', async () => {
      if (!createdRepairId) return;
      
      await request(app)
        .delete('/api/repairs/' + createdRepairId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(204);
    });
  });
});
