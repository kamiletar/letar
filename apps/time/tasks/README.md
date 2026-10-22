# Очередь задач Time

Страница «Время» на нескольких языках: текущее время словами, обратный отсчёт, празднование юбилеев, подписка на уведомления по почте. Next.js, next-intl (сейчас ru и en), Better Auth через Ключницу.

## Старт

`bun scripts/tasks.mjs next time` из корня letar. Затем `show TM-NNN`,
`start TM-NNN --owner time-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **TM-001** — проверить, что передеплой `time` после фиксов smoke-test прошёл (можно брать).
- Можно брать: TM-003 (List-Unsubscribe), TM-005 (theme:check). Ждёт kami: TM-002 (проект GlitchTip).
- Мультиязычность на 40 языков — идея TM-004, пока не начата.
- Ожидания: `bun scripts/tasks.mjs waiting time --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (27 КБ), `PLAN_COMPLETED.md` (37 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
