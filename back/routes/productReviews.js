const express = require('express');
const router = express.Router();
const { ProductReview, Product, Customer, Order } = require('../models');
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;

    const offset = (page - 1) * limit;

    const reviews = await ProductReview.findAndCountAll({
      where: { productId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
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
    const { productId, customerId, rating, title, comment } = req.body;

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
    const { rating, title, comment, customerId } = req.body;

    if (rating !== undefined && (isNaN(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' });
    }

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the customer owns this review
    if (review.customerId !== customerId) {
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
    const { customerId } = req.body;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.customerId !== customerId) {
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
    const { customerId } = req.params;

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