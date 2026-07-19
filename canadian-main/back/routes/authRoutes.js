const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, authorize, generateToken } = require('../utils/auth');
const VALID_ROLES = ['admin', 'seller', 'cashier', 'technician', 'delivery'];

router.post('/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, fullName, email, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Rôles autorisés: ${VALID_ROLES.join(', ')}` });
    }
    const user = await User.create({ username, password, fullName, email, role: role || 'seller' });
    res.status(201).json({
      id: user.id, username: user.username, fullName: user.fullName,
      email: user.email, role: user.role
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);
    const user = await User.findOne({ where: { username } });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isValid = await user.validPassword(password);
    console.log(`Password valid: ${isValid}`);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
