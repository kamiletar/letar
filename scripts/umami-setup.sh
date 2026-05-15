#!/bin/bash
# =============================================================================
# Одноразовый скрипт переинициализации Umami
# Запускается на s1.letar.best после пересоздания контейнеров
#
# Использование:
#   1. Перегенерировать .env.docker (DB_PASSWORD, APP_SECRET)
#   2. Пересоздать контейнеры: docker compose -f docker-compose.production.yml down -v && up -d
#   3. Запустить: bash scripts/umami-setup.sh <новый-пароль-admin>
# =============================================================================

set -euo pipefail

UMAMI_URL="https://stats.letar.best"
DEFAULT_USER="admin"
DEFAULT_PASSWORD="umami"

NEW_PASSWORD="${1:?Укажи новый пароль для admin: bash $0 <password>}"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1" >&2; }

# --- Шаг 1: Ожидание healthcheck ---
log "Ожидание Umami healthcheck..."
for i in $(seq 1 30); do
  if curl -sf "${UMAMI_URL}/api/heartbeat" > /dev/null 2>&1; then
    log "Umami доступен!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "Umami не отвечает после 30 попыток"
    exit 1
  fi
  echo -n "."
  sleep 2
done

# --- Шаг 2: Логин с дефолтными credentials ---
log "Логин с дефолтным паролем (admin/umami)..."
LOGIN_RESPONSE=$(curl -sf "${UMAMI_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${DEFAULT_USER}\",\"password\":\"${DEFAULT_PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  err "Не удалось залогиниться. Возможно, пароль уже изменён."
  err "Ответ: $LOGIN_RESPONSE"
  exit 1
fi

log "Залогинились. User ID: ${USER_ID}"

# --- Шаг 3: Смена пароля admin ---
log "Смена пароля admin..."
curl -sf "${UMAMI_URL}/api/users/${USER_ID}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"password\":\"${NEW_PASSWORD}\"}" > /dev/null

log "Пароль изменён!"

# Перелогиниваемся с новым паролем
LOGIN_RESPONSE=$(curl -sf "${UMAMI_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${DEFAULT_USER}\",\"password\":\"${NEW_PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
log "Перелогинились с новым паролем"

# --- Шаг 4: Создание сайтов ---
SITES=(
  "premium-rosstil|premium.rosstil.ru"
  "imot|integrelle.com"
  "mandala|mandala.letar.best"
  "kami|kami.letar.best"
  "pravda|pravda.letar.best"
  "animatrona-landing|animatrona.letar.best"
  "dashboard|dash.letar.best"
  "driving-school|направа.рф"
)

log "Создание ${#SITES[@]} сайтов..."
echo ""
echo "========================================="
echo "  Website IDs для .env.docker"
echo "========================================="
echo ""

for site in "${SITES[@]}"; do
  IFS='|' read -r name domain <<< "$site"

  RESPONSE=$(curl -sf "${UMAMI_URL}/api/websites" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{\"name\":\"${name}\",\"domain\":\"${domain}\"}")

  WEBSITE_ID=$(echo "$RESPONSE" | jq -r '.id')

  if [ -z "$WEBSITE_ID" ] || [ "$WEBSITE_ID" = "null" ]; then
    warn "Не удалось создать сайт ${name}: $(echo "$RESPONSE" | jq -r '.message // empty')"
  else
    echo -e "  ${GREEN}${name}${NC}"
    echo "    Domain: ${domain}"
    echo "    ID:     ${WEBSITE_ID}"
    echo "    NEXT_PUBLIC_UMAMI_WEBSITE_ID=${WEBSITE_ID}"
    echo ""
  fi
done

echo "========================================="
echo ""
log "Готово! Скопируй Website ID в .env.docker каждого приложения."
echo ""
echo "Общие переменные для всех приложений:"
echo "  NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://stats.letar.best/script.js"
echo ""
warn "Не забудь добавить в apps/dashboard/.env.docker:"
echo "  UMAMI_API_URL=https://stats.letar.best"
echo "  UMAMI_API_USER=admin"
echo "  UMAMI_API_PASSWORD=${NEW_PASSWORD}"
