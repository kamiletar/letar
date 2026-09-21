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
#
# ⚠️ Проверяется содержимое ИНДЕКСА, а не рабочего дерева. `git diff --cached --name-only` отдаёт
# только имена, а `dprint check <путь>` читает файл с диска. Когда индекс в состоянии `MM` (часть
# хунков застейджена, часть лежит в рабочем дереве), на диске целый файл, а коммитится рваная
# индексная версия — проверка проходила молча по не тому содержимому (коммит b8a213578, разбор в
# .claude/docs/git-multi-agent-incidents.md § «Дополнение 2026-09-22»). Поэтому файлы делятся:
#   - диск совпадает с индексом (обычный случай) — один пакетный `dprint check`, как раньше;
#   - диск расходится с индексом — индексная версия читается `git cat-file blob :<путь>` и идёт
#     в `dprint fmt --stdin`; блок, если вывод отличается от входа или dprint не смог разобрать.
# Переменная GIT_INDEX_FILE (временный индекс при `git commit -- <путь>`) наследуется дочерними
# git, поэтому оба режима видят ровно то, что уйдёт в коммит.

set -uo pipefail

# -z вместо голого --name-only: при core.quotepath=true (дефолт) git выводит пути с не-ASCII
# байтами в кавычках с восьмеричными escape-последовательностями — `[[ -f "$f" ]]` ниже такому
# "пути" не соответствует ни одному реальному файлу, и файл молча выпадает из проверки формата
# (см. тот же баг в pre-commit-scope-guard.sh, воспроизведён 2026-09-16 в apps/domwellbes).
STAGED_FILES=()
while IFS= read -r -d '' f; do
  STAGED_FILES+=("$f")
done < <(git diff --cached --name-only -z --diff-filter=ACM -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.md' 2>/dev/null)

if [[ ${#STAGED_FILES[@]} -eq 0 ]]; then
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

# Файлы, у которых рабочее дерево отличается от индекса (`MM`, либо файл удалён с диска после
# стейджа). У остальных диск == индекс, и пакетная проверка с диска проверяет то же, что уйдёт в
# коммит. `git diff` без --cached сравнивает именно рабочее дерево с индексом. Пути — только
# staged-файлы и буквально (`--literal-pathspecs`): иначе `[slug]` в путях Next.js разворачивался бы
# как glob, а сравнение всего дерева по маске расширений перехешировало бы каждый файл.
declare -A DIVERGED=()
while IFS= read -r -d '' f; do
  DIVERGED["$f"]=1
done < <(git --literal-pathspecs diff --name-only -z -- "${STAGED_FILES[@]}" 2>/dev/null)

CLEAN_FILES=()
DIVERGED_FILES=()
for f in "${STAGED_FILES[@]}"; do
  if [[ -n "${DIVERGED[$f]:-}" ]]; then
    DIVERGED_FILES+=("$f")
  elif [[ -f "$f" ]]; then
    # Не существует в рабочем дереве и при этом не расходится с индексом — edge-кейс
    # staged rename/delete: пропускаем, как и раньше.
    CLEAN_FILES+=("$f")
  fi
done

FAILED=0

if [[ ${#CLEAN_FILES[@]} -gt 0 ]]; then
  "$DPRINT_BIN" check "${CLEAN_FILES[@]}" || FAILED=1
fi

if [[ ${#DIVERGED_FILES[@]} -gt 0 ]]; then
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  for f in "${DIVERGED_FILES[@]}"; do
    # `dprint fmt --stdin` применяет правила includes/excludes конфига только к абсолютному пути
    # существующего файла (иначе «Error canonicalizing path»). Файла нет на диске — индексную
    # версию проверить нечем, пропускаем с предупреждением, а не молча.
    if [[ ! -f "$f" ]]; then
      echo "⚠️  $f: нет на диске — индексная версия не проверена (dprint --stdin требует существующий путь)" >&2
      continue
    fi
    if ! git cat-file blob ":$f" >"$WORK/in" 2>/dev/null; then
      echo "⚠️  $f: не удалось прочитать индексную версию — пропущен" >&2
      continue
    fi
    if ! "$DPRINT_BIN" fmt --stdin "$PWD/$f" <"$WORK/in" >"$WORK/out" 2>"$WORK/err"; then
      echo "⛔ $f (индексная версия, отличается от рабочего дерева): dprint не смог её разобрать:" >&2
      cat "$WORK/err" >&2
      FAILED=1
    elif ! cmp -s "$WORK/in" "$WORK/out"; then
      echo "⛔ $f (индексная версия, отличается от рабочего дерева) не соответствует dprint.json:" >&2
      diff -u --label "индекс:$f" --label "dprint" "$WORK/in" "$WORK/out" | head -n 30 >&2
      FAILED=1
    fi
  done
fi

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "⛔ BLOCKED: staged-файлы не соответствуют dprint.json — похоже, кто-то (или что-то)"
  echo "   отформатировал их не тем форматтером (частый случай: голый \`nx format\`, который"
  echo "   запускает Prettier вместо dprint — см. CLAUDE.md)."
  echo ""
  echo "   Почини командой:"
  echo "     nx run-many -t format --projects=<твой проект>"
  echo "   или (внутри submodule без своего таргета):"
  echo "     dprint fmt <файлы>"
  echo "   Если файл помечен «индексная версия» — после форматирования обнови индекс"
  echo "   (git add <файл>): правка в рабочем дереве сама в коммит не попадёт."
  echo ""
  exit 1
fi

exit 0
