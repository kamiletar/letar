# Очередь задач Aira Web

Лендинг мессенджера Aira (постквантовое шифрование, нативные клиенты): релизы, возможности, документация. Next.js, Chakra UI v3. Задуманное браузерное демо переедет в отдельное приложение `aira-try`.

## Старт

`bun scripts/tasks.mjs next aira-web` из корня letar. Затем `show AW-NNN`,
`start AW-NNN --owner aira-web-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Можно брать: **AW-001** (страницы релизов), **AW-002** (страницы документации), **AW-003** (transition).
- Браузерное демо (AW-004, AW-005) — идеи, ждут решения по продуктовым развилкам AW-006.
- Публикация `@letar/ui` в npm (AW-007) — только по слову владельца.
- Ожидания: `bun scripts/tasks.mjs waiting aira-web --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Публичный лендинг: приватные детали (реквизиты, юридические заключения по релеям) в файлы не переносить, ссылаться на `.claude/private/`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (28 КБ), `PLAN_COMPLETED.md` (13 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
