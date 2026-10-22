# Очередь задач Umami

Self-hosted веб-аналитика Umami на s1: сайты приложений, статистика. Свой код отсутствует, только конфигурация развёртывания.

## Старт

`bun scripts/tasks.mjs next umami` из корня letar. Затем `show UM-NNN`,
`start UM-NNN --owner umami-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Идеи: **UM-001** (подключать новые приложения), **UM-002** (обновление версии).
- Ожидания: `bun scripts/tasks.mjs waiting umami --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Аналитика подключается только после согласия на cookie (152-ФЗ); `NEXT_PUBLIC_UMAMI_WEBSITE_ID` лежит в `.env.docker` до сборки.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (1 КБ), `PLAN_COMPLETED.md` (0 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
