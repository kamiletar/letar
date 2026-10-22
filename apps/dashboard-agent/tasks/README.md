# Очередь задач dashboard-agent

Лёгкий агент на серверах s1 и s2 (Fastify): метрики системы и Docker для dashboard (`/metrics` в
формате Prometheus), деплой приложений (`/api/deploy/app`), долгий опрос e2e (`/api/e2e/wait`),
плановые чистки (Docker, `.next/cache`, `.nx/cache`, реестр образов, staging-контейнеры),
канареечные проверки входа и доставки почты. Версия — в `package.json`.

## Старт

`bun scripts/tasks.mjs next dashboard-agent` из корня letar. Затем `show DG-NNN`,
`start DG-NNN --owner dashboard-agent-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **DG-001** — выкатить 0.20.0 (`/api/e2e/wait`) на s1 и s2 и проверить `e2e_wait` вживую.
- Решения владельца: DG-002 (`minLines` для `e2e_wait`), DG-003 (канарейка почты для других приложений).
- Остальное — идеи без срочности. Ожидания: `bun scripts/tasks.mjs waiting dashboard-agent --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`; агент сам себя не деплоит.
3. Агент работает на боевых серверах и держит токены: секреты не придумывать и не печатать,
   новые эндпоинты — за `authMiddleware`.
4. Один пункт — один коммит: версия, `CHANGELOG.md`, `format`, `lint`, `typecheck:tsgo`, `nx test`.

## Справка

- `PLAN.md` (33 КБ) и `PLAN_COMPLETED.md` (219 КБ) заморожены: таблица сделанного по версиям,
  бэклог интеграций, история разборов. Целиком не читать: `grep -n '^#' PLAN.md` и `Read` с
  `offset` по полю `source`.
- `PLAN_TESTING.md` — план тестирования, не заморожен. `CHANGELOG.md` ищется `grep`.
