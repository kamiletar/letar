#!/usr/bin/env bash
# pre-commit-sops.sh — авто-шифрование .env.docker → .env.docker.enc перед коммитом
#
# Установка:
#   cp scripts/hooks/pre-commit-sops.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Или добавить в существующий .git/hooks/pre-commit:
#   bash scripts/hooks/pre-commit-sops.sh

set -euo pipefail

# Проверяем доступность sops
if ! command -v sops &>/dev/null; then
  exit 0
fi

# Проверяем наличие age-ключа
if [[ -z "${SOPS_AGE_KEY_FILE:-}" ]] || [[ ! -f "${SOPS_AGE_KEY_FILE}" ]]; then
  exit 0
fi

ENCRYPTED=0

# Находим все .env.docker.enc которые staged или которые должны быть обновлены
for enc_file in apps/*/.env.docker.enc apps/*/*/.env.docker.enc; do
  [[ -f "$enc_file" ]] || continue

  plain_file="${enc_file%.enc}"
  [[ -f "$plain_file" ]] || continue

  # Шифруем только если .env.docker новее .env.docker.enc
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
