# Блокнот Ками — план тестирования

## Статистика

| Тип        | Написано | Выполнено |
| ---------- | -------- | --------- |
| Unit-тесты | 0        | 0         |
| E2E тесты  | 0        | 0         |
| **Всего**  | **0**    | **0**     |

## Запуск тестов

```bash
nx test notebook             # Unit-тесты (Vitest)
nx e2e notebook-e2e          # E2E-тесты (Playwright), после подключения e2e-suite
```

## Unit-тесты (Vitest)

Настроены (`vitest.config.mts`, `vitest.setup.tsx`), тестов пока нет — добавляй по мере появления
логики в `src/`.

## E2E-тесты (Playwright)

Не подключены. Когда появится первая фича, достойная e2e-покрытия:

```bash
nx g @letar/generators:e2e-suite notebook
```

См. `.claude/docs/e2e-testing.md` за особенностями WebKit/Portal-компонентов.

---

**Последнее обновление:** 2026-10-05
