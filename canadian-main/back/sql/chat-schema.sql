-- Chat System Tables

CREATE TABLE IF NOT EXISTS conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clientId INT NOT NULL,
  adminId INT,
  clientEmail VARCHAR(255) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientId (clientId),
  INDEX idx_adminId (adminId),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversationId INT NOT NULL,
  senderId INT NOT NULL,
  senderRole ENUM('client', 'admin') NOT NULL,
  message TEXT NOT NULL,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_conversationId (conversationId),
  INDEX idx_senderId (senderId)
);
