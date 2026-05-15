# OAuth Providers

Настройка OAuth провайдеров в Better Auth.

---

## Поддерживаемые провайдеры

Better Auth поддерживает 50+ OAuth провайдеров из коробки:

- Google, GitHub, Discord, Twitter/X
- Yandex, VK
- Microsoft, Apple, Facebook
- И другие...

---

## Google

### 1. Создание credentials в Google Cloud Console

1. Перейди в [Google Cloud Console](https://console.cloud.google.com/)
2. Создай проект или выбери существующий
3. APIs & Services → Credentials → Create Credentials → OAuth client ID
4. Application type: **Web application**
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-domain.com/api/auth/callback/google` (prod)

### 2. Конфигурация

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      // Опционально: дополнительные scopes
      scopes: ['openid', 'email', 'profile'],

      // Опционально: ID Token вход (для мобильных)
      idToken: {
        enabled: true,
        aud: process.env.GOOGLE_CLIENT_ID!, // Audience validation
      },
    },
  },
})
```

### 3. Переменные окружения

```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

### 4. Использование

```typescript
'use client'

import { signIn } from '@/lib/auth-client'

export function GoogleSignIn() {
  return (
    <Button
      onClick={() =>
        signIn.social({
          provider: 'google',
          callbackURL: '/dashboard',
        })}
    >
      Войти через Google
    </Button>
  )
}
```

---

## Yandex

### 1. Создание приложения

1. Перейди на [Yandex OAuth](https://oauth.yandex.ru/)
2. Создай новое приложение
3. Callback URL: `https://your-domain.com/api/auth/callback/yandex`
4. Права: `login:info`, `login:email`

### 2. Конфигурация

```typescript
export const auth = betterAuth({
  socialProviders: {
    yandex: {
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    },
  },
})
```

### 3. Переменные окружения

```bash
YANDEX_CLIENT_ID=xxx
YANDEX_CLIENT_SECRET=xxx
```

---

## VK (ВКонтакте)

### 1. Создание приложения

1. Перейди в [VK Developers](https://dev.vk.com/)
2. Создай приложение → Платформа: Веб-сайт
3. Redirect URI: `https://your-domain.com/api/auth/callback/vk`

### 2. Конфигурация

```typescript
export const auth = betterAuth({
  socialProviders: {
    vk: {
      clientId: process.env.VK_CLIENT_ID!,
      clientSecret: process.env.VK_CLIENT_SECRET!,
    },
  },
})
```

### 3. Переменные окружения

```bash
VK_CLIENT_ID=xxx
VK_CLIENT_SECRET=xxx
```

---

## GitHub

### 1. Создание OAuth App

1. GitHub Settings → Developer settings → OAuth Apps → New
2. Authorization callback URL: `https://your-domain.com/api/auth/callback/github`

### 2. Конфигурация

```typescript
export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
})
```

---

## Несколько провайдеров

```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    yandex: {
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
})
```

---

## ID Token вход (для мобильных)

Позволяет входить через ID Token от нативных SDK (например, Google Sign-In на iOS/Android).

```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      idToken: {
        enabled: true,
        // Проверка audience (важно для безопасности!)
        aud: [
          process.env.GOOGLE_CLIENT_ID!, // Web
          process.env.GOOGLE_IOS_CLIENT_ID!, // iOS
          process.env.GOOGLE_ANDROID_CLIENT_ID!, // Android
        ],
      },
    },
  },
})
```

### Использование с мобильного

```typescript
// Запрос от мобильного приложения
const response = await fetch('/api/auth/sign-in/social', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI...', // ID Token от Google SDK
  }),
})
```

---

## Динамические scopes

Запрос дополнительных разрешений при входе:

```typescript
'use client'

import { signIn } from '@/lib/auth-client'

// Базовый вход
signIn.social({ provider: 'google' })

// Вход с дополнительными scopes (например, доступ к календарю)
signIn.social({
  provider: 'google',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
})
```

---

## Обработка данных провайдера

Получение данных от OAuth провайдера через хуки:

```typescript
export const auth = betterAuth({
  hooks: {
    after: [
      {
        matcher: (ctx) => ctx.path === '/sign-in/social/callback',
        handler: async (ctx) => {
          // Данные от провайдера
          const profile = ctx.context.socialProfile

          if (profile) {
            console.log('OAuth профиль:', profile)
            // Можно сохранить дополнительные данные
          }
        },
      },
    ],
  },
})
```

---

## UI компонент с несколькими провайдерами

```typescript
'use client'

import { signIn } from '@/lib/auth-client'
import { Button, Icon, VStack } from '@chakra-ui/react'
import { FaGithub, FaGoogle, FaVk, FaYandex } from 'react-icons/fa'

const providers = [
  { id: 'google', name: 'Google', icon: FaGoogle, color: 'red' },
  { id: 'yandex', name: 'Яндекс', icon: FaYandex, color: 'yellow' },
  { id: 'github', name: 'GitHub', icon: FaGithub, color: 'gray' },
  { id: 'vk', name: 'ВКонтакте', icon: FaVk, color: 'blue' },
] as const

export function SocialLogin() {
  return (
    <VStack gap={3}>
      {providers.map((provider) => (
        <Button
          key={provider.id}
          w="full"
          colorPalette={provider.color}
          onClick={() =>
            signIn.social({
              provider: provider.id,
              callbackURL: '/dashboard',
            })}
        >
          <Icon as={provider.icon} mr={2} />
          Войти через {provider.name}
        </Button>
      ))}
    </VStack>
  )
}
```

---

## Troubleshooting

### "Invalid redirect_uri"

Проверь настройки в консоли провайдера:

- Google: `https://your-domain.com/api/auth/callback/google`
- Yandex: `https://your-domain.com/api/auth/callback/yandex`

### "redirect_uri_mismatch"

`BETTER_AUTH_URL` должен совпадать с доменом в настройках провайдера.

### Нет email от провайдера

Некоторые провайдеры не возвращают email:

- VK не возвращает email без верификации
- Twitter/X не возвращает email по умолчанию

---

## См. также

- [nextjs-integration.md](nextjs-integration.md) — Route Handler
- [email-password.md](email-password.md) — Email/пароль вход
- [security-best-practices.md](security-best-practices.md) — Безопасность OAuth
