# Chat Real-time System

## Installation

### Backend

1. Installer les dépendances Socket.io:
```bash
cd back
npm install socket.io
```

2. Copier `.env.example` en `.env` et configurer:
```bash
cp .env.example .env
```

3. Exécuter la migration:
```bash
npx sequelize-cli db:migrate
```

4. Lancer le serveur:
```bash
# Renommer index.js en index-old.js et index-socket.js en index.js
node index.js
```

### Frontend

1. Installer les dépendances Socket.io:
```bash
cd front
npm install socket.io-client
```

2. Importer les services et composants dans votre routing:
```typescript
const routes: Routes = [
  {
    path: 'chat/client/:id',
    component: ChatClientComponent
  },
  {
    path: 'chat/admin',
    component: ChatAdminComponent,
    canActivate: [AdminGuard]
  }
];
```

## Architecture

### Base de données
- `conversations`: Stocke les conversations client-admin
- `chat_messages`: Stocke les messages de chaque conversation

### Backend Routes
- `POST /api/chat/conversations/create`: Créer une conversation
- `GET /api/chat/conversations/:id`: Récupérer une conversation
- `GET /api/chat/conversations/:id/messages`: Récupérer les messages
- `GET /api/chat/conversations`: Récupérer toutes les conversations
- `POST /api/chat/conversations/:id/assign`: Assigner un admin
- `POST /api/chat/conversations/:id/close`: Fermer une conversation
- `GET /api/chat/unread-count`: Compter les messages non lus

### Socket Events

#### Client -> Server
- `join-conversation`: Rejoindre une conversation
- `send-message`: Envoyer un message
- `typing`: Signaler que l'utilisateur tape
- `stop-typing`: Arrêter de taper
- `assign-admin`: Assigner un admin

#### Server -> Client
- `load-messages`: Charger l'historique
- `receive-message`: Recevoir un nouveau message
- `user-typing`: L'autre utilisateur tape
- `user-stopped-typing`: Arrêt de la frappe
- `admin-assigned`: Admin assigné
- `new-message-notification`: Notification de nouveau message

## Tables SQL

```sql
CREATE TABLE conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clientId INT NOT NULL,
  adminId INT,
  clientEmail VARCHAR(255) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversationId INT NOT NULL,
  senderId INT NOT NULL,
  senderRole ENUM('client', 'admin') NOT NULL,
  message TEXT NOT NULL,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);
```

## Features

✅ Chat en temps réel avec Socket.io
✅ Persistence des messages en MySQL
✅ Historique complet
✅ Statut de connexion
✅ Indicateurs de frappe
✅ Support admin/client séparé
✅ Gestion des conversations ouvertes/fermées
✅ Notifications de nouveaux messages
✅ Marquer comme lu
