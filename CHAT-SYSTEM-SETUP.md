# SETUP CHAT SYSTEM

## 1. Backend Setup

### Install Socket.IO
```bash
cd back
npm install socket.io
```

### Configure .env
```bash
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=erp_db
JWT_SECRET=your-secret-key
SOCKET_IO_CORS_ORIGIN=http://localhost:4200
```

### Create Database Tables
```bash
# Option 1: Run migration
npx sequelize-cli db:migrate

# Option 2: Run SQL script
mysql -u root -p erp_db < back/sql/chat-schema.sql
```

### Update index.js
- Rename current `index.js` to `index-old.js`
- Rename `index-socket.js` to `index.js`
- Or merge the Socket.IO code into your existing index.js

### Start Backend
```bash
node index.js
```

## 2. Frontend Setup

### Install Socket.IO Client
```bash
cd front
npm install socket.io-client
```

### Update AppModule or Component
Import ChatModule in your app module:
```typescript
import { ChatModule } from './pages/chat/chat.module';

@NgModule({
  imports: [
    // ...
    ChatModule
  ]
})
export class AppModule { }
```

### Add Routes
```typescript
import { ChatClientComponent } from './pages/chat/chat-client/chat-client.component';
import { ChatAdminComponent } from './pages/chat/chat-admin/chat-admin.component';

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

### Start Frontend
```bash
npm start
```

## 3. Files Created

### Backend
- `/back/models/Conversation.js` - Sequelize model
- `/back/models/ChatMessage.js` - Sequelize model
- `/back/migrations/20260508000001-create-chat-tables.js` - Migration
- `/back/services/ChatService.js` - Business logic
- `/back/routes/chatRoutes.js` - Express routes
- `/back/socket/chatHandlers.js` - Socket.IO handlers
- `/back/config/socket.js` - Socket configuration
- `/back/sql/chat-schema.sql` - SQL schema
- `/back/index-socket.js` - Updated server with Socket.IO

### Frontend
- `/front/src/app/pages/chat/chat-client/chat-client.component.ts`
- `/front/src/app/pages/chat/chat-client/chat-client.component.html`
- `/front/src/app/pages/chat/chat-client/chat-client.component.css`
- `/front/src/app/pages/chat/chat-admin/chat-admin.component.ts`
- `/front/src/app/pages/chat/chat-admin/chat-admin.component.html`
- `/front/src/app/pages/chat/chat-admin/chat-admin.component.css`
- `/front/src/app/services/chat.service.ts`
- `/front/src/app/services/websocket.service.ts`
- `/front/src/app/pages/chat/chat.module.ts`
- `/front/src/environments/environment.ts`

### Config
- `/.env.example` - Environment variables template
- `/CHAT-SYSTEM-README.md` - Full documentation
- `/CHAT-SYSTEM-SETUP.md` - This file

## 4. Testing

### Client Chat
Visit: `http://localhost:4200/chat/client/1`

### Admin Chat
Visit: `http://localhost:4200/chat/admin`

## 5. Default Flow

1. Client starts chat → Creates conversation
2. Client sends message → Saved in DB + broadcast to admin
3. Admin receives notification
4. Admin joins conversation → Gets message history
5. Admin replies → Message saved + sent to client
6. Both can see real-time typing indicators
7. Admin can close conversation when done

## 6. Key Features

✅ Real-time messaging with Socket.IO
✅ Message persistence in MySQL
✅ Full conversation history
✅ Client/Admin separation
✅ Typing indicators
✅ Unread count tracking
✅ Connection status
✅ Auto-reconnection
✅ Read/unread status

## 7. Database Schema

### conversations table
- id (PK)
- clientId (FK)
- adminId (FK)
- clientEmail
- status (open/closed)
- createdAt
- updatedAt

### chat_messages table
- id (PK)
- conversationId (FK)
- senderId (FK)
- senderRole (client/admin)
- message (TEXT)
- readAt
- createdAt

## 8. Troubleshooting

### Connection refused
- Check if backend is running on port 3001
- Check SOCKET_IO_CORS_ORIGIN in .env

### Messages not saving
- Check MySQL connection
- Verify tables exist in database

### Socket not connecting
- Check browser console for errors
- Verify Socket.IO is imported correctly
- Check CORS settings

### Admin not receiving messages
- Ensure admin is logged in with role='admin'
- Check Socket connection status
- Verify conversation is assigned to admin
