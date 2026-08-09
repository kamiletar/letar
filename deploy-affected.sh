#!/bin/bash
set -e

# Universal deployment script for Nx monorepo
# Deploys all affected applications or a specific app

# Change to script directory (workspace root) - important for nsenter/nohup context
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Если скрипт запущен от root (SSH под root руками) — переключаемся на deploy.
# Это предотвращает создание файлов с владельцем root в src/generated/, .nx/,
# которые потом ломают следующий деплой под deploy ('EACCES: permission denied').
# Отключить можно через DEPLOY_AS_ROOT=1 (например для отладки).
if [ "$(id -u)" = "0" ] && [ "${DEPLOY_AS_ROOT:-0}" != "1" ] && id deploy >/dev/null 2>&1; then
  echo "⚠️  Запущено от root — переключаюсь на пользователя deploy."
  echo "    (для запуска от root установи DEPLOY_AS_ROOT=1)"
  exec sudo -u deploy -H -- bash "$0" "$@"
fi

# SOPS-ключ для расшифровки .env.docker.enc. Дефолт на стандартный путь
# (server-provision.md). Критично для запуска через nsenter из dashboard-agent:
# там root → `exec sudo -u deploy`, а sudo по умолчанию СБРАСЫВАЕТ окружение, теряя
# SOPS_AGE_KEY_FILE, проброшенный спавном в deploy.ts. Этот дефолт выставляется уже
# в контексте deploy (после re-exec) и работает при любом способе запуска — без
# правки sudoers/--preserve-env. Явно заданное значение (SSH-запуск руками) сохраняется.
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/home/deploy/.age/letar-key.txt}"

# Ensure PATH includes common binary locations
# This is needed when running via nsenter from Docker container (HOME may not be set)
_HOME="${HOME:-/root}"
export PATH="$_HOME/.bun/bin:$_HOME/.local/bin:/root/.bun/bin:/root/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
# Отключаем nx daemon — крашит plugin workers на серверах (isolated-plugin fork bug)
export NX_DAEMON=false

# Load bashrc for full environment (needed when running via nohup from container)
if [ -f "/root/.bashrc" ]; then
  # shellcheck source=/dev/null
  source /root/.bashrc 2>/dev/null || true
fi

# Load nvm if available (required for Node.js)
# Use explicit /root path for nsenter compatibility (HOME may not be set)
export NVM_DIR="${HOME:-/root}/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
elif [ -s "/root/.nvm/nvm.sh" ]; then
  # Fallback to /root/.nvm if HOME-based path doesn't work
  export NVM_DIR="/root/.nvm"
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
fi

# Ensure PATH includes all necessary locations AFTER loading nvm/bashrc
# This ensures nx, bun, and node are available
export PATH="$SCRIPT_DIR/node_modules/.bin:/root/.bun/bin:/root/.nvm/versions/node/$(ls /root/.nvm/versions/node 2>/dev/null | tail -1)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Unset NODE_ENV if inherited from container - it causes build issues
# Next.js will set NODE_ENV=production during build automatically
unset NODE_ENV

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Машинный маркер прогресса деплоя (PLAN-INFRA.md §38) — отдельная строка, парсится
# dashboard-agent'ом (appendOutput → DeployStatus.phases[]). Формат: ::phase:<name>:<start|ok|fail>
phase_marker() {
  echo "::phase:$1:$2"
}

# Расшифровка SOPS-файла если есть .enc версия
# Использует SOPS_AGE_KEY_FILE или SOPS_AGE_KEY для расшифровки
decrypt_sops_env() {
  local app_dir=$1
  local enc_file="${app_dir}/${ENV_FILE_NAME}.enc"
  local plain_file="${app_dir}/${ENV_FILE_NAME}"

  if [ ! -f "$enc_file" ]; then
    return 0
  fi

  if [ -z "${SOPS_AGE_KEY_FILE:-}" ] && [ -z "${SOPS_AGE_KEY:-}" ]; then
    echo -e "${RED}❌ Найден зашифрованный файл ${enc_file}, но SOPS_AGE_KEY_FILE не задан${NC}"
    echo -e "${YELLOW}   Установи: export SOPS_AGE_KEY_FILE=/home/deploy/.age/letar-key.txt${NC}"
    return 1
  fi

  # Авто-определение формата: JSON-файлы начинаются с '{', остальные — dotenv
  local first_char
  first_char=$(head -c1 "$enc_file")
  local sops_type_flags=""
  if [ "$first_char" != "{" ]; then
    sops_type_flags="--input-type dotenv --output-type dotenv"
  fi

  echo -e "${YELLOW}🔓 Расшифровываю ${enc_file}...${NC}"
  # shellcheck disable=SC2086
  if sops --decrypt $sops_type_flags "$enc_file" > "$plain_file"; then
    chmod 600 "$plain_file"
    echo -e "${GREEN}✅ Расшифровано в ${plain_file}${NC}"
  else
    echo -e "${RED}❌ Не удалось расшифровать ${enc_file}${NC}"
    return 1
  fi
}

# Configuration
BASE_BRANCH="main"
WORKSPACE_ROOT=$(pwd)
LAST_DEPLOY_DIR="$WORKSPACE_ROOT/.last-deploy"

# Server-specific app configuration
# s1 выведен из эксплуатации — все приложения на s2
S1_APPS=""
# s2.letar.best apps
S2_APPS="dashboard dashboard-agent driving-school auth-hub archetest time form-docs form-example grandslamcup aira-web mandala kami pravda umami animatrona-landing animatrona-tracker kami-key-the-landing letar-landing dsperevod aboi svoichuzhie aprel8008 studio domwellbes"
# s3.letar.best — staging-приложения (через --staging, SERVER_APPS для них не действует) +
# отдельные production-инстансы, у которых порт конфликтует с s2 (напр. dashboard-agent,
# см. PLAN-INFRA.md §66 п.2). Пусто = разрешить любое explicit --app (как раньше для "unknown").
S3_APPS=""

# Detect current server by hostname
CURRENT_HOST=$(hostname -f 2>/dev/null || hostname)
case "$CURRENT_HOST" in
  *s1.letar.best*|s1|server1)
    SERVER_APPS="$S1_APPS"
    SERVER_NAME="s1"
    ;;
  *s2.letar.best*|s2|server2)
    SERVER_APPS="$S2_APPS"
    SERVER_NAME="s2"
    ;;
  *s3.letar.best*|s3|server3)
    SERVER_APPS="$S3_APPS"
    SERVER_NAME="s3"
    ;;
  *)
    # Unknown server - allow all apps (for local testing)
    SERVER_APPS=""
    SERVER_NAME="unknown"
    ;;
esac

# Сохраняем исходные аргументы до parse-цикла (он их shift-ает) — нужны для self-re-exec.
ORIGINAL_ARGS=("$@")

# Parse arguments
SPECIFIC_APP=""
SKIP_GIT=false
DRY_RUN=false
SKIP_NX_CACHE=true  # По умолчанию выключен Nx кэш (избегаем ошибок "File exists")
CLEAN_INSTALL=false
STAGING=false  # Деплой на staging окружение (docker-compose.staging.yml + .env.staging)
RUN_SEED=false  # Запустить nx db:seed после деплоя

while [[ $# -gt 0 ]]; do
  case $1 in
    --app)
      SPECIFIC_APP="$2"
      shift 2
      ;;
    --skip-git)
      SKIP_GIT=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --use-cache)
      SKIP_NX_CACHE=false
      shift
      ;;
    --skip-cache|--no-cache)
      SKIP_NX_CACHE=true
      shift
      ;;
    --clean)
      CLEAN_INSTALL=true
      shift
      ;;
    --staging)
      STAGING=true
      shift
      ;;
    --seed)
      RUN_SEED=true
      shift
      ;;
    --help)
      echo "Usage: ./deploy-affected.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --app APP_NAME    Deploy only specific app (e.g., driving-school)"
      echo "  --skip-git        Skip git pull"
      echo "  --use-cache       Use Nx cache (disabled by default to avoid cache bugs)"
      echo "  --skip-cache      Skip Nx cache (default, for backwards compatibility)"
      echo "  --clean           Clean reinstall node_modules (fixes stale dependencies)"
      echo "  --staging         Deploy to staging (docker-compose.staging.yml + .env.staging)"
  echo "  --seed            Run nx db:seed after successful deploy"
      echo "  --dry-run         Show what would be deployed without actually deploying"
      echo "  --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./deploy-affected.sh                    # Deploy all affected apps (no cache)"
      echo "  ./deploy-affected.sh --app driving-school   # Deploy specific app"
      echo "  ./deploy-affected.sh --dry-run          # See what would be deployed"
      echo "  ./deploy-affected.sh --app dashboard --use-cache  # Use Nx cache"
      echo "  ./deploy-affected.sh --app dashboard --clean      # Clean reinstall"
      echo "  ./deploy-affected.sh --app grandslamcup --staging  # Deploy to staging"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Staging/Production конфигурация
# BASE_COMPOSE_FILE — общее имя compose-файла по умолчанию. Конкретное приложение может
# переопределить его собственным docker-compose.<SERVER_NAME>.yml (см. резолв ниже, в цикле
# деплоя, PLAN-INFRA.md §66 п.2) — поэтому именно там читай/пиши $COMPOSE_FILE, а не здесь.
if [ "$STAGING" = true ]; then
  BASE_COMPOSE_FILE="docker-compose.staging.yml"
  ENV_FILE_NAME=".env.staging"
  DOCKER_TAG_SUFFIX=":staging"
  DEPLOY_ENV="staging"
  # При staging игнорируем SERVER_APPS — деплоим на любом сервере
  SERVER_APPS=""
else
  BASE_COMPOSE_FILE="docker-compose.production.yml"
  ENV_FILE_NAME=".env.docker"
  DOCKER_TAG_SUFFIX=":latest"
  DEPLOY_ENV="production"
fi
COMPOSE_FILE="$BASE_COMPOSE_FILE"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
if [ "$STAGING" = true ]; then
echo -e "${BLUE}║  🧪 Nx Monorepo STAGING Deployment                   ║${NC}"
else
echo -e "${BLUE}║  🚀 Nx Monorepo Deployment with Docker & Cache       ║${NC}"
fi
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Create last-deploy directory if needed
mkdir -p "$LAST_DEPLOY_DIR"

# Function to get last deploy commit for an app
get_last_deploy_commit() {
  local app=$1
  local file="$LAST_DEPLOY_DIR/$app"
  if [ -f "$file" ]; then
    cat "$file"
  else
    echo ""
  fi
}

# Function to save deploy commit for an app
save_deploy_commit() {
  local app=$1
  local commit=$2
  echo "$commit" > "$LAST_DEPLOY_DIR/$app"
}

# Determine base commit for comparison
if [ -n "$SPECIFIC_APP" ]; then
  # For specific app, use its last deploy commit
  LAST_COMMIT=$(get_last_deploy_commit "$SPECIFIC_APP")
  if [ -n "$LAST_COMMIT" ]; then
    echo -e "${BLUE}📌 Last deployment of ${SPECIFIC_APP} was at commit: ${LAST_COMMIT:0:8}${NC}"
  else
    echo -e "${YELLOW}📌 No previous deployment found for ${SPECIFIC_APP}, using origin/$BASE_BRANCH as base${NC}"
    LAST_COMMIT="origin/$BASE_BRANCH"
  fi
else
  # For affected detection, check each app individually against its own marker
  # First get all apps that have any changes since origin/main (broad check)
  echo -e "${BLUE}📌 Checking each app against its own deployment marker${NC}"
  LAST_COMMIT="origin/$BASE_BRANCH"
fi
echo ""

# Абсолютный путь к самому скрипту (для self-re-exec ниже).
# BASH_SOURCE[0] мог быть относительным (./deploy-affected.sh), а мы уже сделали cd в SCRIPT_DIR.
SCRIPT_PATH="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"

# Хеш содержимого скрипта: sha256sum → md5sum → cksum (что найдётся на сервере).
script_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$SCRIPT_PATH" | awk '{print $1}'
  elif command -v md5sum >/dev/null 2>&1; then
    md5sum "$SCRIPT_PATH" | awk '{print $1}'
  else
    cksum "$SCRIPT_PATH" | awk '{print $1}'
  fi
}

# Step 2: Git pull (unless skipped)
if [ "$SKIP_GIT" = false ]; then
  echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"

  # Хеш скрипта ДО pull — чтобы поймать self-modification (git pull может обновить
  # deploy-affected.sh прямо во время его выполнения; тогда bash дорабатывает по старому
  # телу в памяти — новые гейты/теги молча не применяются). См. ниже self-re-exec.
  SCRIPT_HASH_BEFORE=$(script_hash)

  # Fetch changes
  if ! git fetch origin; then
    echo -e "${RED}❌ Failed to fetch from git remote${NC}"
    exit 1
  fi

  # Get current branch
  CURRENT_BRANCH=$(git branch --show-current)

  # Сбрасываем bun.lock перед pull — bun install без --frozen-lockfile обновляет
  # его на сервере (убирает записи для неинициализированных submodule), и git pull
  # упал бы с "local changes would be overwritten". Реальные версии пакетов не меняются.
  git checkout -- bun.lock 2>/dev/null || true

  # Pull changes
  if ! git pull origin $CURRENT_BRANCH; then
    echo -e "${RED}❌ Failed to pull changes from git${NC}"
    echo -e "${YELLOW}This may be due to:${NC}"
    echo -e "${YELLOW}  • Merge conflicts - resolve them and try again${NC}"
    echo -e "${YELLOW}  • Uncommitted local changes - commit or stash them first${NC}"
    echo -e "${YELLOW}  • Network issues - check your connection${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ Successfully pulled latest changes${NC}"

  # Self-re-exec: если git pull изменил сам deploy-affected.sh — перезапускаем себя,
  # чтобы гарантированно исполнялся актуальный код (иначе остаток скрипта — миграции,
  # сборка, docker — доработает по старому телу, прочитанному в память до pull).
  # DEPLOY_SCRIPT_REEXECED защищает от бесконечного цикла (при повторном заходе pull
  # даст "Already up to date" → хеш не изменится, но sentinel — вторая линия обороны).
  if [ "${DEPLOY_SCRIPT_REEXECED:-0}" != "1" ]; then
    SCRIPT_HASH_AFTER=$(script_hash)
    if [ "$SCRIPT_HASH_BEFORE" != "$SCRIPT_HASH_AFTER" ]; then
      echo -e "${YELLOW}🔄 deploy-affected.sh обновился при git pull — перезапускаю себя с актуальным кодом...${NC}"
      export DEPLOY_SCRIPT_REEXECED=1
      exec bash "$SCRIPT_PATH" "${ORIGINAL_ARGS[@]}"
    fi
  fi

  # Обновляем инициализированные submodules до коммитов из родительского репо
  git submodule update --recursive
  echo -e "${GREEN}✅ Submodules updated${NC}"
  echo ""

  # Reset Nx daemon after git pull to avoid stale project graph cache
  echo -e "${YELLOW}🔄 Resetting Nx daemon cache...${NC}"
  npx nx daemon --stop 2>/dev/null || true
  rm -rf .nx/cache .nx/workspace-data 2>/dev/null || true
  echo -e "${GREEN}✅ Nx cache cleared${NC}"
  echo ""
fi

# Step 3: Install dependencies
if [ "$CLEAN_INSTALL" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning node_modules and caches...${NC}"
  rm -rf node_modules .nx/cache
  echo -e "${YELLOW}📦 Fresh installing dependencies...${NC}"
else
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
fi
if [ -f "bun.lock" ]; then
    # Хелпер: запуск bun install с обработкой платформо-специфичных пакетов
    # Некоторые пакеты (Electron, React Native) есть только для Windows — на Linux их нет,
    # bun возвращает exit code != 0, но это не критично для серверных приложений
    run_bun_install() {
      local BUN_ARGS="$*"
      local BUN_OUTPUT
      local BUN_CODE
      BUN_OUTPUT=$(bun install $BUN_ARGS 2>&1)
      BUN_CODE=$?
      echo "$BUN_OUTPUT"
      if [ $BUN_CODE -ne 0 ]; then
        # Проверяем: если единственная проблема — "Failed to install N packages" без реальных ошибок
        if echo "$BUN_OUTPUT" | grep -qE "^Failed to install [0-9]+ packages?$" && \
           ! echo "$BUN_OUTPUT" | grep -qiE "error:|panic:|ENOENT|EACCES|network|timeout"; then
          echo -e "${YELLOW}⚠️  Платформо-специфичные пакеты пропущены (Windows-only, не нужны на Linux)${NC}"
          return 0
        fi
        return $BUN_CODE
      fi
    }
    # При clean install не используем --frozen-lockfile (обновляем lockfile)
    if [ "$CLEAN_INSTALL" = true ]; then
      if ! run_bun_install; then
        echo -e "${RED}❌ Failed to install dependencies with bun${NC}"
        exit 1
      fi
    else
      if ! run_bun_install --frozen-lockfile; then
        # Fallback: --frozen-lockfile может падать если некоторые workspace-пути
        # (uninitialized submodules) отсутствуют на этом сервере. Это не меняет
        # реальные версии пакетов — повторяем без флага.
        echo -e "${YELLOW}⚠️  --frozen-lockfile failed (возможно uninitialized submodules). Повторяю без флага...${NC}"
        if ! run_bun_install; then
          echo -e "${RED}❌ Failed to install dependencies with bun${NC}"
          exit 1
        fi
      fi
    fi
else
    if ! npm install; then
      echo -e "${RED}❌ Failed to install dependencies with npm${NC}"
      exit 1
    fi
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2.4: Build zenstack-form-plugin — gitignored dist/, не входит в bun install.
# На свежем сервере (первый деплой ZenStack-приложения) zenstack:generate падает с
# "Cannot find plugin module ../../libs/zenstack-form-plugin/dist/index.js" (обнаружено §18
# Сессия D — s3, первый живой staging-деплой). nx build кэшируется, поэтому повторный вызов
# на уже собранном дереве — почти мгновенный no-op, безопасно вызывать при каждом деплое.
echo -e "${YELLOW}🔧 Ensuring @letar/zenstack-form-plugin is built...${NC}"
if ! nx run @letar/zenstack-form-plugin:build; then
  echo -e "${RED}❌ Failed to build @letar/zenstack-form-plugin (нужен для zenstack:generate)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ zenstack-form-plugin ready${NC}"
echo ""

# Step 2.45: Пересобрать dist/*.d.ts всех libs/* (PLAN-INFRA.md §43).
# У 45 из 46 libs нет отдельного таргета "build" — dist/*.d.ts производит их "typecheck"
# (tsc --build ... --emitDeclarationOnly, см. libs.md). Приложение резолвит @letar/* через TS
# project references на эти dist/ (lib-entry-points.md), и nx build/typecheck:tsgo приложения
# пересобирает их только для либ, у которых есть рёбро в графе (package.json dependencies или
# nx.implicitDependencies). Найдено 2026-08-06: правка в @letar/auth/client задела 8 либ разом,
# деплой dashboard упал TS6305 ("Output file has not been built from source file") на устаревшем
# dist/*.d.ts. Явный прогон typecheck по ВСЕМ libs перед сборкой приложений закрывает пробел
# независимо от того, объявлена ли зависимость в графе.
echo -e "${YELLOW}🔧 Rebuilding libs/*/dist declarations (typecheck)...${NC}"
LIB_PROJECTS=$(nx show projects --type=lib 2>/dev/null | tr -d '[]"')
if [ -n "$LIB_PROJECTS" ]; then
  LIB_TYPECHECK_CACHE_FLAG=""
  if [ "$SKIP_NX_CACHE" = true ]; then
    LIB_TYPECHECK_CACHE_FLAG="--skip-nx-cache"
  fi
  # Не хардгейтим деплой этим шагом: даже полностью зелёный typecheck по всем libs/* — это
  # подстраховка, не гарантия (замер 2026-08-06 нашёл и починил 4 отдельных бага в 4 либах,
  # два из них — рассинхрон версий SDK/zod между копиями, невидимый до полного пересоздания
  # tsbuildinfo, см. PLAN-INFRA.md §43 и .claude/docs/mcp-server-pattern.md). Жёсткий exit 1
  # здесь заблокировал бы ВСЕ деплои поломкой не связанных с деплоем tool-либ. Если сломался
  # реально нужный lib — это всплывёт явной ошибкой ниже, на сборке самого приложения.
  if ! nx run-many -t typecheck --projects="$LIB_PROJECTS" $LIB_TYPECHECK_CACHE_FLAG; then
    echo -e "${YELLOW}⚠️  Часть libs/* не прошла typecheck (см. PLAN-INFRA.md §43). Продолжаю — сборка приложения ниже покажет, было ли это критично.${NC}"
  else
    echo -e "${GREEN}✅ libs/*/dist up to date${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  nx show projects --type=lib вернул пусто — пропускаю${NC}"
fi
echo ""

# Step 2.5: Create cron-jobs.json if not exists (for Dashboard)
if [ ! -f "cron-jobs.json" ] && [ -f "cron-jobs.example.json" ]; then
  cp cron-jobs.example.json cron-jobs.json
  echo -e "${YELLOW}📋 Created cron-jobs.json from template${NC}"
fi

# Step 4: Get affected applications
echo -e "${YELLOW}🔍 Detecting affected applications...${NC}"

# Function to check if app belongs to current server
app_belongs_to_server() {
  local app=$1
  # If SERVER_APPS is empty (unknown server), allow all
  if [ -z "$SERVER_APPS" ]; then
    return 0
  fi
  # Check if app is in the allowed list for this server
  echo "$SERVER_APPS" | grep -qw "$app"
}

if [ -n "$SPECIFIC_APP" ]; then
  # Deploy specific app - verify it belongs to this server
  if ! app_belongs_to_server "$SPECIFIC_APP"; then
    echo -e "${RED}❌ App '${SPECIFIC_APP}' does not belong to server ${SERVER_NAME}${NC}"
    echo -e "${YELLOW}Apps for this server: ${SERVER_APPS}${NC}"
    exit 1
  fi
  AFFECTED_APPS="$SPECIFIC_APP"
  echo -e "${BLUE}Deploying specific app: ${SPECIFIC_APP}${NC}"
else
  # Get all deployable apps (those with $COMPOSE_FILE AND belong to this server)
  DEPLOYABLE_APPS=""
  SKIPPED_APPS=""
  for app_dir in apps/*/; do
    if [ -f "${app_dir}$COMPOSE_FILE" ]; then
      app_name=$(basename "$app_dir")
      if app_belongs_to_server "$app_name"; then
        DEPLOYABLE_APPS="$DEPLOYABLE_APPS $app_name"
      else
        SKIPPED_APPS="$SKIPPED_APPS $app_name"
      fi
    fi
  done

  # Show server info
  if [ -n "$SERVER_APPS" ]; then
    echo -e "${BLUE}Server: ${SERVER_NAME} (${CURRENT_HOST})${NC}"
    echo -e "${BLUE}Allowed apps: ${SERVER_APPS}${NC}"
    if [ -n "$SKIPPED_APPS" ]; then
      echo -e "${YELLOW}Skipped (wrong server):${SKIPPED_APPS}${NC}"
    fi
    echo ""
  fi

  if [ -z "$DEPLOYABLE_APPS" ]; then
    echo -e "${YELLOW}⚠️  No deployable applications found (no $COMPOSE_FILE)${NC}"
    exit 0
  fi

  # Check each deployable app against its own deployment marker
  AFFECTED_APPS=""
  CURRENT_HEAD=$(git rev-parse HEAD)

  echo -e "${BLUE}Checking each app against its deployment marker:${NC}"
  for APP_FOLDER in $DEPLOYABLE_APPS; do
    APP_LAST_DEPLOY=$(get_last_deploy_commit "$APP_FOLDER")

    if [ -z "$APP_LAST_DEPLOY" ]; then
      # Never deployed - include it
      echo -e "  • ${APP_FOLDER} ${YELLOW}(never deployed)${NC}"
      AFFECTED_APPS="$AFFECTED_APPS $APP_FOLDER"
    elif [ "$APP_LAST_DEPLOY" = "$CURRENT_HEAD" ]; then
      # Already deployed at current HEAD - skip
      echo -e "  • ${APP_FOLDER} ${GREEN}(already at HEAD, skipping)${NC}"
    else
      # Check if app has changes since its own last deployment using Nx affected.
      # Текущий Nx (22.6) при непривязанном к TTY stdout печатает JSON-массив одной строкой
      # (`["app1","app2"]`), НЕ по одному имени на строку — построчный grep с якорями "^$"
      # никогда не совпадал со строкой массива, APP_AFFECTED был всегда пуст (найдено
      # 2026-08-09, PLAN-INFRA.md §51 «Смежная находка»). Разбираем вывод через node —
      # тот же приём, что isAffectedSince() в libs/deploy-mcp/src/config.ts. Фоллбэк на
      # построчный список сохранён на случай другой версии/конфигурации nx на сервере.
      APP_AFFECTED_RAW=$(nx show projects --affected --base=$APP_LAST_DEPLOY --head=HEAD --type=app 2>/dev/null)
      APP_AFFECTED=$(node -e '
        const raw = process.argv[1] || ""
        const app = process.argv[2]
        let list
        try {
          list = JSON.parse(raw)
        } catch {
          list = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
        }
        const hit = Array.isArray(list) && list.some((p) => p === app || p.endsWith("/" + app))
        process.stdout.write(hit ? app : "")
      ' "$APP_AFFECTED_RAW" "$APP_FOLDER" 2>/dev/null || echo "")
      if [ -n "$APP_AFFECTED" ]; then
        echo -e "  • ${APP_FOLDER} ${YELLOW}(changed since ${APP_LAST_DEPLOY:0:8})${NC}"
        AFFECTED_APPS="$AFFECTED_APPS $APP_FOLDER"
      else
        echo -e "  • ${APP_FOLDER} ${GREEN}(no changes since ${APP_LAST_DEPLOY:0:8}, skipping)${NC}"
      fi
    fi
  done

  if [ -z "$AFFECTED_APPS" ]; then
    echo -e "${GREEN}✅ All applications are already deployed at their latest versions. Nothing to deploy!${NC}"
    exit 0
  fi

  echo ""
  echo -e "${BLUE}Applications to deploy:${NC}"
  for app in $AFFECTED_APPS; do
    echo -e "  • ${app}"
  done
fi
echo ""

# Dry run - just show what would be deployed
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No actual deployment will happen${NC}"
  echo ""
  for app in $AFFECTED_APPS; do
    echo -e "${BLUE}Would deploy: ${app}${NC}"

    APP_DIR="apps/${app}"
    if [ -d "$APP_DIR" ]; then
      if [ -f "$APP_DIR/$COMPOSE_FILE" ]; then
        echo -e "  ✓ Has $COMPOSE_FILE"
      else
        echo -e "  ✗ Missing $COMPOSE_FILE"
      fi

      if [ -f "$APP_DIR/Dockerfile.production" ]; then
        echo -e "  ✓ Has Dockerfile.production (build app)"
      else
        echo -e "  ℹ No Dockerfile.production (infrastructure app)"
      fi

      if [ -f "$APP_DIR/$ENV_FILE_NAME" ]; then
        echo -e "  ✓ Has $ENV_FILE_NAME configuration"
      elif [ -f "$APP_DIR/${ENV_FILE_NAME}.example" ]; then
        echo -e "  ⚠ Missing $ENV_FILE_NAME (create from ${ENV_FILE_NAME}.example)"
      else
        echo -e "  ℹ No $ENV_FILE_NAME needed"
      fi
    else
      echo -e "  ${RED}✗ App directory not found: $APP_DIR${NC}"
    fi
    echo ""
  done

  echo -e "${YELLOW}Run without --dry-run to actually deploy${NC}"
  exit 0
fi

# Step 4: Deploy each affected application
DEPLOYED_APPS=()
FAILED_APPS=()

for app in $AFFECTED_APPS; do
  echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Deploying: ${app}${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""

  APP_DIR="apps/${app}"

  # Серверный override compose-файла (PLAN-INFRA.md §66 п.2). Раньше скрипт различал только
  # --staging → docker-compose.staging.yml, иначе всегда docker-compose.production.yml — на s3
  # это привело к тому, что --app dashboard-agent молча взял продовый compose с портом,
  # занятым media-api ("port is already allocated" — симптом не подсказывал первопричину).
  # Если для приложения на этом сервере лежит собственный docker-compose.<SERVER_NAME>.yml
  # (сейчас — только apps/dashboard-agent/docker-compose.s3.yml) — используем его вместо
  # общего $BASE_COMPOSE_FILE. Staging всегда идёт через docker-compose.staging.yml независимо
  # от сервера — override здесь не применяется.
  COMPOSE_FILE="$BASE_COMPOSE_FILE"
  if [ "$STAGING" != true ] && [ -f "${APP_DIR}/docker-compose.${SERVER_NAME}.yml" ]; then
    COMPOSE_FILE="docker-compose.${SERVER_NAME}.yml"
    echo -e "${BLUE}ℹ️  ${app}: серверный override ${COMPOSE_FILE} (сервер ${SERVER_NAME})${NC}"
  fi

  # Расшифровка .env.docker.enc → .env.docker (если используется SOPS)
  if ! decrypt_sops_env "$APP_DIR"; then
    FAILED_APPS+=("$app")
    echo ""
    continue
  fi

  # Check if app directory exists
  if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ App directory not found: $APP_DIR${NC}"
    FAILED_APPS+=("$app")
    echo ""
    continue
  fi

  # Check for required Docker files
  if [ ! -f "$APP_DIR/$COMPOSE_FILE" ]; then
    echo -e "${YELLOW}⚠️  No $COMPOSE_FILE found for $app, skipping...${NC}"
    echo ""
    continue
  fi

  # Check if this is an infrastructure app (no Dockerfile, uses external images)
  if [ ! -f "$APP_DIR/Dockerfile.production" ]; then
    echo -e "${BLUE}ℹ️  Infrastructure app detected (no Dockerfile.production)${NC}"
    echo -e "${YELLOW}🐳 Deploying ${app} with external Docker images...${NC}"

    cd "$APP_DIR"

    # Find env file
    ENV_FILE=""
    if [ -f "$ENV_FILE_NAME" ]; then
      ENV_FILE="--env-file $ENV_FILE_NAME"
    elif [ -f "${ENV_FILE_NAME}.example" ] && [ ! -f "$ENV_FILE_NAME" ]; then
      echo -e "${RED}❌ Missing $ENV_FILE_NAME for ${app}${NC}"
      echo -e "${YELLOW}   Create it from ${ENV_FILE_NAME}.example:${NC}"
      echo -e "${YELLOW}   cp apps/${app}/${ENV_FILE_NAME}.example apps/${app}/$ENV_FILE_NAME${NC}"
      cd "$WORKSPACE_ROOT"
      FAILED_APPS+=("$app")
      echo ""
      continue
    fi

    # Pull latest images and deploy
    if docker compose -f $COMPOSE_FILE $ENV_FILE pull; then
      echo -e "${GREEN}✅ Images pulled${NC}"
    else
      echo -e "${YELLOW}⚠️  Some images may not have been updated${NC}"
    fi

    if docker compose -f $COMPOSE_FILE $ENV_FILE up -d --force-recreate; then
      echo -e "${GREEN}✅ Infrastructure deployment completed for ${app}!${NC}"
      DEPLOYED_APPS+=("$app")
      save_deploy_commit "$app" "$(git -C "$WORKSPACE_ROOT" rev-parse HEAD)"
      echo -e "${BLUE}💾 Saved deployment marker for ${app}${NC}"
    else
      echo -e "${RED}❌ Infrastructure deployment failed for ${app}${NC}"
      FAILED_APPS+=("$app")
    fi

    cd "$WORKSPACE_ROOT"
    echo ""
    continue
  fi

  # Ensure database is running and DATABASE_URL is set before generate/build
  # Skip for apps without database (e.g., dashboard)
  cd "$APP_DIR"

  # Find env file
  BUILD_ENV_FILE=""
  if [ -f "$ENV_FILE_NAME" ]; then
    BUILD_ENV_FILE="$ENV_FILE_NAME"
  fi

  # Check if app has a database service defined
  HAS_DB_SERVICE=$(grep -c "^\s*db:" $COMPOSE_FILE 2>/dev/null | tr -d '\r\n' || echo "0")
  # Ensure it's a valid number
  [[ "$HAS_DB_SERVICE" =~ ^[0-9]+$ ]] || HAS_DB_SERVICE=0

  if [ -n "$BUILD_ENV_FILE" ] && [ "$HAS_DB_SERVICE" -gt 0 ]; then
    echo -e "${YELLOW}🔧 Ensuring database is running for build...${NC}"

    # Start only database if not running
    if ! docker compose -f $COMPOSE_FILE ps db | grep -q "Up"; then
      echo "Starting database container..."
      docker compose -f $COMPOSE_FILE --env-file "$BUILD_ENV_FILE" up -d db
      echo "Waiting for database to be ready..."
      sleep 5
    else
      echo "Database already running"
    fi

    # Export environment variables for build
    echo "Loading environment from: ${BUILD_ENV_FILE}"
    # Source the env file properly to handle special characters
    set -a
    # shellcheck source=/dev/null
    source "${BUILD_ENV_FILE}"
    set +a

    # URL-encode the password for use in DATABASE_URL
    # This handles special characters like =, /, + in the password
    ENCODED_PASSWORD=$(printf '%s' "$DB_PASSWORD" | sed 's/=/%3D/g; s/\//%2F/g; s/+/%2B/g')

    # Extract DB user, name and port from docker-compose.yml
    DB_USER=$(grep "POSTGRES_USER:" $COMPOSE_FILE | awk '{print $2}' | head -1)
    DB_NAME=$(grep "POSTGRES_DB:" $COMPOSE_FILE | awk '{print $2}' | head -1)
    DB_PORT=$(grep -A 1 "ports:" $COMPOSE_FILE | grep -o "[0-9]\+:5432" | cut -d: -f1 | head -1)

    # DATABASE_URL for build - connect to Docker DB via localhost with dynamic port
    export DATABASE_URL="postgresql://${DB_USER:-lena_user}:${ENCODED_PASSWORD}@localhost:${DB_PORT:-5432}/${DB_NAME}?schema=public"
    echo "DATABASE_URL configured for ${DB_USER:-lena_user}@localhost:${DB_PORT:-5432}/${DB_NAME}"
  elif [ "$HAS_DB_SERVICE" -gt 0 ]; then
    # ${app} явно объявляет db-сервис в ${COMPOSE_FILE}, но ${ENV_FILE_NAME} не найден в
    # apps/${app}/ на момент проверки — блок выше молча пропускался целиком, включая
    # DATABASE_URL и последующий шаг применения миграций (711 ниже, тот же гейт), без единой
    # строки в логе деплоя. На практике это выглядит как здоровый деплой, который на самом
    # деле оставляет БД непримигрированной — обнаружено на первом staging-деплое domwellbes
    # (BlackCove создал .env.staging позже, чем скрипт успел его проверить).
    echo -e "${RED}⚠️  ${ENV_FILE_NAME} not found for ${app} in $(pwd) — skipping DB startup, DATABASE_URL export and migrations for this deploy.${NC}"
    echo -e "${RED}   If ${app} needs a database, create ${ENV_FILE_NAME} BEFORE running this deploy and re-run.${NC}"
  fi

  cd "$WORKSPACE_ROOT"

  # Generate Prisma Client and ZenStack if needed (DATABASE_URL must be set before this)
  if [ -f "$APP_DIR/schema.zmodel" ]; then
    echo -e "${YELLOW}🔧 Generating Prisma Client and ZenStack for ${app}...${NC}"

    # Force regeneration without cache to ensure fresh Prisma client
    # IMPORTANT: zenstack:generate already runs prisma generate internally
    # DO NOT run db:generate after this - it would overwrite src/generated/prisma/ 
    # and delete the index.ts file created by zenstack:generate
    echo "Running zenstack:generate without cache..."
    if ! nx zenstack:generate $app --skip-nx-cache; then
      echo -e "${RED}❌ ZenStack generation failed${NC}"
      exit 1
    fi

    echo -e "${GREEN}✅ Prisma Client and ZenStack generated successfully${NC}"
  fi

  cd "$APP_DIR"

  if [ -n "$BUILD_ENV_FILE" ] && [ "$HAS_DB_SERVICE" -gt 0 ]; then

    # Apply migrations before build (so Next.js can pre-render with actual schema)
    echo "Applying database migrations..."
    cd "$WORKSPACE_ROOT"
    cd "$APP_DIR"
    # ⚠️ Prisma 7 + prisma.config.ts (все приложения кроме label-printer-desktop, который не
    # деплоится этим скриптом): CLI сам резолвит и schema, и migrations.path из конфига при
    # запуске БЕЗ --schema (тот же вызов, что и в рабочих nx-таргетах db:migrate/db:migrate:deploy —
    # `cwd: apps/<app>`, никакого --schema). Раньше здесь был хардкод `--schema
    # src/generated/schema.prisma` — для driving-school (shared-lib паттерн, schema.prisma
    # генерируется в libs/driving-school-db/, а migrations лежат в apps/driving-school/prisma/
    # migrations/) путь не совпадал, скрипт молча писал "Schema not found" и пропускал ВЕСЬ шаг
    # миграций без ошибки (в т.ч. на production — найдено при staging e2e §18.6 Сессия J).
    # Передавать --schema на резолвленный из schema.zmodel путь тоже было бы неверно: Prisma
    # тогда искал бы migrations рядом со schema.prisma (в libs/), а не в apps/.../prisma/migrations,
    # где они реально лежат — конфиг в prisma.config.ts специально держит эти два пути вместе.
    USE_PRISMA_CONFIG=0
    SCHEMA_PATH="src/generated/schema.prisma"
    if [ -f "prisma.config.ts" ]; then
      USE_PRISMA_CONFIG=1
    fi
    if [ "$USE_PRISMA_CONFIG" = "1" ] || [ -f "$SCHEMA_PATH" ]; then
      PRISMA_SCHEMA_FLAG=()
      if [ "$USE_PRISMA_CONFIG" != "1" ]; then
        PRISMA_SCHEMA_FLAG=(--schema "$SCHEMA_PATH")
      fi
      # Различаем «нет миграций к применению» (status: exit 0) и реальную работу/ошибку.
      # Раньше падение migrate deploy давало warning и деплой продолжался поверх
      # недомигрированной БД — теперь ошибка миграции прерывает деплой приложения.
      if DATABASE_URL="$DATABASE_URL" npx prisma migrate status "${PRISMA_SCHEMA_FLAG[@]}" > /dev/null 2>&1; then
        echo -e "${BLUE}ℹ️  No pending migrations for ${app}${NC}"
      else
        # Перед миграцией — дамп прод-БД (защита данных; окно потери между ночными
        # бэкапами — до 24ч). Обход только явный: SKIP_PREMIGRATE_DUMP=1
        DUMP_DIR="${PRE_MIGRATE_DUMP_DIR:-/home/deploy/pre-migrate-dumps}"
        if [ "${SKIP_PREMIGRATE_DUMP:-0}" != "1" ]; then
          mkdir -p "$DUMP_DIR"
          DUMP_FILE="${DUMP_DIR}/${app}-$(git -C "$WORKSPACE_ROOT" rev-parse --short HEAD)-$(date +%Y%m%d-%H%M%S).sql.gz"
          # Имя контейнера БД — из compose (container_name под сервисом db:), fallback на конвенцию <app>-db
          DB_CONTAINER=$(awk '/^[[:space:]]*db:[[:space:]]*$/{f=1} f && /container_name:/{print $2; exit}' "$COMPOSE_FILE")
          DB_CONTAINER="${DB_CONTAINER:-${app}-db}"
          echo -e "${YELLOW}💾 Pre-migrate dump (${DB_CONTAINER}): ${DUMP_FILE}${NC}"
          docker exec "$DB_CONTAINER" pg_dump -U "${DB_USER:-lena_user}" "${DB_NAME}" | gzip > "$DUMP_FILE"
          DUMP_RC=${PIPESTATUS[0]}
          if [ "$DUMP_RC" = "0" ] && [ -s "$DUMP_FILE" ]; then
            # Ротация: храним последние 3 дампа этого приложения
            ls -1t "${DUMP_DIR}/${app}-"*.sql.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
            echo -e "${GREEN}✅ Pre-migrate dump created${NC}"
          else
            rm -f "$DUMP_FILE"
            echo -e "${RED}❌ Pre-migrate dump failed for ${app} — деплой прерван (миграция без бэкапа запрещена; явный обход: SKIP_PREMIGRATE_DUMP=1)${NC}"
            FAILED_APPS+=("$app")
            cd "$WORKSPACE_ROOT"
            echo ""
            continue
          fi
        else
          echo -e "${YELLOW}⚠️  SKIP_PREMIGRATE_DUMP=1 — миграция без предварительного дампа${NC}"
        fi

        if DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy "${PRISMA_SCHEMA_FLAG[@]}"; then
          echo -e "${GREEN}✅ Migrations applied${NC}"
        else
          echo -e "${RED}❌ Migration failed for ${app} — деплой прерван, старый контейнер не тронут. Дамп до миграции: ${DUMP_DIR}${NC}"
          FAILED_APPS+=("$app")
          cd "$WORKSPACE_ROOT"
          echo ""
          continue
        fi
      fi
    else
      echo -e "${YELLOW}⚠️  Schema not found at $SCHEMA_PATH (нет prisma.config.ts)${NC}"
    fi
  elif [ -n "$BUILD_ENV_FILE" ]; then
    echo -e "${BLUE}ℹ️  No database service defined, skipping DB setup${NC}"
    # Still load env file for other variables
    set -a
    source "${BUILD_ENV_FILE}"
    set +a
  fi

  cd "$WORKSPACE_ROOT"

  # Verify critical env variables are loaded (for debugging build failures)
  if [ -n "$BUILD_ENV_FILE" ]; then
    echo -e "${BLUE}ℹ️  Checking env variables...${NC}"
    [ -n "$BETTER_AUTH_SECRET" ] && echo "  ✓ BETTER_AUTH_SECRET set" || echo "  ✗ BETTER_AUTH_SECRET missing"
    [ -n "$AUTH_GOOGLE_ID" ] && echo "  ✓ AUTH_GOOGLE_ID set" || echo "  ✗ AUTH_GOOGLE_ID missing"
    [ -n "$AUTH_GOOGLE_SECRET" ] && echo "  ✓ AUTH_GOOGLE_SECRET set" || echo "  ✗ AUTH_GOOGLE_SECRET missing"

    # Re-export critical variables explicitly (in case source didn't work due to CRLF)
    if [ -z "$BETTER_AUTH_SECRET" ] || [ -z "$AUTH_GOOGLE_ID" ]; then
      echo -e "${YELLOW}⚠️  Re-reading env file with CRLF fix...${NC}"
      while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        # Remove carriage return if present
        key=$(echo "$key" | tr -d '\r')
        value=$(echo "$value" | tr -d '\r')
        export "$key=$value"
      done < "${WORKSPACE_ROOT}/${APP_DIR}/${BUILD_ENV_FILE}"
    fi
  fi

  # Clear Next.js and Babel caches before build to prevent stale cache issues
  echo -e "${YELLOW}🧹 Clearing build caches for ${app}...${NC}"
  rm -rf "$APP_DIR/.next" 2>/dev/null || true
  rm -rf "$APP_DIR/out" 2>/dev/null || true
  rm -rf "node_modules/.cache" 2>/dev/null || true

  phase_marker build start

  # Determine app type: Next.js (static/standalone) or Node.js (esbuild/bun)
  IS_STATIC_EXPORT=false
  IS_NEXTJS_APP=false
  IS_NODE_APP=false

  if [ -f "$APP_DIR/next.config.mjs" ] || [ -f "$APP_DIR/next.config.js" ] || [ -f "$APP_DIR/next.config.ts" ]; then
    IS_NEXTJS_APP=true
    if grep -q "output.*['\"]export['\"]" "$APP_DIR/next.config.mjs" 2>/dev/null || \
       grep -q "output.*['\"]export['\"]" "$APP_DIR/next.config.js" 2>/dev/null || \
       grep -q "output.*['\"]export['\"]" "$APP_DIR/next.config.ts" 2>/dev/null; then
      IS_STATIC_EXPORT=true
      echo -e "${BLUE}ℹ️  Next.js static export detected for ${app}${NC}"
    else
      echo -e "${BLUE}ℹ️  Next.js standalone detected for ${app}${NC}"
    fi
  else
    IS_NODE_APP=true
    echo -e "${BLUE}ℹ️  Node.js app detected for ${app} (builds inside Docker)${NC}"
  fi

  # Skip local build for Node.js apps (they build inside Docker)
  if [ "$IS_NODE_APP" = true ]; then
    echo -e "${BLUE}ℹ️  Skipping local build (Node.js app builds inside Docker)${NC}"
  else
    # Determine build command (some apps need special build targets)
    BUILD_TARGET="build"
    if [ "$IS_STATIC_EXPORT" = true ]; then
      # Check if build:production target exists (handles RSC path fixes for Next.js 16)
      if nx show project $app --json 2>/dev/null | grep -q '"build:production"'; then
        BUILD_TARGET="build:production"
        echo -e "${BLUE}ℹ️  Using build:production target (includes RSC path fixes)${NC}"
      fi
    else
      # Check if build:webpack target exists (for low-RAM servers, uses webpack instead of Turbopack)
      if nx show project $app --json 2>/dev/null | grep -q '"build:webpack"'; then
        BUILD_TARGET="build:webpack"
        echo -e "${BLUE}ℹ️  Using build:webpack target (webpack instead of Turbopack for low-RAM servers)${NC}"
      fi
    fi

    # Build the application
    NX_CACHE_FLAG=""
    if [ "$SKIP_NX_CACHE" = true ]; then
      NX_CACHE_FLAG="--skip-nx-cache"
      # Также очищаем локальный Nx кэш для этого приложения
      echo -e "${YELLOW}🧹 Clearing Nx cache...${NC}"
      rm -rf ".nx/cache" 2>/dev/null || true
      echo -e "${YELLOW}🔨 Building ${app} with ${BUILD_TARGET} (cache disabled)...${NC}"
    else
      echo -e "${YELLOW}🔨 Building ${app} with ${BUILD_TARGET} (Nx cache enabled)...${NC}"
    fi
    # Увеличиваем лимит памяти Node.js для билда (export нужен для worker-процессов Next.js)
    # --parallel=1 ограничивает параллелизм Nx (предотвращает OOM на серверах с малым количеством RAM)
    export NODE_OPTIONS="--max-old-space-size=8192"
    if nx $BUILD_TARGET $app --verbose --parallel=1 $NX_CACHE_FLAG; then
      echo -e "${GREEN}✅ Build completed for ${app}${NC}"
    else
      echo -e "${RED}❌ Build failed for ${app}${NC}"
      phase_marker build fail
      FAILED_APPS+=("$app")
      echo ""
      continue
    fi
  fi

  # Check for build output (skip for Node.js apps - they build inside Docker)
  if [ "$IS_NODE_APP" = true ]; then
    echo -e "${BLUE}ℹ️  Skipping build output check (Node.js app builds inside Docker)${NC}"
  elif [ "$IS_STATIC_EXPORT" = true ]; then
    # Static export: check for out/ directory
    if [ ! -d "$APP_DIR/out" ]; then
      echo -e "${RED}❌ Build output not found for ${app} (out/)${NC}"
      phase_marker build fail
      FAILED_APPS+=("$app")
      echo ""
      continue
    fi
    echo -e "${GREEN}✅ Static export output found: out/${NC}"
  else
    # Standalone: check for .next/standalone
    if [ ! -d "$APP_DIR/.next/standalone" ]; then
      echo -e "${RED}❌ Build output not found for ${app} (.next/standalone)${NC}"
      phase_marker build fail
      FAILED_APPS+=("$app")
      echo ""
      continue
    fi
  fi

  # Build Docker image
  echo -e "${YELLOW}🐳 Building Docker image for ${app}...${NC}"

  DOCKER_IMAGE="${app}${DOCKER_TAG_SUFFIX}"
  # Build from workspace root as context, with app-specific Dockerfile
  cd "$WORKSPACE_ROOT"
  # Дублирующий тег по git SHA — откат без пересборки: docker compose up с <app>:<sha>
  GIT_SHORT_SHA=$(git rev-parse --short HEAD)
  SHA_IMAGE="${app}:${GIT_SHORT_SHA}"
  if docker build -f "$APP_DIR/Dockerfile.production" -t "$DOCKER_IMAGE" -t "$SHA_IMAGE" .; then
    echo -e "${GREEN}✅ Docker image built: ${DOCKER_IMAGE} (+ rollback tag ${SHA_IMAGE})${NC}"
    # Ретеншн sha-тегов: храним последние 3 (docker images сортирует по дате создания);
    # rmi по тегу лишь снимает тег — образ под :latest/:staging не удаляется
    docker images "${app}" --format '{{.Tag}}' | grep -E '^[0-9a-f]{7,12}$' | tail -n +4 \
      | xargs -r -I{} docker rmi "${app}:{}" 2> /dev/null || true
    phase_marker build ok
  else
    echo -e "${RED}❌ Docker build failed for ${app}${NC}"
    phase_marker build fail
    FAILED_APPS+=("$app")
    echo ""
    continue
  fi

  # Deploy with Docker Compose
  echo -e "${YELLOW}🔄 Deploying ${app} containers...${NC}"
  cd "$APP_DIR"

  # Find env file
  ENV_FILE=""
  if [ -f "$ENV_FILE_NAME" ]; then
    ENV_FILE="$ENV_FILE_NAME"
  else
    echo -e "${RED}❌ No $ENV_FILE_NAME found for ${app}${NC}"
    cd "$WORKSPACE_ROOT"
    FAILED_APPS+=("$app")
    echo ""
    continue
  fi

  # Prepare DATABASE_URL with encoded password for the container
  # Source the env file to get DB_PASSWORD
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a

  # Generate DATABASE_URL with proper postgres container name
  if [ -n "$DB_PASSWORD" ]; then
    # Extract DB user and name from docker-compose
    DB_USER=$(grep "POSTGRES_USER:" $COMPOSE_FILE | awk '{print $2}' | head -1)
    DB_NAME=$(grep "POSTGRES_DB:" $COMPOSE_FILE | awk '{print $2}' | head -1)
    # Get postgres container_name — по соглашению монорепо это всегда "${app}-db"
    POSTGRES_CONTAINER="${app}-db"

    export DATABASE_URL="postgresql://${DB_USER:-lena_user}:${DB_PASSWORD}@${POSTGRES_CONTAINER}:5432/${DB_NAME}?schema=public"
    echo "DATABASE_URL: ${DB_USER:-lena_user}@${POSTGRES_CONTAINER}:5432/${DB_NAME}"
  fi

  # Run docker-compose from app directory
  # Self-deploy: приложения, которые сами хостят канал, через который идёт этот же деплой
  # (dashboard — process supervisor UI на 3002; dashboard-agent — deploy-mcp туннель на 3100,
  # через nsenter-спавн деплоя проходит именно через его контейнер). force-recreate убивает
  # старый контейнер, а с ним — cgroup, в которой живёт сам процесс деплоя.
  #
  # ⚠️ nohup+setsid НЕ РАБОТАЕТ здесь (проверено живым деплоем 2026-07-29, коммит fd1f8c6a):
  # setsid отвязывает процесс от сессии/терминала, но НЕ от cgroup — при docker stop/rm
  # процессы внутри cgroup контейнера убиваются независимо от того, что они уже в новой
  # сессии. Detached-скрипт обрывался ровно на "Recreate", не доходя до собственного запуска
  # (диагностировал BlackCove, message #870). Нужен реальный выход из cgroup контейнера —
  # даёт systemd-run, создающий transient-unit в system.slice (или user.slice), полностью
  # отдельной от cgroup докера.
  phase_marker rollout start
  DEPLOY_SUCCEEDED=false
  if [ "$app" = "dashboard" ] || [ "$app" = "dashboard-agent" ]; then
    echo -e "${YELLOW}⚠️  ${app} self-deploy: detached restart через systemd-run (переживает уничтожение cgroup собственного контейнера)${NC}"

    if [ "$app" = "dashboard" ]; then
      OLD_CONTAINER="dashboard-app"
      POST_START_CMD="curl -s http://localhost:3002/api/monitoring/auto-start > /dev/null 2>&1 || true"
    else
      # container_name у dashboard-agent — "dashboard-agent" (без суффикса -app, в отличие
      # от остальных приложений монорепо), задан в docker-compose.production.yml.
      OLD_CONTAINER="dashboard-agent"
      POST_START_CMD="true"
    fi

    # Скрипт сам себе задаёт лог (exec > ... 2>&1) — не зависит от того, как его запустили
    # (systemd-run пишет stdout юнита в journal, не в перенаправление вызывающей команды).
    RESTART_SCRIPT="/tmp/${app}-restart-$$.sh"
    RESTART_LOG="/tmp/${app}-restart-$$.log"
    cat > "$RESTART_SCRIPT" << RESTART_EOF
#!/bin/bash
exec > "${RESTART_LOG}" 2>&1
sleep 3
# Stop and remove old container if exists
docker stop ${OLD_CONTAINER} 2>/dev/null || true
docker rm ${OLD_CONTAINER} 2>/dev/null || true
cd "${WORKSPACE_ROOT}/${APP_DIR}"
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE_NAME up -d app
sleep 5
${POST_START_CMD}
docker logs --tail 10 ${OLD_CONTAINER}
RESTART_EOF
    chmod +x "$RESTART_SCRIPT"

    RESTART_UNIT="${app}-restart-$$"
    # ⚠️ Вызов systemd-run должен стоять именно в условии if (не в then-блоке) — при `set -e`
    # (действует всю жизнь скрипта, см. строку 2) ненулевой exit-код внутри then-блока убивает
    # ВЕСЬ deploy-affected.sh, а не только эту ветку. Так и произошло с первой версией фикса
    # (0.9.9, попытка 1): голый `systemd-run --unit=...` без sudo падал с "Interactive
    # authentication required" (polkit не даёт непривилегированному deploy стартовать unit в
    # system.slice без интерактивной авторизации) — команда была в then-блоке, скрипт падал
    # сразу после warning-строки, ни разу не добравшись до fallback (диагностировал BlackCove,
    # message #875, проверил вручную на s2: `sudo -n systemd-run` работает, голый — нет).
    # --collect: юнит и его результат удаляются автоматически после завершения (не копится
    # в `systemctl list-units --failed`). Без --scope — транзиентный service, а не scope:
    # запускается в фоне, systemd-run возвращает управление сразу, не блокируя деплой.
    if command -v systemd-run >/dev/null 2>&1 \
      && sudo -n systemd-run --unit="$RESTART_UNIT" --collect -- bash "$RESTART_SCRIPT" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ ${app} restart scheduled via sudo systemd-run (unit: ${RESTART_UNIT})${NC}"
    else
      echo -e "${RED}❌ sudo systemd-run недоступен на этом хосте (нет passwordless sudo или systemd-run) — fallback на nohup+setsid, который НЕ переживает уничтожение cgroup контейнера (известно не работает для self-deploy, см. комментарий выше)${NC}"
      nohup setsid bash "$RESTART_SCRIPT" > /dev/null 2>&1 &
    fi

    echo -e "${BLUE}ℹ️  ${app} will restart in ~5 seconds (log: ${RESTART_LOG})${NC}"
    DEPLOY_SUCCEEDED=true
  elif grep -vE '^[[:space:]]*#' "$COMPOSE_FILE" 2> /dev/null | grep -qE "letar\.rollout:[[:space:]]*['\"]?true['\"]?"; then
    # Strangler-переход на zero-downtime rollout (§18.6 Сессия G): opt-in через label
    # letar.rollout: 'true' в docker-compose.production.yml сервиса app (пилот на `time`
    # пройден чисто 2026-07-12, тираж на остальные приложения — в процессе). Детект
    # закомментированных строк исключён (`grep -v '^\s*#'` перед проверкой label) — иначе
    # `# labels:\n#   letar.rollout: 'true'` (temp-выключенный на приложениях в процессе
    # миграции, напр. form-docs) ложно матчился и заворачивал на rollout-путь, который сразу
    # падал в doctor (корректно, но зря) — найдено при тираже на form-docs 2026-07-12.
    # Откат = убрать/закомментировать label, старый force-recreate путь работает без изменений.
    echo -e "${YELLOW}🔀 ${app}: label letar.rollout=true — zero-downtime rollout (libs/deploy-engine)${NC}"
    GIT_SHORT_SHA_ROLLOUT=$(git -C "$WORKSPACE_ROOT" rev-parse --short HEAD)
    if (cd "$WORKSPACE_ROOT" && bun run libs/deploy-engine/src/cli.ts rollout --app "$app" --deploy-tag "$GIT_SHORT_SHA_ROLLOUT"); then
      echo -e "${GREEN}✅ Rollout completed for ${app}!${NC}"
      DEPLOY_SUCCEEDED=true
    else
      echo -e "${RED}❌ Rollout failed for ${app}${NC}"
    fi
  elif docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --force-recreate app; then
    echo -e "${GREEN}✅ Deployment completed for ${app}!${NC}"
    DEPLOY_SUCCEEDED=true
  fi

  if [ "$DEPLOY_SUCCEEDED" = true ]; then
    phase_marker rollout ok
    DEPLOYED_APPS+=("$app")
    save_deploy_commit "$app" "$(git -C "$WORKSPACE_ROOT" rev-parse HEAD)"
    echo -e "${BLUE}💾 Saved deployment marker for ${app}${NC}"
    if [ "$RUN_SEED" = true ]; then
      echo -e "${YELLOW}🌱 Running db:seed for ${app}...${NC}"
      # db:seed выполняется на хосте через `nx run` (НЕ docker exec — prod-образ standalone,
      # без bun/prisma/seed.ts), поэтому нужен DATABASE_URL с localhost + маппинг порта, как на
      # шаге build/migrate (строка ~680) — а не docker-internal hostname (${app}-db) из
      # $DATABASE_URL выше: тот резолвится только изнутри docker-сети и с хоста даёт
      # `getaddrinfo ESERVFAIL` (найдено 2026-07-16, деплой auth-hub --seed для aprel8008-prod).
      SEED_DATABASE_URL="postgresql://${DB_USER:-lena_user}:${ENCODED_PASSWORD}@localhost:${DB_PORT:-5432}/${DB_NAME}?schema=public"
      if DATABASE_URL="$SEED_DATABASE_URL" nx run "${app}:db:seed"; then
        echo -e "${GREEN}✅ Seed completed for ${app}${NC}"
      else
        echo -e "${RED}⚠️  Seed failed for ${app} (deploy succeeded)${NC}"
      fi
    fi
  else
    echo -e "${RED}❌ Deployment failed for ${app}${NC}"
    phase_marker rollout fail
    FAILED_APPS+=("$app")
  fi

  cd "$WORKSPACE_ROOT"
  echo ""
done

# Ожидание готовности контейнеров перед reload nginx
# Без этого NPM показывает default page пока контейнер стартует (5-10 мин даунтайм)
if [ ${#DEPLOYED_APPS[@]} -gt 0 ]; then
  phase_marker wait-healthy start
  echo -e "${YELLOW}⏳ Waiting for containers to become healthy before reloading Nginx...${NC}"
  for app in "${DEPLOYED_APPS[@]}"; do
    if [ "$STAGING" = true ]; then
      APP_CONTAINER="${app}-staging-app"
    elif [ "$app" = "dashboard-agent" ]; then
      # container_name без суффикса -app (docker-compose.production.yml), в отличие от
      # остальных приложений монорепо — иначе docker inspect ниже не находит контейнер
      # и healthcheck-ожидание молча пропускается.
      APP_CONTAINER="dashboard-agent"
    else
      APP_CONTAINER="${app}-app"
    fi
    # Проверяем наличие healthcheck у контейнера
    HAS_HEALTHCHECK=$(docker inspect "$APP_CONTAINER" --format '{{.Config.Healthcheck}}' 2>/dev/null || echo "")
    if [ -n "$HAS_HEALTHCHECK" ] && [ "$HAS_HEALTHCHECK" != "<nil>" ]; then
      echo -e "${BLUE}  Waiting for ${APP_CONTAINER} healthcheck...${NC}"
      MAX_WAIT=120
      WAITED=0
      while [ $WAITED -lt $MAX_WAIT ]; do
        STATUS=$(docker inspect "$APP_CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "healthy" ]; then
          echo -e "${GREEN}  ✅ ${APP_CONTAINER} is healthy (${WAITED}s)${NC}"
          break
        fi
        sleep 3
        WAITED=$((WAITED + 3))
      done
      if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${YELLOW}  ⚠️  ${APP_CONTAINER} not healthy after ${MAX_WAIT}s, proceeding anyway${NC}"
      fi
    else
      # Нет healthcheck — ждём фиксированное время
      echo -e "${BLUE}  No healthcheck for ${APP_CONTAINER}, waiting 10s...${NC}"
      sleep 10
    fi
  done
  phase_marker wait-healthy ok

  phase_marker nginx-reload start
  echo -e "${YELLOW}🔄 Reloading Nginx Proxy Manager to pick up new container IPs...${NC}"
  # Имя контейнера NPM различается по серверам: "nginx-proxy-manager" на s2 (прод),
  # "npm" на s3 (staging, поднят отдельно от canonical infra/nginx-proxy-manager/docker-compose.yml).
  NPM_CONTAINER=""
  for candidate in nginx-proxy-manager npm; do
    if docker exec "$candidate" nginx -s reload 2>/dev/null; then
      NPM_CONTAINER="$candidate"
      break
    fi
  done
  if [ -n "$NPM_CONTAINER" ]; then
    echo -e "${GREEN}✅ Nginx reloaded successfully (container: ${NPM_CONTAINER})${NC}"
    phase_marker nginx-reload ok
  elif docker ps --format '{{.Names}}' 2> /dev/null | grep -qx traefik; then
    # Сервер уже за Traefik (PLAN-INFRA.md §48). Reload'а не существует как понятия: Traefik
    # слушает docker-сокет и подхватывает новый контейнер сам. Отмечать это как fail нельзя —
    # провалившаяся фаза на каждом деплое приучает не смотреть на провалившиеся фазы.
    echo -e "${GREEN}✅ Traefik подхватит контейнер сам (nginx reload не требуется)${NC}"
    phase_marker nginx-reload ok
  else
    echo -e "${YELLOW}⚠️  Could not reload Nginx (container may not exist on this server)${NC}"
    phase_marker nginx-reload fail
  fi
  echo ""
fi

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 Deployment Summary                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ${#DEPLOYED_APPS[@]} -gt 0 ]; then
  echo -e "${GREEN}✅ Successfully deployed (${#DEPLOYED_APPS[@]}):${NC}"
  for app in "${DEPLOYED_APPS[@]}"; do
    echo -e "  • ${app}"
  done
  echo ""
fi

if [ ${#FAILED_APPS[@]} -gt 0 ]; then
  echo -e "${RED}❌ Failed deployments (${#FAILED_APPS[@]}):${NC}"
  for app in "${FAILED_APPS[@]}"; do
    echo -e "  • ${app}"
  done
  echo ""
  exit 1
fi

echo -e "${GREEN}🎉 All deployments completed successfully!${NC}"
echo ""

# Show logs for deployed apps
if [ ${#DEPLOYED_APPS[@]} -eq 1 ]; then
  app="${DEPLOYED_APPS[0]}"
  echo -e "${YELLOW}📋 Showing logs for ${app}:${NC}"
  cd "apps/${app}"
  docker compose -f $COMPOSE_FILE logs --tail=50 app
fi
