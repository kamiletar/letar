# Очередь задач Kami Key The Landing

Лендинг приложения Kami Key The (Next.js): описание, загрузка, SEO. Личный некоммерческий проект.

## Старт

`bun scripts/tasks.mjs next kami-key-the-landing` из корня letar. Затем `show KL-NNN`,
`start KL-NNN --owner kami-key-the-landing-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Ждут kami: **KL-001** (статус проекта в studio), **KL-002** (ручные шаги продвижения).
- Можно брать: KL-004 (`pressScale`). KL-003 — идея.
- Ожидания: `bun scripts/tasks.mjs waiting kami-key-the-landing --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (9 КБ), `PLAN_COMPLETED.md` (15 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
