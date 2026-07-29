#!/bin/bash
# ⛔ УСТАРЕЛО. Не используй — см. .claude/docs/secret-manager.md
#
# Скрипт возил .env.docker на серверы по SSH до перехода на SOPS + age. Сейчас источник
# истины — закоммиченный apps/<app>/.env.docker.enc, а плейнтекст на сервере создаётся
# расшифровкой при каждом деплое (decrypt_sops_env() в deploy-affected.sh). Всё, что этот
# скрипт зальёт, будет затёрто следующим прогоном.
#
# Правильный путь: sops apps/<app>/.env.docker.enc → git commit → deploy-request к BlackCove.
#
# Оставлен только на случай аварийного восстановления, когда SOPS-путь недоступен.
# Дополнительно устарел по составу: ходит на s1 (выведен из эксплуатации 2026-06-20).

set -e

if [ "${FORCE_LEGACY_SYNC:-}" != "1" ]; then
  echo "⛔ sync-env-docker.sh устарел с переходом на SOPS + age." >&2
  echo "   Секреты доставляет деплой, расшифровывая .env.docker.enc — этот скрипт бесполезен," >&2
  echo "   а залитое им будет затёрто следующим прогоном." >&2
  echo >&2
  echo "   Вместо него:  sops apps/<app>/.env.docker.enc  →  git commit  →  deploy-request" >&2
  echo "   Подробности:  .claude/docs/secret-manager.md" >&2
  echo >&2
  echo "   Если это всё-таки аварийное восстановление: FORCE_LEGACY_SYNC=1 $0 $*" >&2
  exit 1
fi

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
  "dsperevod"
  "aprel8008"
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
