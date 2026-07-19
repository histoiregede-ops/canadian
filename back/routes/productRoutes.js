const express = require('express');
const router = express.Router();
const { v2: cloudinary } = require('cloudinary');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const uploadToCloudinary = async (base64String) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(base64String, {
      folder: 'canadian-products',
      resource_type: 'image'
    }, (error, result) => {
      if (error) reject(error);
      else resolve(result.secure_url);
    });
  });
};

const deleteFromCloudinary = async (url) => {
  if (!url || !url.includes('cloudinary.com')) return;

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/);
  if (!match) return;

  const publicId = match[1];
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error deleting from Cloudinary:', err);
  }
};

const isCloudinaryUrl = (url) => url && url.includes('cloudinary.com');
const isBase64Image = (str) => str && str.startsWith('data:image');

router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({ include: [Category, { model: Supplier, attributes: ['id', 'name'] }] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: [Category, { model: Supplier, attributes: ['id', 'name'] }] });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    let { photo, name, description, price, stockQuantity, status, categoryId, supplierId } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom du produit est requis' });
    if (price === undefined || isNaN(price) || Number(price) <= 0) return res.status(400).json({ error: 'Le prix doit être supérieur à 0' });
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

    if (!categoryId || categoryId === '') categoryId = null;
    if (!supplierId || supplierId === '') supplierId = null;

    let productData = { name, description, price, stockQuantity, status, categoryId, supplierId };

    if (isBase64Image(photo)) {
      productData.photo = await uploadToCloudinary(photo);
    } else if (photo === '') {
      productData.photo = null;
    }

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    let { photo, name, description, price, stockQuantity, status, categoryId, supplierId } = req.body;

    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Le nom du produit est requis' });
    if (price !== undefined && (isNaN(price) || Number(price) <= 0)) return res.status(400).json({ error: 'Le prix doit être supérieur à 0' });
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (!categoryId || categoryId === '') categoryId = null;
    if (!supplierId || supplierId === '') supplierId = null;

    let productData = { name, description, price, stockQuantity, status, categoryId, supplierId };

    if (isBase64Image(photo)) {
      if (isCloudinaryUrl(product.photo)) {
        await deleteFromCloudinary(product.photo);
      }
      productData.photo = await uploadToCloudinary(photo);
    } else if (photo === '') {
      if (isCloudinaryUrl(product.photo)) {
        await deleteFromCloudinary(product.photo);
      }
      productData.photo = null;
    }

    const oldStock = product.stockQuantity;
    await product.update(productData);
    if (stockQuantity !== undefined && Number(stockQuantity) !== oldStock) {
      await logStockMovement(id, oldStock, Number(stockQuantity), 'adjustment', null, req.user?.username);
    }
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ error: error.message });
  }
});

async function logStockMovement(productId, previousQuantity, newQuantity, reason, reference, createdBy) {
  const changeAmount = newQuantity - previousQuantity;
  await sequelize.query(
    'INSERT INTO stock_movements (productId, previousQuantity, newQuantity, changeAmount, reason, reference, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    { replacements: [productId, previousQuantity, newQuantity, changeAmount, reason, reference || null, createdBy || null] }
  );
  const [p] = await sequelize.query('SELECT name, lowStockThreshold FROM Products WHERE id = ?', { replacements: [productId] });
  const name = p[0]?.name || 'Produit';
  const threshold = p[0]?.lowStockThreshold || 15;
  if (newQuantity <= threshold && newQuantity > 0 && global.broadcastNotification) {
    global.broadcastNotification({ title: 'Stock faible', body: `${name}: ${newQuantity} unité(s) restante(s)`, type: 'low_stock' });
  } else if (newQuantity === 0 && global.broadcastNotification) {
    global.broadcastNotification({ title: 'Rupture de stock', body: `${name} est en rupture de stock`, type: 'out_of_stock' });
  }
}

router.post('/:id/restock', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Quantité invalide' });

    const prev = product.stockQuantity;
    const next = prev + quantity;
    await product.update({ stockQuantity: next, status: 'available' });
    await logStockMovement(id, prev, next, 'restock', null, req.user?.username);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/adjust-stock', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason = 'adjustment' } = req.body;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (quantity === undefined || quantity === null || isNaN(quantity) || Number(quantity) < 0) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const prev = product.stockQuantity;
    const next = Number(quantity);
    await product.update({ stockQuantity: next, status: next > 0 ? 'available' : 'out_of_stock' });
    await logStockMovement(id, prev, next, reason || 'adjustment', null, req.user?.username);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/movements', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const [movements] = await sequelize.query(
      'SELECT * FROM stock_movements WHERE productId = ? ORDER BY createdAt DESC LIMIT 100',
      { replacements: [req.params.id] }
    );
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (isCloudinaryUrl(product.photo)) {
      await deleteFromCloudinary(product.photo);
    }

    await product.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
