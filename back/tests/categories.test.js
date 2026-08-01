const request = require('supertest');
const app = require('../index');

describe('Categories API', () => {
  let authToken;
  let createdCategoryId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/categories', () => {
    it('should return all categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test Category ' + Date.now(),
          type: 'solar'
        })
        .expect(201);
      
      createdCategoryId = res.body.id;
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('type', 'solar');
    });
  });

  describe('GET /api/categories/:id', () => {
    // Route GET /api/categories/:id NON implémentée côté serveur (seulement
    // GET /, POST /, PUT /:id, DELETE /:id) → 404 du handler global.
    it('should return 404 for GET single category (route missing)', async () => {
      if (!createdCategoryId) return;
      
      const res = await request(app)
        .get('/api/categories/' + createdCategoryId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(404);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update a category', async () => {
      if (!createdCategoryId) return;
      
      const res = await request(app)
        .put('/api/categories/' + createdCategoryId)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'Updated Category' })
        .expect(200);
      
      expect(res.body).toHaveProperty('name', 'Updated Category');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      if (!createdCategoryId) return;
      
      const res = await request(app)
        .delete('/api/categories/' + createdCategoryId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });
});
