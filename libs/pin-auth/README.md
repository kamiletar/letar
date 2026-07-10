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
| `@letar/pin-auth/email`   | Шаблоны email-писем                           |
| `@letar/pin-auth/schemas` | Zod-схемы валидации                           |

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
  generateToken
)

if (result.success) {
  // Авто-логин с result.token
}
```

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

Управление процессом верификации PIN.

```tsx
import { usePinVerification } from '@letar/pin-auth/client'

function VerifyPinForm({ email }: { email: string }) {
  const { state, error, isVerifying, canResend, resendSecondsLeft, formKey, verifyPin, resendPin } = usePinVerification(
    {
      email,
      onVerified: async (token) => {
        await autoLogin(token)
        router.push('/dashboard')
      },
    },
    {
      onVerifyPin: verifyPinAction,
      onResendPin: resendPinAction,
    }
  )

  return (
    <form key={formKey} onSubmit={handleSubmit}>
      <PinInput onComplete={verifyPin} disabled={isVerifying} />
      {error && <Text color="red">{error}</Text>}

      {canResend ? (
        <Button onClick={resendPin}>Отправить повторно</Button>
      ) : (
        <Text>Повторно через {resendSecondsLeft} сек</Text>
      )}
    </form>
  )
}
```

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

## Email

### formatVerificationEmail

Генерирует HTML и текстовое содержимое письма верификации.

```typescript
import { formatVerificationEmail } from '@letar/pin-auth/email'

const { html, text, subject } = formatVerificationEmail(
  {
    userName: 'Иван',
    verificationUrl: 'https://my-app.com/verify/token123',
    pin: '123456',
  },
  {
    appUrl: 'https://my-app.com',
    appName: 'MyApp',
    primaryColor: '#1a365d',
    accentColor: '#CA9E67',
  }
)

await emailProvider.send({ to: email, subject, html, text })
```

### formatResetPasswordEmail

Генерирует письмо для сброса пароля.

```typescript
import { formatResetPasswordEmail } from '@letar/pin-auth/email'

const { html, text, subject } = formatResetPasswordEmail(
  { userName: 'Иван', resetUrl: 'https://...', pin: '123456' },
  { appUrl: 'https://my-app.com', appName: 'MyApp' }
)
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
