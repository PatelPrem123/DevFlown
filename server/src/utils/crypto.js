import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// Ensure 32-byte master encryption key buffer
const getMasterKeyBuffer = () => {
  const hexKey = env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).');
  }
  return Buffer.from(hexKey, 'hex');
};

/**
 * Encrypts sensitive string using AES-256-GCM (DEC-006)
 * Returns formatted string: iv:authTag:ciphertext (all hex encoded)
 */
export const encryptToken = (plainText) => {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Cannot encrypt non-string or empty payload.');
  }

  const key = getMasterKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts AES-256-GCM ciphertext string (DEC-006)
 * Verifies 16-byte authentication tag to guarantee integrity and authenticity
 */
export const decryptToken = (encryptedPayload) => {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Cannot decrypt non-string or empty payload.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload structure. Expected format: iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getMasterKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Corrupted IV or authentication tag length.');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Verifies GitHub Webhook X-Hub-Signature-256 using constant-time comparison (DEC-007)
 */
export const verifyWebhookSignature = (rawBody, headerSignature, secret = env.GITHUB_WEBHOOK_SECRET) => {
  if (!rawBody || !headerSignature || !secret) {
    return false;
  }

  const parts = headerSignature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const signatureHex = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedHex = hmac.digest('hex');

  const signatureBuffer = Buffer.from(signatureHex, 'hex');
  const expectedBuffer = Buffer.from(expectedHex, 'hex');

  // Must have identical buffer lengths to prevent timing attacks
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

/**
 * Generates cryptographically secure random state string for OAuth CSRF protection
 */
export const generateOAuthState = () => {
  return crypto.randomBytes(32).toString('hex');
};
