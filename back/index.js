const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');
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
  if (!origin && process.env.NODE_ENV === 'production') {
    return callback(new Error('Not allowed by CORS'), false);
  }
  if (!origin) {
    return callback(null, true);
  }
  if (allowedOrigins.some(o => origin.startsWith(o))) {
    return callback(null, true);
  }
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
  return callback(new Error('Origin non autorisée par CORS'), false);
};
app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'");
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

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
});

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
const supplierRoutes = require('./routes/supplierRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const movementRoutes = require('./routes/movementRoutes');
const seedRoutes = require('./routes/seedRoutes');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' }
});
app.use('/api/auth/login', loginLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Trop de requêtes, réessayez plus tard' }
});
app.use('/api/', apiLimiter);

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
app.use('/api/suppliers', supplierRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/movements', movementRoutes);

app.use('/api', seedRoutes);

// Servir les fichiers statiques du dossier public
app.use('/public', express.static(path.join(__dirname, 'public')));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Canadian Solar ERP API', documentation: '/api-docs' });
});

// Swagger Documentation
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Canadian Solar ERP API',
      version: '1.0.0',
      description: 'API complète pour la gestion de magasin solaire et électronique'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Serveur de développement' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./swagger.json']
};

const swaggerDocs = require('./swagger.json');

app.get('/api-docs/login', (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'");
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swagger Login</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      width: 100%;
      max-width: 420px;
    }
    .login-card h1 {
      font-size: 1.8rem;
      color: #333;
      margin-bottom: 8px;
      text-align: center;
    }
    .login-card p {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 0.95rem;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s;
      outline: none;
    }
    .form-group input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .btn-login {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }
    .btn-login:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }
    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .result {
      margin-top: 25px;
      padding: 15px;
      border-radius: 10px;
      display: none;
      word-break: break-all;
    }
    .result.success {
      display: block;
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .result.error {
      display: block;
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .result h3 {
      font-size: 1rem;
      margin-bottom: 10px;
    }
    .result code {
      background: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }
    .result .token {
      background: #fff;
      padding: 10px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      word-break: break-all;
      max-height: 120px;
      overflow-y: auto;
      margin-top: 8px;
      border: 1px solid #ddd;
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 20px;
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .loading {
      display: none;
      text-align: center;
      margin-top: 20px;
      color: #667eea;
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(102, 126, 234, 0.3);
      border-radius: 50%;
      border-top-color: #667eea;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>🔐 Swagger Login</h1>
    <p>Obtenir un token JWT pour l'API</p>
    
    <form id="loginForm">
      <div class="form-group">
        <label for="username">Identifiant</label>
        <input type="text" id="username" name="username" placeholder="admin" required value="admin">
      </div>
      
      <div class="form-group">
        <label for="password">Mot de passe</label>
        <input type="password" id="password" name="password" placeholder="admin123" required value="admin123">
      </div>
      
      <button type="submit" class="btn-login" id="loginBtn">Se connecter</button>
    </form>
    
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p style="margin-top: 10px; color: #667eea;">Connexion en cours...</p>
    </div>
    
    <div class="result" id="result">
      <h3 id="resultTitle"></h3>
      <div class="token" id="tokenDisplay"></div>
    </div>
    
    <a href="/api-docs" class="back-link">← Retour à Swagger UI</a>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');
      const loading = document.getElementById('loading');
      const result = document.getElementById('result');
      const resultTitle = document.getElementById('resultTitle');
      const tokenDisplay = document.getElementById('tokenDisplay');
      
      loginBtn.disabled = true;
      loading.style.display = 'block';
      result.className = 'result';
      result.style.display = 'none';
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          resultTitle.textContent = '✅ Connexion réussie !';
          tokenDisplay.textContent = data.token;
          result.className = 'result success';
          result.style.display = 'block';
        } else {
          resultTitle.textContent = '❌ Erreur de connexion';
          tokenDisplay.textContent = data.error || data.message || 'Identifiants invalides';
          result.className = 'result error';
          result.style.display = 'block';
        }
      } catch (error) {
        resultTitle.textContent = '❌ Erreur réseau';
        tokenDisplay.textContent = error.message;
        result.className = 'result error';
        result.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loading.style.display = 'none';
      }
    });
  </script>
</body>
</html>
  `);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message;
  res.status(status).json({ error: message });
});

// Database Sync and Server Start
sequelize.sync()
  .then(async () => {
    console.log('Database synced successfully.');
    const count = await models.User.count();
    if (count === 0) {
      const seed = require('./seeders/202605200001-default-data');
      await seed.up(sequelize.getQueryInterface());
      console.log('Seed data inserted automatically.');

      const barcodeSeed = require('./seeders/barcodeSeeder');
      await barcodeSeed.up(sequelize.getQueryInterface());
      console.log('Barcode seeding completed.');
    }
    const server = app.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT}`);
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
        productId VARCHAR(255),
        productName VARCHAR(255),
        productPrice DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'open',
        lastMessage TEXT,
        unreadCount INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating app_conversations table:', err));

    // Add new columns if they don't exist (safe migration for existing tables)
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN customerPhone VARCHAR(50) AFTER customerName`)
      .catch(() => {});
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN customerEmail VARCHAR(255) AFTER customerPhone`)
      .catch(() => {});
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN productId VARCHAR(255) AFTER customerEmail`)
      .catch(() => {});
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN productName VARCHAR(255) AFTER productId`)
      .catch(() => {});
    sequelize.query(`ALTER TABLE app_conversations ADD COLUMN productPrice DECIMAL(10, 2) AFTER productName`)
      .catch(() => {});

    sequelize.query(`
      CREATE TABLE IF NOT EXISTS app_messages (
        id VARCHAR(64) PRIMARY KEY,
        conversationId VARCHAR(64) NOT NULL,
        senderId VARCHAR(255) NOT NULL,
        senderName VARCHAR(255) NOT NULL,
        senderRole VARCHAR(20) NOT NULL DEFAULT 'customer',
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

    sequelize.query(`
      CREATE TABLE IF NOT EXISTS app_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        type VARCHAR(50) DEFAULT 'info',
        readStatus TINYINT(1) DEFAULT 0,
        link VARCHAR(500),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating app_notifications table:', err));

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
        // Fallback: use senderId from messageData if socket wasn't authenticated
        if (!senderId && messageData.senderId) {
          senderId = messageData.senderId;
        }
        const { conversationId, senderName, senderRole, content } = messageData;
        const id = 'msg_' + Date.now();

        await sequelize.query(
          'INSERT INTO app_messages (id, conversationId, senderId, senderName, senderRole, content, createdAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          { replacements: [id, conversationId, senderId, senderName, senderRole, content] }
        );

        await sequelize.query(
          'UPDATE app_conversations SET lastMessage = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
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
    global.broadcastNotification = async (notification) => {
      // Persist to database for all staff users
      try {
        const [staffUsers] = await sequelize.query(
          "SELECT id FROM Users WHERE role IN ('admin', 'cashier', 'technician')"
        );
        for (const user of staffUsers) {
          await sequelize.query(
            'INSERT INTO app_notifications (userId, title, body, type, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            { replacements: [user.id, notification.title, notification.body, notification.type || 'info'] }
          );
        }
      } catch (err) {
        console.error('Error persisting notification:', err.message);
      }
      // Broadcast to all connected WebSocket clients (existing logic)
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
