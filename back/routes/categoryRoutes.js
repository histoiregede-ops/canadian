const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { authenticate, authorize } = require('../utils/auth');

// Redis cache initialization
let redisCache = null;
let redisAvailable = false;
try {
  const { cache: redisCacheModule } = require('../config/redis');
  redisCache = redisCacheModule;
  // Initialize Redis connection
  const { initRedis, isRedisAvailable } = require('../config/redis');
  initRedis();
  redisAvailable = isRedisAvailable();
} catch (error) {
  console.warn('[CategoryRoutes] Redis not available, using no cache:', error.message);
}

const CATEGORIES_CACHE_KEY = 'categories_all';
const CATEGORIES_CACHE_TTL = 300; // 5 minutes

router.get('/', async (req, res) => {
  try {
    // Try Redis cache first
    if (redisAvailable && redisCache) {
      try {
        const cached = await redisCache.get(CATEGORIES_CACHE_KEY);
        if (cached) {
          res.set('X-Cache', 'HIT');
          return res.json(cached);
        }
      } catch (error) {
        console.warn('[CategoryRoutes] Redis GET error:', error.message);
      }
    }

    const categories = await Category.findAll();
    
    // Save to Redis cache
    if (redisAvailable && redisCache) {
      try {
        await redisCache.set(CATEGORIES_CACHE_KEY, categories, CATEGORIES_CACHE_TTL);
      } catch (error) {
        console.warn('[CategoryRoutes] Redis SET error:', error.message);
      }
    }
    
    res.set('X-Cache', 'MISS');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'type', 'photo'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const category = await Category.create(data);
    
    // Clear categories cache
    if (redisAvailable && redisCache) {
      try {
        await redisCache.del(CATEGORIES_CACHE_KEY);
      } catch (error) {
        console.warn('[CategoryRoutes] Redis DEL error:', error.message);
      }
    }
    
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'type', 'photo'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const [updated] = await Category.update(data, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: 'Category not found' });
    const updatedCategory = await Category.findByPk(req.params.id);
    
    // Clear categories cache
    if (redisAvailable && redisCache) {
      try {
        await redisCache.del(CATEGORIES_CACHE_KEY);
      } catch (error) {
        console.warn('[CategoryRoutes] Redis DEL error:', error.message);
      }
    }
    
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deleted = await Category.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    
    // Clear categories cache
    if (redisAvailable && redisCache) {
      try {
        await redisCache.del(CATEGORIES_CACHE_KEY);
      } catch (error) {
        console.warn('[CategoryRoutes] Redis DEL error:', error.message);
      }
    }
    
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
