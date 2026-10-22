# Очередь задач Form Develop App

Песочница полей `@letar/forms` для разработки и визуальной проверки (демо-страницы по полям).

## Старт

`bun scripts/tasks.mjs next form-develop-app` из корня letar. Затем `show FV-NNN`,
`start FV-NNN --owner form-develop-app-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Проект в режиме поддержки, очередь пока пуста.
- Ожидания: `bun scripts/tasks.mjs waiting form-develop-app --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Изменения в `libs/forms*` согласуй с `forms-coordinator-dev`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (24 КБ), `PLAN_COMPLETED.md` (73 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
