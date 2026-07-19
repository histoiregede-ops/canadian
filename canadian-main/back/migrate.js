const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize with database connection
const DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD || '';
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    // Check if columns already exist
    console.log('🔍 Checking existing columns...');
    const [existingColumns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'Customers'
      AND COLUMN_NAME IN ('password', 'points', 'loyaltyLevel', 'email', 'phone')
    `);

    const existingColumnNames = existingColumns.map(col => col.COLUMN_NAME);

    // Add new columns to Customer table if they don't exist
    if (!existingColumnNames.includes('password')) {
      console.log('📝 Adding password column to Customer table...');
      await sequelize.query(`ALTER TABLE Customers ADD COLUMN password VARCHAR(255)`);
    }

    if (!existingColumnNames.includes('points')) {
      console.log('📝 Adding points column to Customer table...');
      await sequelize.query(`ALTER TABLE Customers ADD COLUMN points INT DEFAULT 0`);
    }

    if (!existingColumnNames.includes('loyaltyLevel')) {
      console.log('📝 Adding loyaltyLevel column to Customer table...');
      await sequelize.query(`ALTER TABLE Customers ADD COLUMN loyaltyLevel ENUM('Bronze', 'Argent', 'Or', 'Platinum') DEFAULT 'Bronze'`);
    }

    if (!existingColumnNames.includes('email')) {
      console.log('📝 Adding email column to Customer table...');
      await sequelize.query(`ALTER TABLE Customers ADD COLUMN email VARCHAR(255) UNIQUE`);
    }

    if (!existingColumnNames.includes('phone')) {
      console.log('📝 Adding phone column to Customer table...');
      await sequelize.query(`ALTER TABLE Customers ADD COLUMN phone VARCHAR(20)`);
    }

    // Check if ProductReview table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'ProductReviews'
    `);

    if (tables.length === 0) {
      // Create ProductReview table (without foreign keys for now)
      console.log('📝 Creating ProductReview table...');
      await sequelize.query(`
        CREATE TABLE ProductReviews (
          id VARCHAR(36) PRIMARY KEY,
          productId VARCHAR(36) NOT NULL,
          customerId VARCHAR(36) NOT NULL,
          rating INT NOT NULL,
          title VARCHAR(255),
          comment TEXT,
          isVerified BOOLEAN DEFAULT FALSE,
          helpful INT DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_product_rating (productId, rating),
          INDEX idx_customer_reviews (customerId),
          INDEX idx_created_at (createdAt)
        )
      `);

      // Add CHECK constraint separately (MySQL 8.0.16+)
      try {
        await sequelize.query(`ALTER TABLE ProductReviews ADD CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5)`);
      } catch (constraintError) {
        console.log('⚠️  CHECK constraint not supported, will validate in application layer');
      }
    } else {
      console.log('📝 ProductReview table already exists');
    }

    console.log('✅ Database migrations completed successfully!');
    console.log('📋 Summary of changes:');
    console.log('   - Added missing columns to Customers table');
    console.log('   - Created ProductReviews table if not exists');
    console.log('   - All indexes are in place');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migrations
runMigrations();