# @letar/pin-auth

Библиотека для PIN-верификации email с поддержкой авто-логина.

## Установка

Библиотека использует peer dependencies:

```bash
# Обязательные
bun add react zod

# Опциональные (для UI компонентов)
bun add @chakra-ui/react react-icons
```

## Модули

| Модуль                    | Описание                                      |
| ------------------------- | --------------------------------------------- |
| `@letar/pin-auth/server`  | Генерация PIN, валидация, управление токенами |
| `@letar/pin-auth/client`  | React хуки для верификации                    |
| `@letar/pin-auth/schemas` | Zod-схемы валидации                           |

Шаблоны email-писем с PIN-кодом — в `@letar/email` (`sendVerificationEmail`,
`sendPasswordResetEmail`), не здесь: `./email` был третьей независимой копией того же письма и
удалён 2026-09-14 (потребителей не было).

## Server

### generatePin

Генерирует криптографически безопасный PIN-код.

```typescript
import { generatePin, generateToken } from '@letar/pin-auth/server'

const pin = generatePin() // "123456"
const pin8 = generatePin({ length: 8 }) // "12345678"
const token = generateToken() // 64-символьный hex-токен
```

### createPinValidator

Создаёт валидатор PIN с настраиваемым адаптером БД.

```typescript
import { createPinValidator, generateToken } from '@letar/pin-auth/server'

const validator = createPinValidator({
  maxAttempts: 5,
  pinValidityMs: 10 * 60 * 1000, // 10 минут
})

// В server action
const result = await validator.verifyPin(
  email,
  pin,
  {
    findToken: (id) => prisma.verificationToken.findFirst({ where: { identifier: id } }),
    incrementAttempts: (token) =>
      prisma.verificationToken.update({
        where: { token },
        data: { pinAttempts: { increment: 1 } },
      }),
    findUser: (email) => prisma.user.findUnique({ where: { email } }),
    verifyUserEmail: (userId) =>
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      }),
    updateTokenForAutoLogin: async (oldToken, newToken, expires) => {
      await prisma.verificationToken.update({
        where: { token: oldToken },
        data: { token: newToken, expires, pin: null },
      })
    },
  },
  generateToken,
)

if (result.success) {
  // Авто-логин с result.token
}
```

### Race-safe лимит попыток — `reserveAttempt`

Путь по умолчанию (`incrementAttempts` выше) — **check-then-act**: валидатор читает `pinAttempts`
вместе с токеном и лишь потом, после сравнения PIN, вызывает `incrementAttempts`. Под
параллельной нагрузкой (несколько запросов на один email одновременно, например скрипт-перебор)
все они читают один и тот же счётчик и успевают сравнить PIN, прежде чем хоть один инкремент
применится — `maxAttempts` не соблюдается, пачка из N параллельных запросов даёт N сравнений.

Чтобы это исключить, реализуйте в адаптере опциональный `reserveAttempt(identifier)` — валидатор
вызовет его вместо `pinAttempts`/`incrementAttempts`. Метод обязан быть **compare-and-swap**
(прочитать текущее значение → атомарно обновить, только если оно не изменилось → повторить при
конфликте), а не read-then-write:

```typescript
async function reserveAttempt(identifier: string): Promise<number> {
  const key = `pin-attempts:${identifier}`

  for (;;) {
    const row = await store.findCounter(key)

    if (!row) {
      // Первая попытка — создать счётчик; если параллельный запрос уже создал его
      // (нарушение уникальности), перечитываем и продолжаем цикл
      const created = await store.tryCreateCounter(key)
      if (created) {
        return 0
      }
      continue
    }

    // Атомарное обновление ТОЛЬКО если значение не изменилось с момента чтения —
    // update ... where value = row.value (affected rows === 0 означает проигранную гонку)
    const updated = await store.tryIncrementCounter(key, row.value)
    if (updated) {
      return row.value
    }
    // Конфликт — параллельный запрос успел обновить счётчик первым, пробуем снова
  }
}
```

```typescript
const validator = createPinValidator({ maxAttempts: 5 })

const result = await validator.verifyPin(
  email,
  pin,
  {
    findToken: (id) => prisma.verificationToken.findFirst({ where: { identifier: id } }),
    // pinAttempts из findToken игнорируется, когда задан reserveAttempt — incrementAttempts
    // тоже не вызывается, можно оставить пустой функцией
    incrementAttempts: async () => {},
    reserveAttempt,
    findUser: (email) => prisma.user.findUnique({ where: { email } }),
    verifyUserEmail: (userId) => prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    updateTokenForAutoLogin: async (oldToken, newToken, expires) => {
      await prisma.verificationToken.update({
        where: { token: oldToken },
        data: { token: newToken, expires, pin: null },
      })
    },
  },
  generateToken,
)
```

⚠️ `reserveAttempt` опционален — адаптеры без него продолжают работать на старом
`incrementAttempts`-пути (race-prone, см. выше). Миграция не обязательна, но рекомендована для
приложений, где важна защита от параллельного перебора PIN.

### createPinVerifyRateLimiter

`reserveAttempt`/`incrementAttempts` выше считают попытки на один email. Это не мешает
перебирать PIN разных адресов с одного IP — для этого отдельный IP-based rate-limit поверх
`@letar/api-server`:

```typescript
import { createPinVerifyRateLimiter } from '@letar/pin-auth/server'
import { headers } from 'next/headers'

// getClientIp внедряется приложением — способ получить IP у каждого свой
const isPinVerifyRateLimited = createPinVerifyRateLimiter(async () => getClientIp({ headers: await headers() }))

// В server action, до проверки PIN
if (await isPinVerifyRateLimited()) {
  return { success: false, error: 'RATE_LIMITED' }
}
```

По умолчанию окно 15 минут / 30 запросов — переопределяется вторым аргументом
(`{ windowMs, maxRequests, cleanupIntervalMs }`, см. `RateLimiterConfig` из `@letar/api-server`).
Хранилище in-memory: приложение работает одним контейнером, рестарт обнуляет лимит — приемлемо,
основной барьер всё равно `reserveAttempt` на email.

### createTokenManager

Управление токенами для повторной отправки PIN.

```typescript
import { createTokenManager } from '@letar/pin-auth/server'

const tokenManager = createTokenManager({
  pinValidityMs: 10 * 60 * 1000,
  resendCooldownMs: 60 * 1000,
})

const result = await tokenManager.resendPin(email, {
  findUser: (email) => prisma.user.findUnique({ where: { email } }),
  findLatestToken: (id) =>
    prisma.verificationToken.findFirst({
      where: { identifier: id },
      orderBy: { expires: 'desc' },
    }),
  deleteTokens: (id) =>
    prisma.verificationToken.deleteMany({
      where: { identifier: id },
    }),
  createToken: (data) => prisma.verificationToken.create({ data }),
})

if (result.success) {
  await sendEmail({ pin: result.pin, token: result.token })
}
```

## Client

### usePinVerification

Управление процессом верификации PIN — общий хук для регистрации и сброса пароля. Один общий
для обоих сценариев компонент — `sseEvents` различает их.

```tsx
import { usePinVerification } from '@letar/pin-auth/client'

function VerifyPinForm({ email, streamToken }: { email: string; streamToken: string }) {
  const {
    error,
    isVerifying,
    isResending,
    resendCountdown,
    canResend,
    completedInOtherTab,
    formKey,
    handleVerify,
    handleResend,
  } = usePinVerification({
    email,
    // Непубличный streamToken — вместо email в URL, исключает enumeration чужих email
    sseEndpoint: `/api/auth/verification-stream/${streamToken}`,
    verifyAction: verifyPinAction,
    resendAction: resendPinAction,
    sseEvents: { completedField: 'verified' },
    onVerified: async (result) => {
      await autoLogin(result.token)
      router.push('/dashboard')
    },
  })

  if (completedInOtherTab) {
    return <Text>Подтверждено в другой вкладке</Text>
  }

  return (
    <form key={formKey} onSubmit={(e) => e.preventDefault()}>
      <PinInput onComplete={handleVerify} disabled={isVerifying} />
      {error && <Text color="red">{error}</Text>}

      {canResend
        ? <Button loading={isResending} onClick={handleResend}>Отправить повторно</Button>
        : <Text>Повторно через {resendCountdown} сек</Text>}
    </form>
  )
}
```

`verifyAction`/`resendAction` — server actions приложения, `verifyAction` может вернуть
`token` (авто-логин) или `resetToken` (переход на страницу сброса пароля) — `onVerified`
получает оба поля опционально. `sseEvents.openedField` (для сброса пароля — «открыто в другой
вкладке») опционален, есть только у сценария сброса пароля.

### PinVerificationForm

Готовый 4-экранный Chakra UI компонент поверх `usePinVerification` — ввод кода / верифицировано /
завершено в другой вкладке / открыто в другой вкладке (для сброса пароля). Как и
`EmailCodePanel`, не тянет `@letar/forms` в зависимости — поле кода рендерит приложение своим
инстансом `createForm` через render-prop `renderCodeForm`.

```tsx
import { PinVerificationForm } from '@letar/pin-auth/client'
import { VerifyPinSchema } from '@letar/pin-auth/schemas'

<PinVerificationForm
  email={email}
  sseEndpoint={`/api/auth/verification-stream/${streamToken}`}
  verifyAction={verifyPinAction}
  resendAction={resendPinAction}
  sseEvents={{ completedField: 'verified' }}
  onVerified={(result) => autoLoginAndRedirect(result.token)}
  texts={{
    title: 'Подтвердите email',
    subtitle: (
      <>
        Мы отправили код на <strong>{email}</strong>
      </>
    ),
    verifiedTitle: 'Email подтверждён!',
    verifiedMessage: 'Выполняется вход в аккаунт...',
    otherTabCompletedTitle: 'Email подтверждён!',
    otherTabCompletedMessage: 'Вы вошли в другой вкладке.',
  }}
  renderCodeForm={({ formKey, disabled, onComplete }) => (
    <AppForm
      key={formKey}
      initialValue={{ pin: '' }}
      schema={VerifyPinSchema}
      onSubmit={(d) => onComplete(d.pin)}
    >
      <AppForm.Field.Auto name="pin" size="lg" disabled={disabled} onComplete={onComplete} />
      <AppForm.Button.Submit>Подтвердить</AppForm.Button.Submit>
    </AppForm>
  )}
/>
```

Для сброса пароля дополнительно передаются `texts.otherTabOpenedTitle`/`otherTabOpenedMessage` и
`sseEvents.openedField` — без них экран «открыто в другой вкладке» не показывается (актуально
только для сброса пароля: «открыто» значит «перешли по ссылке из письма в другом окне»).

### useResendCountdown

Таймер для повторной отправки.

```tsx
import { useResendCountdown } from '@letar/pin-auth/client'

const { secondsLeft, canResend, reset } = useResendCountdown({
  initialSeconds: 60,
})
```

### useVerificationStream

SSE для отслеживания верификации в другой вкладке.

```tsx
import { useVerificationStream } from '@letar/pin-auth/client'

const { verifiedInOtherTab } = useVerificationStream({
  email,
  onVerified: () => console.log('Verified in other tab'),
})
```

## Schemas

### VerifyPinSchema

Готовая схема для 6-значного PIN с UI метаданными.

```typescript
import { VerifyPinSchema } from '@letar/pin-auth/schemas'

// Использование с @letar/forms
<Form schema={VerifyPinSchema}>
  <Form.Field.Auto name="pin" />
</Form>
```

### createPinSchema

Создание кастомной схемы PIN.

```typescript
import { createPinSchema } from '@letar/pin-auth/schemas'

const Pin4Schema = createPinSchema({ length: 4 })
const Pin8Schema = createPinSchema({
  length: 8,
  uiMeta: { title: 'Код', fieldType: 'pinInput' },
})
```

## Конфигурация

| Параметр           | По умолчанию | Описание                          |
| ------------------ | ------------ | --------------------------------- |
| `pinLength`        | 6            | Длина PIN-кода                    |
| `pinValidityMs`    | 10 мин       | Время жизни PIN                   |
| `linkValidityMs`   | 24 часа      | Время жизни ссылки                |
| `resendCooldownMs` | 60 сек       | Время между повторными отправками |
| `maxAttempts`      | 5            | Максимум попыток ввода PIN        |
