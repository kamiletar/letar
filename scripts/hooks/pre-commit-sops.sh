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
BLOCKED=0

# Расшифровывает .enc в stdout. Формат бывает двух видов (см. scripts/sops-env-set.sh):
# JSON-блоб (без флагов) и построчный dotenv — на «invalid character» повторяем с dotenv.
# Значения секретов наружу не печатаются: stderr sops уходит в файл, пишем только код возврата.
sops_decrypt_any() {
  local enc="$1" err
  err="$(mktemp)"
  if sops --decrypt "$enc" 2>"$err"; then
    rm -f "$err"
    return 0
  fi
  if grep -qi "invalid character" "$err"; then
    rm -f "$err"
    sops --decrypt --input-type dotenv --output-type dotenv "$enc" 2>/dev/null
    return $?
  fi
  rm -f "$err"
  return 1
}

# Имена ключей KEY=... (только имена, не значения), по одному в строке, отсортированные.
env_key_names() {
  grep -oE '^[A-Z0-9_]+=' | tr -d '=' | sort -u
}

# Находим все .env.docker.enc/.env.staging.enc/infra-секреты, которые должны быть обновлены.
# Два набора паттернов: из корня суперпроекта (apps/<app>/...) — для обычных приложений
# монорепо; из корня самого приложения (./...) — для коммита ВНУТРИ приватного submodule,
# где хук устанавливается отдельно в .git/modules/apps/<app>/hooks/pre-commit и запускается
# с cwd = корень submodule, так что префикса apps/*/ там не существует (§18.8 PLAN-INFRA.md).
# infra/*/secrets/*.enc — тот же принцип для infra-сервисов (§18.8.1 PLAN-INFRA.md): у них
# нет apps/*/-префикса и нет submodule-варианта, secrets/ всегда живёт в корне letar.
for enc_file in \
  apps/*/.env.docker.enc apps/*/*/.env.docker.enc \
  apps/*/.env.staging.enc apps/*/*/.env.staging.enc \
  .env.docker.enc .env.staging.enc \
  infra/*/secrets/*.enc; do
  [[ -f "$enc_file" ]] || continue

  plain_file="${enc_file%.enc}"
  [[ -f "$plain_file" ]] || continue

  # Шифруем только если plain-файл новее .enc
  if [[ "$plain_file" -nt "$enc_file" ]]; then
    # Защита от затирания прод-секретов устаревшей/урезанной локальной копией: если в plain нет
    # ключа, который есть в .enc, — не шифруем. Добавление ключей разрешено.
    # Только для .env-файлов (KEY=VALUE); infra/*/secrets/* — произвольные файлы, не сверяем.
    if [[ "$(basename "$plain_file")" == .env.* ]] && [[ "${GIT_ALLOW_SOPS_KEY_REMOVAL:-}" != "1" ]]; then
      if ! enc_plain="$(sops_decrypt_any "$enc_file")"; then
        echo "⛔ [sops] Не удалось расшифровать $enc_file — не могу сверить ключи, перешифровка пропущена." >&2
        echo "   Проверь SOPS_AGE_KEY_FILE или осознанно: GIT_ALLOW_SOPS_KEY_REMOVAL=1 git commit ..." >&2
        BLOCKED=$((BLOCKED + 1))
        continue
      fi
      missing="$(comm -23 <(printf '%s\n' "$enc_plain" | env_key_names) <(env_key_names <"$plain_file") || true)"
      unset enc_plain
      if [[ -n "$missing" ]]; then
        echo "⛔ [sops] $plain_file новее $enc_file, но в нём нет ключей, которые есть в .enc:" >&2
        printf '     - %s\n' $missing >&2
        echo "   Перешифровка затёрла бы их в прод-секретах. Значения не показываются." >&2
        echo "   Обнови plain из .enc:  sops -d $enc_file > $plain_file  (затем внеси свою правку)" >&2
        echo "   или осознанно удалить ключ: GIT_ALLOW_SOPS_KEY_REMOVAL=1 git commit ..." >&2
        BLOCKED=$((BLOCKED + 1))
        continue
      fi
    fi

    echo "[sops] Шифрую $plain_file → $enc_file"
    sops --encrypt --output "$enc_file" "$plain_file"
    git add "$enc_file"
    ENCRYPTED=$((ENCRYPTED + 1))
  fi
done

if [[ $BLOCKED -gt 0 ]]; then
  echo "⛔ [sops] Коммит заблокирован: $BLOCKED файл(ов) с потерей ключей (см. выше)." >&2
  exit 1
fi

if [[ $ENCRYPTED -gt 0 ]]; then
  echo "[sops] Зашифровано и добавлено в коммит: $ENCRYPTED файл(ов)"
fi

exit 0
