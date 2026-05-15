#!/bin/bash

# PostgreSQL Database Restore Script for premium-rosstil (Docker)
# Restores database from backup file

set -euo pipefail

# Configuration
DB_NAME="${DB_NAME:-lena_premium}"
DB_USER="${DB_USER:-lena_user}"
DOCKER_CONTAINER="${DOCKER_CONTAINER:-premium-rosstil-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups/premium-rosstil/db}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [BACKUP_FILE]"
    echo ""
    echo "Restore PostgreSQL database from backup"
    echo ""
    echo "Options:"
    echo "  BACKUP_FILE    Path to backup file (optional, uses latest if not specified)"
    echo ""
    echo "Environment variables:"
    echo "  DB_NAME              Database name (default: premium_rosstil)"
    echo "  DB_USER              Database user (default: premium_rosstil)"
    echo "  DOCKER_CONTAINER     Docker container name (default: premium-rosstil-postgres)"
    echo "  BACKUP_DIR           Backup directory (default: /backups/premium-rosstil/db)"
    exit 1
}

# Parse arguments
if [ $# -eq 0 ]; then
    BACKUP_FILE="${BACKUP_DIR}/latest.sql.gz"
else
    BACKUP_FILE="$1"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"; then
    echo -e "${RED}✗ Docker container '$DOCKER_CONTAINER' is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Database Restore${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Database: $DB_NAME"
echo "Docker container: $DOCKER_CONTAINER"
echo "Backup file: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo -e "${RED}⚠ WARNING: This will REPLACE all data in the database!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting restore..."

# Test database connection
if ! docker exec "$DOCKER_CONTAINER" psql -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}✗ Cannot connect to database in Docker container${NC}"
    exit 1
fi

# Restore database using Docker exec
if gunzip -c "$BACKUP_FILE" | docker exec -i "$DOCKER_CONTAINER" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet 2>&1 | grep -v "NOTICE" | grep -v "already exists"; then

    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Restore completed successfully${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
