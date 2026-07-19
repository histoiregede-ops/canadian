const express = require('express');
const router = express.Router();
const contactService = require('../services/contactService');
const { authenticate, authorize } = require('../utils/auth');

// Middleware de validation
const validateContactForm = (req, res, next) => {
  const { name, email, subject, message } = req.body;

  const errors = [];

  // Validation nom
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Le nom doit contenir au moins 2 caractères');
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Adresse email invalide');
  }

  // Validation sujet
  if (!subject || typeof subject !== 'string' || subject.trim().length < 5) {
    errors.push('Le sujet doit contenir au moins 5 caractères');
  }

  // Validation message
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push('Le message doit contenir au moins 10 caractères');
  }

  // Validation téléphone (optionnel)
  if (req.body.phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = req.body.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.push('Numéro de téléphone invalide');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors
    });
  }

  next();
};

// Middleware anti-spam basique (rate limiting simple)
const contactRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 heure (au lieu de 15 minutes)
const MAX_REQUESTS = 10; // 10 messages max par heure (au lieu de 3)

const checkRateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!contactRateLimit.has(clientIP)) {
    contactRateLimit.set(clientIP, { count: 1, firstRequest: now });
    return next();
  }

  const clientData = contactRateLimit.get(clientIP);

  // Reset counter if window has passed
  if (now - clientData.firstRequest > RATE_LIMIT_WINDOW) {
    clientData.count = 1;
    clientData.firstRequest = now;
    return next();
  }

  // Check if limit exceeded
  if (clientData.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Trop de messages envoyés. Veuillez réessayer dans 1 heure.',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.firstRequest)) / 1000)
    });
  }

  clientData.count++;
  next();
};

/**
 * POST /api/contact
 * Envoie un message de contact
 */
router.post('/', checkRateLimit, validateContactForm, async (req, res) => {
  try {
    const contactData = {
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      phone: req.body.phone ? req.body.phone.trim() : null,
      subject: req.body.subject.trim(),
      message: req.body.message.trim()
    };

    const result = await contactService.processContactForm(contactData);

    res.status(200).json({
      success: true,
      message: 'Message envoyé avec succès ! Vous allez recevoir un email de confirmation.',
      data: result
    });

  } catch (error) {
    console.error('Erreur API contact:', error);

    // Erreurs spécifiques
    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'Erreur de configuration email. Contactez l\'administrateur.'
      });
    }

    if (error.message.includes('validation')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message. Veuillez réessayer.'
    });
  }
});

/**
 * GET /api/contact/health
 * Vérifie si le service de contact fonctionne
 */
router.get('/health', async (req, res) => {
  try {
    // Vérification basique de la configuration
    const hasApiKey = !!process.env.BREVO_API_KEY;
    const hasAdminEmail = !!process.env.ADMIN_EMAIL;

    res.json({
      success: true,
      status: 'healthy',
      config: {
        hasApiKey,
        hasAdminEmail,
        senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;