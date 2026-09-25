const Redis = require('ioredis');
require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'canadian:',
  retryStrategy: (times) => {
    // Retry after increasing delays up to max 2 seconds
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
  connectTimeout: 10000, // 10 seconds
};

// Create Redis client
let redisClient = null;
let redisIsConnected = false;

function initRedis() {
  try {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('connect', () => {
      redisIsConnected = true;
      console.log('[Redis] Connected to Redis server');
    });
    
    redisClient.on('ready', () => {
      console.log('[Redis] Redis client is ready');
    });
    
    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      redisIsConnected = false;
    });
    
    redisClient.on('close', () => {
      console.warn('[Redis] Connection closed');
      redisIsConnected = false;
    });
    
    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting to Redis...');
    });
    
    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize Redis client:', error.message);
    return null;
  }
}

// Get Redis client instance
function getRedisClient() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

// Check if Redis is available
function isRedisAvailable() {
  return redisIsConnected && redisClient && redisClient.status === 'ready';
}

// Cache helper functions
const cache = {
  // Set a value with TTL (in seconds)
  async set(key, value, ttl = 300) { // Default 5 minutes
    if (!isRedisAvailable()) return false;
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient.setex(key, ttl, stringValue);
      return true;
    } catch (error) {
      console.error('[Redis] SET error:', error.message);
      return false;
    }
  },
  
  // Get a value
  async get(key) {
    if (!isRedisAvailable()) return null;
    try {
      const value = await redisClient.get(key);
      if (value === null) return null;
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value;
      }
    } catch (error) {
      console.error('[Redis] GET error:', error.message);
      return null;
    }
  },
  
  // Delete a key
  async del(key) {
    if (!isRedisAvailable()) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('[Redis] DEL error:', error.message);
      return false;
    }
  },
  
  // Clear all keys with our prefix (use with caution!)
  async clearPrefix() {
    if (!isRedisAvailable()) return false;
    try {
      const keys = await redisClient.keys(`${redisConfig.keyPrefix}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('[Redis] CLEAR PREFIX error:', error.message);
      return false;
    }
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  isRedisAvailable,
  cache
};