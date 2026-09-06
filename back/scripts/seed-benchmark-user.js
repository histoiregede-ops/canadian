#!/usr/bin/env node
/**
 * Seed minimal pour le benchmark API (mode --sqlite uniquement).
 * Crée l'utilisateur admin (admin/admin) si la base est vide.
 * N'a AUCUN effet sur la base de production : le benchmark l'exécute
 * uniquement contre la base temporaire back/tmp/benchmark.sqlite.
 */
'use strict';

const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { User } = require('../models');

async function main() {
  try {
    const count = await User.count();
    if (count === 0) {
      await User.bulkCreate([
        {
          username: 'admin',
          password: bcrypt.hashSync('admin', 10),
          role: 'admin',
          fullName: 'Administrateur Système',
          email: 'admin@benchmark.local'
        }
      ]);
      console.log('[seed-benchmark] utilisateur admin créé');
    } else {
      console.log(`[seed-benchmark] ${count} utilisateur(s) présent(s), aucun seed nécessaire`);
    }
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error('[seed-benchmark] échec :', err.message);
  process.exit(1);
});