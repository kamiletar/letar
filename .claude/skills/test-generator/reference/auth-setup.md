# Авторизация в E2E тестах (Better Auth)

## Подход

Better Auth использует **session-based аутентификацию** (сессия хранится в БД, не JWT). Для E2E тестов рекомендуется:

1. **Логиниться через UI один раз** в setup
2. **Сохранять состояние** через `storageState`
3. **Переиспользовать сессию** в тестах

## Setup файл

```typescript
// e2e/setup/auth.setup.ts
import { expect, test as setup } from '@playwright/test'

const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
  },
  user: {
    email: 'user@test.com',
    password: process.env.TEST_USER_PASSWORD || 'user123',
  },
}

export const STORAGE_STATES = {
  admin: 'playwright/.auth/admin.json',
  user: 'playwright/.auth/user.json',
}

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/sign-in')

  // Заполняем форму логина
  await page.getByPlaceholder('Email').fill(TEST_USERS.admin.email)
  await page.getByPlaceholder('Пароль').fill(TEST_USERS.admin.password)
  await page.getByRole('button', { name: /войти/i }).click()

  // Ждём успешного входа
  await expect(page).toHaveURL(/\/(profile|admin|dashboard)/, { timeout: 10000 })

  // Сохраняем состояние
  await page.context().storageState({ path: STORAGE_STATES.admin })
})

setup('authenticate as user', async ({ page }) => {
  await page.goto('/sign-in')

  await page.getByPlaceholder('Email').fill(TEST_USERS.user.email)
  await page.getByPlaceholder('Пароль').fill(TEST_USERS.user.password)
  await page.getByRole('button', { name: /войти/i }).click()

  await expect(page).toHaveURL(/\/(profile|dashboard)/, { timeout: 10000 })
  await page.context().storageState({ path: STORAGE_STATES.user })
})
```

## Конфигурация Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

const STORAGE_STATES = {
  admin: 'playwright/.auth/admin.json',
  user: 'playwright/.auth/user.json',
}

export default defineConfig({
  projects: [
    // Setup проекты
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Админские тесты
    {
      name: 'admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATES.admin,
      },
      dependencies: ['setup'],
      testMatch: /admin\/.*.spec.ts/,
    },

    // Пользовательские тесты
    {
      name: 'user-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATES.user,
      },
      dependencies: ['setup'],
      testMatch: /user\/.*.spec.ts/,
    },

    // Гостевые тесты (без авторизации)
    {
      name: 'guest-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // storageState не указан — без cookies
      },
      testMatch: /guest\/.*.spec.ts/,
    },
  ],
})
```

## Использование в тестах

```typescript
// e2e/admin/products.spec.ts
import { expect, test } from '@playwright/test'

test.describe('Админ: Продукты', () => {
  // Авторизация уже есть из storageState

  test('список продуктов', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page.getByRole('heading', { name: 'Продукты' })).toBeVisible()
  })

  test('создание продукта', async ({ page }) => {
    await page.goto('/admin/products/new')
    // ... тест
  })
})
```

## Тесты без авторизации

```typescript
// e2e/guest/redirect.spec.ts
import { expect, test } from '@playwright/test'

test('редирект на логин', async ({ browser }) => {
  // Явно без cookies
  const context = await browser.newContext({
    storageState: undefined,
  })
  const page = await context.newPage()

  await page.goto('/admin/products', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/sign-in/)

  await context.close()
})
```

## Переключение ролей в тесте

```typescript
test('переключение роли', async ({ browser }) => {
  // Начинаем как user
  const userContext = await browser.newContext({
    storageState: 'playwright/.auth/user.json',
  })
  const userPage = await userContext.newPage()
  await userPage.goto('/profile')
  await expect(userPage.getByRole('heading', { name: 'Мой профиль' })).toBeVisible()
  await userContext.close()

  // Переключаемся на admin
  const adminContext = await browser.newContext({
    storageState: 'playwright/.auth/admin.json',
  })
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/admin')
  await expect(adminPage.getByRole('heading', { name: 'Админ-панель' })).toBeVisible()
  await adminContext.close()
})
```

## Продвинутый подход: Прямое создание сессии

Если нужно создавать сессии программно (без UI), можно использовать API Better Auth напрямую:

```typescript
// e2e/utils/auth.ts
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

export async function createTestSession(userId: string): Promise<string> {
  const sessionToken = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа

  await prisma.session.create({
    data: {
      id: randomUUID(),
      token: sessionToken,
      userId,
      expiresAt,
    },
  })

  return sessionToken
}

export async function getSessionCookie(userId: string) {
  const token = await createTestSession(userId)

  return {
    name: 'better-auth.session_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax' as const,
  }
}
```

⚠️ **Важно:** Этот подход требует доступа к БД из тестов.

## Очистка после тестов

```typescript
// e2e/setup/teardown.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function globalTeardown() {
  // Удаляем тестовые сессии
  await prisma.session.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@test.com',
        },
      },
    },
  })

  await prisma.$disconnect()
}
```

## Важно

1. **Тестовые пользователи** должны быть созданы в БД перед тестами (seed или fixtures)
2. **Пароли** для тестов храни в env переменных
3. **storageState: undefined** — для тестов неавторизованного доступа
4. **dependencies: ['setup']** — гарантирует выполнение setup перед тестами
5. Cookie Better Auth называется `better-auth.session_token`
