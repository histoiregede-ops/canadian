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
    let { username, password, email, fullName, role } = req.body;

    // Normalisation
    if (typeof username === 'string') username = username.trim();
    if (typeof email === 'string') email = email.trim().toLowerCase();
    if (typeof fullName === 'string') fullName = fullName.trim();
    if (typeof role === 'string') role = role.trim().toLowerCase();

    const validRoles = ['admin', 'seller', 'cashier', 'technician', 'delivery'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Rôles autorisés: ${validRoles.join(', ')}` });
    }

    // Validation champs requis - messages explicites
    if (!username) return res.status(400).json({ error: "Nom d'utilisateur requis" });
    if (!password) return res.status(400).json({ error: 'Mot de passe requis' });
    if (!email) return res.status(400).json({ error: 'Email requis' });
    if (!fullName) return res.status(400).json({ error: 'Nom complet requis' });

    // Vérification unicité en parallèle (1 seul aller-retour au lieu de 2) pour réduire latence Render
    const [existingUsername, existingEmail] = await Promise.all([
      User.findOne({ where: { username } }),
      User.findOne({ where: { email } })
    ]);
    if (existingUsername) return res.status(409).json({ error: "Nom d'utilisateur déjà utilisé" });
    if (existingEmail) return res.status(409).json({ error: 'Email déjà utilisé' });

    const user = await User.create({ username, password, email, fullName, role: role || 'technician' });
    res.status(201).json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role });
  } catch (error) {
    // Gestion fine des erreurs Sequelize
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'champ';
      const map = { username: "Nom d'utilisateur déjà utilisé", email: 'Email déjà utilisé' };
      return res.status(409).json({ error: map[field] || `Doublon sur ${field}`, details: error.errors });
    }
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors?.map(e => e.message).join(', ') || error.message;
      return res.status(400).json({ error: msg, details: error.errors });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update a user (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    let { username, password, email, fullName, role } = req.body;
    const validRoles = ['admin', 'seller', 'cashier', 'technician', 'delivery'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Rôles autorisés: ${validRoles.join(', ')}` });
    }

    const updateData = {};
    if (username !== undefined) updateData.username = typeof username === 'string' ? username.trim() : username;
    if (email !== undefined) updateData.email = typeof email === 'string' ? email.trim().toLowerCase() : email;
    if (fullName !== undefined) updateData.fullName = typeof fullName === 'string' ? fullName.trim() : fullName;
    if (role !== undefined) updateData.role = typeof role === 'string' ? role.trim().toLowerCase() : role;
    if (password) updateData.password = password;

    const [updated] = await User.update(updateData, { where: { id: req.params.id }, individualHooks: true });
    if (!updated) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const user = await User.findByPk(req.params.id, { attributes: ['id', 'username', 'fullName', 'email', 'role'] });
    res.json(user);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'champ';
      const map = { username: "Nom d'utilisateur déjà utilisé", email: 'Email déjà utilisé' };
      return res.status(409).json({ error: map[field] || `Doublon sur ${field}`, details: error.errors });
    }
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors?.map(e => e.message).join(', ') || error.message;
      return res.status(400).json({ error: msg, details: error.errors });
    }
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
