import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment configuration
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/devflow_db'),
  TEST_MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/devflow_test_db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('devflow_cookie_secret'),
  GITHUB_TOKEN_ENCRYPTION_KEY: z.string().length(64, 'GITHUB_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CALLBACK_URL: z.string().optional().default('http://localhost:5000/api/v1/github/oauth/callback'),
  GITHUB_WEBHOOK_SECRET: z.string().optional().default('devflow_webhook_secret')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ FATAL: Invalid Server Environment Configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsedEnv.success ? parsedEnv.data : process.env;
