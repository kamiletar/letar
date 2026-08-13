#!/usr/bin/env bash
# pre-commit-dprint-check.sh — блокирует коммит, если staged-файлы не отформатированы dprint'ом.
#
# Не полагается на то, что PreToolUse-хук агента (.claude/hooks/validate-bash.js) успел
# перехватить неверную команду форматирования ДО её выполнения — это защита второго рубежа,
# которая срабатывает вне зависимости от того, как именно файлы оказались неотформатированы
# (случайный `nx format` вместо `nx run-many -t format`, ручная правка, чужой редактор и т.п.).
# git гарантированно запускает pre-commit при каждом коммите независимо от того, кто и как его
# инициировал — в отличие от хука инструмента, чьё срабатывание зависит от среды исполнения
# агента.
#
# cwd при запуске git-хука — корень репозитория, в котором коммитят (letar или submodule).
# dprint ищет dprint.json, поднимаясь по дереву каталогов от cwd — тот же механизм, которым
# пользуется `nx run-many -t format` (`cwd` таргета = корень проекта). Поэтому просто передаём
# staged-файлы в `dprint check` без ручного резолва конфига.

set -uo pipefail

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.md' 2>/dev/null)

if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

resolve_dprint() {
  if command -v dprint &>/dev/null; then
    echo "dprint"
    return 0
  fi
  local dir
  dir="$(pwd)"
  while [[ "$dir" != "/" && "$dir" != "" ]]; do
    # На Windows bun кладёт в node_modules/.bin бинарник с расширением .exe,
    # а не голый "dprint" — без этой ветки резолв на Windows не срабатывал
    # никогда, если dprint не оказался в PATH (см. .claude/docs/dprint-windows-bin-shim-missing.md).
    if [[ -x "$dir/node_modules/.bin/dprint.exe" ]]; then
      echo "$dir/node_modules/.bin/dprint.exe"
      return 0
    fi
    if [[ -x "$dir/node_modules/.bin/dprint" ]]; then
      echo "$dir/node_modules/.bin/dprint"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

DPRINT_BIN="$(resolve_dprint)" || {
  echo "⚠️  dprint не найден (ни в PATH, ни в node_modules/.bin выше по дереву) — проверка формата пропущена" >&2
  exit 0
}

# Файлы, которые ещё не существуют в рабочем дереве (staged rename/delete edge-кейсы), пропускаем.
EXISTING_FILES=()
while IFS= read -r f; do
  [[ -f "$f" ]] && EXISTING_FILES+=("$f")
done <<<"$STAGED_FILES"

if [[ ${#EXISTING_FILES[@]} -eq 0 ]]; then
  exit 0
fi

if ! "$DPRINT_BIN" check "${EXISTING_FILES[@]}"; then
  echo ""
  echo "⛔ BLOCKED: staged-файлы не соответствуют dprint.json — похоже, кто-то (или что-то)"
  echo "   отформатировал их не тем форматтером (частый случай: голый \`nx format\`, который"
  echo "   запускает Prettier вместо dprint — см. CLAUDE.md)."
  echo ""
  echo "   Почини командой:"
  echo "     nx run-many -t format --projects=<твой проект>"
  echo "   или (внутри submodule без своего таргета):"
  echo "     dprint fmt <файлы>"
  echo ""
  exit 1
fi

exit 0
