# Очередь задач form-mcp

MCP-сервер `@letar/form-mcp`: подсказки по полям и паттернам `@letar/forms` для агентов (`list_fields`, `get_field_props`, `generate_form`). Пакет публикуется в npm.

## Старт

`bun scripts/tasks.mjs next form-mcp` из корня letar. Затем `show FMC-NNN`,
`start FMC-NNN --owner form-mcp-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Проект в режиме поддержки, очередь пока пуста.
- Ожидания: `bun scripts/tasks.mjs waiting form-mcp --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Публикация в npm и изменения публичного API — только по слову владельца и через `forms-coordinator-dev`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (6 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
