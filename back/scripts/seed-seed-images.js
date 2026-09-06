#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const sequelize = require('../config/database');
const { Product, Category } = require('../models');

const targetDir = path.join(__dirname, '..', 'public', 'products', 'seed-images');
const sourceDir = path.join(__dirname, '..', '..', 'front', 'public', 'SEED-IMAGES');

const products = [
  { file: 'Panneau solaire.jpeg', name: 'Panneau solaire 400W', price: 150000, stock: 12, category: 'Solaire', type: 'solar', description: 'Panneau monocristallin 400 W, rendement élevé, idéal pour les installations résidentielles et professionnelles.' },
  { file: 'solar installation.jpeg', name: 'Kit installation solaire résidentiel', price: 1250000, stock: 4, category: 'Solaire', type: 'solar', description: 'Solution solaire complète pour maison : panneaux, câblage et accessoires de pose. Installation sur devis.' },
  { file: 'Ampoule Qualité.jpeg', name: 'Ampoule LED économique 12W', price: 2500, stock: 80, category: 'Solaire', type: 'solar', description: 'Ampoule LED basse consommation, lumière blanche, longue durée de vie et faible chaleur.' },
  { file: 'Mini ventillo.jpeg', name: 'Mini ventilateur USB', price: 7500, stock: 25, category: 'Électronique', type: 'electronics', description: 'Ventilateur compact alimenté par USB, silencieux, pratique au bureau ou à la maison.' },
  { file: 'Gaziniere.jpeg', name: 'Gazinière 5 feux avec four', price: 185000, stock: 6, category: 'Électroménager', type: 'other', description: 'Gazinière familiale en acier inoxydable, 5 brûleurs, four intégré et allumage pratique.' },
  { file: 'Machine a lavé.jpeg', name: 'Machine à laver automatique 8 kg', price: 275000, stock: 5, category: 'Électroménager', type: 'other', description: 'Lave-linge automatique 8 kg, programmes quotidiens, essorage performant et faible consommation.' },
  { file: 'Moulinex.jpeg', name: 'Blender Moulinex 1,5 L', price: 35000, stock: 12, category: 'Électroménager', type: 'other', description: 'Blender puissant avec bol 1,5 L, idéal pour smoothies, sauces et préparations culinaires.' },
  { file: 'Pack ustensiles de Cuisine.jpeg', name: 'Pack ustensiles de cuisine', price: 28000, stock: 18, category: 'Électroménager', type: 'other', description: 'Ensemble pratique d’ustensiles de cuisine pour équiper une maison ou compléter un équipement.' },
  { file: 'Adapteur Clé usb memoire.jpeg', name: 'Adaptateur et lecteur carte USB', price: 10000, stock: 30, category: 'Accessoires', type: 'accessory', description: 'Lecteur multi-cartes et adaptateur USB compact pour transférer facilement vos fichiers.' },
  { file: 'Chargeur Type C.jpeg', name: 'Chargeur rapide USB-C 25W', price: 12000, stock: 35, category: 'Accessoires', type: 'accessory', description: 'Chargeur secteur USB-C 25 W pour smartphones, tablettes et accessoires compatibles.' },
  { file: 'Chargeur.jpeg', name: 'Chargeur universel smartphone', price: 8000, stock: 40, category: 'Accessoires', type: 'accessory', description: 'Chargeur secteur fiable pour téléphones et petits appareils électroniques.' },
  { file: 'Cable simple chargeur.jpeg', name: 'Câble de charge USB', price: 3500, stock: 70, category: 'Accessoires', type: 'accessory', description: 'Câble de charge et synchronisation, pratique pour les usages quotidiens.' },
  { file: 'casque 9.jpeg', name: 'Casque audio stéréo', price: 18000, stock: 16, category: 'Électronique', type: 'electronics', description: 'Casque audio confortable avec son stéréo équilibré pour musique, appels et vidéos.' },
  { file: 'Pochette.jpeg', name: 'Pochette de protection smartphone', price: 5000, stock: 45, category: 'Accessoires', type: 'accessory', description: 'Pochette souple de protection contre les rayures et les petits chocs.' },
  { file: 'Pochette (2).jpeg', name: 'Coque smartphone renforcée', price: 7500, stock: 40, category: 'Accessoires', type: 'accessory', description: 'Coque résistante avec bords renforcés, protection quotidienne et bonne prise en main.' },
  { file: 'POWER BANK.jpeg', name: 'Power bank 20 000 mAh', price: 25000, stock: 20, category: 'Accessoires', type: 'accessory', description: 'Batterie externe haute capacité avec plusieurs sorties pour recharger vos appareils en déplacement.' },
  { file: 'Rallonge.jpeg', name: 'Rallonge électrique multiprise', price: 15000, stock: 22, category: 'Électronique', type: 'electronics', description: 'Rallonge multiprise robuste pour bureau, maison et installation électrique légère.' }
];

function safeFileName(file) {
  return file.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.]+/g, '-').toLowerCase();
}

async function seedImageProducts({ initializeDatabase = false } = {}) {
  fs.mkdirSync(targetDir, { recursive: true });
  if (initializeDatabase) {
    await sequelize.authenticate();
    await sequelize.sync();
  }

  const categoryIds = new Map();
  for (const item of products) {
    let category = await Category.findOne({ where: { name: item.category } });
    if (!category) category = await Category.create({ name: item.category, type: item.type });
    categoryIds.set(item.category, category.id);
  }

  let created = 0;
  let updated = 0;
  for (const item of products) {
    const source = fs.existsSync(path.join(sourceDir, item.file))
      ? path.join(sourceDir, item.file)
      : path.join(targetDir, safeFileName(item.file));
    if (!fs.existsSync(source)) {
      console.warn(`[seed-images] Image absente: ${item.file}`);
      continue;
    }
    const targetName = safeFileName(item.file);
    fs.copyFileSync(source, path.join(targetDir, targetName));
    const photo = `/public/products/seed-images/${targetName}`;
    const values = {
      description: item.description,
      price: item.price,
      stockQuantity: item.stock,
      status: item.stock > 0 ? 'available' : 'out_of_stock',
      photo,
      categoryId: categoryIds.get(item.category),
      lowStockThreshold: 5
    };
    const [product, wasCreated] = await Product.findOrCreate({
      where: { name: item.name },
      defaults: { id: randomUUID(), name: item.name, ...values }
    });
    if (wasCreated) created += 1;
    else {
      await product.update(values);
      updated += 1;
    }
  }

  console.log(`[seed-images] ${created} produits créés, ${updated} produits mis à jour.`);
}

module.exports = { seedImageProducts };

if (require.main === module) {
  seedImageProducts({ initializeDatabase: true })
    .catch(error => {
      console.error('[seed-images] Échec:', error.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}