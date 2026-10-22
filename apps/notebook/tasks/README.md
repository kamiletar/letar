# Очередь задач Блокнот

Личный блокнот владельца: заметки Markdown с версиями и откатом, офлайн-режим (PWA, IndexedDB, ветки при расхождениях), публикация в рубрики после одобрения. Вход через Ключницу, пускается только владелец. Порт 3127.

## Старт

`bun scripts/tasks.mjs next notebook` из корня letar. Затем `show NB-NNN`,
`start NB-NNN --owner notebook-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **NB-001** — вход на staging не возвращает в блокнот (блокирует все ручные проверки).
- Дальше по цепочке: NB-002 (редактор и история), NB-003 (офлайн на телефоне), NB-004 (прод).
- Ждёт kami: NB-005 (два решения по публикации).
- Ожидания: `bun scripts/tasks.mjs waiting notebook --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Заметки владельца личные: содержимое заметок и тестовые данные в логи, отчёты и задачи не переносить.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (6 КБ), `PLAN_COMPLETED.md` (5 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- Страница плана со схемами: https://claude.ai/artifact/LUsWWH9iycSE4MrkBVrdCZ
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
