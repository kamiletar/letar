# Очередь задач Mandala

Интернет-магазин и галерея мандал: каталог, корзина и оформление заказа, просмотрщик мандал с дыханием и аудио-синхронизацией, админка контента, мультиязычность. Next.js, Chakra UI v3, ZenStack, Better Auth. Миграция завершена (17 из 17 фаз).

## Старт

`bun scripts/tasks.mjs next mandala` из корня letar. Затем `show MN-NNN`,
`start MN-NNN --owner mandala-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **MN-001** — push и деплой 0.40.39 (ждёт слова владельца).
- Можно брать: MN-003 (verification-stream), MN-004 (корзина), MN-005.
- Ждёт kami: MN-002 (судьба аудио-синхронизации).
- Ожидания: `bun scripts/tasks.mjs waiting mandala --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (14 КБ), `PLAN_COMPLETED.md` (179 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
