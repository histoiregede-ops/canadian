const request = require('supertest');
const app = require('../index');

describe('Suppliers API', () => {
  let authToken;
  let createdSupplierId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/suppliers', () => {
    it('should return all suppliers', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/suppliers', () => {
    it('should create a new supplier', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test Supplier ' + Date.now(),
          contactName: 'John Doe',
          email: 'supplier_' + Date.now() + '@test.com',
          phone: '123456789',
          city: 'Paris',
          country: 'France',
          productTypes: 'solar',
          isActive: true
        })
        .expect(201);
      
      createdSupplierId = res.body.id;
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('isActive', true);
    });

    it('should reject supplier without name', async () => {
      await request(app)
        .post('/api/suppliers')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          contactName: 'John'
        })
        .expect(400);
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should return a specific supplier', async () => {
      if (!createdSupplierId) return;
      
      const res = await request(app)
        .get('/api/suppliers/' + createdSupplierId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(res.body).toHaveProperty('id', createdSupplierId);
    });
  });

  describe('PUT /api/suppliers/:id', () => {
    it('should update a supplier', async () => {
      if (!createdSupplierId) return;
      
      const res = await request(app)
        .put('/api/suppliers/' + createdSupplierId)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'Updated Supplier' })
        .expect(200);
      
      expect(res.body).toHaveProperty('name', 'Updated Supplier');
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    it('should delete a supplier', async () => {
      if (!createdSupplierId) return;
      
      await request(app)
        .delete('/api/suppliers/' + createdSupplierId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(204);
    });
  });
});
