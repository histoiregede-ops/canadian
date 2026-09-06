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
const { logAudit } = require('../utils/audit');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Format de fichier non autorisé. Utilisez JPG, PNG, WEBP ou GIF.');
      err.status = 400;
      cb(err);
    }
  }
});

const isCloudinaryConfigured = () => Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const uploadToCloudinary = async (filePath) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary n\'est pas configuré. Veuillez définir CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.');
  }
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
const describeDatabaseError = (error) => ({
  name: error?.name,
  message: error?.message,
  code: error?.parent?.code || error?.original?.code || error?.code,
  sqlMessage: error?.parent?.sqlMessage || error?.original?.sqlMessage,
  constraint: error?.parent?.constraint || error?.original?.constraint
});
const isMissingTableError = (error) => {
  const code = error?.parent?.code || error?.original?.code || error?.code;
  return code === 'ER_NO_SUCH_TABLE' || code === 'SQLITE_ERROR' && /no such table/i.test(error?.message || '');
};

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      include: [Category, { model: Supplier, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, pages: Math.ceil(count / limit) });
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
  const tStart = Date.now();
  const step = (label, t) => console.log(`[Product POST] ${label}: ${Date.now() - t} ms`);
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
      const tUpload = Date.now();
      try {
        productData.photo = await uploadToCloudinary(req.file.path);
        step('upload Cloudinary', tUpload);
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    } else if (isBase64Image(req.body.photo)) {
      const tUpload = Date.now();
      const tmp = path.join(os.tmpdir(), `base64_${Date.now()}.jpg`);
      const raw = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(tmp, Buffer.from(raw, 'base64'));
      try {
        productData.photo = await uploadToCloudinary(tmp);
        step('upload Cloudinary', tUpload);
      } finally {
        fs.unlink(tmp, () => {});
      }
    }

    const tCreate = Date.now();
    const product = await Product.create(productData);
    step('Product.create', tCreate);

    const tAudit = Date.now();
    await logAudit(req, 'Product', product.id, 'create', productData);
    step('logAudit', tAudit);

    console.log(`[Product POST] TOTAL: ${Date.now() - tStart} ms`);
    res.status(201).json(product);
  } catch (error) {
    console.error(`[Product POST] ERREUR après ${Date.now() - tStart} ms:`, error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'cashier'), upload.single('photo'), async (req, res) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({
      success: false,
      error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found', details: null, requestId: req.requestId },
      requestId: req.requestId
    });

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
      const previousPhoto = product.photo;
      try {
        productData.photo = await uploadToCloudinary(req.file.path);
      } finally {
        fs.unlink(req.file.path, () => {});
      }
      if (isCloudinaryUrl(previousPhoto)) {
        deleteFromCloudinary(previousPhoto).catch(error => {
          console.error('[Product PUT] Suppression Cloudinary différée échouée:', error.message);
        });
      }
    } else if (req.body.photo === '') {
      if (isCloudinaryUrl(product.photo)) {
        deleteFromCloudinary(product.photo).catch(error => {
          console.error('[Product PUT] Suppression Cloudinary différée échouée:', error.message);
        });
      }
      productData.photo = null;
    } else if (isBase64Image(req.body.photo)) {
      const previousPhoto = product.photo;
      const tmp = path.join(os.tmpdir(), `base64_${Date.now()}.jpg`);
      const raw = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(tmp, Buffer.from(raw, 'base64'));
      try {
        productData.photo = await uploadToCloudinary(tmp);
      } finally {
        fs.unlink(tmp, () => {});
      }
      if (isCloudinaryUrl(previousPhoto)) {
        deleteFromCloudinary(previousPhoto).catch(error => {
          console.error('[Product PUT] Suppression Cloudinary différée échouée:', error.message);
        });
      }
    }

    const oldStock = product.stockQuantity;
    await product.update(productData);
    logAudit(req, 'Product', id, 'update', productData).catch(error => {
      console.error('[Product PUT] Audit différé échoué:', error.message);
    });
    if (stockQuantity !== undefined && Number(stockQuantity) !== oldStock) {
      logStockMovement(id, oldStock, Number(stockQuantity), 'adjustment', null, req.user?.username, req.user?.id, req.user?.role, 'product_adjustment')
        .catch(error => console.error('[Product PUT] Mouvement de stock différé échoué:', error.message));
    }
    res.json({
      ...product.toJSON(),
      success: true,
      data: product,
      requestId: req.requestId
    });
  } catch (error) {
    const details = describeDatabaseError(error);
    console.error('[Product PUT] ERREUR', {
      id: req.params.id,
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      bodyFields: Object.keys(req.body || {}),
      durationMs: Date.now() - startedAt,
      ...details,
      stack: error?.stack
    });
    const status = error?.status || (details.code ? 500 : 400);
    res.status(status).json({
      success: false,
      error: {
        code: status >= 500 ? 'PRODUCT_UPDATE_FAILED' : 'PRODUCT_UPDATE_INVALID',
        message: error.message,
        details: null,
        requestId: req.requestId
      },
      requestId: req.requestId
    });
  }
});

async function logStockMovement(productId, previousQuantity, newQuantity, reason, reference, createdBy, userId, createdByRole, referenceType) {
  const changeAmount = newQuantity - previousQuantity;
  await sequelize.query(
    'INSERT INTO stock_movements (productId, previousQuantity, newQuantity, changeAmount, reason, reference, createdBy, createdByRole, userId, referenceType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    { replacements: [productId, previousQuantity, newQuantity, changeAmount, reason, reference || null, createdBy || null, createdByRole || null, userId || null, referenceType || null] }
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
    await logStockMovement(id, prev, next, 'restock', null, req.user?.username, req.user?.id, req.user?.role, 'product_restock');
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
    await logStockMovement(id, prev, next, reason || 'adjustment', null, req.user?.username, req.user?.id, req.user?.role, 'product_adjustment');
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

router.delete('/:id', authenticate, authorize('admin', 'cashier', 'seller'), async (req, res) => {
  const startedAt = Date.now();
  let transaction;
  try {
    const { id } = req.params;
    transaction = await sequelize.transaction();
    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found', details: null, requestId: req.requestId },
        requestId: req.requestId
      });
    }

    const photoToDelete = product.photo;
    try {
      await sequelize.query('UPDATE OrderItems SET productId = NULL WHERE productId = ?', {
        replacements: [id],
        transaction
      });
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      console.warn('[Product DELETE] Table OrderItems absente, nettoyage ignoré');
    }
    try {
      await sequelize.query('DELETE FROM ProductReviews WHERE productId = ?', {
        replacements: [id],
        transaction
      });
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      console.warn('[Product DELETE] Table ProductReviews absente, nettoyage ignoré');
    }
    const deleted = await Product.destroy({ where: { id }, transaction });
    if (deleted !== 1) {
      const deleteError = new Error(`Product ${id} was not deleted`);
      deleteError.status = 409;
      deleteError.code = 'PRODUCT_DELETE_NOT_CONFIRMED';
      throw deleteError;
    }
    await transaction.commit();
    logAudit(req, 'Product', id, 'delete', { name: product.name, supplierId: product.supplierId }).catch(error => {
      console.error('[Product DELETE] Audit différé échoué:', error.message);
    });
    if (isCloudinaryUrl(photoToDelete)) {
      deleteFromCloudinary(photoToDelete).catch(error => {
        console.error('[Product DELETE] Nettoyage Cloudinary différé échoué:', error.message);
      });
    }
    res.status(200).json({
      success: true,
      message: 'Produit supprimé avec succès',
      data: { id },
      requestId: req.requestId
    });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    const details = describeDatabaseError(error);
    console.error('[Product DELETE] ERREUR', {
      id: req.params.id,
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      durationMs: Date.now() - startedAt,
      ...details,
      stack: error?.stack
    });
    const status = error?.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status >= 500 ? 'PRODUCT_DELETE_FAILED' : 'PRODUCT_DELETE_INVALID',
        message: error.message,
        details: null,
        requestId: req.requestId
      },
      requestId: req.requestId
    });
  }
});

module.exports = router;