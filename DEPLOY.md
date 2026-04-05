# Deployment Guide

SkillHub uses two hosting services:
- **Railway** — backend (Bun/Hono server + PostgreSQL)
- **Vercel** — frontend (React/Vite static site)

---

## Step 1 — Deploy the backend to Railway

### 1a. Create a Railway project

1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project → Deploy from GitHub repo**.
3. Connect your GitHub account and select this repository.
4. Railway detects the `Dockerfile` and `railway.toml` automatically.

### 1b. Add a PostgreSQL database

1. Inside your Railway project, click **New → Database → Add PostgreSQL**.
2. Railway will automatically inject a `DATABASE_URL` environment variable into your backend service.
3. Once the Postgres service is running, open a Railway shell (or use the Railway CLI) to initialise the schema:
   ```
   railway run psql $DATABASE_URL -f db/init.sql
   ```

### 1c. Add a Volume for skill file storage

1. In your backend service on Railway, go to **Volumes → New Volume**.
2. Set the mount path to `/app/skills-data`.
3. This keeps uploaded skill files persistent across deploys.

### 1d. Set environment variables

In your Railway backend service → **Variables**, add:

| Variable | Value |
|---|---|
| `PORT` | `3000` (Railway sets this automatically) |
| `SKILLS_DIR` | `/app/skills-data` |
| `LLM_TIMEOUT_MS` | `60000` |

`DATABASE_URL` is injected automatically by the Postgres plugin.

### 1e. Note your Railway URL

Once deployed, Railway gives your service a public URL like:
```
https://skillhub-backend-production.up.railway.app
```
Copy this — you need it for Vercel.

---

## Step 2 — Update vercel.json with your Railway URL

Open `vercel.json` in the project root and replace the three `YOUR_RAILWAY_URL` placeholders with your actual Railway URL:

```json
"destination": "https://skillhub-backend-production.up.railway.app/api/:path*"
```

Commit and push this change.

---

## Step 3 — Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New → Project → Import Git Repository**.
3. Select this repository.
4. Vercel will detect `vercel.json` in the root. The build command and output directory are already configured there — no changes needed in the Vercel UI.
5. Click **Deploy**.

The frontend will be live at your Vercel URL (e.g. `https://skillhub.vercel.app`).
All `/api/*` and `/mcp/*` requests are proxied to Railway transparently.

---

## Verification

Once both are deployed, visit:
- `https://your-vercel-app.vercel.app` — frontend should load
- `https://your-railway-url/health` — should return `{"status":"ok","db":true}`

---

## Local development (unchanged)

```bash
# Terminal 1 — Postgres
docker compose up -d postgres

# Terminal 2 — Backend
bun run dev

# Terminal 3 — Frontend
cd web && bun run dev
```
