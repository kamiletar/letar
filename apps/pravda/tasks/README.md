# Очередь задач Pravda

Сайт-справочник документов и статей: печать и экспорт в PDF, закладки, SEO, перекрёстные ссылки. Next.js, Chakra UI v3.

## Старт

`bun scripts/tasks.mjs next pravda` из корня letar. Затем `show PV-NNN`,
`start PV-NNN --owner pravda-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Проект в режиме поддержки.
- Ждёт kami: **PV-001** (исключение для масштаба кнопки).
- PV-002 — идеи (редакции, история, комментарии).
- Ожидания: `bun scripts/tasks.mjs waiting pravda --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (22 КБ), `PLAN_COMPLETED.md` (38 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
