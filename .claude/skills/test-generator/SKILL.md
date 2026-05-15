---
name: test-generator
description: |
  Генератор тестов Vitest и Playwright. Используй при:
  - Написании unit/integration тестов
  - Написании E2E тестов Playwright
  - Тестировании TanStack Form компонентов
  - Тестировании Chakra UI Portal компонентов
  - Настройке auth в тестах (storageState)
---

# Test Generator

Генератор тестов: Vitest для unit/integration, Playwright для E2E.

## Когда использовать

- Написание unit тестов
- Написание E2E тестов
- Тестирование TanStack Form компонентов
- Тестирование Chakra UI Portal компонентов

## Ключевая рекомендация для E2E

⭐ **Авторизуйся через UI форму логина один раз в setup**, затем используй `storageState` для переиспользования сессии — это стабильнее чем ручное создание cookies.

```typescript
// global.setup.ts
import { test as setup } from '@playwright/test'

const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'test-password-123',
}

const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  // Логинимся через UI один раз
  await page.goto('/sign-in')
  await page.getByPlaceholder('Email').fill(TEST_ADMIN.email)
  await page.getByPlaceholder('Пароль').fill(TEST_ADMIN.password)
  await page.getByRole('button', { name: /войти/i }).click()

  // Ждём успешного входа
  await page.waitForURL(/\/(profile|admin|dashboard)/)

  // Сохраняем состояние для переиспользования
  await page.context().storageState({ path: ADMIN_STORAGE_STATE })
})
```

> Better Auth использует session-based аутентификацию (не JWT). Сессия хранится в БД, cookie содержит только session token.

## Параллельное выполнение E2E

⚠️ Тесты запускаются в несколько workers параллельно. Каждый тест должен работать с изолированными данными:

```typescript
import { randomUUID } from 'crypto'

// ✅ Уникальные данные для каждого теста
const testProduct = {
  name: `Product ${randomUUID().slice(0, 8)}`,
  sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
}
```

## Reference файлы

- `reference/vitest-patterns.md` — Unit/Integration тесты
- `reference/playwright-patterns.md` — E2E тесты
- `reference/chakra-portals.md` — Portal компоненты
- `reference/form-components.md` — Тестирование форм
- `reference/webkit-quirks.md` — Особенности WebKit
- `reference/auth-setup.md` — Авторизация в E2E тестах (Better Auth)

## Команды

```bash
# Unit тесты
nx test <app>

# E2E тесты
nx e2e <app>-e2e

# Конкретный тест
nx e2e <app>-e2e -- --grep="название теста"

# С UI режимом
nx e2e <app>-e2e -- --ui
```
