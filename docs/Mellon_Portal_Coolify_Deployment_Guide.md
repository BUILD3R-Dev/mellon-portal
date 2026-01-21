# Mellon Portal - Coolify Deployment Guide

## Application Overview

| Property | Value |
|----------|-------|
| **Type** | Full-Stack Astro 5.x SSR Application |
| **Language** | TypeScript + React 19 |
| **Database** | PostgreSQL 12+ |
| **ORM** | Drizzle ORM |
| **Styling** | Tailwind CSS 4 |
| **Target VM** | mellon-franchising (192.168.1.66) |

## Prerequisites

Before deploying to Coolify:

1. **GitHub Repository Access**
   - Repository: `mellon-portal` (ensure Coolify has access)
   - Branch to deploy: `main` (or your production branch)

2. **PostgreSQL Database**
   - Either provision on Coolify (recommended) or external
   - Version 12 or higher required

3. **AWS SES Credentials**
   - For password reset and invitation emails
   - Verified sender email address

4. **ClientTether API Access**
   - Enterprise API token from ClientTether

---

## Coolify Setup Steps

### Step 1: Access Coolify

- **URL**: https://panel.build3r.io
- **Auth**: Google OAuth

### Step 2: Create PostgreSQL Database

1. Go to **Projects** → Select or create project for Mellon
2. Click **+ New** → **Database** → **PostgreSQL**
3. Configure:
   - **Name**: `mellon-portal-db`
   - **Version**: 16 (latest stable)
   - **Database Name**: `mellon_portal`
   - **Username**: `mellon`
   - **Password**: (generate strong password)
4. Deploy the database
5. Note the internal connection URL (format: `postgres://mellon:PASSWORD@mellon-portal-db:5432/mellon_portal`)

### Step 3: Create Application Resource

1. In same project, click **+ New** → **Application**
2. Select **GitHub** as source
3. Connect to repository: `mellon-portal`
4. Configure:
   - **Branch**: `main`
   - **Build Pack**: Nixpacks (auto-detected) or Docker

### Step 4: Configure Build Settings

**Build Command:**
```bash
npm ci && npm run build
```

**Start Command:**
```bash
node ./dist/server/entry.mjs
```

**Node Version:** 20.x (specify in Nixpacks or use `.node-version` file)

**Port:** 4321 (Astro default) or configure via `HOST` and `PORT` env vars

### Step 5: Environment Variables

Add these in Coolify's **Environment Variables** section:

```env
# Database (use Coolify's internal DNS)
DATABASE_URL=postgres://mellon:PASSWORD@mellon-portal-db:5432/mellon_portal

# Authentication - GENERATE A STRONG 32+ CHAR SECRET
AUTH_SECRET=generate-a-secure-random-string-min-32-chars

# ClientTether Integration
CLIENTTETHER_API_URL=https://api.clienttether.com
CLIENTTETHER_ACCESS_TOKEN=your-clienttether-enterprise-token

# AWS SES Email
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=AKIA...
AWS_SES_SECRET_KEY=your-secret-key
AWS_SES_FROM_EMAIL=noreply@mellonfranchising.com

# Application URL (your public domain)
BASE_URL=https://portal.mellonfranchising.com

# Node/Astro settings
HOST=0.0.0.0
PORT=4321
NODE_ENV=production
```

### Step 6: Configure Domain

1. Go to **Domains** tab in application settings
2. Add domain: `portal.mellonfranchising.com` (or your chosen domain)
3. Enable **HTTPS** (Let's Encrypt auto-provisioned by Coolify)
4. Coolify's Traefik will handle SSL termination

**DNS Configuration:**
- Add A record: `portal.mellonfranchising.com` → `38.32.12.11`
- Or use CNAME if using Cloudflare proxy

### Step 7: Health Check (Optional but Recommended)

Configure health check endpoint:
- **Path**: `/api/auth/session` (or create a `/health` endpoint)
- **Interval**: 30 seconds

### Step 8: Deploy

1. Click **Deploy** to trigger first deployment
2. Monitor build logs for any issues
3. Verify deployment completes successfully

---

## Post-Deployment Setup

### Run Database Migrations

**Option A: Via Coolify Execute Command**
1. Go to your application in Coolify
2. Click **Execute Command** (terminal icon)
3. Run:
```bash
npm run db:push
```

**Option B: Via SSH to Container**
```bash
# SSH to mellon-franchising VM
ssh -A -i ~/.ssh/id_ed25519_old root@38.32.12.11 -t "ssh build3r@192.168.1.66"

# Find container and exec into it
docker ps | grep mellon
docker exec -it <container_id> npm run db:push
```

### Seed Admin User

After migrations, seed the initial admin:

```bash
npm run db:seed
```

This creates the admin user. Check `scripts/seed-admin.ts` for default credentials.

---

## Alternative: Dockerfile Deployment

If Nixpacks has issues, create this `Dockerfile` in the repo root:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
```

Then in Coolify, set **Build Pack** to **Dockerfile**.

---

## Application Features

### User Roles
| Role | Access |
|------|--------|
| `agency_admin` | Full access, manage all tenants |
| `tenant_admin` | Manage assigned tenant |
| `tenant_viewer` | Read-only tenant access |

### Key Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/` | Landing/Login redirect |
| `/login` | User authentication |
| `/dashboard` | Main dashboard |
| `/admin/*` | Admin panel (agency_admin only) |
| `/reports/*` | Reporting dashboard |
| `/api/*` | REST API endpoints |

### Database Tables
- `users` - User accounts
- `tenants` - Multi-tenant organizations
- `memberships` - User-tenant relationships
- `sessions` - Authentication sessions
- `tenant_branding` - Custom branding per tenant
- `report_*` - Weekly reporting tables
- `audit_log` - Action tracking

---

## Monitoring & Logs

### View Logs in Coolify
1. Go to application → **Logs** tab
2. View real-time or historical logs

### Common Issues

**Database Connection Failed:**
- Verify `DATABASE_URL` uses Coolify's internal DNS
- Ensure database is running and healthy

**Build Fails:**
- Check Node version (needs 20.x)
- Verify all dependencies install correctly

**Emails Not Sending:**
- Verify AWS SES credentials
- Check sender email is verified in SES
- Review application logs for SES errors

**Authentication Issues:**
- Ensure `AUTH_SECRET` is set and 32+ characters
- Verify `BASE_URL` matches actual deployment URL

---

## Sync Worker (Future)

The `worker/sync.js` is a placeholder for ClientTether data synchronization. To enable:

1. Create separate Coolify service or use cron
2. Run `npm run sync` on schedule (hourly recommended)
3. Monitor `sync_runs` table for status

---

## Quick Reference

| Item | Value |
|------|-------|
| **Coolify URL** | https://panel.build3r.io |
| **Target VM** | 192.168.1.66 (mellon-franchising) |
| **App Port** | 4321 |
| **Database** | PostgreSQL 16 |
| **Build** | `npm ci && npm run build` |
| **Start** | `node ./dist/server/entry.mjs` |
| **Migrations** | `npm run db:push` |
| **Seed Admin** | `npm run db:seed` |

---

## Support Contacts

- **Infrastructure**: Check datacenter CLAUDE.md for SSH access
- **Application**: Review `/Users/dustin/dev/github/mellon-portal/docs/PRD.md`
