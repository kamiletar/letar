#!/bin/bash
# Release-фаза деплоя на production-сервере (s2) — PLAN-INFRA-6.md §157.
#
# Сборка приложения идёт на s1 (`deploy-affected.sh --remote-release`): там `nx build`,
# `docker build`, `docker push` в registry. Сюда приезжает уже готовый образ, поэтому этому
# скрипту не нужны ни Nx, ни bun install, ни typecheck — только Docker, git-чекаут (compose-файлы
# и зашифрованные env) и SOPS-ключ.
#
# Вызывается ТОЛЬКО через scripts/deploy-release-entry.sh (forced-command ограниченного SSH-ключа
# s1→s2), не руками и не напрямую с s1.
#
# Подкоманды:
#   dump    <app> <sha>  — pre-migrate дамп БД приложения (pg_dump живёт рядом с БД, на s2)
#   release <app> <sha>  — docker pull из registry → перетегирование в локальные теги →
#                          rollout/up -d → ожидание healthcheck → маркер деплоя
#
# ⚠️ Перетегирование — суть схемы: compose-файлы и libs/deploy-engine по-прежнему читают локальный
# `<app>:${DEPLOY_TAG:-latest}`, ни те, ни другие менять не нужно. Registry для них невидим.
#
# ⚠️ Часть шагов дублирует deploy-affected.sh (расшифровка SOPS, цикл healthcheck, блок rollout) —
# осознанно: на время тиража старый однохостовый путь остаётся рабочим, и трогать его ради общей
# библиотеки рискованнее дубля. Когда путь удалят, дубль исчезнет сам.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"
WORKSPACE_ROOT="$SCRIPT_DIR"

export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/home/deploy/.age/letar-key.txt}"
_HOME="${HOME:-/home/deploy}"
export PATH="$_HOME/.bun/bin:$_HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
unset NODE_ENV

REGISTRY_HOST="${REGISTRY_HOST:-registry.s1.letar.best}"
LAST_DEPLOY_DIR="$WORKSPACE_ROOT/.last-deploy"
BASE_BRANCH="main"
ENV_FILE_NAME=".env.docker"
SERVER_NAME="s2"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

phase_marker() {
  echo "::phase:$1:$2"
}

die() {
  echo -e "${RED}❌ $*${NC}" >&2
  exit 1
}

usage() {
  echo "Usage: deploy-release.sh <dump|release> <app> <sha>" >&2
  exit 2
}

[ "$#" -eq 3 ] || usage
CMD="$1"
APP="$2"
SHA="$3"

# Те же ограничения, что накладывает deploy-release-entry.sh — вторая линия обороны на случай
# прямого вызова: значения попадают в пути, имена образов и shell-строки.
[[ "$CMD" =~ ^(dump|release)$ ]] || usage
[[ "$APP" =~ ^[a-z0-9-]+$ ]] || die "Недопустимое имя приложения: $APP"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || die "Недопустимый sha: $SHA"

APP_DIR="apps/${APP}"

# Приложения, которые перезапускают сами себя, здесь недопустимы: канал деплоя идёт через их же
# контейнер (systemd-run в deploy-affected.sh), а release-фаза сама идёт по SSH-сессии, которую
# такой перезапуск оборвёт.
case "$APP" in
  dashboard | dashboard-agent)
    die "${APP} перезапускает сам себя — release-фаза его не обслуживает (деплой через deploy-affected.sh на s2)"
    ;;
esac

COMPOSE_FILE="docker-compose.production.yml"

# ───────────────────────── git: подтянуть compose-файлы и зашифрованные env ─────────────────────────
sync_checkout() {
  echo -e "${YELLOW}📥 s2: git pull (compose-файлы и env)...${NC}"
  git fetch origin || die "git fetch не удался"
  # bun.lock здесь никто не меняет, но сброс безвреден и повторяет поведение deploy-affected.sh
  git checkout -- bun.lock 2>/dev/null || true
  local branch
  branch=$(git branch --show-current)
  git pull origin "$branch" || die "git pull не удался (конфликт/локальные правки/сеть)"
  if ! git submodule update --recursive; then
    # Самая частая причина — bump submodule на не запушенный коммит; лечится на рабочей машине
    # (scripts/check-submodule-push-state.sh), здесь чинить нечего.
    die "git submodule update не удался — вероятно, коммит submodule не запушен на его origin"
  fi
  echo -e "${GREEN}✅ Чекаут s2 обновлён: $(git rev-parse --short HEAD)${NC}"
}

# ───────────────────────── SOPS: .env.docker.enc → .env.docker ─────────────────────────
decrypt_sops_env() {
  local enc_file="${APP_DIR}/${ENV_FILE_NAME}.enc"
  local plain_file="${APP_DIR}/${ENV_FILE_NAME}"
  [ -f "$enc_file" ] || return 0
  local sops_type_flags=""
  if [ "$(head -c1 "$enc_file")" != "{" ]; then
    sops_type_flags="--input-type dotenv --output-type dotenv"
  fi
  echo -e "${YELLOW}🔓 Расшифровываю ${enc_file}...${NC}"
  # shellcheck disable=SC2086
  sops --decrypt $sops_type_flags "$enc_file" > "$plain_file" || die "Не удалось расшифровать ${enc_file}"
  chmod 600 "$plain_file"
}

# ───────────────────────── dump: pre-migrate дамп БД ─────────────────────────
do_dump() {
  # Без .env.docker не знаем ни БД, ни пользователя — как и в deploy-affected.sh, это стоп, а не пропуск
  decrypt_sops_env
  local dump_dir="${PRE_MIGRATE_DUMP_DIR:-/home/deploy/pre-migrate-dumps}"
  local db_user db_name db_container dump_file
  db_user=$(grep "POSTGRES_USER:" "${APP_DIR}/${COMPOSE_FILE}" | awk '{print $2}' | head -1)
  db_name=$(grep "POSTGRES_DB:" "${APP_DIR}/${COMPOSE_FILE}" | awk '{print $2}' | head -1)
  # Якорь на ровно 2 пробела — top-level ключ сервиса, иначе матчится вложенный depends_on.db
  # (deploy-affected-premigrate-dump-wrong-container.md)
  db_container=$(awk '/^  [A-Za-z0-9_-]+:[[:space:]]*$/{f=($0 ~ /^  db:[[:space:]]*$/)?1:0} f && /container_name:/{print $2; exit}' "${APP_DIR}/${COMPOSE_FILE}")
  db_container="${db_container:-${APP}-db}"

  mkdir -p "$dump_dir"
  dump_file="${dump_dir}/${APP}-${SHA}-$(date +%Y%m%d-%H%M%S).sql.gz"
  echo -e "${YELLOW}💾 Pre-migrate dump (${db_container}): ${dump_file}${NC}"
  local rc=0
  docker exec "$db_container" pg_dump -U "${db_user:-lena_user}" "$db_name" | gzip > "$dump_file" || rc=$?
  # pipefail уже даёт ненулевой rc при падении pg_dump; проверяем ещё и что файл не пустой
  if [ "$rc" != "0" ] || [ ! -s "$dump_file" ]; then
    rm -f "$dump_file"
    die "Pre-migrate dump не удался для ${APP} — миграция без бэкапа запрещена"
  fi
  # Ротация: последние 3 дампа приложения
  ls -1t "${dump_dir}/${APP}-"*.sql.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
  echo -e "${GREEN}✅ Pre-migrate dump создан${NC}"
}

# ───────────────────────── registry: login + pull + перетегирование ─────────────────────────
registry_login() {
  # Учётные данные registry лежат в SOPS-секретах dashboard-agent (те же REGISTRY_USER/REGISTRY_PASS,
  # что использует ночной ретеншн тегов). Пароль идёт в docker login только через stdin и никуда
  # не пишется, кроме стандартного ~/.docker/config.json.
  local enc_file="$WORKSPACE_ROOT/apps/dashboard-agent/.env.docker.enc"
  [ -f "$enc_file" ] || die "Нет $enc_file — не откуда взять учётные данные registry"
  # Формат .enc бывает и dotenv-построчным, и JSON-блобом (у dashboard-agent — блоб): определяем по
  # первому символу. Жёсткий `--input-type dotenv` на блобе не расшифровывает файл.
  local env_text reg_user reg_pass sops_type_flags=""
  if [ "$(head -c1 "$enc_file")" != "{" ]; then
    sops_type_flags="--input-type dotenv --output-type dotenv"
  fi
  # shellcheck disable=SC2086
  env_text=$(sops --decrypt $sops_type_flags "$enc_file" 2>/dev/null) \
    || die "Не удалось расшифровать секреты dashboard-agent для docker login"
  reg_user=$(printf '%s\n' "$env_text" | grep '^REGISTRY_USER=' | head -1 | cut -d= -f2-)
  reg_pass=$(printf '%s\n' "$env_text" | grep '^REGISTRY_PASS=' | head -1 | cut -d= -f2-)
  [ -n "$reg_user" ] && [ -n "$reg_pass" ] || die "В секретах dashboard-agent нет REGISTRY_USER/REGISTRY_PASS"
  printf '%s' "$reg_pass" | docker login "$REGISTRY_HOST" -u "$reg_user" --password-stdin >/dev/null \
    || die "docker login в ${REGISTRY_HOST} не удался"
}

pull_image() {
  local remote_ref="${REGISTRY_HOST}/${APP}:${SHA}"
  echo -e "${YELLOW}🐳 docker pull ${remote_ref}${NC}"
  docker pull "$remote_ref" || die "Не удалось скачать ${remote_ref} — образ не собран/не запушен на s1?"
  # Локальные теги, которые ждут compose и deploy-engine: <app>:<sha> (откат) и <app>:latest
  docker tag "$remote_ref" "${APP}:${SHA}"
  docker tag "$remote_ref" "${APP}:latest"
  # Снимаем registry-тег: имя не должно жить на s2 вторым списком образов
  docker rmi "$remote_ref" >/dev/null 2>&1 || true
  # Ретеншн sha-тегов: последние 3 (как в deploy-affected.sh)
  docker images "$APP" --format '{{.Tag}}' | grep -E '^[0-9a-f]{7,12}$' | tail -n +4 \
    | xargs -r -I{} docker rmi "${APP}:{}" 2>/dev/null || true
  echo -e "${GREEN}✅ Образ доставлен: ${APP}:${SHA}, ${APP}:latest${NC}"
}

# ───────────────────────── release ─────────────────────────
do_release() {
  decrypt_sops_env
  [ -f "${APP_DIR}/${ENV_FILE_NAME}" ] || die "Нет ${APP_DIR}/${ENV_FILE_NAME} после расшифровки"

  registry_login
  pull_image

  cd "$APP_DIR"
  # DATABASE_URL для compose-интерполяции (имя контейнера БД в docker-сети, не localhost)
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE_NAME"
  set +a
  if [ -n "${DB_PASSWORD:-}" ]; then
    local db_user db_name
    db_user=$(grep "POSTGRES_USER:" "$COMPOSE_FILE" | awk '{print $2}' | head -1)
    db_name=$(grep "POSTGRES_DB:" "$COMPOSE_FILE" | awk '{print $2}' | head -1)
    export DATABASE_URL="postgresql://${db_user:-lena_user}:${DB_PASSWORD}@${APP}-db:5432/${db_name}?schema=public"
  fi
  export GLITCHTIP_RELEASE="$SHA"
  export NEXT_PUBLIC_GLITCHTIP_RELEASE="$SHA"

  phase_marker rollout start
  local ok=false
  if grep -vE '^[[:space:]]*#' "$COMPOSE_FILE" 2>/dev/null | grep -qE "letar\.rollout:[[:space:]]*['\"]?true['\"]?"; then
    echo -e "${YELLOW}🔀 ${APP}: label letar.rollout=true — zero-downtime rollout (libs/deploy-engine)${NC}"
    local proxy_args=()
    if grep -vE '^[[:space:]]*#' "$COMPOSE_FILE" 2>/dev/null | grep -qE "letar\.proxy-kind:[[:space:]]*['\"]?traefik['\"]?"; then
      proxy_args=(--proxy-kind traefik)
    fi
    if (cd "$WORKSPACE_ROOT" && bun run libs/deploy-engine/src/cli.ts rollout --app "$APP" --deploy-tag "$SHA" "${proxy_args[@]}"); then
      ok=true
    fi
  elif docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE_NAME" up -d --force-recreate app; then
    ok=true
  fi

  if [ "$ok" != true ]; then
    phase_marker rollout fail
    die "Релиз ${APP} не удался (rollout/up -d)"
  fi
  phase_marker rollout ok
  echo -e "${GREEN}✅ Релиз ${APP} выполнен${NC}"
  cd "$WORKSPACE_ROOT"

  # Ожидание healthcheck (как в deploy-affected.sh; у rollout-профиля нет container_name, и тогда
  # inspect пуст — та же фиксированная пауза, что и раньше)
  phase_marker wait-healthy start
  local container="${APP}-app" has_hc status waited=0 max_wait=120
  has_hc=$(docker inspect "$container" --format '{{.Config.Healthcheck}}' 2>/dev/null || echo "")
  if [ -n "$has_hc" ] && [ "$has_hc" != "<nil>" ]; then
    while [ "$waited" -lt "$max_wait" ]; do
      status=$(docker inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
      if [ "$status" = "healthy" ]; then
        echo -e "${GREEN}  ✅ ${container} healthy (${waited}s)${NC}"
        break
      fi
      sleep 3
      waited=$((waited + 3))
    done
    if [ "$waited" -ge "$max_wait" ]; then
      echo -e "${YELLOW}  ⚠️  ${container} не healthy за ${max_wait}s${NC}"
    fi
  else
    echo -e "${BLUE}  У ${container} нет healthcheck — жду 10s${NC}"
    sleep 10
  fi
  phase_marker wait-healthy ok

  # Маркер деплоя: полный SHA собранного коммита, а не HEAD чекаута s2 (он мог уйти вперёд)
  mkdir -p "$LAST_DEPLOY_DIR"
  git rev-parse "${SHA}^{commit}" 2>/dev/null > "$LAST_DEPLOY_DIR/$APP" \
    || git rev-parse HEAD > "$LAST_DEPLOY_DIR/$APP"
  echo -e "${BLUE}💾 Маркер деплоя ${APP} сохранён${NC}"
}

main() {
  sync_checkout

  # Проверки каталога — после pull: у приложения, добавленного последним коммитом, до него на s2
  # каталога ещё нет
  [ -d "$APP_DIR" ] || die "Каталог приложения не найден: $APP_DIR"
  if [ -f "${APP_DIR}/docker-compose.${SERVER_NAME}.yml" ]; then
    COMPOSE_FILE="docker-compose.${SERVER_NAME}.yml"
  fi
  [ -f "${APP_DIR}/${COMPOSE_FILE}" ] || die "Нет ${APP_DIR}/${COMPOSE_FILE}"
  [ -f "${APP_DIR}/Dockerfile.production" ] || die "У ${APP} нет Dockerfile.production — это не собираемое приложение"

  case "$CMD" in
    dump) do_dump ;;
    release) do_release ;;
  esac
}

# ⚠️ Всё тело — в main, а вызов и exit в одной последней строке: `git pull` внутри sync_checkout
# может обновить сам этот файл, а bash дочитывает скрипт по мере исполнения — без обёртки остаток
# выполнился бы по кускам уже НОВОГО файла (та же проблема, что решает self-re-exec в
# deploy-affected.sh, здесь дешевле).
main; exit $?
