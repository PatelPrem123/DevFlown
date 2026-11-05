import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocket } from './sockets/socketManager.js';

const server = http.createServer(app);

// Initialize Socket.IO Real-Time Mesh
initSocket(server);

// Start Server Function
const startServer = async () => {
  try {
    await connectDB();

    server.listen(env.PORT, () => {
      console.log(`
======================================================
🚀 DevFlow Platform API Gateway Running
📡 Port:         ${env.PORT}
🌍 Environment:  ${env.NODE_ENV}
🔗 API Endpoint: http://localhost:${env.PORT}/api/v1
⚡ WebSocket:    ws://localhost:${env.PORT}/socket.io/
======================================================
      `);
    });
  } catch (error) {
    console.error(`❌ Failed to start DevFlow server: ${error.message}`);
    process.exit(1);
  }
};

// Handle Uncaught Exceptions & Rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Graceful Termination
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Commencing graceful server shutdown...`);
  server.close(async () => {
    console.log('🔒 Closed active HTTP server.');
    await disconnectDB();
    console.log('📦 Disconnected from MongoDB cluster.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server, app };
