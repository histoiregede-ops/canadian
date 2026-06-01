const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../utils/auth');
const JWT_SECRET = process.env.JWT_SECRET;

// Accept staff OR customer JWT tokens
const authenticateAny = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    // Support both staff tokens (id, username, role) and customer tokens (id, email)
    req.user = decoded;
    next();
  });
};

// Get all conversations for admin or client
router.get('/conversations', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [conversations] = await sequelize.query(
      'SELECT * FROM app_conversations ORDER BY updatedAt DESC'
    );
    res.json(conversations || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for a customer
router.get('/conversations/:customerId', authenticateAny, async (req, res) => {
  try {
    const [conversations] = await sequelize.query(
      'SELECT * FROM app_conversations WHERE customerId = ? ORDER BY updatedAt DESC',
      { replacements: [req.params.customerId] }
    );
    res.json(conversations || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation by ID
router.get('/conversations/:conversationId/details', authenticateAny, async (req, res) => {
  try {
    const [conversations] = await sequelize.query(
      'SELECT * FROM app_conversations WHERE id = ?',
      { replacements: [req.params.conversationId] }
    );
    if (conversations && conversations.length > 0) {
      res.json(conversations[0]);
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new conversation
router.post('/conversations', authenticateAny, async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      subject,
      productId,
      productName,
      productPrice,
      status = 'open'
    } = req.body;
    const id = `conv_${Date.now()}`;

    await sequelize.query(
      'INSERT INTO app_conversations (id, customerId, customerName, customerPhone, customerEmail, subject, productId, productName, productPrice, status, unreadCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())',
      {
        replacements: [
          id,
          customerId,
          customerName,
          customerPhone || null,
          customerEmail || null,
          subject,
          productId || null,
          productName || null,
          productPrice || null,
          status
        ]
      }
    );

    const conversation = {
      id,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      subject,
      productId,
      productName,
      productPrice,
      status,
      lastMessage: null,
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.json(conversation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get messages for conversation
router.get('/conversations/:conversationId/messages', authenticateAny, async (req, res) => {
  try {
    const [messages] = await sequelize.query(
      'SELECT * FROM app_messages WHERE conversationId = ? ORDER BY createdAt ASC',
      { replacements: [req.params.conversationId] }
    );
    res.json(messages || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/send', authenticateAny, async (req, res) => {
  try {
    const { conversationId, senderId, senderName, senderRole, content, attachmentUrl } = req.body;

    const [conversations] = await sequelize.query(
      'SELECT * FROM app_conversations WHERE id = ?',
      { replacements: [conversationId] }
    );

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const id = `msg_${Date.now()}`;
    await sequelize.query(
      'INSERT INTO app_messages (id, conversationId, senderId, senderName, senderRole, content, attachmentUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      { replacements: [id, conversationId, senderId, senderName, senderRole, content, attachmentUrl || null] }
    );

    const message = {
      id, conversationId, senderId, senderName, senderRole, content,
      attachmentUrl: attachmentUrl || null, readAt: null, createdAt: new Date()
    };

    await sequelize.query(
      'UPDATE app_conversations SET lastMessage = ?, updatedAt = NOW() WHERE id = ?',
      { replacements: [content, conversationId] }
    );

    if (senderRole !== 'customer') {
      await sequelize.query(
        'UPDATE app_conversations SET unreadCount = unreadCount + 1 WHERE id = ?',
        { replacements: [conversationId] }
      );
    }

    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark message as read
router.patch('/:messageId/read', authenticateAny, async (req, res) => {
  try {
    const [messages] = await sequelize.query(
      'SELECT * FROM app_messages WHERE id = ?',
      { replacements: [req.params.messageId] }
    );

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await sequelize.query(
      'UPDATE app_messages SET readAt = NOW() WHERE id = ?',
      { replacements: [req.params.messageId] }
    );

    messages[0].readAt = new Date();
    res.json(messages[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Close conversation
router.patch('/conversations/:conversationId/close', authenticateAny, async (req, res) => {
  try {
    const [conversations] = await sequelize.query(
      'SELECT * FROM app_conversations WHERE id = ?',
      { replacements: [req.params.conversationId] }
    );

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await sequelize.query(
      'UPDATE app_conversations SET status = ?, updatedAt = NOW() WHERE id = ?',
      { replacements: ['closed', req.params.conversationId] }
    );

    conversations[0].status = 'closed';
    conversations[0].updatedAt = new Date();
    res.json(conversations[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete message
router.delete('/:messageId', authenticateAny, async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM app_messages WHERE id = ?',
      { replacements: [req.params.messageId] }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
