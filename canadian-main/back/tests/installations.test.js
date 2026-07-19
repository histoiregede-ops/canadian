const request = require('supertest');
const app = require('../index');

describe('Installations API', () => {
  let authToken;
  let createdInstallationId;
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
        name: 'Installation Test Customer',
        email: 'install_test@example.com',
        phone: '333333333'
      });
    testCustomerId = customerRes.body.id;
  });

  describe('GET /api/installations', () => {
    it('should return all installations', async () => {
      const res = await request(app)
        .get('/api/installations')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/installations', () => {
    it('should create a new installation', async () => {
      const res = await request(app)
        .post('/api/installations')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          customerId: testCustomerId,
          location: 'Test Location',
          kitType: 'Solar Kit 1',
          status: 'planned',
          notes: 'Test installation'
        })
        .expect(201);
      
      createdInstallationId = res.body.id;
      expect(res.body).toHaveProperty('location', 'Test Location');
    });
  });

  describe('GET /api/installations/:id', () => {
    it('should return a specific installation', async () => {
      if (!createdInstallationId) return;
      
      const res = await request(app)
        .get('/api/installations/' + createdInstallationId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(res.body).toHaveProperty('id', createdInstallationId);
    });
  });

  describe('PUT /api/installations/:id', () => {
    it('should update an installation', async () => {
      if (!createdInstallationId) return;
      
      const res = await request(app)
        .put('/api/installations/' + createdInstallationId)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ status: 'in_progress' })
        .expect(200);
      
      expect(res.body).toHaveProperty('status', 'in_progress');
    });
  });

  describe('DELETE /api/installations/:id', () => {
    it('should delete an installation', async () => {
      if (!createdInstallationId) return;
      
      await request(app)
        .delete('/api/installations/' + createdInstallationId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(204);
    });
  });
});
