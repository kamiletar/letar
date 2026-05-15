---
paths: apps/**/*.spec.ts, apps/**/*.spec.tsx, apps/**/*-e2e/**, libs/**/*.spec.ts
---

# Правила для тестирования

## TDD методология

1. **Red** — напиши тест, который падает
2. **Green** — напиши минимальный код для прохождения
3. **Refactor** — улучши код, сохраняя тесты зелёными

## Unit/Integration тесты (Vitest)

```typescript
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('MyComponent', () => {
  it('отображает заголовок', () => {
    render(<MyComponent title="Тест" />)
    expect(screen.getByText('Тест')).toBeInTheDocument()
  })
})
```

## E2E тесты (Playwright)

```typescript
import { expect, test } from '@playwright/test'

test('пользователь может войти', async ({ page }) => {
  await page.goto('/signin')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Команды

```bash
nx test <app-name>              # Unit тесты
nx e2e <app-name>-e2e           # E2E тесты
nx e2e <app-name>-e2e -- --project=chromium  # Только Chromium
```

## Документирование

- **MUST** обновлять `PLAN_TESTING.md` при добавлении тестов
- **SHOULD** отмечать фазы тестирования как выполненные

## Документация

→ **Skill: `test-generator`** — паттерны Vitest и Playwright
→ См. `.claude/docs/e2e-testing.md` для особенностей WebKit и Portal компонентов
