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
# Исключение — scope `docs-root`: все корневые *.md одного репозитория (плюс корневой
# package.json, когда хук стоит внутри submodule) считаются одной правкой. Подробности —
# в комментариях у самого case ниже.
#
# Легитимный multi-scope коммит (например «bump all submodules», repo-wide format) —
# явное подтверждение через переменную окружения:
#   GIT_ALLOW_MULTI_SCOPE_COMMIT=1 git commit ...
#
# Флаг не отключает саму проверку scope — он лишь превращает блокировку в предупреждение:
# при multi-scope хук печатает список затронутых scope с числом файлов в каждом (не блокируя
# коммит), чтобы тот, кто снял барьер флагом, увидел явную сводку вместо тихого прохода.
# Прецедент, из-за которого это добавлено — .claude/docs/git-multi-agent-incidents.md
# «Дополнение 2026-08-19», «Побочное наблюдение 2»: флаг стоял «на всякий случай» у легитимного
# multi-scope коммита (bump submodule) и заодно забрал два чужих файла, случайно оказавшихся
# застейдженными в общем индексе после гонки за HEAD в параллельной сессии.
#
# Установка: scripts/hooks/install.sh (ставит связку с pre-commit-sops.sh)

set -euo pipefail

mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMRTUXB)

[[ ${#FILES[@]} -eq 0 ]] && exit 0

# Корневой package.json значит разное в зависимости от того, где стоит хук:
#   - внутри submodule это манифест ОДНОГО приложения, и bump его версии едет вместе с
#     CHANGELOG.md в каждом коммите конца сессии (.claude/rules/app-workflow.md
#     «После завершения задачи», шаги 3 и 5) — значит это часть той же правки доков;
#   - в корне letar это общий манифест монорепо, который параллельные агенты правят через
#     bun install — его объединять с доками нельзя, иначе чужая зависимость молча уедет
#     в чужой коммит.
# Признак submodule — непустой superproject (у обычного клона letar он пуст).
IN_SUBMODULE=0
if [[ -n "$(git rev-parse --show-superproject-working-tree 2>/dev/null || true)" ]]; then
  IN_SUBMODULE=1
fi

declare -A SCOPES
for f in "${FILES[@]}"; do
  case "$f" in
    apps/*/*|libs/*/*|infra/*/*)
      # Файл внутри приложения/библиотеки монорепо — scope до второго сегмента.
      # Проверяется ПЕРВЫМ, поэтому apps/appA/PLAN.md и apps/appB/PLAN.md остаются
      # разными scope и по-прежнему блокируются: спецкейс docs-root ниже до них не доходит.
      scope="$(echo "$f" | cut -d/ -f1-2)"
      ;;
    */*)
      # Прочий вложенный путь (scripts/**, .claude/**, src/** внутри submodule) — scope
      # по первому сегменту.
      scope="$(echo "$f" | cut -d/ -f1)"
      ;;
    *.md)
      # Корневые markdown-файлы приложения/репозитория обновляются пачкой в конце сессии
      # (см. CLAUDE.md «После завершения задачи») — это одна логическая правка, а не набор
      # независимых scope по имени файла. Спецкейс намеренно задан ШАБЛОНОМ, а не списком
      # имён: тематические планы верхнего уровня заводят по ходу работы (PLAN_SHOP.md,
      # ROADMAP.md, PLAN_STICKY_CTA.md, CHANGELOG_<дата>.md), и фиксированный список
      # отставал от практики — коммит «PLAN_SHOP.md + CHANGELOG.md» ловил ложное
      # срабатывание (2026-08-17).
      scope="docs-root"
      ;;
    package.json)
      if [[ $IN_SUBMODULE -eq 1 ]]; then
        scope="docs-root"
      else
        scope="$f"
      fi
      ;;
    *)
      # Прочий файл в корне репозитория — сам себе scope.
      scope="$f"
      ;;
  esac
  SCOPES["$scope"]=$(( ${SCOPES["$scope"]:-0} + 1 ))
done

if [[ "${GIT_ALLOW_MULTI_SCOPE_COMMIT:-0}" == "1" ]]; then
  if [[ ${#SCOPES[@]} -gt 1 ]]; then
    echo "⚠️  ФЛАГ GIT_ALLOW_MULTI_SCOPE_COMMIT снят — коммитятся файлы из ${#SCOPES[@]} scope, это осознанно?" >&2
    for s in "${!SCOPES[@]}"; do
      echo "  - $s (${SCOPES[$s]} файл(ов))" >&2
    done
    echo "" >&2
  fi
  exit 0
fi

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
