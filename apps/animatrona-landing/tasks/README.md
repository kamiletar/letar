# Очередь задач Animatrona Landing

Лендинг приложения Animatrona (Next.js, Chakra UI v3): возможности, скриншоты, загрузка.

## Старт

`bun scripts/tasks.mjs next animatrona-landing` из корня letar. Затем `show AL-NNN`,
`start AL-NNN --owner animatrona-landing-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- Можно брать: **AL-002** (SEO и Open Graph), AL-003, AL-004.
- Ждёт kami: **AL-001** (скриншоты и видео-демо).
- AL-005 — идеи (аналитика, документация, блог, ru/en).
- Ожидания: `bun scripts/tasks.mjs waiting animatrona-landing --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (2 КБ), `PLAN_COMPLETED.md` (17 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
