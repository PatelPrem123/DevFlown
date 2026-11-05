import express from 'express';
import { getDBStatus } from '../config/db.js';
import { env } from '../config/env.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus.readyState === 1 || env.NODE_ENV === 'test';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      service: 'DevFlow API Gateway',
      version: '1.0.0',
      status: isHealthy ? 'healthy' : 'degraded',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatus
    }
  });
});

export default router;
