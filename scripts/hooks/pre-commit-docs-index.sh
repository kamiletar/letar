#!/usr/bin/env bash
# pre-commit-docs-index.sh — проверяет двухуровневый индекс документации
# (CLAUDE.md ↔ .claude/docs/INDEX.md), но ТОЛЬКО когда коммит его вправду задевает.
#
# Зачем на коммит-пути, а не только в CI: gate `docs-index-integrity` до этого хука
# жил только в `bun scripts/check-all.mjs --ci`. 2026-09-23 в main уехали пять доков
# `.claude/docs/*.md`, добавленных в CLAUDE.md, но без записи в INDEX.md, — CI на main
# стал красным, чинилось отдельной сессией (774ea3e9f). Правило «новый док → две
# записи» — .claude/docs/documentation-guidelines.md § «Индекс документации монорепо».
#
# Узкий запуск (по образцу pre-commit-deps-integrity.sh): только если в staged-наборе
# есть `.claude/docs/*.md` (включая INDEX.md) или корневой CLAUDE.md. Удаление и
# переименование дока — тоже повод: ссылка на него в CLAUDE.md становится битой.
# Обычный коммит по коду не платит ничего. Сама проверка — ~0.2 с.
#
# ⚠️ Проверяется ИНДЕКС, не рабочее дерево (`--staged` у чекера): запись в INDEX.md,
# сделанная на диске, но не застейдженная, иначе дала бы ложный пропуск — ровно тот
# сценарий, от которого хук защищает. Почему и как — шапка
# scripts/check-docs-index-integrity.mjs. Поэтому чекер вызывается напрямую, а не через
# `check-all.mjs --only=docs-index-integrity`: раннер флаги скрипту не прокидывает.
#
# Внутри submodule хук молчит: двухуровневый индекс живёт только в корне letar.
#
# Обход для заведомо ломающего коммита (например док и его записи едут разными
# коммитами одной серии):
#   GIT_SKIP_DOCS_INDEX=1 git commit ...

set -uo pipefail

if [[ -n "${GIT_SKIP_DOCS_INDEX:-}" ]]; then
  echo "ℹ️  проверка индекса документации пропущена (GIT_SKIP_DOCS_INDEX)" >&2
  exit 0
fi

# В submodule нет ни .claude/docs/, ни карты в CLAUDE.md — свой CLAUDE.md submodule к
# индексу монорепо отношения не имеет.
if [[ -n "$(git rev-parse --show-superproject-working-tree 2>/dev/null)" ]]; then
  exit 0
fi

# --no-renames: переименование дока даёт и удалённое старое имя, и новое — оба повод.
# Без --diff-filter: удалённый док тоже должен запускать проверку (битая ссылка).
staged="$(git diff --cached --name-only --no-renames)"

if ! grep -qE '^(CLAUDE\.md|\.claude/docs/[^/]+\.md)$' <<< "$staged"; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
checker="$repo_root/scripts/check-docs-index-integrity.mjs"

if [[ ! -f "$checker" ]]; then
  echo "⚠️  $checker не найден — проверка индекса документации пропущена." >&2
  exit 0
fi

if ! command -v bun > /dev/null 2>&1; then
  echo "⚠️  bun не найден в PATH — проверка индекса документации пропущена." >&2
  echo "    Прогони вручную перед push: bun scripts/check-all.mjs --only=docs-index-integrity" >&2
  exit 0
fi

echo "🔍 в коммите есть .claude/docs/*.md или CLAUDE.md — проверяю индекс документации…" >&2

if ! bun "$checker" --staged; then
  cat >&2 <<'MSG'

❌ Коммит остановлен: индекс документации в коммите разошёлся (см. вывод выше).

Новый док → две записи: строка в CLAUDE.md § «Документация» и аннотация в
.claude/docs/INDEX.md, в разделах с одинаковым названием
(.claude/docs/documentation-guidelines.md § «Индекс документации монорепо»).
Проверяется ИНДЕКС: запись на диске, но не застейдженная, не считается —
добавь её в коммит (`git add` или перечисли файл в `git commit -- <файлы>`).

Осознанный промежуточный коммит:
  GIT_SKIP_DOCS_INDEX=1 git commit ...
MSG
  exit 1
fi

exit 0
