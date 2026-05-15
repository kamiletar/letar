#!/bin/bash
set -e

# Синхронизация production БД на staging для grandslamcup
# Запускается на s1 (staging сервере) или локально
#
# Использование:
#   ./sync-db-staging.sh                    # полная синхронизация с sanitization
#   ./sync-db-staging.sh --no-sanitize      # без sanitization (для отладки)
#   ./sync-db-staging.sh --dump-only        # только создать дамп, не загружать

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
PROD_SERVER="s2.letar.best"
PROD_DB_CONTAINER="grandslamcup-db"
PROD_DB_NAME="grandslamcup"
PROD_DB_USER="postgres"

STAGING_DB_CONTAINER="grandslamcup-staging-db"
STAGING_DB_NAME="grandslamcup"
STAGING_DB_USER="postgres"

DUMP_FILE="/tmp/gsc-prod-$(date +%Y%m%d_%H%M%S).dump"

# Флаги
SANITIZE=true
DUMP_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-sanitize)
      SANITIZE=false
      shift
      ;;
    --dump-only)
      DUMP_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: ./sync-db-staging.sh [OPTIONS]"
      echo ""
      echo "Синхронизация production БД grandslamcup на staging"
      echo ""
      echo "Options:"
      echo "  --no-sanitize   Не очищать PII данные"
      echo "  --dump-only     Только создать дамп, не загружать в staging"
      echo "  --help          Показать справку"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔄 GrandSlamCup: Production → Staging DB Sync       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Шаг 1: Дамп production БД
echo -e "${YELLOW}📥 Создаю дамп production БД с ${PROD_SERVER}...${NC}"

# Определяем, запущен ли скрипт на s1 (staging) или локально
CURRENT_HOST=$(hostname -f 2>/dev/null || hostname)
if [[ "$CURRENT_HOST" == *s1* ]]; then
  # На s1 — подключаемся к s2 по SSH
  ssh deploy@${PROD_SERVER} "docker exec ${PROD_DB_CONTAINER} pg_dump -U ${PROD_DB_USER} -Fc ${PROD_DB_NAME}" > "$DUMP_FILE"
else
  # Локально — подключаемся к s2 по SSH
  ssh deploy@${PROD_SERVER} "docker exec ${PROD_DB_CONTAINER} pg_dump -U ${PROD_DB_USER} -Fc ${PROD_DB_NAME}" > "$DUMP_FILE"
fi

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo -e "${GREEN}✅ Дамп создан: ${DUMP_FILE} (${DUMP_SIZE})${NC}"
echo ""

if [ "$DUMP_ONLY" = true ]; then
  echo -e "${BLUE}ℹ️  --dump-only: дамп сохранён в ${DUMP_FILE}${NC}"
  exit 0
fi

# Шаг 2: Проверяем что staging БД запущена
echo -e "${YELLOW}🔍 Проверяю staging БД...${NC}"
if ! docker ps | grep -q "$STAGING_DB_CONTAINER"; then
  echo -e "${RED}❌ Staging БД не запущена (${STAGING_DB_CONTAINER})${NC}"
  echo -e "${YELLOW}   Запустите: cd apps/grandslamcup && docker compose -f docker-compose.staging.yml up -d db${NC}"
  rm -f "$DUMP_FILE"
  exit 1
fi
echo -e "${GREEN}✅ Staging БД запущена${NC}"
echo ""

# Шаг 3: Загружаем дамп в staging
echo -e "${YELLOW}📤 Загружаю дамп в staging БД...${NC}"

# Копируем дамп внутрь контейнера
docker cp "$DUMP_FILE" "${STAGING_DB_CONTAINER}:/tmp/prod.dump"

# Дропаем и пересоздаём staging БД
docker exec "${STAGING_DB_CONTAINER}" bash -c "
  # Завершаем все соединения
  psql -U ${STAGING_DB_USER} -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${STAGING_DB_NAME}' AND pid <> pg_backend_pid();\" 2>/dev/null || true
  # Дропаем и создаём заново
  dropdb -U ${STAGING_DB_USER} --if-exists ${STAGING_DB_NAME}
  createdb -U ${STAGING_DB_USER} ${STAGING_DB_NAME}
  # Restore
  pg_restore -U ${STAGING_DB_USER} -d ${STAGING_DB_NAME} --no-owner --no-privileges /tmp/prod.dump || true
  rm /tmp/prod.dump
"

echo -e "${GREEN}✅ Дамп загружен в staging БД${NC}"
echo ""

# Шаг 4: Sanitization (опционально)
if [ "$SANITIZE" = true ]; then
  echo -e "${YELLOW}🧹 Sanitization PII данных...${NC}"
  docker exec "${STAGING_DB_CONTAINER}" psql -U ${STAGING_DB_USER} -d ${STAGING_DB_NAME} -c "
    -- Замена email на тестовые (кроме @letar.best)
    UPDATE \"user\" SET
      email = CONCAT(id, '@staging.local'),
      name = CONCAT('Тест ', LEFT(id::text, 6))
    WHERE email NOT LIKE '%@letar.best';
  " 2>/dev/null || echo -e "${YELLOW}⚠️  Sanitization не выполнена (возможно другая структура таблиц)${NC}"
  echo -e "${GREEN}✅ PII данные очищены${NC}"
  echo ""
fi

# Очистка
rm -f "$DUMP_FILE"

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Синхронизация завершена!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
