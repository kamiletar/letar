# Очередь задач Form Example

Пример приложения на `@letar/forms`: эталонные формы и паттерны.

## Старт

`bun scripts/tasks.mjs next form-example` из корня letar. Затем `show FX-NNN`,
`start FX-NNN --owner form-example-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Проект в режиме поддержки, очередь пока пуста.
- Ожидания: `bun scripts/tasks.mjs waiting form-example --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Изменения в `libs/forms*` согласуй с `forms-coordinator-dev`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (7 КБ), `PLAN_COMPLETED.md` (41 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
