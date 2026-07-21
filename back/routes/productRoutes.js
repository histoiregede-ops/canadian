const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const { v2: cloudinary } = require('cloudinary');
const path = require('path');
const fs = require('fs');
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

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadToCloudinary = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'easy-erp/produits',
    resource_type: 'image'
  });
  return result.secure_url;
};

const deleteFromCloudinary = async (url) => {
  if (!url || !url.includes('cloudinary.com')) return;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/);
  if (!match) return;
  try {
    await cloudinary.uploader.destroy(match[1]);
  } catch (_) {}
};

const isBase64Image = (str) => str && str.startsWith('data:image');
const isCloudinaryUrl = (url) => url && url.includes('cloudinary.com');

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

router.post('/', authenticate, authorize('admin', 'cashier'), upload.single('photo'), async (req, res) => {
  try {
    const { name, description, price, stockQuantity, status, categoryId, supplierId } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom du produit est requis' });
    if (price === undefined || isNaN(price) || Number(price) <= 0) return res.status(400).json({ error: 'Le prix doit être supérieur à 0' });
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

    let productData = {
      name,
      description,
      price: Number(price),
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 0,
      status: status || 'available',
      categoryId: categoryId && categoryId !== '' ? categoryId : null,
      supplierId: supplierId && supplierId !== '' ? Number(supplierId) : null
    };

    if (req.file) {
      try {
        productData.photo = await uploadToCloudinary(req.file.path);
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    } else if (isBase64Image(req.body.photo)) {
      const tmp = path.join(os.tmpdir(), `base64_${Date.now()}.jpg`);
      const raw = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(tmp, Buffer.from(raw, 'base64'));
      try {
        productData.photo = await uploadToCloudinary(tmp);
      } finally {
        fs.unlink(tmp, () => {});
      }
    }

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'cashier'), upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { name, description, price, stockQuantity, status, categoryId, supplierId } = req.body;

    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Le nom du produit est requis' });
    if (price !== undefined && (isNaN(price) || Number(price) <= 0)) return res.status(400).json({ error: 'Le prix doit être supérieur à 0' });
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

    let productData = {};
    if (name !== undefined) productData.name = name;
    if (description !== undefined) productData.description = description;
    if (price !== undefined) productData.price = Number(price);
    if (stockQuantity !== undefined) productData.stockQuantity = Number(stockQuantity);
    if (status !== undefined) productData.status = status;
    productData.categoryId = categoryId && categoryId !== '' ? categoryId : null;
    productData.supplierId = supplierId && supplierId !== '' ? Number(supplierId) : null;

    if (req.file) {
      if (isCloudinaryUrl(product.photo)) {
        await deleteFromCloudinary(product.photo);
      }
      try {
        productData.photo = await uploadToCloudinary(req.file.path);
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    } else if (req.body.photo === '') {
      if (isCloudinaryUrl(product.photo)) {
        await deleteFromCloudinary(product.photo);
      }
      productData.photo = null;
    } else if (isBase64Image(req.body.photo)) {
      if (isCloudinaryUrl(product.photo)) {
        await deleteFromCloudinary(product.photo);
      }
      const tmp = path.join(os.tmpdir(), `base64_${Date.now()}.jpg`);
      const raw = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(tmp, Buffer.from(raw, 'base64'));
      try {
        productData.photo = await uploadToCloudinary(tmp);
      } finally {
        fs.unlink(tmp, () => {});
      }
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