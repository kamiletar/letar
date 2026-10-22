# Очередь задач Dashboard

Панель владельца монорепо: мониторинг серверов и приложений, алерты, cron и задачи `@letar/jobs`, аудит-лог, интеграции. Next.js, ZenStack. Собирает данные через `dashboard-agent`.

## Старт

`bun scripts/tasks.mjs next dashboard` из корня letar. Затем `show DB-NNN`,
`start DB-NNN --owner dashboard-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Проект в режиме поддержки, очередь пока пуста.
- DB-001 — идея (тесты из плана тестирования).
- Ожидания: `bun scripts/tasks.mjs waiting dashboard --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (8 КБ), `PLAN_COMPLETED.md` (122 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
