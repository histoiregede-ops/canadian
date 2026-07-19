CREATE TABLE IF NOT EXISTS app_conversations (
  id VARCHAR(64) PRIMARY KEY,
  customerId VARCHAR(255) NOT NULL,
  customerName VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('open', 'pending', 'closed') DEFAULT 'open',
  lastMessage TEXT,
  unreadCount INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);
