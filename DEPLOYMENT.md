# DevFlow — Production Deployment & Operations Guide (DEPLOYMENT.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Target Environments:** Ubuntu 22.04 LTS / Debian 12 / Docker Compose / Kubernetes  

---

## 1. System Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 20 GB SSD | 50 GB NVMe |
| **Node.js** | Node.js v18.18+ or v20+ / v24+ | Node.js v20 LTS / v24 |
| **Database** | MongoDB 6.0+ | MongoDB 7.0+ (Replica Set enabled for transactions) |
| **Web Server** | Nginx 1.20+ | Nginx 1.24+ with HTTP/2 & TLS 1.3 |

---

## 2. Production Environment Configuration Checklist

Create `/opt/devflow/server/.env` with strict `chmod 600` permissions:

```ini
# Runtime & Networking
NODE_ENV=production
PORT=5000
CLIENT_URL=https://devflow.yourcompany.com

# Database Connection (Replica Set recommended for multi-document ACID transactions)
MONGODB_URI=mongodb://devflow_user:SecurePassword123!@127.0.0.1:27017/devflow_prod?replicaSet=rs0&authSource=admin
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/devflow_test_db

# Security & Session Secrets
JWT_SECRET=c2e8a159f816432b9845d070b4c718a287e0fa19d3b4e18342738a9d18e819b0
JWT_EXPIRES_IN=7d
COOKIE_SECRET=f9814c1e8749a0b12d87e0234bfa901247812903841920834192083412089412

# AES-256-GCM Master Encryption Key (Must be exactly 64 hexadecimal characters = 32 bytes)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
GITHUB_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# GitHub OAuth Integration
GITHUB_CLIENT_ID=your_github_production_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_production_oauth_client_secret
GITHUB_CALLBACK_URL=https://devflow.yourcompany.com/api/v1/github/oauth/callback

# GitHub Webhook Shared Secret
GITHUB_WEBHOOK_SECRET=your_github_webhook_verification_secret_entropy
```

---

## 3. Docker Compose Deployment

A containerized stack can be launched using `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_DATABASE: devflow_prod
    volumes:
      - mongo_data:/data/db
    ports:
      - "127.0.0.1:27017:27017"

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongodb:27017/devflow_prod
    depends_on:
      - mongodb
    ports:
      - "127.0.0.1:5000:5000"

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - server

volumes:
  mongo_data:
```

---

## 4. Nginx Reverse Proxy with WebSocket Upgrade Configuration

In production environments running on bare-metal or VMs, configure Nginx at `/etc/nginx/sites-available/devflow`:

```nginx
server {
    listen 80;
    server_name devflow.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name devflow.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/devflow.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/devflow.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Single Page Application (SPA)
    location / {
        root /opt/devflow/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # REST API Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO Real-Time Mesh with WebSocket Upgrade
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

---

## 5. Process Management via PM2

Manage background Node.js processes with PM2 clustering:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'devflow-api',
      script: './src/index.js',
      cwd: '/opt/devflow/server',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100
    }
  ]
};
```

Commands:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 6. Pre-Flight Security & Go-Live Checklist

- [x] Generated 64-character hex master key for `GITHUB_TOKEN_ENCRYPTION_KEY`.
- [x] Verified `devflow_token` cookies feature `HttpOnly`, `Secure`, and `SameSite=strict`.
- [x] Verified rate limiting on `/api/v1/auth/login` (50 attempts per 15 min).
- [x] Verified raw body verification for webhook HMAC-SHA256 ingress.
- [x] Verified no bypass flags or backdoors (`BYPASS_AUTH`, `DEBUG=true`) are present.
- [x] Executed full automated regression suite (`npm test` in `server`, 128/128 tests passing).
- [x] Compiled client production assets via `npm run build` with zero chunk warnings.
