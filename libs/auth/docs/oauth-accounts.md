# Привязка OAuth аккаунтов

[← Назад к README](../README.md)

Библиотека предоставляет компоненты и хелперы для страницы управления связанными OAuth аккаунтами.

## ConnectedAccountsList

Клиентский компонент для отображения и управления привязанными OAuth аккаунтами.

```tsx
// apps/my-app/src/app/settings/connected-accounts/_components/client.tsx
'use client'

import type { AccountBase } from '@letar/auth'
import { ConnectedAccountsList } from '@letar/auth/client'
import { unlinkAccount } from '../_actions/unlink-account.action'

export function ConnectedAccountsClient({
  accounts,
  hasPassword,
  userEmail,
}: {
  accounts: AccountBase[]
  hasPassword: boolean
  userEmail: string
}) {
  return (
    <ConnectedAccountsList
      accounts={accounts}
      hasPassword={hasPassword}
      userEmail={userEmail}
      providers={['google', 'yandex', 'vk']}
      linkCallbackUrl="/settings/connected-accounts"
      changePasswordUrl="/settings/security"
      onUnlink={unlinkAccount}
    />
  )
}
```

### Props ConnectedAccountsList

| Prop                | Тип                                                    | По умолчанию                             | Описание                         |
| ------------------- | ------------------------------------------------------ | ---------------------------------------- | -------------------------------- |
| `accounts`          | `AccountBase[]`                                        | —                                        | Список связанных аккаунтов       |
| `hasPassword`       | `boolean`                                              | —                                        | Есть ли у пользователя пароль    |
| `userEmail`         | `string`                                               | —                                        | Email пользователя               |
| `providers`         | `OAuthProvider[]`                                      | `['google', 'yandex', 'vk', 'telegram']` | Провайдеры для отображения       |
| `linkCallbackUrl`   | `string`                                               | `/settings/connected-accounts`           | URL для редиректа после привязки |
| `changePasswordUrl` | `string`                                               | `/settings/change-password`              | URL страницы смены пароля        |
| `onUnlink`          | `(providerId: string) => Promise<UnlinkAccountResult>` | —                                        | Обработчик отвязки аккаунта      |
| `telegramWidget`    | `ReactNode`                                            | `undefined`                              | Кастомный виджет для Telegram    |
| `providerIcons`     | `Partial<Record<OAuthProvider, ReactNode>>`            | —                                        | Кастомные иконки                 |

## createUnlinkAccountAction

Server-side фабрика для создания Server Action отвязки OAuth аккаунта.

```typescript
// apps/my-app/src/app/settings/connected-accounts/_actions/unlink-account.action.ts
'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { createUnlinkAccountAction } from '@letar/auth/server'

export const unlinkAccount = createUnlinkAccountAction({
  getSession,
  getDb: (user) => getEnhancedPrisma(user),
  revalidatePath: '/settings/connected-accounts',
})
```

| Опция            | Тип                              | По умолчанию                   | Описание                     |
| ---------------- | -------------------------------- | ------------------------------ | ---------------------------- |
| `getSession`     | `() => Promise<Session \| null>` | —                              | Функция получения сессии     |
| `getDb`          | `(user) => PrismaClient`         | —                              | Функция получения БД клиента |
| `revalidatePath` | `string`                         | `/settings/connected-accounts` | Путь для ревалидации         |
| `logger`         | `Logger`                         | no-op                          | Логгер для отладки           |

## Иконки провайдеров

```tsx
import { GitHubIcon, GoogleIcon, TelegramIcon, VKIcon, YandexIcon } from '@letar/auth/client'
```

[← Назад к README](../README.md)
