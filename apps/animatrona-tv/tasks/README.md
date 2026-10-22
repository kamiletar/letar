# Очередь задач Animatrona TV

Клиент Animatrona для Android TV (React Native 0.87): библиотека, плеер, управление пультом.

## Старт

`bun scripts/tasks.mjs next animatrona-tv` из корня letar. Затем `show TV-NNN`,
`start TV-NNN --owner animatrona-tv-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Ждёт kami: **TV-001** — тест на Android TV (эмулятор или устройство).
- Ожидания: `bun scripts/tasks.mjs waiting animatrona-tv --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (15 КБ), `PLAN_COMPLETED.md` (25 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
