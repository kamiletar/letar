#!/bin/bash
# Обратная синхронизация: скачивание .env.docker с production серверов на локальную машину
# Использование:
#   ./scripts/pull-env-docker.sh                        # Показать diff для всех
#   ./scripts/pull-env-docker.sh dashboard-agent        # Только одно приложение
#   ./scripts/pull-env-docker.sh --apply                # Скачать и перезаписать все
#   ./scripts/pull-env-docker.sh dashboard-agent --apply # Скачать конкретное

#
# ⚠️ Штатной нужды в этом скрипте больше нет: источник истины — закоммиченный
# apps/<app>/.env.docker.enc, и восстановить локальный .env.docker можно без сервера:
#   sops --decrypt apps/<app>/.env.docker.enc > apps/<app>/.env.docker
# Скрипт полезен только чтобы посмотреть, что реально лежит на сервере, при расследовании
# расхождений. Подробности: .claude/docs/secret-manager.md

set -e

# Production серверы (s1 выведен из эксплуатации 2026-06-20, все приложения — на s2)
declare -A SERVER_MAP=(
  ["s2"]="root@s2.letar.best"
)
REMOTE_PATH="/home/deploy/letar"
LOCAL_PATH="apps"

# Какие приложения на каком сервере
S2_APPS="dashboard dashboard-agent driving-school animatrona-web animatrona-tracker auth-hub archetest time form-docs grandslamcup aira-web mandala kami pravda umami animatrona-landing kami-key-the-landing letar-landing dsperevod aprel8008 aboi"

# Windows OpenSSH
SSH="/c/Windows/System32/OpenSSH/ssh.exe"
SCP="/c/Windows/System32/OpenSSH/scp.exe"

# Цвета
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' RED='' BLUE='' CYAN='' NC=''
fi

# Параметры
APPLY=false
APP_FILTER=""
SERVER_FILTER=""

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --server) shift; SERVER_FILTER="$1" ;;
    s2) SERVER_FILTER="$arg" ;;
    *) APP_FILTER="$arg" ;;
  esac
done

# Определить сервер для приложения
get_server_for_app() {
  local app="$1"
  if echo "$S2_APPS" | grep -qw "$app"; then
    echo "s2"
  else
    echo ""
  fi
}

# Список приложений
ALL_APPS=(
  "dashboard-agent"
  "dashboard" "driving-school" "auth-hub" "archetest"
  "mandala" "kami" "pravda" "animatrona-landing" "animatrona-tracker"
  "umami" "animatrona-web" "letar-landing" "aira-web" "aboi"
  "kami-key-the-landing" "grandslamcup" "time" "form-docs" "form-example"
  "dsperevod"
  "aprel8008"
)

if [ -n "$APP_FILTER" ]; then
  ALL_APPS=("$APP_FILTER")
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo -e "${BLUE}📥 Pull .env.docker с production серверов${NC}"
echo ""

HAS_DIFF=false

for app in "${ALL_APPS[@]}"; do
  server_key=$(get_server_for_app "$app")

  if [ -z "$server_key" ]; then
    echo -e "  ${YELLOW}⏭ ${app}: неизвестный сервер${NC}"
    continue
  fi

  # Фильтр по серверу
  if [ -n "$SERVER_FILTER" ] && [ "$SERVER_FILTER" != "$server_key" ]; then
    continue
  fi

  SERVER="${SERVER_MAP[$server_key]}"
  remote_file="${REMOTE_PATH}/${LOCAL_PATH}/${app}/.env.docker"
  local_file="${LOCAL_PATH}/${app}/.env.docker"
  tmp_file="${TMPDIR}/${app}.env.docker"

  # Скачать с сервера во временный файл
  if "$SCP" -q "${SERVER}:${remote_file}" "$tmp_file" 2>/dev/null; then
    if [ ! -f "$local_file" ]; then
      echo -e "  ${GREEN}+ ${app}${NC} (${server_key}) — новый файл"
      HAS_DIFF=true
      if [ "$APPLY" = true ]; then
        cp "$tmp_file" "$local_file"
        echo -e "    ${GREEN}✓ сохранён${NC}"
      fi
    elif ! diff -q "$local_file" "$tmp_file" > /dev/null 2>&1; then
      echo -e "  ${CYAN}~ ${app}${NC} (${server_key}) — есть различия:"
      diff --color=auto -u "$local_file" "$tmp_file" | head -30 || true
      echo ""
      HAS_DIFF=true
      if [ "$APPLY" = true ]; then
        cp "$tmp_file" "$local_file"
        echo -e "    ${GREEN}✓ обновлён${NC}"
      fi
    else
      echo -e "  ${GREEN}= ${app}${NC} (${server_key}) — идентичен"
    fi
  else
    echo -e "  ${RED}✗ ${app}${NC} (${server_key}) — не удалось скачать"
  fi
done

echo ""

if [ "$APPLY" = true ]; then
  echo -e "${GREEN}✅ Файлы обновлены!${NC}"
elif [ "$HAS_DIFF" = true ]; then
  echo -e "${YELLOW}💡 Для применения изменений добавь --apply:${NC}"
  echo "   ./scripts/pull-env-docker.sh --apply"
else
  echo -e "${GREEN}✅ Все файлы синхронизированы${NC}"
fi
