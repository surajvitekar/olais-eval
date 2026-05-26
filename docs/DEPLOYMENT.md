# Olais Eval — Deployment Guide

## Prerequisites

- **Server**: Linux (Debian/Ubuntu recommended), 2+ GB RAM, 20+ GB storage
- **Docker**: Docker Engine 24+ and Docker Compose v2+
- **Domain**: `eval.olais.in` pointed to your server IP (via Cloudflare DNS)
- **SSL**: Let's Encrypt certificate or Cloudflare Origin CA certificate
- **Ports**: 80 (HTTP) and 443 (HTTPS) open in firewall

### Install Docker

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Step 1: Clone the Repository

```bash
git clone https://github.com/surajvitekar/olais-eval.git /opt/olais-eval
cd /opt/olais-eval
```

## Step 2: Configure Environment

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your production values:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://olais:pass@db:5432/olais_eval` |
| `AUTH_SECRET` | Auth.js encryption secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public-facing app URL | `https://eval.olais.in` |
| `JWT_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `DB_PASSWORD` | PostgreSQL password | Same as in DATABASE_URL |

Generate secrets:
```bash
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -base64 32  # For JWT_SECRET
```

## Step 3: Start the Application

```bash
# Pull images and start services
docker compose -f docker-compose.prod.yml up -d

# Check container status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f app
```

## Step 4: Run Database Migrations

```bash
# Run Prisma migrations to create tables
docker compose -f docker-compose.prod.yml exec app npx prisma db push

# Seed the database with initial data (questions, problems)
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

## Step 5: Create Admin Account

```bash
# Connect to the app container
docker compose -f docker-compose.prod.yml exec app sh

# Run the admin creation script
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('YourAdminPassword123!', 12);
  await prisma.user.create({
    data: {
      email: 'admin@olais.in',
      name: 'Admin',
      passwordHash: hash,
      role: 'ADMIN',
      status: 'REGISTERED',
    },
  });
  console.log('Admin account created');
}
main().catch(console.error).finally(() => prisma.\$disconnect());
"
```

## Cloudflare DNS Setup

1. Log in to your Cloudflare dashboard
2. Add your domain `olais.in` to Cloudflare (if not already)
3. Create a **DNS A record**:
   - Type: `A`
   - Name: `eval`
   - IPv4 Address: `<your-server-ip>`
   - Proxy Status: **Proxied** (orange cloud) for DDoS + SSL
4. In **SSL/TLS → Overview**, set encryption mode to **Full (strict)**
5. In **SSL/TLS → Origin Server**, create an **Origin CA certificate**:
   - Copy the certificate to server: `/etc/ssl/certs/origin.crt`
   - Copy the private key to server: `/etc/ssl/private/origin.key`
6. Update `docker/nginx.conf` to point to these certificate paths
7. Restart Nginx: `docker compose -f docker-compose.prod.yml restart nginx`

## SSL Certificates

### Option A: Cloudflare Origin CA (Recommended)

```bash
# Create certificate directories
sudo mkdir -p /etc/ssl/certs /etc/ssl/private

# Place the certificate and key files (from Cloudflare dashboard)
sudo nano /etc/ssl/certs/origin.crt
sudo nano /etc/ssl/private/origin.key
sudo chmod 644 /etc/ssl/certs/origin.crt
sudo chmod 600 /etc/ssl/private/origin.key
```

### Option B: Let's Encrypt (Certbot)

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d eval.olais.in
# Certificates will be at /etc/letsencrypt/live/eval.olais.in/
```

## Health Check

```bash
# Verify the app is responding
curl -s -o /dev/null -w "%{http_code}" https://eval.olais.in

# Check database connection
docker compose -f docker-compose.prod.yml exec app npx prisma db push --dry-run

# Monitor logs
docker compose -f docker-compose.prod.yml logs --tail=100 -f
```

## Updating

```bash
cd /opt/olais-eval
git pull origin main
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Container won't start | Check logs: `docker compose logs app` |
| Database connection refused | Ensure DB container is healthy: `docker compose ps` |
| 502 Bad Gateway | App may still be starting; wait 30s and retry |
| Rate limiting too strict | Adjust `limit_req` parameters in `docker/nginx.conf` |
| Session not persisting | Verify `NEXTAUTH_URL` matches actual URL |
