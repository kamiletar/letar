#!/usr/bin/env bash
# pre-commit-syntax-check.sh — блокирует коммит staged .ts/.tsx/.mts/.cts, которые не парсятся
# как TypeScript (только парсер, без типов и разрешения импортов — доли секунды).
#
# Защита от инцидента 2026-09-22 (b8a213578): два писателя одного файла + `Write` вместо `Edit` +
# смешанный индекс (`MM`) дали закоммиченный server.ts с 11 синтаксическими ошибками, а ни один
# хук синтаксис не смотрел. Разбор — .claude/docs/git-multi-agent-incidents.md.
#
# cwd при запуске git-хука — корень репозитория, в котором коммитят (letar или submodule).
# Внутри submodule каталога scripts/ нет — сам чекер копируется рядом install.sh (как
# _check-stray-dts.mjs и другие), вместе с hooks_dir/lib/repo-root.mjs, который он импортирует.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER="$DIR/_check-staged-syntax.mjs"

if [[ ! -f "$CHECKER" ]]; then
  echo "⚠️  $CHECKER не найден — проверка синтаксиса пропущена (переустанови хуки: scripts/hooks/install.sh)" >&2
  exit 0
fi

if ! command -v node &>/dev/null; then
  echo "⚠️  node не найден в PATH — проверка синтаксиса пропущена" >&2
  exit 0
fi

if ! node "$CHECKER"; then
  echo ""
  echo "⛔ BLOCKED: staged .ts/.tsx не парсится (см. вывод выше)."
  exit 1
fi

exit 0
