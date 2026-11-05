# DevFlow — Installation & Setup Runbook (INSTALLATION.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Target Environment:** Local Development & Production Staging (Windows / Linux / macOS)  

---

## 1. System Prerequisites

Before initializing DevFlow, ensure the following core runtimes are installed:

| Prerequisite | Minimum Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (LTS) | `node -v` |
| **npm** | `>= 9.0.0` | `npm -v` |
| **MongoDB** | `>= 7.0.0` | `mongosh --version` or verify local service port 27017 |
| **Git** | `>= 2.30.0` | `git -v` |

---

## 2. Environment Configuration

### Server Configuration (`server/.env`)
Copy the template configuration in `server/.env.example` to `server/.env`:

```env
# Server Runtime Environment
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Connections
MONGODB_URI=mongodb://127.0.0.1:27017/devflow_db
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/devflow_test_db

# Security Secrets (Must be at least 32 characters long)
JWT_SECRET=devflow_jwt_secret_dev_environment_32bytes_min_length_value
JWT_EXPIRES_IN=7d
COOKIE_SECRET=devflow_cookie_signing_secret_dev_environment_key

# AES-256-GCM Master Key (Hex string, exactly 64 characters = 32 bytes)
GITHUB_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# GitHub OAuth Integration (From GitHub Developer Settings -> OAuth Apps)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1/github/oauth/callback

# GitHub Webhook Shared Secret
GITHUB_WEBHOOK_SECRET=devflow_webhook_verification_secret_key_entropy
```

---

## 3. Step-by-Step Installation

### Step A: Install Server Dependencies
```powershell
cd server
npm install
```

### Step B: Run Automated Tests
Verify that the test suite runs and passes against the local database:
```powershell
npm test
```

### Step C: Launch the API Gateway
```powershell
npm run dev
# Server starts on http://localhost:5000/api/v1
```

### Step D: Install & Launch Client SPA (In a separate terminal)
```powershell
cd ../client
npm install
npm run dev
# Client interface starts on http://localhost:5173
```

---

## 4. Verification Check

Open your browser to:
1. `http://localhost:5000/api/v1/health` — Expect `{"success": true, "data": {"status": "healthy", ...}}`
2. `http://localhost:5173` — Expect the DevFlow workspace dashboard rendering with green "Phase 1 Verified" and active database connection indicator.
