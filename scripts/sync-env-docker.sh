#!/bin/bash
# Синхронизация .env.docker файлов на production серверы
# Использование: ./scripts/sync-env-docker.sh [app-name]
# Примеры:
#   ./scripts/sync-env-docker.sh              # Синхронизировать все на оба сервера
#   ./scripts/sync-env-docker.sh premium-rosstil  # Только premium-rosstil

set -e

# Production серверы
SERVERS=(
  "root@s1.letar.best"
  "root@s2.letar.best"
)
REMOTE_PATH="/home/deploy/letar"
LOCAL_PATH="apps"

# Windows OpenSSH (системный, работает без Git bash PATH)
SSH="/c/Windows/System32/OpenSSH/ssh.exe"
SCP="/c/Windows/System32/OpenSSH/scp.exe"

# Цвета для вывода (отключаем если нет TTY)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  GREEN=''
  YELLOW=''
  RED=''
  BLUE=''
  NC=''
fi

# Список приложений с .env.docker
APPS=(
  "premium-rosstil"
  "imot"
  "mandala"
  "dashboard"
  "driving-school"
  "kami"
  "pravda"
  "animatrona-landing"
  "animatrona-tracker"
  "letar-landing"
  "animatrona-web"
  "umami"
  "dashboard-agent"
  "archetest"
  "auth-hub"
  "time"
  "form-docs"
  "grandslamcup"
  "aira-web"
  "kami-key-the-landing"
  "form-example"
  "aboi"
)

echo "🚀 Синхронизация .env.docker на production серверы"
echo ""

# Если указано конкретное приложение
if [ -n "$1" ]; then
  APPS=("$1")
fi

# Собираем список файлов для копирования
FILES_TO_SYNC=""
echo -e "${BLUE}📋 Файлы для синхронизации:${NC}"
for app in "${APPS[@]}"; do
  local_file="${LOCAL_PATH}/${app}/.env.docker"
  if [ -f "$local_file" ]; then
    FILES_TO_SYNC="${FILES_TO_SYNC} ${local_file}"
    echo -e "  ${GREEN}✓ ${app}${NC}"
  else
    echo -e "  ${YELLOW}⏭ ${app}: нет .env.docker${NC}"
  fi
done

if [ -z "$FILES_TO_SYNC" ]; then
  echo -e "${RED}❌ Нет файлов для синхронизации${NC}"
  exit 1
fi

echo ""

# Синхронизация на каждый сервер
for SERVER in "${SERVERS[@]}"; do
  echo -e "${BLUE}📤 Копирование на ${SERVER}...${NC}"

  # Используем scp для каждого файла (надёжнее на Windows)
  SUCCESS=true
  for app in "${APPS[@]}"; do
    local_file="${LOCAL_PATH}/${app}/.env.docker"
    if [ -f "$local_file" ]; then
      if "$SCP" -q "$local_file" "${SERVER}:${REMOTE_PATH}/${LOCAL_PATH}/${app}/.env.docker" 2>/dev/null; then
        echo -e "  ${GREEN}✓ ${app}${NC}"
      else
        echo -e "  ${RED}✗ ${app}${NC}"
        SUCCESS=false
      fi
    fi
  done

  if [ "$SUCCESS" = true ]; then
    echo -e "  ${GREEN}✅ ${SERVER} — готово${NC}"
  else
    echo -e "  ${RED}❌ ${SERVER} — есть ошибки${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ Синхронизация завершена!${NC}"
echo ""
echo "Перезапустить контейнеры на серверах:"
for SERVER in "${SERVERS[@]}"; do
  echo "  \"$SSH\" ${SERVER} 'cd /home/deploy/letar && ./deploy-affected.sh --app <app-name>'"
done
