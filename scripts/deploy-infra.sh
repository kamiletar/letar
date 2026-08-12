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

MANIFEST="$SERVICE_DIR/secrets/deploy.conf"

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

echo "[deploy-infra] docker compose up -d ($SERVICE)"
(cd "$SERVICE_DIR" && docker compose up -d)

echo "[deploy-infra] Готово: $SERVICE"
