# Olais Eval — Backup & Restore Guide

## Overview

This guide covers PostgreSQL backup strategies for the Olais Eval platform.
Backups protect candidate submissions, evaluations, and assessment data.

## Automated Daily Backup

### Using pg_dump (Recommended)

Create a backup script at `/opt/olais-eval/scripts/backup.sh`:

```bash
#!/bin/bash
# Olais Eval — Daily Database Backup Script
# Run via cron: 0 3 * * * /opt/olais-eval/scripts/backup.sh

set -e

BACKUP_DIR="/opt/olais-eval/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DB_CONTAINER="olais-eval-db"
DB_USER="olais"
DB_NAME="olais_eval"

mkdir -p "$BACKUP_DIR"

# Run pg_dump inside the Docker container
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="/tmp/olais-eval-${TIMESTAMP}.dump"

# Copy backup from container to host
docker cp "${DB_CONTAINER}:/tmp/olais-eval-${TIMESTAMP}.dump" "${BACKUP_DIR}/"

# Clean up backup file inside container
docker exec "$DB_CONTAINER" rm "/tmp/olais-eval-${TIMESTAMP}.dump"

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "olais-eval-*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: olais-eval-${TIMESTAMP}.dump"
```

Make it executable and schedule it:

```bash
chmod +x /opt/olais-eval/scripts/backup.sh

# Add to crontab (runs daily at 3:00 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/olais-eval/scripts/backup.sh >> /var/log/olais-backup.log 2>&1") | crontab -
```

### Docker Volume Backup

For additional safety, back up the PostgreSQL volume:

```bash
# Stop the database container
docker compose -f docker-compose.prod.yml stop db

# Create a tar archive of the volume
sudo tar -czf /opt/olais-eval/backups/pgdata-$(date +"%Y-%m-%d").tar.gz \
  -C /var/lib/docker/volumes/olais-eval_pgdata/_data .

# Restart the database container
docker compose -f docker-compose.prod.yml start db
```

## Restoring from Backup

### Option A: Restore Custom Format Dump (.dump)

```bash
# Step 1: Copy backup file to the DB container
docker cp /opt/olais-eval/backups/olais-eval-2026-05-27_03-00-00.dump olais-eval-db:/tmp/restore.dump

# Step 2: Restore using pg_restore
docker exec -i olais-eval-db pg_restore -U olais -d olais_eval \
  --clean \
  --if-exists \
  /tmp/restore.dump

# Step 3: Clean up
docker exec olais-eval-db rm /tmp/restore.dump
```

### Option B: Restore Plain SQL Dump (.sql)

```bash
# If you used plain SQL format instead of custom format
docker exec -i olais-eval-db psql -U olais -d olais_eval < /path/to/backup.sql
```

### Option C: Full Volume Restore

⚠️ **Warning**: This replaces all database data.

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Remove current volume and recreate (empty)
docker volume rm olais-eval_pgdata
docker compose -f docker-compose.prod.yml up -d db

# Wait for DB to be ready
sleep 10

# Restore from dump
docker exec -i olais-eval-db pg_restore -U olais -d olais_eval \
  --clean --if-exists /path/to/restore.dump

# Start remaining services
docker compose -f docker-compose.prod.yml up -d
```

## One-Line Manual Backup

Quick backup without the script:

```bash
docker exec olais-eval-db pg_dump -U olais -d olais_eval \
  --format=custom --compress=9 \
  --file=/tmp/olais-eval-manual.dump && \
docker cp olais-eval-db:/tmp/olais-eval-manual.dump ./olais-eval-$(date +"%Y-%m-%d").dump && \
docker exec olais-eval-db rm /tmp/olais-eval-manual.dump
```

## One-Line Manual Restore

```bash
docker cp ./olais-eval-2026-05-27.dump olais-eval-db:/tmp/restore.dump && \
docker exec olais-eval-db pg_restore -U olais -d olais_eval --clean --if-exists /tmp/restore.dump && \
docker exec olais-eval-db rm /tmp/restore.dump
```

## Backup Strategy Summary

| Method | Frequency | Retention | Storage | Restore Time |
|--------|-----------|-----------|---------|-------------|
| pg_dump (custom) | Daily | 30 days | ~50 MB/day | ~1-2 min |
| Volume backup | Weekly | 90 days | ~200 MB | ~5-10 min |
| Offsite copy | Daily | 90 days | Cloud/remote | Varies |

## Offsite Backup (Optional)

For critical data, copy backups to a remote location:

```bash
# Using rsync to a backup server
rsync -avz /opt/olais-eval/backups/ user@backup-server:/backups/olais-eval/

# Using rclone to cloud storage (S3, GCS, B2)
rclone sync /opt/olais-eval/backups/ remote:olais-eval-backups/
```
