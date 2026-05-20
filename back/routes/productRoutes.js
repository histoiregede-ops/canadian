const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Category = require('../models/Category');
const Product = require('../models/Product');
const sequelize = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to safely join paths on Windows by removing leading slashes
const getLocalPath = (relativePath) => {
  if (!relativePath) return null;
  return path.join(__dirname, '..', relativePath.replace(/^\//, ''));
};

// Helper function to save Base64 image
const saveBase64Image = (base64String) => {
  // Check if it's a valid base64 image string
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid Base64 image string');
  }

  const imageType = matches[1]; // e.g., 'image/jpeg'
  const imageData = matches[2]; // Base64 data
  const extension = imageType.split('/')[1]; // e.g., 'jpeg'

  const filename = `${uuidv4()}.${extension}`;
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, imageData, 'base64');

  // Return the public path relative to the server root
  return `/public/uploads/${filename}`;
};

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({ include: [Category] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: [Category] });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create a new product
router.post('/', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    let { photo, name, description, price, stockQuantity, status, categoryId } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom du produit est requis' });
    if (price === undefined || isNaN(price) || Number(price) <= 0) return res.status(400).json({ error: 'Le prix doit être supérieur à 0' });
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

    let productData = {
      name,
      description,
      price,
      stockQuantity,
      status,
      categoryId
    };

    if (photo && photo.startsWith('data:image')) {
      // If a new Base64 image is provided, save it
      productData.photo = saveBase64Image(photo);
    } else if (photo === '') {
      // If photo is explicitly set to empty, clear it
      productData.photo = null;
    }
    // If photo is already a valid path, keep it as is (e.g., during an update where image wasn't changed)

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT update a product
router.put('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    let { photo, name, description, price, stockQuantity, status, categoryId } = req.body;

    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Le nom du produit est requis' });
    if (price !== undefined && (isNaN(price) || Number(price) <= 0)) return res.status(400).json({ error: 'Le prix doit être supérieur à 0' });
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

    let productData = {
      name,
      description,
      price,
      stockQuantity,
      status,
      categoryId
    };

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (photo && photo.startsWith('data:image')) {
      // Suppression de l'ancienne image si elle existe
      if (product.photo) {
        const oldPath = getLocalPath(product.photo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      productData.photo = saveBase64Image(photo);
    } else if (photo === '') {
      // If photo is explicitly set to empty, clear it and delete old file
      if (product.photo && fs.existsSync(path.join(__dirname, '..', product.photo))) {
        fs.unlinkSync(path.join(__dirname, '..', product.photo));
      }
      productData.photo = null;
    }
    // If photo is already a valid path (e.g., no change in image), it will be in productData and used in update

    const oldStock = product.stockQuantity;
    await product.update(productData);
    // Log stock movement if quantity changed
    if (stockQuantity !== undefined && Number(stockQuantity) !== oldStock) {
      await logStockMovement(id, oldStock, Number(stockQuantity), 'adjustment', null, req.user?.username);
    }
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ error: error.message });
  }
});

// Helper to log stock movement and check low stock
async function logStockMovement(productId, previousQuantity, newQuantity, reason, reference, createdBy) {
  const changeAmount = newQuantity - previousQuantity;
  await sequelize.query(
    'INSERT INTO stock_movements (productId, previousQuantity, newQuantity, changeAmount, reason, reference, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    { replacements: [productId, previousQuantity, newQuantity, changeAmount, reason, reference || null, createdBy || null] }
  );
  // Broadcast low-stock alert if below threshold
  if (newQuantity <= 15 && newQuantity > 0 && global.broadcastNotification) {
    const [p] = await sequelize.query('SELECT name FROM Products WHERE id = ?', { replacements: [productId] });
    const name = p[0]?.name || 'Produit';
    global.broadcastNotification({
      title: 'Stock faible',
      body: `${name}: ${newQuantity} unité(s) restante(s)`,
      type: 'low_stock'
    });
  } else if (newQuantity === 0 && global.broadcastNotification) {
    const [p] = await sequelize.query('SELECT name FROM Products WHERE id = ?', { replacements: [productId] });
    const name = p[0]?.name || 'Produit';
    global.broadcastNotification({
      title: 'Rupture de stock',
      body: `${name} est en rupture de stock`,
      type: 'out_of_stock'
    });
  }
}

// POST restock: add quantity and log movement
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

// GET movements: stock change history for a product
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

// DELETE a product
router.delete('/:id', authenticate, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Suppression du fichier physique
    if (product.photo) {
      const filePath = getLocalPath(product.photo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await product.destroy();
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;