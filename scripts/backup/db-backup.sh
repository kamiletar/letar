#!/bin/bash

# PostgreSQL Database Backup Script for premium-rosstil (Docker)
# This script creates compressed backups with rotation

set -euo pipefail

# Configuration
DB_NAME="${DB_NAME:-lena_premium}"
DB_USER="${DB_USER:-lena_user}"
DOCKER_CONTAINER="${DOCKER_CONTAINER:-premium-rosstil-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups/premium-rosstil/db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"
LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting backup for database: $DB_NAME"

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"; then
    log "✗ Docker container '$DOCKER_CONTAINER' is not running"
    exit 1
fi

# Perform backup with compression using Docker exec
if docker exec "$DOCKER_CONTAINER" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"; then

    log "✓ Backup created successfully: $BACKUP_FILE"

    # Update latest symlink
    ln -sf "$(basename "$BACKUP_FILE")" "$LATEST_LINK"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"

else
    log "✗ Backup failed!"
    exit 1
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
log "Total backups retained: $BACKUP_COUNT"

log "Backup completed successfully"
