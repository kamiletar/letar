#!/usr/bin/env bash
# pre-commit-scope-guard.sh — блокирует коммит, затянувший несвязанные scope одновременно
#
# Защита от голого `git commit`/`git add -A` в монорепо с параллельными агентами
# (см. .claude/rules/git.md «Работа в монорепозитории с другими агентами»). Голый commit
# без pathspec коммитит ВСЁ, что уже застейджено в общем индексе — в том числе чужую
# незакоммиченную работу параллельного агента. Хук ловит это по факту: если застейдженные
# файлы относятся к более чем одному scope (apps/<x>, libs/<x>, infra/<x>, либо корневой
# каталог/файл) — коммит блокируется.
#
# Легитимный multi-scope коммит (например «bump all submodules», repo-wide format) —
# явное подтверждение через переменную окружения:
#   GIT_ALLOW_MULTI_SCOPE_COMMIT=1 git commit ...
#
# Установка: scripts/hooks/install.sh (ставит связку с pre-commit-sops.sh)

set -euo pipefail

if [[ "${GIT_ALLOW_MULTI_SCOPE_COMMIT:-0}" == "1" ]]; then
  exit 0
fi

mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMRTUXB)

[[ ${#FILES[@]} -eq 0 ]] && exit 0

declare -A SCOPES
for f in "${FILES[@]}"; do
  case "$f" in
    apps/*/*|libs/*/*|infra/*/*)
      scope="$(echo "$f" | cut -d/ -f1-2)"
      ;;
    *)
      scope="$(echo "$f" | cut -d/ -f1)"
      ;;
  esac
  SCOPES["$scope"]=1
done

if [[ ${#SCOPES[@]} -gt 1 ]]; then
  echo "⛔ pre-commit заблокирован: застейджены файлы из ${#SCOPES[@]} разных scope:" >&2
  for s in "${!SCOPES[@]}"; do
    echo "  - $s" >&2
  done
  echo "" >&2
  echo "Голый 'git commit' без pathspec подхватывает всё застейдженное в индексе —" >&2
  echo "включая чужую незакоммиченную работу параллельного агента (.claude/rules/git.md)." >&2
  echo "" >&2
  echo "Исправь:" >&2
  echo "  1) git reset -- <файлы не по теме>   — убрать лишнее из индекса" >&2
  echo "  2) git commit -- <только свои пути>  — закоммитить явно" >&2
  echo "" >&2
  echo "Если это ОДНА осознанная multi-scope правка (bump all submodules, repo-wide format):" >&2
  echo "  GIT_ALLOW_MULTI_SCOPE_COMMIT=1 git commit ..." >&2
  exit 1
fi

exit 0
