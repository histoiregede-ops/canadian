const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const models = require('../models');

router.get('/seed', async (req, res) => {
  try {
    await sequelize.sync({ force: true });
    await models.User.create({ username: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrateur' });
    await models.User.create({ username: 'cashier1', password: 'cashier123', role: 'cashier', fullName: 'Caissier Principal' });
    await models.User.create({ username: 'tech1', password: 'password', role: 'technician', fullName: 'Amadou Diallo' });
    const catSolar = await models.Category.create({ name: 'Solaire', type: 'solar' });
    await models.Product.create({ name: 'Panneau Solaire 400W Monocristallin', description: 'Haute efficacité', price: 150000, stockQuantity: 15, status: 'available', categoryId: catSolar.id });
    await models.Product.create({ name: 'Batterie Lithium LiFePO4 12V 100Ah', description: '6000 cycles', price: 450000, stockQuantity: 5, status: 'available', categoryId: catSolar.id });
    res.json({ message: 'Base de données initialisée', users: 'admin/admin123, cashier1/cashier123, tech1/password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
