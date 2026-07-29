# @letar/e2e-testing

Общие хелперы для Playwright `global-setup.ts` приложений монорепо.

## Проблема

Staging-раннер (s3, `run_e2e`) физически не имеет доступа к `DATABASE_URL` приложения — прямая
запись тестовых пользователей в БД из `global-setup.ts` работает только локально/в CI. Для
staging используется отдельный staging-only роут `/api/auth/dev-session` (`createDevSessionRoute`
из `@letar/auth/server`) — логин без пароля/OIDC по секретному токену (`DEV_SESSION_TOKEN`,
только `.env.staging`, см. `.claude/rules/env-files.md`).

Этот паттерн уже реализован в нескольких приложениях (`driving-school-e2e`, `svoichuzhie-e2e`) —
`@letar/e2e-testing` выносит общую часть, чтобы не копировать её в каждое следующее.

## API

- `storagePaths(e2eRoot, filename)` — пути для записи `storageState` (config-директория + CWD).
- `requireDevSessionToken()` — читает `DEV_SESSION_TOKEN` из окружения, бросает понятную ошибку
  вместо непрозрачного 403 при пустом значении.
- `devSessionLogin(options)` — логинится через `/api/auth/dev-session`, опционально делает
  дополнительный переход (`postLoginPath`) для триггера серверных побочных эффектов, сохраняет
  `storageState`.
- `clickWithHydrationRetry(clickTarget, waitFor, firstTimeoutMs?, retryTimeoutMs?)` — клик,
  устойчивый к гонке гидратации React у controlled-компонентов (например Chakra
  `Checkbox.Root`). Если клик по нативному элементу физически происходит до того, как React
  навесил обработчик во время гидратации, состояние откатывается назад без ошибки
  actionability. Хелпер кликает, коротко ждёт условие (`waitFor.state`: `'enabled'` или
  `'visible'` у `waitFor.locator`), и если оно не наступило — кликает ещё раз и ждёт дольше
  (к этому моменту гидратация уже гарантированно завершена). Найдено 2026-07-29 в archetest на
  controlled-чекбоксе согласия.

  ```ts
  import { clickWithHydrationRetry } from '@letar/e2e-testing'

  const startButton = page.getByRole('button', { name: 'Начать тест' })
  const consentCheckbox = page.locator('[data-part="control"]').first()
  await clickWithHydrationRetry(consentCheckbox, { locator: startButton, state: 'enabled' })
  ```

## Пример

```ts
// apps/my-app-e2e/src/global-setup.ts
import { devSessionLogin, requireDevSessionToken, storagePaths } from '@letar/e2e-testing'
import { resolve } from 'path'

const E2E_ROOT = resolve(__dirname, '..')
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

async function stagingGlobalSetup() {
  const token = requireDevSessionToken()
  await devSessionLogin({
    baseURL: BASE_URL,
    email: 'e2e-admin@my-app.test',
    redirect: '/admin',
    token,
    paths: storagePaths(E2E_ROOT, 'admin.json'),
  })
}

export default async function globalSetup() {
  if (process.env['DEV_SESSION_TOKEN']) {
    return stagingGlobalSetup()
  }
  // локальный/CI-флоу — прямая запись в БД, без изменений
}
```

## Приложение приложения

В `apps/<app>/src/app/api/auth/dev-session/route.ts`:

```ts
import { prisma } from '@/lib/db'
import { createDevSessionRoute } from '@letar/auth/server'

export const GET = createDevSessionRoute({
  prisma,
  authSecret: process.env.BETTER_AUTH_SECRET ?? '',
  defaultEmail: 'e2e-admin@my-app.test',
  defaultRedirect: '/admin',
  buildUserData: (email) => ({ role: email.includes('admin') ? 'ADMIN' : 'USER' }),
})
```
