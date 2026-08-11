# Tier 1/Tier 2 — informed-consent и self-service OAuth-ключи

[← Назад к README](../README.md)

Контекст: [modes.md § Tier 2 — self-service соц-секреты владельца](./modes.md#tier-2--self-service-соц-секреты-владельца-socialsource-db).

## AuthModeSettings — Tier 1/Tier 2 informed-consent

Готовая страница сравнения режимов авторизации для standalone-приложений (Tier 2 = свои ключи,
Tier 1 = переход на Ключницу как hub-client). Компонент **только фиксирует запрос** — сам
переход не автоматизирован (смена режима = миграция identity, требует правки `lib/auth.ts`,
регистрации hub-клиента и переноса данных, не рантайм-флаг).

Извлечён в libs после третьего дословного дубля (dsperevod → aboi → driving-school) — три
приложения имели ~90% идентичный код страницы. Data-fetching (какая таблица аудита, ZenStack vs
raw Prisma) остаётся в приложении; переиспользуется только презентационная часть + чекбокс-форма.

```tsx
// app/admin/settings/auth-mode/page.tsx
import { AuthModeSettings } from '@letar/auth/client'

import { requireAdmin } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'
import { requestAuthModeMigration } from '../../_actions/auth-mode.action'

export default async function AuthModeSettingsPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const requests = await db.auditLog.findMany({
    where: { action: 'REQUEST_AUTH_MODE_MIGRATION' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <AuthModeSettings
      currentModeLabel="Tier 2 — Standalone (свои ключи)"
      tier2Points={['Свой домен и бренд входа', 'Соц-вход через собственные OAuth-приложения']}
      tier1Points={[
        { text: 'Вход делегируется Ключнице (auth.letar.best)' },
        { text: 'user.id меняется на идентификатор Ключницы — требуется миграция данных', emphasized: true },
      ]}
      requests={requests.map((r) => ({ id: r.id, name: r.user.name, email: r.user.email, createdAt: r.createdAt }))}
      onRequest={requestAuthModeMigration}
    />
  )
}
```

```typescript
// _actions/auth-mode.action.ts — остаётся в приложении, не выносится
'use server'
export async function requestAuthModeMigration(acknowledgedRisks: boolean) {
  const user = await requireAdmin()
  if (!acknowledgedRisks) { return { error: 'Нужно подтвердить ознакомление с рисками перехода' } }
  await db.auditLog.create({
    data: { action: 'REQUEST_AUTH_MODE_MIGRATION', userId: user.id /* ... */ },
  })
  revalidatePath('/admin/settings/auth-mode/')
  return { data: null }
}
```

### Props AuthModeSettings

| Prop               | Тип                                                                | Описание                                                                                                    |
| ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `currentModeLabel` | `string`                                                           | Ярлык текущего режима, например `"Tier 2 — Standalone (свои ключи)"`                                        |
| `tier2Points`      | `string[]`                                                         | Пункты карточки «Текущий выбор» (Tier 2)                                                                    |
| `tier1Points`      | `{ text: string; emphasized?: boolean }[]`                         | Пункты карточки «Альтернатива» (Tier 1); `emphasized` — выделить оранжевым                                  |
| `requests`         | `{ id, name: string \| null, email, createdAt: Date }[]`           | История запросов, уже отсортированная по убыванию даты                                                      |
| `onRequest`        | `(acknowledgedRisks: boolean) => Promise<{error?} \| {data:null}>` | Server action — фиксирует informed-consent запрос                                                           |
| `successMessage?`  | `string`                                                           | Текст алерта после успешной фиксации (переопределить для доп. рисков — например VK/Yandex у driving-school) |
| `footer?`          | `ReactNode`                                                        | Доп. контент под таблицей (например ссылка на общий журнал аудита)                                          |

> Полные примеры: [`apps/dsperevod`](../../../apps/dsperevod/src/app/(admin)/admin/settings/auth-mode/page.tsx),
> [`apps/aboi`](../../../apps/aboi/src/app/[locale]/admin/settings/auth-mode/page.tsx),
> [`apps/driving-school`](../../../apps/driving-school/src/app/(owner)/owner/settings/auth-mode/page.tsx).

## SocialProvidersSettings — self-service OAuth-ключи (Tier 2)

Список + форма создания/редактирования/удаления Tier 2 OAuth-провайдеров (`clientId`/`clientSecret`
шифруется at-rest AES-256-GCM) и фабрика 4 server actions. Извлечено после третьего дословного
дубля (dsperevod → aboi → driving-school) — тот же приём, что и для `AuthModeSettings` выше.

Presentational-компоненты (`SocialProvidersList`, `SocialProviderForm`) не знают о Prisma/auth —
получают данные и server-action-колбэки пропсами, реализованы на чистом React (`useState`/
`useTransition` + примитивы Chakra), **не через `@letar/forms`** — библиотека не может зависеть от
app-specific `createForm()` инстанса (тот же компромисс, что уже принят для `AuthModeRequestForm`).
Server action-фабрика `createSocialProviderActions` не завязана на конкретный Prisma-клиент (raw
vs ZenStack-enhanced) или конкретную сигнатуру auth-guard — принимает структурные функции
`requireAuth`/`getDb`/`encryptionKey`.

Data-fetching, page-layout, `schema.zmodel` модели `SocialProvider` и подключение провайдеров в
`lib/auth.ts` остаются в приложении.

```tsx
// app/admin/social-providers/page.tsx
import { SocialProvidersList } from '@letar/auth/client'

import { requireAdmin } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'

export default async function SocialProvidersPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)
  const providers = await db.socialProvider.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <SocialProvidersList
      providers={providers}
      providerLabels={{ google: 'Google', vk: 'VK' }}
      newHref="/admin/social-providers/new"
      editHref={(id) => `/admin/social-providers/${id}`}
    />
  )
}
```

```tsx
// app/admin/social-providers/new/page.tsx (и [id]/page.tsx — аналогично, с id + secretHint)
import { SocialProviderForm } from '@letar/auth/client'

import { createSocialProvider } from '../_actions/social-provider.action'

export default function NewSocialProviderPage() {
  return (
    <SocialProviderForm
      initialValue={{ providerId: 'google', clientId: '', enabled: true }}
      providerOptions={[
        { value: 'google', label: 'Google' },
        { value: 'vk', label: 'VK' },
      ]}
      onSubmit={createSocialProvider}
      successHref="/admin/social-providers"
    />
  )
}
```

```typescript
// _actions/social-provider.action.ts
'use server'
import { createSocialProviderActions, getEncryptionKey } from '@letar/auth/server'

import { requireAdmin } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'

export const { createSocialProvider, updateSocialProvider, deleteSocialProvider, getSocialProviderSecretHint } =
  createSocialProviderActions({
    requireAuth: () => requireAdmin(),
    getDb: (user) => getEnhancedPrisma(user),
    encryptionKey: () => getEncryptionKey(),
    basePath: '/admin/social-providers',
  })
```

> Если приложение не может себе позволить строгий fail-fast при отсутствии `AUTH_ENCRYPTION_KEY`
> (например уже работающий в проде Tier2-соц-вход на env-переменных, который не должен падать
> целиком) — используйте `tryGetEncryptionKey()` вместо `getEncryptionKey()`: возвращает `null`
> вместо исключения, `createSocialProviderActions` в этом случае отдаёт понятную ошибку
> (`keyMissingMessage`) вместо падения. См. `apps/driving-school/src/lib/auth.ts`.

### Props `SocialProvidersList`

| Prop              | Тип                      | Описание                                                                        |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `providers`       | `SocialProviderRow[]`    | Список провайдеров из БД                                                        |
| `providerLabels?` | `Record<string, string>` | Подписи для отображения (по умолчанию Google/VK/Yandex/Telegram)                |
| `newHref`         | `string`                 | Ссылка на страницу создания                                                     |
| `editHref`        | `(id: string) => string` | Строит ссылку на страницу редактирования                                        |
| `description?`    | `ReactNode`              | Текст-подводка над таблицей (переопределить для доп. упоминаний — напр. Yandex) |
| `emptyMessage?`   | `string`                 | Текст при пустом списке                                                         |

### Props `SocialProviderForm`

| Prop                    | Тип                                                                  | Описание                                                 |
| ----------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| `id?`                   | `string`                                                             | Есть при редактировании, отсутствует при создании        |
| `initialValue`          | `SocialProviderInput`                                                | Начальные значения полей                                 |
| `secretHint?`           | `string \| null`                                                     | Маска текущего секрета (`••••1234`)                      |
| `providerOptions`       | `{ value: string; label: string }[]`                                 | Список провайдеров для Select — набор отличается per-app |
| `alertDescription?`     | `ReactNode`                                                          | Текст предупреждения о владении/рисках                   |
| `onSubmit`              | `(data: SocialProviderInput) => Promise<SocialProviderActionResult>` | Server action create/update                              |
| `onDelete?`             | `(id: string) => Promise<void>`                                      | Server action delete                                     |
| `successHref`           | `string`                                                             | Куда перейти после успеха                                |
| `deleteConfirmMessage?` | `string`                                                             | Текст `confirm()` перед удалением                        |

### Опции `createSocialProviderActions`

| Опция                  | Тип                                             | По умолчанию                                         |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `requireAuth`          | `() => Promise<TUser \| null>`                  | —                                                    |
| `getDb`                | `(user: TUser) => PrismaWithSocialProviderCrud` | —                                                    |
| `encryptionKey`        | `() => Buffer \| null`                          | —                                                    |
| `basePath`             | `string`                                        | —                                                    |
| `unauthorizedMessage?` | `string`                                        | `'Требуется авторизация'`                            |
| `keyMissingMessage?`   | `string`                                        | `'AUTH_ENCRYPTION_KEY не настроен на сервере — ...'` |

> Полные примеры: [`apps/dsperevod`](../../../apps/dsperevod/src/app/(admin)/admin/social-providers/),
> [`apps/aboi`](../../../apps/aboi/src/app/[locale]/admin/social-providers/),
> [`apps/driving-school`](../../../apps/driving-school/src/app/(owner)/owner/settings/social-providers/).

[← Назад к README](../README.md)
