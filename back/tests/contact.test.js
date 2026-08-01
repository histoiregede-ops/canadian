const request = require('supertest');

// Le service email (Brevo) n'a pas d'API key en environnement de test :
// on mocke processContactForm pour tester la route (validation + réponse),
// sans dépendre d'un appel réseau externe.
jest.mock('../services/contactService', () => ({
  processContactForm: jest.fn(async (data) => ({ recipient: data.email, messageId: 'test-msg-id' }))
}));

const app = require('../index');

describe('Contact API', () => {
  describe('POST /api/contact', () => {
    it('should submit contact form', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Demande de renseignement',
          phone: '660000000',
          message: 'Bonjour, je souhaite obtenir un devis pour une installation solaire.'
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should reject contact form without name', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          email: 'test@example.com',
          subject: 'Demande de renseignement',
          message: 'Bonjour, message de test suffisamment long.'
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject contact form without subject', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Bonjour, message de test suffisamment long.'
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject contact form with invalid email', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'pas-un-email',
          subject: 'Demande de renseignement',
          message: 'Bonjour, message de test suffisamment long.'
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/contact/health', () => {
    it('should report service health', async () => {
      const res = await request(app)
        .get('/api/contact/health')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'healthy');
    });
  });
});
