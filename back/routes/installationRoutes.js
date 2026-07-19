const express = require('express');
const router = express.Router();
const { Installation, Customer, User, Order } = require('../models');
const { authenticate, authorize } = require('../utils/auth');

// Get all installations
router.get('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const installations = await Installation.findAll({ 
      include: [
        { model: Customer, attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'Technician', attributes: ['id', 'fullName', 'email'] },
        { model: Order, attributes: ['id', 'orderNumber', 'totalAmount', 'status', 'createdAt'] }
      ] 
    });
    res.json(installations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single installation
router.get('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const installation = await Installation.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'Technician', attributes: ['id', 'fullName', 'email'] },
        { model: Order, attributes: ['id', 'orderNumber', 'totalAmount', 'status', 'createdAt'] }
      ]
    });
    if (!installation) return res.status(404).json({ message: 'Installation not found' });
    res.json(installation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create installation
router.post('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const allowedFields = ['orderId', 'location', 'kitType', 'status', 'priority', 'customerId', 'technicianId', 'notes', 'scheduledDate', 'gpsCoordinates', 'powerCapacity', 'roofType', 'components', 'totalPrice'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const installation = await Installation.create(data);
    res.status(201).json(installation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update installation
router.put('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const allowedFields = ['location', 'kitType', 'status', 'priority', 'technicianId', 'notes', 'scheduledDate', 'gpsCoordinates', 'powerCapacity', 'roofType', 'components', 'totalPrice'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const [updated] = await Installation.update(data, {
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
