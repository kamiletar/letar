#!/usr/bin/env bash
# pre-commit-tasks-check.sh — проверяет очередь задач «одна задача — один файл»
# (scripts/tasks.mjs check --staged) и не даёт расти замороженным планам.
#
# Запускается ТОЛЬКО если в коммите есть tasks/**, PLAN*/ROADMAP*.md или docs/plans/**.
# Обычный коммит по коду не платит ничего. Проверяется ИНДЕКС, не рабочее дерево.
# Формат и поток работы — .claude/docs/tasks-per-file.md.
#
# Работает и внутри submodule: сам чекер ищем в superproject, если он есть, иначе в корне
# текущего репозитория. Нет bun или скрипта — предупреждение и код 0.
#
# Обходы:
#   GIT_SKIP_TASKS_CHECK=1 git commit ...              # пропустить проверку целиком
#   GIT_ALLOW_FROZEN_PLAN_GROWTH=1 git commit ...      # рост замороженного плана — предупреждение

set -uo pipefail

if [[ -n "${GIT_SKIP_TASKS_CHECK:-}" ]]; then
  echo "ℹ️  проверка очереди задач пропущена (GIT_SKIP_TASKS_CHECK)" >&2
  exit 0
fi

staged="$(git diff --cached --name-only --no-renames)"

if ! grep -qE '(^|/)tasks/|(^|/)(PLAN|ROADMAP)[^/]*\.md$|^docs/plans/' <<< "$staged"; then
  exit 0
fi

superproject="$(git rev-parse --show-superproject-working-tree 2>/dev/null)"
if [[ -n "$superproject" ]]; then
  checker="$superproject/scripts/tasks.mjs"
else
  checker="$(git rev-parse --show-toplevel)/scripts/tasks.mjs"
fi

if [[ ! -f "$checker" ]]; then
  echo "⚠️  $checker не найден — проверка очереди задач пропущена." >&2
  exit 0
fi

if ! command -v bun > /dev/null 2>&1; then
  echo "⚠️  bun не найден в PATH — проверка очереди задач пропущена." >&2
  echo "    Прогони вручную: bun scripts/tasks.mjs check" >&2
  exit 0
fi

echo "🔍 в коммите есть задачи или планы — проверяю очередь задач…" >&2

if ! bun "$checker" check --staged; then
  cat >&2 <<'MSG'

❌ Коммит остановлен: очередь задач не прошла проверку (см. вывод выше).

Замороженный план не растёт: задачу заведи через `bun scripts/tasks.mjs new`,
журнал и итог пиши в файл задачи (`note`, `done --summary`).

Осознанный случай:
  GIT_ALLOW_FROZEN_PLAN_GROWTH=1 git commit ...   # рост плана — предупреждение
  GIT_SKIP_TASKS_CHECK=1 git commit ...           # пропустить проверку
MSG
  exit 1
fi

exit 0
