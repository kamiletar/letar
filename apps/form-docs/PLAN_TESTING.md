# План тестирования — form-docs

## Статистика

| Тип  | Количество | Статус          |
| ---- | ---------- | --------------- |
| Unit | 0          | Не требуется    |
| E2E  | 2          | ✅ Базовый сьют |

## Запуск тестов

```bash
nx build form-docs  # Проверка сборки — включает typecheck

# E2E (apps/form-docs-e2e) — nx e2e зависает в dev-режиме, см. .claude/docs/e2e-testing.md
nx run form-docs:dev &
cd apps/form-docs-e2e && BASE_URL=http://localhost:3020 bunx playwright test --project=chromium
```

## Известные проблемы

- 5 demo-страниц удалены из-за ChakraProvider SSR issue (prerender)
- Требуется обёртка ChakraProvider в demo layout для SSR совместимости

---

**Последнее обновление:** 2026-07-18 — базовый e2e-сьют `apps/form-docs-e2e` (сгенерирован
`nx g @letar/generators:e2e-suite form-docs --port=3020`), 2 теста (главная грузится, нет ошибок в
консоли). Заодно добавлен `apps/form-docs/.env` с `PORT=3020` — отсутствовал, `next dev` слушал
3000 вместо документированного порта. Часть тиража N (`PLAN.md` §18.7 корневого репо, теперь 6/6
закрыт).
