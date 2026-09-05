#!/usr/bin/env bash
# pre-commit-schema-migration-check.sh — блокирует коммит, где *.zmodel-файл (корневой
# schema.zmodel приложения или файл-фрагмент multi-file схемы, см. .claude/docs/
# zenstack-multifile-schema-circular-imports.md) меняет физическую структуру БД
# (новые/изменённые поля, @@unique/@@index/@@id/@@map/...), а рядом нет новой папки миграции.
#
# Зачем на коммит-пути: локальная разработка обычно идёт через `nx db:push`, который
# молча приводит DEV-базу автора коммита в соответствие со схемой — рассинхрон невидим
# на его машине, пока код не доедет до прода. Деплой это тоже не ловит: шаг миграций в
# deploy-affected.sh опирается на `prisma migrate status`, а тот сверяет только файлы
# миграций против таблицы _prisma_migrations, не схему против фактической БД —
# "No pending migrations" даже когда коду уже нужна отсутствующая колонка. Прецеденты —
# .claude/docs/database.md § «Изменил схему — файл миграции обязан ехать в ТОМ ЖЕ
# коммите»:
#   - 2026-07-30: страница тайм-трекинга одного из приложений лежала ~7.5 часов;
#   - 2026-08-28 (svoichuzhie, коммит 505cf2b): 500 на любой запрос к Order/TicketOrder
#     (idempotencyKey добавлен в schema.zmodel без миграции).
#
# Эвристика — не любой diff schema.zmodel, а только строки внутри model/enum-блоков,
# не являющиеся @@allow(/@@deny(/комментарием, и не парные (то же имя+тип поля с обеих
# сторон диффа — считается атрибутивной правкой). Полная логика и её ограничения —
# scripts/check-schema-migration.mjs.
#
# Обход для сознательных случаев (ложное срабатывание эвристики, миграция едет отдельным
# коммитом руками):
#   GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1 git commit ...
#
# Установка: scripts/hooks/install.sh

set -uo pipefail

if [[ -n "${GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION:-}" ]]; then
  echo "ℹ️  проверка schema.zmodel↔миграция пропущена (GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION)" >&2
  exit 0
fi

staged="$(git diff --cached --name-only --diff-filter=ACMR)"
if ! grep -qE '\.zmodel$' <<< "$staged"; then
  exit 0
fi

if ! command -v bun > /dev/null 2>&1; then
  echo "⚠️  bun не найден в PATH — проверка schema.zmodel↔миграция пропущена." >&2
  echo "    Проверь вручную: .claude/docs/database.md § «Изменил схему...»" >&2
  exit 0
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Рабочая копия скрипта приоритетнее (правки в scripts/ применяются без переустановки
# хуков); копия рядом с хуком — фолбэк для чекаутов без каталога scripts/ (submodule).
CHECKER=""
for candidate in "$TOPLEVEL/scripts/check-schema-migration.mjs" "$DIR/_check-schema-migration.mjs"; do
  if [[ -f "$candidate" ]]; then
    CHECKER="$candidate"
    break
  fi
done

if [[ -z "$CHECKER" ]]; then
  echo "⚠️  pre-commit: check-schema-migration.mjs не найден — проверка пропущена" >&2
  echo "    (переустановить: bash scripts/hooks/install.sh)" >&2
  exit 0
fi

bun "$CHECKER"
status=$?

if [[ $status -ne 0 ]]; then
  echo "Если это ложное срабатывание эвристики или миграция едет отдельно осознанно:" >&2
  echo "  GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1 git commit ..." >&2
fi

exit $status
