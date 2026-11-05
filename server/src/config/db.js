import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export const connectDB = async (customUri = null) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || (env.NODE_ENV === 'test' ? env.TEST_MONGODB_URI : env.MONGODB_URI);

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true
    });

    isConnected = true;
    if (env.NODE_ENV !== 'test') {
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn.connection;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    databaseName: mongoose.connection.name || null
  };
};
