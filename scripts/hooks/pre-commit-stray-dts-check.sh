#!/usr/bin/env bash
# pre-commit-stray-dts-check.sh — блокирует коммит .d.ts/.d.ts.map, похожих на побочный
# артефакт typecheck:tsgo (typescript-go), а не на ручной код.
#
# Тот же чекер зарегистрирован в scripts/check-all.mjs (id: stray-dts) и запускается в CI —
# этот хук нужен, чтобы поймать находку ДО пуша, не дожидаясь CI. Дёшев (один git ls-files +
# stat по кандидатам), поэтому не обусловлен списком staged-файлов, как
# pre-commit-deps-integrity.sh — запускается на каждый коммит.
#
# cwd при запуске git-хука — корень репозитория, в котором коммитят (letar или submodule).
# Внутри submodule каталога scripts/ нет — сам чекер копируется рядом install.sh (как
# _check-schema-migration.mjs и другие).

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER="$DIR/_check-stray-dts.mjs"

if [[ ! -f "$CHECKER" ]]; then
  echo "⚠️  $CHECKER не найден — проверка stray .d.ts пропущена (переустанови хуки: scripts/hooks/install.sh)" >&2
  exit 0
fi

if ! command -v node &>/dev/null; then
  echo "⚠️  node не найден в PATH — проверка stray .d.ts пропущена" >&2
  exit 0
fi

if ! node "$CHECKER"; then
  echo ""
  echo "⛔ BLOCKED: коммит содержит .d.ts/.d.ts.map, похожий на артефакт typecheck:tsgo"
  echo "   (лежит рядом с одноимённым .ts/.tsx — см. вывод выше)."
  exit 1
fi

exit 0
