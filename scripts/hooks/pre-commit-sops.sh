#!/usr/bin/env bash
# pre-commit-sops.sh — авто-шифрование .env.docker/.env.staging → *.enc перед коммитом
#
# Установка:
#   cp scripts/hooks/pre-commit-sops.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Или добавить в существующий .git/hooks/pre-commit:
#   bash scripts/hooks/pre-commit-sops.sh

set -euo pipefail
shopt -s nullglob

# Проверяем доступность sops
if ! command -v sops &>/dev/null; then
  exit 0
fi

# Проверяем наличие age-ключа
if [[ -z "${SOPS_AGE_KEY_FILE:-}" ]] || [[ ! -f "${SOPS_AGE_KEY_FILE}" ]]; then
  exit 0
fi

ENCRYPTED=0

# Находим все .env.docker.enc/.env.staging.enc которые должны быть обновлены.
# Два набора паттернов: из корня суперпроекта (apps/<app>/...) — для обычных приложений
# монорепо; из корня самого приложения (./...) — для коммита ВНУТРИ приватного submodule,
# где хук устанавливается отдельно в .git/modules/apps/<app>/hooks/pre-commit и запускается
# с cwd = корень submodule, так что префикса apps/*/ там не существует (§18.8 PLAN-INFRA.md).
for enc_file in \
  apps/*/.env.docker.enc apps/*/*/.env.docker.enc \
  apps/*/.env.staging.enc apps/*/*/.env.staging.enc \
  .env.docker.enc .env.staging.enc; do
  [[ -f "$enc_file" ]] || continue

  plain_file="${enc_file%.enc}"
  [[ -f "$plain_file" ]] || continue

  # Шифруем только если plain-файл новее .enc
  if [[ "$plain_file" -nt "$enc_file" ]]; then
    echo "[sops] Шифрую $plain_file → $enc_file"
    sops --encrypt --output "$enc_file" "$plain_file"
    git add "$enc_file"
    ENCRYPTED=$((ENCRYPTED + 1))
  fi
done

if [[ $ENCRYPTED -gt 0 ]]; then
  echo "[sops] Зашифровано и добавлено в коммит: $ENCRYPTED файл(ов)"
fi

exit 0
