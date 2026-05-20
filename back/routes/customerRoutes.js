const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { Customer, Order } = require('../models');

const { authenticate, authorize } = require('../utils/auth');
const JWT_SECRET = process.env.JWT_SECRET;

const normalizeCustomerPayload = (body) => ({
  name: body.fullName || body.name || body.email || 'Client',
  email: body.email,
  phone: body.phone,
  address: body.address,
  city: body.city,
  country: body.country,
  password: body.password,
  points: typeof body.points !== 'undefined' ? body.points : 0,
  loyaltyLevel: body.loyaltyLevel || 'bronze',
  isActive: typeof body.isActive !== 'undefined' ? body.isActive : true
});

const serializeCustomer = (customer) => {
  if (!customer) return null;
  const response = { ...customer.toJSON(), fullName: customer.name };
  delete response.password;
  return response;
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.customer = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Quick registration during checkout (minimal data)
router.post('/quick-register', async (req, res) => {
  try {
    const { fullName, name, email, phone } = req.body;
    const customerData = normalizeCustomerPayload({ fullName, name, email, phone });

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ where: { email: customerData.email } });
    if (existingCustomer) {
      return res.json({
        success: true,
        customer: serializeCustomer(existingCustomer),
        message: 'Customer already exists'
      });
    }

    const customer = await Customer.create(customerData);
    const token = jwt.sign({ id: customer.id, email: customer.email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      success: true,
      customer: serializeCustomer(customer),
      token
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Full registration with password
router.post('/register', async (req, res) => {
  try {
    const { fullName, name, email, phone, password, address, city, country } = req.body;
    const customerData = normalizeCustomerPayload({ fullName, name, email, phone, address, city, country });

    const existingCustomer = await Customer.findOne({ where: { email: customerData.email } });
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'Customer already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    customerData.password = hashedPassword;

    const customer = await Customer.create(customerData);
    const token = jwt.sign({ id: customer.id, email: customer.email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      success: true,
      customer: serializeCustomer(customer),
      token
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.status(400).json({ success: false, message: 'Customer not found' });
    }

    if (customer.password) {
      const validPassword = await bcrypt.compare(password, customer.password);
      if (!validPassword) {
        return res.status(400).json({ success: false, message: 'Invalid password' });
      }
    }

    const token = jwt.sign({ id: customer.id, email: customer.email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      success: true,
      customer: serializeCustomer(customer),
      token
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get customer orders (for dashboard)
router.get('/:id/orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.params.id },
      include: ['products'],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer loyalty info
router.get('/:id/loyalty', verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const points = customer.points || 0;
    let level = 'bronze';
    let nextLevelPoints = 100;

    if (points >= 1000) {
      level = 'platinum';
      nextLevelPoints = 0; // Max level
    } else if (points >= 500) {
      level = 'gold';
      nextLevelPoints = 1000;
    } else if (points >= 100) {
      level = 'silver';
      nextLevelPoints = 500;
    }

    res.json({
      points,
      level,
      nextLevelPoints
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add loyalty points
router.post('/:id/loyalty', verifyToken, async (req, res) => {
  try {
    const { points, reason } = req.body;
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const newPoints = (customer.points || 0) + points;
    let newLevel = 'bronze';

    if (newPoints >= 1000) newLevel = 'platinum';
    else if (newPoints >= 500) newLevel = 'gold';
    else if (newPoints >= 100) newLevel = 'silver';

    await customer.update({
      points: newPoints,
      loyaltyLevel: newLevel
    });

    // Send WebSocket notification if available
    if (global.sendWebSocketNotification) {
      global.sendWebSocketNotification(customer.id, {
        title: 'Points de fidélité',
        body: `Vous avez gagné ${points} points! Nouveau total: ${newPoints}`,
        type: 'loyalty'
      });
    }

    const customerResponse = { ...customer.toJSON() };
    delete customerResponse.password;

    res.json(customerResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all customers (admin only)
router.get('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers.map(serializeCustomer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID (admin only)
router.get('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(serializeCustomer(customer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get own profile (customer self)
router.get('/profile/me', verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.customer.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(serializeCustomer(customer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own profile (customer self)
router.put('/profile/me', verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.customer.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const allowed = ['name', 'phone', 'address', 'city', 'country'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.password) {
      const saltRounds = 10;
      updates.password = await bcrypt.hash(req.body.password, saltRounds);
    }

    await customer.update(updates);
    res.json(serializeCustomer(customer));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update customer profile (admin only)
router.put('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const payload = normalizeCustomerPayload(req.body);
    if (payload.password) {
      const saltRounds = 10;
      payload.password = await bcrypt.hash(payload.password, saltRounds);
    }

    await customer.update(payload);
    res.json(serializeCustomer(customer));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create customer (admin)
router.post('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const payload = normalizeCustomerPayload(req.body);
    if (payload.password) {
      const saltRounds = 10;
      payload.password = await bcrypt.hash(payload.password, saltRounds);
    }

    const customer = await Customer.create(payload);
    res.status(201).json(serializeCustomer(customer));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete customer (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    await customer.destroy();
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
