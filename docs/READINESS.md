# Olais Eval — Production Readiness Checklist

Use this checklist before deploying to production. Each item must be verified.

---

## 1. Environment Variables

- [ ] `DATABASE_URL` — PostgreSQL connection string with strong password
- [ ] `AUTH_SECRET` — Generated with `openssl rand -base64 32`, >32 chars
- [ ] `NEXTAUTH_URL` — Set to `https://eval.olais.in` (not localhost)
- [ ] `JWT_SECRET` — Generated with `openssl rand -base64 32`, separate from AUTH_SECRET
- [ ] `NEXT_PUBLIC_APP_NAME` — Display name (e.g., "Olais Eval")
- [ ] `NEXT_PUBLIC_APP_URL` — Public URL `https://eval.olais.in`
- [ ] `MAX_PARTICIPANTS` — Set to desired cycle capacity
- [ ] `CAMPAIGN_DEADLINE` — ISO 8601 format, future date
- [ ] `LEADERBOARD_PUBLIC` — `true` or `false`
- [ ] `.env.production` is **NOT** committed to version control
- [ ] `.env.production` has correct file permissions (`chmod 600`)

## 2. Database

- [ ] PostgreSQL 16 running with health check passing
- [ ] Database user has a strong, unique password
- [ ] Remote access to port 5432 is blocked (firewall)
- [ ] Prisma migrations have been applied (`npx prisma db push`)
- [ ] Seed data has been loaded (`npx prisma db seed`)
- [ ] `pg_isready` responds successfully
- [ ] Database is backed up (see `docs/BACKUP.md`)

## 3. SSL/TLS

- [ ] Valid SSL certificate installed (Cloudflare Origin CA or Let's Encrypt)
- [ ] Nginx configured to use certificate paths in `docker/nginx.conf`
- [ ] HTTP → HTTPS redirect working (port 80 → 443)
- [ ] HSTS header set (`Strict-Transport-Security: max-age=63072000`)
- [ ] SSL protocols restricted to TLSv1.2 and TLSv1.3
- [ ] Certificate auto-renewal configured (if Let's Encrypt)

## 4. Rate Limiting

- [ ] Auth routes limited to 10 requests/minute (configured in nginx.conf)
- [ ] API routes limited to 60 requests/minute
- [ ] General page routes limited to 120 requests/minute
- [ ] Rate limit error pages return 429 status code
- [ ] Rate limiting tested with burst traffic

## 5. Admin Accounts

- [ ] At least one admin account created
- [ ] Admin email: `admin@olais.in` (or custom)
- [ ] Admin password meets security requirements (12+ chars, mixed case, numbers)
- [ ] No default/weak passwords in production
- [ ] Admin registration disabled for public (invite-only)

## 6. Problem Templates Seeded

- [ ] At least 12 problem templates exist in the database
- [ ] Problems cover all 10 assessment categories
- [ ] Each problem has requirements, constraints, deliverables
- [ ] Problems have difficulty ratings (1-5)
- [ ] Problems are marked `isActive: true`
- [ ] Seed script can be re-run safely (uses `upsert` or checks duplicates)

## 7. Assessment Questions Seeded

- [ ] At least 15 assessment questions exist
- [ ] Questions cover all question types (SELF_RATING, MULTIPLE_CHOICE, EXPERIENCE, etc.)
- [ ] Questions have proper weights assigned
- [ ] Questions have valid options for MCQ types

## 8. Backup Strategy

- [ ] Daily backup cron job installed (see `docs/BACKUP.md`)
- [ ] Backup retention policy configured (30 days recommended)
- [ ] Backup storage location has sufficient disk space
- [ ] Backup restoration has been tested
- [ ] Offsite/cloud backup configured (optional but recommended)
- [ ] `scripts/` directory exists with backup script

## 9. Monitoring & Logging

- [ ] Docker container health checks configured
- [ ] Nginx access and error logs enabled
- [ ] Log rotation configured (logrotate)
- [ ] Application errors logged to stderr
- [ ] Audit logging active for all critical actions
- [ ] Docker restart policy set to `always`

## 10. Docker Configuration

- [ ] `docker-compose.prod.yml` builds without errors
- [ ] Docker containers run as non-root users
- [ ] Containers have restart policies set
- [ ] No sensitive data in Dockerfiles or compose files
- [ ] Docker images tagged with version (optional but recommended)
- [ ] `.dockerignore` excludes node_modules, .env, .next, etc.

## 11. Security Hardening

- [ ] Nginx security headers all present (see `docker/nginx.conf`)
- [ ] Content-Security-Policy restricts script sources
- [ ] X-Frame-Options set to SAMEORIGIN
- [ ] X-Content-Type-Options set to nosniff
- [ ] Password hashing uses bcrypt with cost factor ≥ 12
- [ ] Input validation (Zod) on all API routes
- [ ] Prisma parameterized queries prevent SQL injection
- [ ] Admin routes guarded by middleware role check
- [ ] Invite codes are UUIDv4, non-guessable

## 12. Restart & Recovery

- [ ] `docker compose restart` works cleanly
- [ ] Application recovers after server reboot
- [ ] Docker containers configured to `restart: always`
- [ ] Database recovers from crash without corruption
- [ ] Application health endpoint responds quickly

## 13. Log Rotation

- [ ] Nginx logs configured for rotation
- [ ] Docker logs limited in size (configure in daemon.json)
- [ ] Log rotation max size: 100MB per file
- [ ] Log retention: 7-30 days

## Pre-Launch Final Checks

- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Run `docker compose build` — builds successfully
- [ ] Walk through full candidate flow (see J07)
- [ ] Test login with admin account
- [ ] Test login with candidate account
- [ ] Verify leaderboard displays correctly
- [ ] Test invite code creation and usage
- [ ] Verify all API routes return correct status codes
- [ ] Check mobile responsiveness at 375px, 768px, 1024px
- [ ] Verify SEO metadata on all pages
- [ ] Test 404 page for invalid routes
- [ ] Test error boundary by triggering an error

---

**Last Verified:** <!-- Date -->
**Verified By:** <!-- Name/Role -->
**Status:** ❌ Not Ready | ⏳ In Progress | ✅ Ready for Production
