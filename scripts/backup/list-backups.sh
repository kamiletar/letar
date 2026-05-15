#!/bin/bash

# List available database backups for premium-rosstil

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/premium-rosstil/db}"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Available Database Backups${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}No backup directory found: $BACKUP_DIR${NC}"
    exit 0
fi

# Find all backup files
BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | sort -r)

if [ -z "$BACKUPS" ]; then
    echo -e "${YELLOW}No backups found${NC}"
    exit 0
fi

# Display backups in a table format
printf "%-35s %-15s %-20s\n" "DATE" "SIZE" "FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

COUNT=0
while IFS= read -r backup; do
    BASENAME=$(basename "$backup")
    SIZE=$(du -h "$backup" | cut -f1)
    DATE=$(stat -c %y "$backup" 2>/dev/null || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || echo "N/A")
    DATE=${DATE:0:19}

    # Highlight latest backup
    if [ -L "${BACKUP_DIR}/latest.sql.gz" ] && [ "$(readlink "${BACKUP_DIR}/latest.sql.gz")" = "$BASENAME" ]; then
        printf "${GREEN}%-35s %-15s %-20s [LATEST]${NC}\n" "$DATE" "$SIZE" "$BASENAME"
    else
        printf "%-35s %-15s %-20s\n" "$DATE" "$SIZE" "$BASENAME"
    fi

    COUNT=$((COUNT + 1))
done <<< "$BACKUPS"

echo ""
echo "Total backups: $COUNT"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
