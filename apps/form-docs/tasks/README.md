# Очередь задач form-docs

Документационный сайт `@letar/forms` на Fumadocs: гайды и поля на русском и английском,
переключатели Framework (React, Vue, Angular) и Skin, `llms.txt`. Порт 3020, версия — в `package.json`.

## Старт

`bun scripts/tasks.mjs next form-docs` из корня letar. Затем `show FD-NNN`,
`start FD-NNN --owner form-docs-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Проект в режиме поддержки: переключатели P7 (этапы 0–6), русификация, SEO, `llms.txt` готовы.
- **FD-001** — подключить `theme:check` (можно брать).
- **FD-002** — перенос оставшихся инлайн-блоков кода на `SkinCodeFile` (идея).

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`, deploy-request. Деплой — только
   заявкой `deploy-agent-dev`.
3. Задачи, которые меняют `@letar/forms`, координирует `forms-coordinator-dev`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (80 КБ) и `PLAN_COMPLETED.md` заморожены: обоснование и этапы переключателей P7 (решения,
  антипаттерны, замеры). Целиком не читать: `grep -n '^#' PLAN.md` и `Read` с `offset` по полю `source`.
- `PLAN_TESTING.md` — план тестирования, не заморожен. `CHANGELOG.md` целиком не читать, ищется `grep`.
