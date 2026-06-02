# @letar/email

Универсальная библиотека для отправки email в монорепо Letar.

## Установка

Добавьте в `tsconfig.json` вашего приложения:

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/email": ["../../libs/email/src/index.ts"]
    }
  },
  "references": [{ "path": "../../libs/email" }]
}
```

## Быстрый старт

```typescript
import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'

// Отправка письма верификации
await sendVerificationEmail({
  to: 'user@example.com',
  userName: 'Иван',
  verificationUrl: 'https://app.com/verify/token123',
})

// Сброс пароля
await sendPasswordResetEmail({
  to: 'user@example.com',
  userName: 'Иван',
  resetUrl: 'https://app.com/reset/token123',
})
```

## Конфигурация

### Переменные окружения

**Общие для всех приложений (одинаковые):**

```env
# Сервер Maddy
SMTP_HOST=mail.letar.best
SMTP_PORT=587
SMTP_USER=noreply@letar.best
SMTP_PASSWORD=<пароль>
SMTP_SECURE=false

# Dev режим (Mailhog на localhost:1025)
EMAIL_USE_MAILHOG=false
```

**Индивидуальные для каждого приложения:**

```env
# Email отправителя
SMTP_FROM_EMAIL=noreply@app.letar.best
SMTP_FROM_NAME="Название приложения"

# Брендинг (опционально)
EMAIL_HEADER_COLOR=#2d3748
EMAIL_BUTTON_COLOR=#3182ce
EMAIL_HEADER_EMOJI=✉️

# URL для отписки (по умолчанию: {appUrl}/unsubscribe)
EMAIL_UNSUBSCRIBE_URL=https://app.com/unsubscribe
```

### Примеры конфигурации по приложениям

| Приложение      | SMTP_FROM_EMAIL              | SMTP_FROM_NAME    |
| --------------- | ---------------------------- | ----------------- |
| premium-rosstil | noreply@premium.rosstil.ru   | Premium Rosstil   |
| driving-school  | noreply@направа.рф           | Направа Автошкола |
| imot            | noreply@imot.letar.best      | IMOT              |
| kami            | noreply@kami.letar.best      | Ками              |
| mandala         | noreply@mandala.letar.best   | Мандала           |
| dashboard       | noreply@dashboard.letar.best | Dashboard         |

## API

### Функции отправки

#### `sendVerificationEmail(params, branding?)`

Письмо подтверждения email.

```typescript
await sendVerificationEmail({
  to: 'user@example.com',
  userName: 'Иван', // опционально
  verificationUrl: 'https://...',
  pin: '123456', // опционально — PIN вместо ссылки
})
```

#### `sendPasswordResetEmail(params, branding?)`

Письмо сброса пароля.

```typescript
await sendPasswordResetEmail({
  to: 'user@example.com',
  userName: 'Иван', // опционально
  resetUrl: 'https://...',
  expiresInMinutes: 60, // опционально, по умолчанию 60
})
```

#### `sendMagicLinkEmail(params, branding?)`

Magic Link для входа без пароля.

```typescript
await sendMagicLinkEmail({
  to: 'user@example.com',
  userName: 'Иван', // опционально
  magicLinkUrl: 'https://...',
  expiresInMinutes: 15, // опционально, по умолчанию 15
})
```

#### `sendInvitationEmail(params, branding?)`

Приглашение в организацию.

```typescript
await sendInvitationEmail({
  to: 'user@example.com',
  inviterName: 'Админ',
  organizationName: 'Моя команда',
  inviteUrl: 'https://...',
  role: 'Менеджер', // опционально
  expiresInDays: 7, // опционально
})
```

#### `sendGenericEmail(params, branding?)`

Произвольное письмо с базовым шаблоном.

```typescript
await sendGenericEmail({
  to: 'user@example.com',
  subject: 'Уведомление',
  heading: 'Новое уведомление',
  greeting: 'Привет, Иван!', // опционально
  body: 'У вас новое сообщение.',
  buttonText: 'Посмотреть', // опционально
  buttonUrl: 'https://...', // опционально
  footer: 'Это важное письмо', // опционально
})
```

### Брендинг

Второй аргумент всех функций — частичный объект брендинга для переопределения:

```typescript
await sendVerificationEmail(params, {
  appName: 'Мой App',
  appUrl: 'https://myapp.com',
  headerColor: '#ff6600',
  buttonColor: '#ff6600',
  headerEmoji: '🚀',
})
```

### Провайдер

```typescript
import { createEmailProvider, verifyConnection } from '@letar/email'

// Проверка подключения
const isConnected = await verifyConnection()
if (!isConnected) {
  console.error('SMTP недоступен')
}

// Прямая отправка через провайдер
const provider = createEmailProvider(getConfigFromEnv())
await provider.sendEmail({
  to: 'user@example.com',
  subject: 'Тема',
  html: '<p>HTML контент</p>',
  text: 'Текстовая версия',
})
```

## Интеграция с Better Auth

```typescript
// lib/auth.ts
import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  // ... конфиг

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        userName: user.name,
        verificationUrl: url,
      })
    },
  },

  emailAndPassword: {
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: url,
      })
    },
  },
})
```

## Разработка

### Mailhog

Для локальной разработки используйте Mailhog:

```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

Включите в `.env`:

```env
EMAIL_USE_MAILHOG=true
```

Письма будут доступны по адресу: http://localhost:8025

### Шаблоны

Библиотека экспортирует функции создания шаблонов для кастомизации:

```typescript
import {
  createBaseTemplate,
  createButton,
  createGreeting,
  createParagraph,
  createPinBlock,
  createWarning,
} from '@letar/email'

const html = createBaseTemplate({
  heading: 'Мой заголовок',
  content: `
    ${createGreeting('Иван')}
    ${createParagraph('Текст письма')}
    ${createButton('Нажми меня', 'https://...', '#3182ce')}
  `,
  branding: {
    appName: 'Мой App',
    appUrl: 'https://...',
    headerColor: '#2d3748',
    buttonColor: '#3182ce',
    headerEmoji: '✉️',
  },
})
```

## Архитектура

```
libs/email/
├── src/
│   ├── index.ts              # Экспорты
│   ├── types.ts              # TypeScript типы
│   ├── provider.ts           # Nodemailer провайдер
│   ├── service.ts            # Высокоуровневые функции
│   └── templates/
│       ├── base.ts           # Базовый HTML шаблон
│       ├── verification.ts   # Верификация email
│       ├── password-reset.ts # Сброс пароля
│       ├── magic-link.ts     # Magic link
│       └── invitation.ts     # Приглашение
├── package.json
├── project.json
├── tsconfig.json
└── README.md
```
