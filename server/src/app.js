import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Hub-Signature-256']
}));

// 3. Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests originating from this IP address. Please try again later.'
    }
  }
});
app.use('/api/', apiLimiter);

// 4. Request Parsers (captures rawBody buffer for HMAC webhook signature verification - DEC-007)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// SEO Crawler Directives & Sitemap Endpoints
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /socket.io/\nSitemap: https://devflow.io/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://devflow.io/</loc><changefreq>daily</changefreq><priority>1.00</priority></url>
  <url><loc>https://devflow.io/pricing</loc><changefreq>daily</changefreq><priority>0.95</priority></url>
  <url><loc>https://devflow.io/features</loc><changefreq>weekly</changefreq><priority>0.90</priority></url>
  <url><loc>https://devflow.io/kanban</loc><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>https://devflow.io/sprints</loc><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>https://devflow.io/github-sync</loc><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>https://devflow.io/docs</loc><changefreq>monthly</changefreq><priority>0.80</priority></url>
  <url><loc>https://devflow.io/security</loc><changefreq>monthly</changefreq><priority>0.80</priority></url>
</urlset>`);
});

// 5. Mount API Version 1 Gateway
app.use('/api/v1', apiRouter);

// 6. 404 Handler for Unmatched Endpoints
app.use(notFound);

// 7. Centralized Global Error Handler
app.use(errorHandler);

export default app;
