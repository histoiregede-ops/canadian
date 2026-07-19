const request = require('supertest');
const app = require('../index');

describe('Products API', () => {
  let authToken;
  let createdProductId;
  let createdCategoryId;
  let createdSupplierId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/products', () => {
    it('should return all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test Product ' + Date.now(),
          price: 1000,
          stockQuantity: 10,
          status: 'available',
          categoryId: createdCategoryId || 'test-category',
          barcode: 'TEST' + Date.now()
        })
        .expect(201);
      
      createdProductId = res.body.id;
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('price', 1000);
    });

    it('should reject product without name', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          price: 1000
        })
        .expect(400);
    });

    it('should reject product with invalid price', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test',
          price: -100
        })
        .expect(400);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a specific product', async () => {
      if (!createdProductId) return;
      
      const res = await request(app)
        .get('/api/products/' + createdProductId)
        .expect(200);
      
      expect(res.body).toHaveProperty('id', createdProductId);
    });

    it('should return 404 for non-existent product', async () => {
      await request(app)
        .get('/api/products/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      if (!createdProductId) return;
      
      const res = await request(app)
        .put('/api/products/' + createdProductId)
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Updated Product',
          price: 2000
        })
        .expect(200);
      
      expect(res.body).toHaveProperty('name', 'Updated Product');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      if (!createdProductId) return;
      
      await request(app)
        .delete('/api/products/' + createdProductId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(204);
    });
  });
});
