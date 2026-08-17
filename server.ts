import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './src/server/routes/authRoutes.js';
import chatRoutes from './src/server/routes/chatRoutes.js';
import messageRoutes from './src/server/routes/messageRoutes.js';
import backupRoutes from './src/server/routes/backupRoutes.js';
import momentRoutes from './src/server/routes/momentRoutes.js';
import mediaRoomRoutes from './src/server/routes/mediaRoomRoutes.js';
import webauthnRoutes from './src/server/routes/webauthnRoutes.js';
import { setupSocketIO } from './src/server/socketHandler.js';


dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    maxHttpBufferSize: 1e7, // 10MB for media upload
  });

  setupSocketIO(io);

  // Enable CORS for Web, Capacitor APK, and Chrome Extension
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parser middleware
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', chatRoutes);
  app.use('/api', messageRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/moments', momentRoutes);
  app.use('/api/media-rooms', mediaRoomRoutes);
  app.use('/api/webauthn', webauthnRoutes);


  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', name: 'Gossip API', time: new Date().toISOString() });
  });

  // Vite middleware or Production static files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🔐 Gossip server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Gossip server:', err);
});
