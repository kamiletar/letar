# Очередь задач Animatrona Tracker

Веб-трекер аниме для экосистемы Animatrona: каталог и франшизы, страницы серий с плеером на IPFS-раздачах, прогресс просмотра, библиотека по статусам, комментарии, пинеры. Next.js, Better Auth через Ключницу, ZenStack.

## Старт

`bun scripts/tasks.mjs next animatrona-tracker` из корня letar. Затем `show TR-NNN`,
`start TR-NNN --owner animatrona-tracker-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **TR-001** — OIDC-переменные добавлены на сервер вручную, но не в `.env.docker.enc`: следующий деплой их перезапишет (можно брать, срочно).
- **TR-002** — комментарии с тайм-кодами (фаза N.3), спроектированы, можно брать.
- Ждёт kami: TR-005 (статус миграции Pinner3). Остальное — идеи из бэклога.
- Ожидания: `bun scripts/tasks.mjs waiting animatrona-tracker --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Согласуй изменения общего с Animatrona (манифесты, ключи API, deep link) с `animatrona-coordinator-dev`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (29 КБ), `PLAN_COMPLETED.md` (42 КБ), `PLAN_COMPLETED_2026_09_08.md` (13 КБ), `PLAN_COMPLETED_2026_09_08_FEATURES.md` (29 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
