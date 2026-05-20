const express = require('express');
const router = express.Router();
const { Installation, Customer, User } = require('../models');
const { authenticate, authorize } = require('../utils/auth');

// Get all installations
router.get('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const installations = await Installation.findAll({ 
      include: [
        { model: Customer },
        { model: User, as: 'Technician', attributes: ['fullName'] }
      ] 
    });
    res.json(installations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create installation
router.post('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const installation = await Installation.create(req.body);
    res.status(201).json(installation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update installation
router.put('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const [updated] = await Installation.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: 'Installation not found' });
    const updatedInstallation = await Installation.findByPk(req.params.id);
    res.json(updatedInstallation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete installation
router.delete('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const deleted = await Installation.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ message: 'Installation not found' });
    res.json({ message: 'Installation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
