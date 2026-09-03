#!/usr/bin/env bash
# pre-commit-section-number-check.sh — блокирует коммит, вводящий дубль номера §NN в
# журналах PLAN.md/PLAN-INFRA*.md/PLAN-JOURNAL-*.md.
#
# Зачем: несколько параллельных сессий читают журнал, вычисляют «следующий номер §NN» и
# кэшируют его в голове до момента вставки — если вставка откладывается (текст секции ещё
# пишется, идут прод-сборки), другая сессия успевает занять тот же номер первой. Только за
# сессию декомпозиции 2026-09-03 найдено и исправлено три таких коллизии (разбор — карточка
# .claude/docs/plan-decomposition-pattern.md и предупреждение в самом PLAN-INFRA.md).
# Письменное предупреждение в доке не масштабируется на десятки параллельных сессий — нужен
# барьер по факту, тот же принцип, что у pre-commit-scope-guard.sh.
#
# Логика (полностью — scripts/check-section-numbers.mjs): сравнивает состояние ДО (HEAD) и
# ПОСЛЕ (staged-версия для застейдженных файлов, HEAD для остальных файлов семейства) —
# блокирует только НОВОЕ увеличение числа вхождений §NN. Уже существующие дубли (§66,
# задокументирован и намеренно не тронут) повторно не блокируют.
#
# Обход для сознательных случаев (ложное срабатывание, осознанный дубль):
#   GIT_ALLOW_SECTION_DUP=1 git commit ...
#
# Установка: scripts/hooks/install.sh

set -uo pipefail

if [[ -n "${GIT_ALLOW_SECTION_DUP:-}" ]]; then
  echo "ℹ️  проверка дублей §NN пропущена (GIT_ALLOW_SECTION_DUP)" >&2
  exit 0
fi

if ! command -v bun > /dev/null 2>&1; then
  echo "⚠️  bun не найден в PATH — проверка дублей §NN пропущена." >&2
  exit 0
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Рабочая копия скрипта приоритетнее (правки в scripts/ применяются без переустановки
# хуков); копия рядом с хуком — фолбэк для чекаутов без каталога scripts/ (submodule, где
# этот хук всё равно не нужен — семейство PLAN*.md живёт только в корне letar, но копия
# кладётся install.sh'ом единообразно со всеми остальными хелперами).
CHECKER=""
for candidate in "$TOPLEVEL/scripts/check-section-numbers.mjs" "$DIR/_check-section-numbers.mjs"; do
  if [[ -f "$candidate" ]]; then
    CHECKER="$candidate"
    break
  fi
done

if [[ -z "$CHECKER" ]]; then
  # Не найден — типично внутри submodule, где семейства PLAN*.md нет. Тихий выход, не шум.
  exit 0
fi

bun "$CHECKER"
exit $?
