const express = require('express');
const router = express.Router();
const { Repair, Customer } = require('../models');
const { authenticate, authorize } = require('../utils/auth');

// Get all repairs
router.get('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const repairs = await Repair.findAll({ include: [Customer] });
    res.json(repairs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single repair
router.get('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const repair = await Repair.findByPk(req.params.id, { include: [Customer] });
    if (!repair) return res.status(404).json({ message: 'Repair not found' });
    res.json(repair);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create repair
router.post('/', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const allowedFields = ['customerId', 'deviceType', 'brand', 'serialNumber', 'reportedIssue', 'diagnosis', 'resolution',
      'estimatedCost', 'finalCost', 'status', 'priority', 'receivedAt', 'completedAt', 'notes'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const repair = await Repair.create(data);
    res.status(201).json(repair);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update repair
router.put('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const allowedFields = ['deviceType', 'brand', 'serialNumber', 'reportedIssue', 'diagnosis', 'resolution',
      'estimatedCost', 'finalCost', 'status', 'priority', 'receivedAt', 'completedAt', 'notes'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const [updated] = await Repair.update(data, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: 'Repair not found' });
    const updatedRepair = await Repair.findByPk(req.params.id);
    res.json(updatedRepair);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete repair
router.delete('/:id', authenticate, authorize('admin', 'technician'), async (req, res) => {
  try {
    const deleted = await Repair.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ message: 'Repair not found' });
    res.json({ message: 'Repair deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
