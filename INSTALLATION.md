# DevFlow — Installation & Setup Runbook (INSTALLATION.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Author:** Prem Patel ([@PatelPrem123](https://github.com/PatelPrem123) / prempatel55299@gmail.com)  
**Repository:** [https://github.com/PatelPrem123/DevFlown](https://github.com/PatelPrem123/DevFlown)  
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

## 2. Clone Repository & Setup

```bash
# Clone the repository
git clone https://github.com/PatelPrem123/DevFlown.git
cd DevFlown
```

---

## 3. Environment Configuration

### Server Configuration (`server/.env`)
Create or edit `server/.env` with the following baseline:

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

## 4. Step-by-Step Installation & Launch

### Step A: Install Server Dependencies & Seed Demo Dataset
```powershell
cd server
npm install

# Run automated test suites (13 suites, 128 tests)
npm test

# (Optional) Seed realistic demo workspace, project, tasks, and sprints
node src/seedDemo.js

# Launch the API Gateway
npm run dev
# Server starts on http://localhost:5000/api/v1
```

### Step B: Install & Launch Client SPA (In a separate terminal)
```powershell
cd ../client
npm install
npm run dev
# Client interface starts on http://localhost:5173
```

---

## 5. Quick Verification & Demo Access

1. Open your browser to **`http://localhost:5173`**.
2. Click **"1-Click Launch"** on the sign-in page to enter the pre-populated **DevFlow Engineering Workspace** immediately.
3. Or sign in manually with seeded credentials:
   - **Email:** `alex.lead@devflow.io`
   - **Password:** `DevFlow2026!`
4. Verify backend health check: **`http://localhost:5000/api/v1/health`** — returns status `200 OK` with database status `connected`.
