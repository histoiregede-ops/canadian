const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const [notifications] = await sequelize.query(
      'SELECT * FROM app_notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
      { replacements: [req.user.id] }
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE app_notifications SET readStatus = 1 WHERE id = ? AND userId = ?',
      { replacements: [req.params.id, req.user.id] }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/read-all', authenticate, async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE app_notifications SET readStatus = 1 WHERE userId = ?',
      { replacements: [req.user.id] }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM app_notifications WHERE id = ? AND userId = ?',
      { replacements: [req.params.id, req.user.id] }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
