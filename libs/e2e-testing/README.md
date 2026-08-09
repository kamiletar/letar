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
  controlled-чекбоксе согласия. Использовать, когда ожидаемый эффект клика виден на ДРУГОМ
  элементе (например кнопка становится enabled).

  ```ts
  import { clickWithHydrationRetry } from '@letar/e2e-testing'

  const startButton = page.getByRole('button', { name: 'Начать тест' })
  const consentCheckbox = page.locator('[data-part="control"]').first()
  await clickWithHydrationRetry(consentCheckbox, { locator: startButton, state: 'enabled' })
  ```

- `fillWithHydrationRetry(locator, value, timeoutMs?)` — заполняет controlled-инпут с ретраем до
  подтверждения значения через `toHaveValue()`. Тот же класс гонки, что и у `clickWithHydrationRetry`,
  но применительно к тексту: `.fill()` может сработать до навешивания `onChange` во время
  гидратации, либо соседний `.fill()`/клик в той же форме триггерит re-render, откатывающий уже
  введённое значение. Найдено 2026-08-08 в aboi (WebKit), затем независимо переоткрыто в
  svoichuzhie — обе локальные копии консолидированы сюда 2026-08-09.

  ```ts
  import { fillWithHydrationRetry } from '@letar/e2e-testing'

  await fillWithHydrationRetry(page.locator('#email'), 'user@example.com')
  ```

- `checkWithHydrationRetry(clickTarget, checkboxLocator, timeoutMs?)` — устанавливает
  checked-состояние controlled-чекбокса с ретраем, идемпотентным относительно уже достигнутого
  состояния (перед каждой попыткой проверяет `isChecked()`, кликает только если ещё не checked —
  в отличие от `clickWithHydrationRetry` здесь повторный клик был бы неверен, он снял бы уже
  выставленную галочку). `clickTarget` — обычно `[data-part="control"]` (Zag.js вешает toggle
  именно на control-часть, не на `<label>` целиком). Найдено 2026-08-09 в svoichuzhie,
  подтверждено трейсом на staging.

  ```ts
  import { checkWithHydrationRetry } from '@letar/e2e-testing'

  const control = footer.locator('[data-part="control"]').first()
  const checkbox = footer.locator('input[type="checkbox"]').first()
  await checkWithHydrationRetry(control, checkbox)
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
