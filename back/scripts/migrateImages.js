/**
 * Script de migration : upload vers Cloudinary toutes les images
 * produits encore stockées en base64, puis met à jour le champ
 * photo avec l'URL Cloudinary.
 *
 * Usage : node scripts/migrateImages.js
 */
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('../models/Product');

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('CLOUDINARY_CLOUD_NAME non défini. Ajoutez les vars Cloudinary dans .env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

async function migrate() {
  const products = await Product.findAll({ where: { photo: { [Op.ne]: null } } });
  let count = 0;

  for (const product of products) {
    if (!product.photo || product.photo.startsWith('http') || !product.photo.startsWith('data:image')) {
      continue;
    }

    console.log(`Migrating ${product.id} — ${product.name}`);
    const raw = product.photo.replace(/^data:image\/\w+;base64,/, '');
    const extMatch = product.photo.match(/^data:image\/(\w+);base64,/);
    const ext = extMatch && extMatch[1] === 'jpeg' ? 'jpg' : (extMatch ? extMatch[1] : 'jpg');
    const tmpFile = path.join(tmpDir, `migrate_${product.id}.${ext}`);
    fs.writeFileSync(tmpFile, Buffer.from(raw, 'base64'));

    try {
      const result = await cloudinary.uploader.upload(tmpFile, {
        folder: 'easy-erp/produits',
        resource_type: 'image'
      });
      await product.update({ photo: result.secure_url });
      console.log(`  ✓ ${result.secure_url}`);
      count++;
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    } finally {
      fs.unlink(tmpFile, () => {});
    }
  }

  console.log(`\nMigré : ${count} / ${products.length} produits avec image`);
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
