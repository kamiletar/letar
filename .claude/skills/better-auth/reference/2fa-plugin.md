# 2FA Plugin

Двухфакторная аутентификация: TOTP, OTP, backup codes.

---

## Установка

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    twoFactor({
      // Методы 2FA
      totp: true, // Authenticator apps
      otp: true, // Email/SMS коды
      backupCodes: true, // Резервные коды
    }),
  ],
})
```

```typescript
// src/lib/auth-client.ts
import { twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [twoFactorClient()],
})
```

---

## TOTP (Authenticator Apps)

Работает с Google Authenticator, Authy, 1Password и другими.

### Включение TOTP

```typescript
// 1. Сгенерировать секрет и получить QR-код
const { data } = await authClient.twoFactor.enable({
  method: 'totp',
})

// data.totpURI — URI для QR-кода
// data.secret — секрет (для ручного ввода)

// 2. Показать QR-код пользователю (используй библиотеку типа qrcode)
import QRCode from 'qrcode'
const qrCodeUrl = await QRCode.toDataURL(data.totpURI)

// 3. Подтвердить активацию кодом из приложения
await authClient.twoFactor.verifyTotp({
  code: '123456', // Код из Google Authenticator
})
```

### UI компонент настройки TOTP

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import QRCode from 'qrcode'
import { useState } from 'react'

export function TotpSetup() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')

  async function handleEnable() {
    const { data } = await authClient.twoFactor.enable({ method: 'totp' })

    if (data?.totpURI) {
      const qr = await QRCode.toDataURL(data.totpURI)
      setQrCode(qr)
      setSecret(data.secret)
    }
  }

  async function handleVerify() {
    const { error } = await authClient.twoFactor.verifyTotp({ code })

    if (error) {
      alert('Неверный код')
      return
    }

    alert('2FA включена!')
    setQrCode(null)
  }

  if (qrCode) {
    return (
      <div>
        <h2>Отсканируйте QR-код</h2>
        <img src={qrCode} alt="QR Code" />
        <p>Или введите код вручную: {secret}</p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Код из приложения"
          maxLength={6}
        />
        <button onClick={handleVerify}>Подтвердить</button>
      </div>
    )
  }

  return <button onClick={handleEnable}>Включить 2FA</button>
}
```

---

## OTP (Email/SMS коды)

Отправка одноразовых кодов на email или телефон.

### Конфигурация

```typescript
export const auth = betterAuth({
  plugins: [
    twoFactor({
      otp: {
        // Отправка кода
        sendOTP: async (user, otp) => {
          await sendEmail({
            to: user.email,
            subject: 'Код подтверждения',
            html: `
              <h1>Ваш код: ${otp}</h1>
              <p>Код действителен 5 минут.</p>
            `,
          })
        },

        // Время жизни кода (секунды)
        expiresIn: 60 * 5, // 5 минут

        // Длина кода
        otpLength: 6,
      },
    }),
  ],
})
```

### Использование OTP

```typescript
// 1. Запросить код
await authClient.twoFactor.sendOtp()

// 2. Подтвердить код
const { error } = await authClient.twoFactor.verifyOtp({
  code: '123456',
})
```

---

## Backup Codes

Резервные коды на случай потери доступа к authenticator.

### Генерация

```typescript
const { data } = await authClient.twoFactor.generateBackupCodes()

// data.backupCodes = ['ABC123DEF4', 'GHI567JKL8', ...]
// Показать пользователю для сохранения!
```

### Настройка

```typescript
export const auth = betterAuth({
  plugins: [
    twoFactor({
      backupCodes: {
        // Количество кодов
        count: 10,

        // Длина каждого кода
        length: 10,
      },
    }),
  ],
})
```

### Использование backup code

```typescript
await authClient.twoFactor.verifyBackupCode({
  code: 'ABC123DEF4',
})

// Код одноразовый — после использования удаляется
```

---

## Вход с 2FA

### Процесс входа

```typescript
'use client'

import { authClient, signIn } from '@/lib/auth-client'
import { useState } from 'react'

export function SignInForm() {
  const [requires2FA, setRequires2FA] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()

    const { data, error } = await signIn.email({
      email,
      password,
    })

    if (error?.code === 'TWO_FACTOR_REQUIRED') {
      // Нужен 2FA код
      setRequires2FA(true)
      return
    }

    if (error) {
      alert(error.message)
      return
    }

    // Успешный вход
    window.location.href = '/dashboard'
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault()

    // Попробовать как TOTP
    const { error } = await authClient.twoFactor.verifyTotp({
      code: twoFactorCode,
    })

    if (error) {
      // Попробовать как backup code
      const { error: backupError } = await authClient.twoFactor.verifyBackupCode({
        code: twoFactorCode,
      })

      if (backupError) {
        alert('Неверный код')
        return
      }
    }

    window.location.href = '/dashboard'
  }

  if (requires2FA) {
    return (
      <form onSubmit={handleVerify2FA}>
        <h2>Введите код 2FA</h2>
        <input
          type="text"
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value)}
          placeholder="Код из приложения или backup code"
        />
        <button type="submit">Подтвердить</button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSignIn}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
      />
      <button type="submit">Войти</button>
    </form>
  )
}
```

---

## Trust Device

Запомнить устройство, чтобы не спрашивать 2FA повторно.

### Конфигурация

```typescript
export const auth = betterAuth({
  plugins: [
    twoFactor({
      trustDevice: {
        enabled: true,
        expiresIn: 60 * 60 * 24 * 30, // 30 дней
      },
    }),
  ],
})
```

### Использование

```typescript
// При верификации 2FA
await authClient.twoFactor.verifyTotp({
  code: '123456',
  trustDevice: true, // Запомнить устройство
})
```

---

## Отключение 2FA

```typescript
await authClient.twoFactor.disable({
  // Требуется подтверждение
  password: 'current_password',
})
```

---

## Проверка статуса 2FA

```typescript
const { data: session } = useSession()

if (session?.user.twoFactorEnabled) {
  // 2FA включена
}
```

---

## Обязательная 2FA для ролей

```typescript
export const auth = betterAuth({
  plugins: [
    twoFactor({
      // Обязательная 2FA для админов
      requireTwoFactor: async (user) => {
        return user.roles?.includes('ADMIN') || user.roles?.includes('OWNER')
      },
    }),
  ],
})
```

---

## Схема БД

```sql
-- Добавляется к User
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT; -- Encrypted TOTP secret

-- Backup codes
CREATE TABLE "BackupCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "code" TEXT NOT NULL, -- Hashed
  "used" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Trusted devices
CREATE TABLE "TrustedDevice" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "deviceId" TEXT NOT NULL,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

Или через CLI:

```bash
npx @better-auth/cli migrate
```

---

## См. также

- [email-password.md](email-password.md) — Email/пароль вход
- [security-best-practices.md](security-best-practices.md) — Безопасность
- [admin-plugin.md](admin-plugin.md) — Обязательная 2FA для админов
