// Forcer SQLite pour les tests (ne touche PAS à la base MySQL/Aiven)
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = process.env.DB_STORAGE || require('path').join(__dirname, '..', 'tmp', 'test-database.sqlite');
process.env.PORT = '0'; // port éphémère → évite EADDRINUSE entre fichiers de test

const sequelize = require('../config/database');

// Charge/enregistre tous les modèles Sequelize (User, Product, Order, ...) sur l'instance,
// sinon `sequelize.sync()` ne crée aucune table.
require('../models');

// Tables "raw" (non Sequelize) créées par index.js au démarrage.
// index.js utilise des DDL MySQL (AUTO_INCREMENT, ENUM...) qui échouent sur SQLite :
// on les recrée ici en DDL SQLite compatible pour que les routes correspondantes
// (movements, messages, notifications) fonctionnent en test.
async function createRawTables() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId VARCHAR(255) NOT NULL,
    previousQuantity INTEGER NOT NULL DEFAULT 0,
    newQuantity INTEGER NOT NULL DEFAULT 0,
    changeAmount INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(50) NOT NULL DEFAULT 'manual',
    reference VARCHAR(255),
    createdBy VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await sequelize.query(`CREATE TABLE IF NOT EXISTS app_conversations (
    id VARCHAR(64) PRIMARY KEY,
    customerId VARCHAR(255) NOT NULL,
    customerName VARCHAR(255) NOT NULL,
    customerPhone VARCHAR(50),
    customerEmail VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    productId VARCHAR(255),
    productName VARCHAR(255),
    productPrice DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'open',
    lastMessage TEXT,
    unreadCount INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await sequelize.query(`CREATE TABLE IF NOT EXISTS app_messages (
    id VARCHAR(64) PRIMARY KEY,
    conversationId VARCHAR(64) NOT NULL,
    senderId VARCHAR(255) NOT NULL,
    senderName VARCHAR(255) NOT NULL,
    senderRole VARCHAR(20) NOT NULL DEFAULT 'customer',
    content TEXT NOT NULL,
    attachmentUrl VARCHAR(500),
    readAt DATETIME NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await sequelize.query(`CREATE TABLE IF NOT EXISTS app_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50) DEFAULT 'info',
    readStatus TINYINT(1) DEFAULT 0,
    link VARCHAR(500),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = async () => {
  await sequelize.authenticate();
  console.log('Test database connected (sqlite)');
  // SQLite ne supporte qu'un seul écrivain à la fois : quand un test ouvre une
  // transaction, les requêtes "hors transaction" (ex: INSERT stock_movements)
  // se font sur une 2e connexion et déclenchent SQLITE_BUSY. On augmente le
  // busy_timeout pour que ces écritures attendent la fin de la transaction.
  await sequelize.query('PRAGMA busy_timeout = 30000');
  // Schéma frais + données de base (admin/admin, admin2/admin, cashier1/cashier123, tech1/password)
  await sequelize.sync({ force: true });
  await createRawTables();
  const seed = require('../seeders/202605200001-default-data');
  await seed.up(sequelize.getQueryInterface());
  console.log('Test database synced and seeded (default-data)');
};
