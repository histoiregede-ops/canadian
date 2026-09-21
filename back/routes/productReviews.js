const express = require('express');
const router = express.Router();
const { ProductReview, Product, Customer, Order } = require('../models');
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

// Helper partagé pour batch - évite duplication GET/POST
async function handleBatch(productIds, res) {
  const t0 = Date.now();
  const ids = [...new Set(productIds.filter(Boolean))].slice(0, 100); // limite 100 pour éviter WHERE IN trop large + header overflow
  if (ids.length === 0) return res.json({});

  const tDB = Date.now();
  const reviews = await ProductReview.findAll({
    where: { productId: ids },
    include: [{ model: Customer, attributes: ['name'] }],
    order: [['createdAt', 'DESC']],
    limit: 1000 // garde-fou: pas plus de 1000 reviews en RAM
  });
  const tDBEnd = Date.now();

  const grouped = {};
  for (const id of ids) {
    grouped[id] = { reviews: [], stats: { averageRating: '0.0', totalReviews: 0, ratingDistribution: {} } };
  }
  for (const review of reviews) {
    const pid = review.productId;
    if (!grouped[pid]) continue;
    grouped[pid].reviews.push(review);
  }
  for (const pid of ids) {
    const productReviews = grouped[pid].reviews;
    const total = productReviews.length;
    if (total === 0) continue;
    let sum = 0;
    const dist = {};
    for (const r of productReviews) {
      sum += r.rating;
      dist[r.rating] = (dist[r.rating] || 0) + 1;
    }
    grouped[pid].stats = {
      averageRating: (sum / total).toFixed(1),
      totalReviews: total,
      ratingDistribution: dist
    };
  }
  const tEnd = Date.now();
  console.log(`[PERF] /api/reviews/batch products=${ids.length} reviews=${reviews.length} DB=${tDBEnd - tDB}ms Node=${tEnd - tDBEnd}ms TOTAL=${tEnd - t0}ms`);
  res.set('Cache-Control', 'public, max-age=60');
  res.json(grouped);
}

// Get reviews for multiple products (batch) - GET version gardée pour compat mais limitée à 100 IDs
router.get('/batch', async (req, res) => {
  try {
    const { productIds } = req.query;
    if (!productIds) {
      return res.status(400).json({ error: 'productIds parameter is required' });
    }
    if (productIds.length > 8000) {
      // évite 431 Request Header Fields Too Large
      return res.status(431).json({ error: 'productIds trop long, utilisez POST /api/reviews/batch avec body JSON { productIds: [...] } et limite 100 IDs' });
    }
    const ids = productIds.split(',').filter(Boolean);
    if (ids.length > 100) {
      return res.status(400).json({ error: 'Trop de productIds (max 100). Découpez en lots.' });
    }
    return handleBatch(ids, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST version pour gros lots - évite 431 et permet 100+ via body JSON
router.post('/batch', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'productIds (array) requis dans le body' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: 'Trop de productIds (max 100 par requête POST)' });
    }
    return handleBatch(ids, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;

    // Whitelist sort/order to prevent ORDER BY injection
    const allowedSorts = ['createdAt', 'updatedAt', 'rating'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'createdAt';
    const sortOrder = ['ASC', 'DESC'].includes(String(order).toUpperCase()) ? order.toUpperCase() : 'DESC';

    const offset = (page - 1) * limit;

    const reviews = await ProductReview.findAndCountAll({
      where: { productId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortColumn, sortOrder]],
      include: [{
        model: Customer,
        attributes: ['name']
      }]
    });

    // Calculate average rating
    const stats = await ProductReview.findAll({
      where: { productId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
      ],
      raw: true
    });

    const ratingDistribution = await ProductReview.findAll({
      where: { productId },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('rating')), 'count']
      ],
      group: ['rating'],
      raw: true
    });

    res.json({
      reviews: reviews.rows,
      pagination: {
        total: reviews.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(reviews.count / limit)
      },
      stats: {
        averageRating: parseFloat(stats[0].averageRating || 0).toFixed(1),
        totalReviews: parseInt(stats[0].totalReviews || 0),
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[item.rating] = parseInt(item.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new review
router.post('/', authenticate, async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const customerId = req.user.id;

    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' });
    }

    // Verify customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if customer has purchased this product (for verified reviews)
    const hasPurchased = await Order.findOne({
      where: { customerId },
      include: [{
        model: Product,
        where: { id: productId },
        through: { attributes: [] }
      }]
    });

    // Check if customer already reviewed this product
    const existingReview = await ProductReview.findOne({
      where: { productId, customerId }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const review = await ProductReview.create({
      productId,
      customerId,
      customerName: customer.name,
      rating,
      title,
      comment,
      isVerified: !!hasPurchased
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a review
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;

    if (rating !== undefined && (isNaN(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' });
    }

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the customer owns this review
    if (review.customerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own reviews' });
    }

    await review.update({ rating, title, comment });
    res.json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a review (customer-owned)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.customerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await review.destroy();
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin delete any review
router.delete('/admin/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const review = await ProductReview.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message: 'Avis non trouvé' });
    await review.destroy();
    res.json({ message: 'Avis supprimé par l\'administrateur' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark review as helpful
router.post('/:id/helpful', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await review.increment('helpful');
    res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer's reviews
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const tokenCustomerId = req.user?.id?.toString();
    const isAdmin = req.user?.role === 'admin';
    if (tokenCustomerId !== customerId && !isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const reviews = await ProductReview.findAll({
      where: { customerId },
      include: [{
        model: Product,
        attributes: ['name', 'photo']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;