#!/usr/bin/env bash
# deploy-infra.sh <сервис> — путь деплоя для infra/<сервис>, аналог deploy-affected.sh для apps/*.
#
# Решает §18.8.1 PLAN-INFRA.md: у infra/* (Traefik, acme-dns, NPM, ...) не было ни пайплайна
# секретов, ни единой команды деплоя — секреты копировались вручную scp мимо репозитория, а
# запуск был "cd infra/<сервис> && docker compose up -d" по памяти.
#
# Что делает:
#   1. расшифровывает infra/<сервис>/secrets/*.enc по манифесту secrets/deploy.conf
#      в целевые пути с нужными правами (файлы, не KEY=value — другой примитив, чем .env.docker);
#   2. поднимает docker compose.
#
# Манифест secrets/deploy.conf — путь и права описаны РЯДОМ с секретом, не в голове
# исполнителя (требование §18.8.1). Формат построчно:
#   <имя>.enc:<целевой_путь>:<права_chmod>
# Строки, начинающиеся с '#', и пустые строки игнорируются.
#
# Использование (на сервере, из корня letar):
#   scripts/deploy-infra.sh traefik
#   scripts/deploy-infra.sh acme-dns
#
# Требует SOPS_AGE_KEY_FILE в окружении, если у сервиса есть секреты — как и остальной
# SOPS-конвейер (.claude/docs/secret-manager.md). Сервис без secrets/deploy.conf просто
# пропускает шаг 1.

set -euo pipefail

SERVICE="${1:-}"
if [[ -z "$SERVICE" ]]; then
  echo "Использование: $0 <сервис>  (например: traefik, acme-dns)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_DIR="$REPO_ROOT/infra/$SERVICE"

if [[ ! -d "$SERVICE_DIR" ]]; then
  echo "[deploy-infra] infra/$SERVICE не существует" >&2
  exit 1
fi

# Определение сервера — тот же приоритет, что в deploy-affected.sh (DEPLOY_SERVER_NAME для
# серверов, где hostname -f не совпадает с *.letar.best, иначе hostname -f как фолбэк).
if [[ -n "${DEPLOY_SERVER_NAME:-}" ]]; then
  CURRENT_HOST="$DEPLOY_SERVER_NAME"
else
  CURRENT_HOST=$(hostname -f 2>/dev/null || hostname)
fi
case "$CURRENT_HOST" in
  *s1.letar.best* | s1 | server1) SERVER_NAME="s1" ;;
  *s2.letar.best* | s2 | server2) SERVER_NAME="s2" ;;
  *s3.letar.best* | s3 | server3) SERVER_NAME="s3" ;;
  *) SERVER_NAME="unknown" ;;
esac

# Server-specific override — полная замена, не merge (тот же паттерн, что
# docker-compose.<SERVER_NAME>.yml у apps в deploy-affected.sh). Без override — прежнее
# поведение (docker-compose.yml / secrets/deploy.conf), s3 этот код не задевает вовсе.
COMPOSE_FILE="docker-compose.yml"
if [[ -f "$SERVICE_DIR/docker-compose.${SERVER_NAME}.yml" ]]; then
  COMPOSE_FILE="docker-compose.${SERVER_NAME}.yml"
  echo "[deploy-infra] серверный override: $COMPOSE_FILE (сервер $SERVER_NAME)"
fi

MANIFEST="$SERVICE_DIR/secrets/deploy.conf"
if [[ -f "$SERVICE_DIR/secrets/deploy.${SERVER_NAME}.conf" ]]; then
  MANIFEST="$SERVICE_DIR/secrets/deploy.${SERVER_NAME}.conf"
  echo "[deploy-infra] серверный манифест секретов: deploy.${SERVER_NAME}.conf"
fi

if [[ -f "$MANIFEST" ]]; then
  if ! command -v sops &>/dev/null; then
    echo "[deploy-infra] sops не найден, а у $SERVICE есть секреты в манифесте — прерываю" >&2
    exit 1
  fi
  if [[ -z "${SOPS_AGE_KEY_FILE:-}" || ! -f "${SOPS_AGE_KEY_FILE}" ]]; then
    echo "[deploy-infra] SOPS_AGE_KEY_FILE не задан или файл не найден — прерываю" >&2
    exit 1
  fi

  echo "[deploy-infra] Расшифровываю секреты $SERVICE по $MANIFEST"
  while IFS=':' read -r name target mode || [[ -n "$name" ]]; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    enc_file="$SERVICE_DIR/secrets/$name"
    if [[ ! -f "$enc_file" ]]; then
      echo "[deploy-infra] $enc_file не найден (указан в манифесте) — прерываю" >&2
      exit 1
    fi
    if [[ -z "$target" || -z "$mode" ]]; then
      echo "[deploy-infra] строка манифеста для $name не содержит target:mode — прерываю" >&2
      exit 1
    fi

    mkdir -p "$(dirname "$target")"
    umask 077
    sops --decrypt "$enc_file" >"$target"
    chmod "$mode" "$target"
    echo "[deploy-infra]   $name → $target (chmod $mode)"
  done <"$MANIFEST"
else
  echo "[deploy-infra] $SERVICE без secrets/deploy.conf — пропускаю расшифровку"
fi

echo "[deploy-infra] docker compose -f $COMPOSE_FILE up -d ($SERVICE)"
(cd "$SERVICE_DIR" && docker compose -f "$COMPOSE_FILE" up -d)

echo "[deploy-infra] Готово: $SERVICE"
