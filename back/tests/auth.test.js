const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');

describe('Authentication API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: false });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('username', 'admin');
      expect(res.body.user).toHaveProperty('role', 'admin');
    });

    it('should reject invalid username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrong'
        });
      
      expect(res.statusCode).toBe(401);
    });

    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(res.statusCode).toBe(500);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer ' + global.testToken)
        .send({
          username: 'testuser_' + Date.now(),
          password: 'testpass123',
          fullName: 'Test User',
          email: 'test_' + Date.now() + '@example.com',
          role: 'seller'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('username');
      expect(res.body).toHaveProperty('role', 'seller');
    });

    it('should reject registration without username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer ' + global.testToken)
        .send({
          password: 'testpass123'
        });
      
      expect(res.statusCode).toBe(400);
    });
  });
});
