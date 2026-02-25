import 'express-async-errors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupWebSocket } from './config/websocket';
import { createApp } from './app';
import { setIo } from './realtime';
import { seedDemoUsers } from './utils/seedDemoUsers';

dotenv.config();

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setIo(io);

// WebSocket setup
setupWebSocket(io);

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      await seedDemoUsers();
      console.log('✅ Demo users are ready');
    } catch (error) {
      console.error('⚠️ Demo users could not be seeded:', error);
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 WebSocket server is ready`);
  });
};

bootstrap();

export { io };
