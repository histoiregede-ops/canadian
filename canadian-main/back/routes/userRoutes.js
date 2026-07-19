const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, authorize } = require('../utils/auth');

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'fullName', 'email', 'role']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, email, fullName, role } = req.body;
    const user = await User.create({ username, password, email, fullName, role });
    res.status(201).json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a user (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, email, fullName, role } = req.body;
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (password) updateData.password = password;

    const [updated] = await User.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const user = await User.findByPk(req.params.id, { attributes: ['id', 'username', 'fullName', 'email', 'role'] });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    await user.destroy();
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
