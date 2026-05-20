const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const WebSocket = require('ws');
const sequelize = require('./config/database');
const Product = require('./models/Product');
const models = require('./models');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & middleware
app.disable('x-powered-by');
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  'https://canada-erp.vercel.app',
  'https://canada-erp-frontend.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);
const corsOrigin = function (origin, callback) {
  if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
    return callback(null, true);
  }
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
  callback(null, true); // Allow all in production too
};
app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'");
  next();
});

function sanitize(value) {
  if (typeof value === 'string') {
    return value.replace(/[<>"'`;()]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((clean, key) => {
      clean[key] = sanitize(value[key]);
      return clean;
    }, {});
  }
  return value;
}

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
});
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Routes
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const statsRoutes = require('./routes/statsRoutes');
const orderRoutes = require('./routes/orderRoutes');
const repairRoutes = require('./routes/repairRoutes');
const installationRoutes = require('./routes/installationRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const financeRoutes = require('./routes/financeRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messagingRoutes = require('./routes/messagingRoutes');
const productReviewsRoutes = require('./routes/productReviews');
const configRoutes = require('./routes/configRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const seedRoutes = require('./routes/seedRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/installations', installationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/reviews', productReviewsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', seedRoutes);

// Servir les fichiers statiques du dossier public
app.use('/public', express.static(path.join(__dirname, 'public')));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Solar Tech Solutions ERP API' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
      error: err.message
  });
});

// Database Sync and Server Start
sequelize.sync()
  .then(() => {
    console.log('Database synced successfully.');
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Visit /api/seed to initialize the database');
    });

    // Initialize messaging tables
    sequelize.query(`
      CREATE TABLE IF NOT EXISTS app_conversations (
        id VARCHAR(64) PRIMARY KEY,
        customerId VARCHAR(255) NOT NULL,
        customerName VARCHAR(255) NOT NULL,
        customerPhone VARCHAR(50),
        customerEmail VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        status ENUM('open', 'pending', 'closed') DEFAULT 'open',
        lastMessage TEXT,
        unreadCount INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating app_conversations table:', err));

    // Add new columns if they don't exist (safe migration for existing tables)
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN customerPhone VARCHAR(50) AFTER customerName`)
      .catch(() => {});
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN customerEmail VARCHAR(255) AFTER customerPhone`)
      .catch(() => {});

    sequelize.query(`
      CREATE TABLE IF NOT EXISTS app_messages (
        id VARCHAR(64) PRIMARY KEY,
        conversationId VARCHAR(64) NOT NULL,
        senderId VARCHAR(255) NOT NULL,
        senderName VARCHAR(255) NOT NULL,
        senderRole ENUM('customer', 'admin', 'support') NOT NULL DEFAULT 'customer',
        content TEXT NOT NULL,
        attachmentUrl VARCHAR(500),
        readAt DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating app_messages table:', err));

    sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId VARCHAR(255) NOT NULL,
        previousQuantity INT NOT NULL DEFAULT 0,
        newQuantity INT NOT NULL DEFAULT 0,
        changeAmount INT NOT NULL DEFAULT 0,
        reason VARCHAR(50) NOT NULL DEFAULT 'manual',
        reference VARCHAR(255),
        createdBy VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating stock_movements table:', err));

    // Initialize WebSocket server
    const wss = new WebSocket.Server({ server });

    // Store connected clients
    const clients = new Map();

    wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');

      let customerId = null;

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'auth':
              customerId = message.customerId;
              clients.set(customerId, ws);
              console.log(`Customer ${customerId} authenticated via WebSocket`);
              break;

            case 'send_message':
              handleSendMessage(message.message, customerId);
              break;

            case 'join_conversation':
              ws.conversationId = message.conversationId;
              break;

            case 'leave_conversation':
              ws.conversationId = null;
              break;

            case 'typing':
              handleTypingIndicator(message, customerId, ws);
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        if (customerId) {
          clients.delete(customerId);
          console.log(`Customer ${customerId} disconnected`);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Function to handle sending messages - save to DB + broadcast in real-time
    async function handleSendMessage(messageData, senderId) {
      try {
        const { conversationId, senderName, senderRole, content } = messageData;
        const id = 'msg_' + Date.now();

        await sequelize.query(
          'INSERT INTO app_messages (id, conversationId, senderId, senderName, senderRole, content, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          { replacements: [id, conversationId, senderId, senderName, senderRole, content] }
        );

        await sequelize.query(
          'UPDATE app_conversations SET lastMessage = ?, updatedAt = NOW() WHERE id = ?',
          { replacements: [content, conversationId] }
        );

        if (senderRole !== 'customer') {
          await sequelize.query(
            'UPDATE app_conversations SET unreadCount = unreadCount + 1 WHERE id = ?',
            { replacements: [conversationId] }
          );
        }

        const message = {
          id, ...messageData, senderId, createdAt: new Date()
        };

        // Broadcast to all clients in the same conversation
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.conversationId === conversationId) {
            client.send(JSON.stringify({
              type: 'new_message',
              message
            }));
          }
        });
      } catch (error) {
        console.error('Error saving message via WebSocket:', error);
      }
    }

    // Function to handle typing indicators
    function handleTypingIndicator(data, senderId, senderWs) {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN &&
            client.conversationId === data.conversationId &&
            client !== senderWs) {
          client.send(JSON.stringify({
            type: 'typing',
            conversationId: data.conversationId,
            userId: senderId,
            isTyping: data.isTyping
          }));
        }
      });
    }

    // Function to send notification to specific customer
    global.sendWebSocketNotification = (customerId, notification) => {
      const client = clients.get(customerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          notification
        }));
      }
    };

    // Broadcast a notification to all WebSocket clients
    global.broadcastNotification = (notification) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'notification',
            notification
          }));
        }
      });
    };

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Erreur : Le port ${PORT} est déjà utilisé par un autre programme.`);
      } else {
        console.error('Erreur lors du démarrage du serveur:', error);
      }
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
