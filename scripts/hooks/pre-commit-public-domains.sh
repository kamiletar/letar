#!/usr/bin/env bash
# pre-commit-public-domains.sh — не пускает в коммит домены коммерческих приложений и ИНН
# в публичных файлах (.claude/rules/public-repo-hygiene.md).
#
# Зачем на коммит-пути: gate `public-domains` в check-all ловит утечку только постфактум (CI),
# а к тому моменту строка уже в истории публичного репо. Проверяется ИНДЕКС (`--staged`).
# Область — любые staged текстовые файлы, кроме allowlist (scripts/data/public-domains-allowlist.txt);
# бинарники чекер пропускает сам.
# Внутри submodule хук молчит: это правило публичного letar, а submodule приватные.
#
# Обход (осознанно, например правка самого правила): GIT_SKIP_PUBLIC_DOMAINS=1 git commit ...

set -uo pipefail

if [[ -n "${GIT_SKIP_PUBLIC_DOMAINS:-}" ]]; then
  echo "ℹ️  проверка публичных доменов пропущена (GIT_SKIP_PUBLIC_DOMAINS)" >&2
  exit 0
fi

if [[ -n "$(git rev-parse --show-superproject-working-tree 2>/dev/null)" ]]; then
  exit 0
fi

if [[ -z "$(git diff --cached --name-only --diff-filter=ACMR)" ]]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
# Рабочая копия чекера предпочтительна: правки применяются без переустановки хуков.
checker="$repo_root/scripts/check-public-domains.mjs"
if [[ ! -f "$checker" ]]; then
  checker="$(dirname "${BASH_SOURCE[0]}")/_check-public-domains.mjs"
fi
[[ -f "$checker" ]] || exit 0

if command -v node >/dev/null 2>&1; then
  node "$checker" --staged >&2 || exit 1
fi
