# Form Components Offline

Оффлайн-поддержка форм через `@letar/forms/offline`.

## useOfflineForm

Основной хук для создания форм с оффлайн-поддержкой.

```typescript
import { useAppForm } from '@letar/forms'
import { useOfflineForm } from '@letar/forms/offline'

const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<FormData>({
  actionType: 'UPDATE_PROFILE',
  onlineSubmit: async (value) => {
    const result = await updateProfileAction(value)
    return result.success ? { success: true } : { success: false, error: result.error?.formErrors?.[0] }
  },
  onSuccess: () => toaster.success({ title: 'Сохранено' }),
  onQueued: () => toaster.info({ title: 'Сохранено локально' }),
  onError: (error) => toaster.error({ title: error }),
})

const form = useAppForm({
  defaultValues: initialData,
  onSubmit: async ({ value }) => await submit(value),
})
```

### UseOfflineFormOptions

| Параметр       | Тип                                        | Описание                               |
| -------------- | ------------------------------------------ | -------------------------------------- |
| `actionType`   | `SyncActionType`                           | Тип действия для очереди синхронизации |
| `onlineSubmit` | `(value: T) => Promise<{success, error?}>` | Обработчик онлайн отправки             |
| `onSuccess`    | `() => void`                               | Callback при успешной отправке         |
| `onQueued`     | `() => void`                               | Callback при добавлении в очередь      |
| `onError`      | `(error: string) => void`                  | Callback при ошибке                    |

### UseOfflineFormResult

| Поле              | Тип                                          | Описание                              |
| ----------------- | -------------------------------------------- | ------------------------------------- |
| `submit`          | `(value: T) => Promise<OfflineSubmitResult>` | Функция отправки формы                |
| `isOffline`       | `boolean`                                    | Текущий статус оффлайн                |
| `pendingCount`    | `number`                                     | Количество ожидающих синхронизации    |
| `queueLength`     | `number`                                     | Общее количество элементов в очереди  |
| `isProcessing`    | `boolean`                                    | Идёт ли обработка очереди             |
| `lastSyncAttempt` | `number \| null`                             | Время последней попытки синхронизации |

---

## SyncActionType расширение

Типы действий расширяются через declaration merging:

```typescript
// src/types/sync-actions.d.ts
declare module '@letar/forms/offline' {
  interface SyncActionTypeRegistry {
    BOOK_LESSON: true
    UPDATE_INSTRUCTOR_PROFILE: true
    CANCEL_BOOKING: true
  }
}
```

### Базовые типы

```typescript
type BaseSyncActionType = 'FORM_SUBMIT' | 'FORM_UPDATE' | 'FORM_DELETE'
```

---

## Полный пример формы

```tsx
'use client'

import { toaster } from '@/components/ui/toaster'
import { Box, Button, Fieldset, HStack, Stack } from '@chakra-ui/react'
import { useAppForm } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus, useOfflineForm } from '@letar/forms/offline'
import { LuCloudOff, LuSave } from 'react-icons/lu'

import { ProfileFormSchema } from './_schemas/profile.schema'
import { updateProfileAction } from './actions'

interface ProfileFormProps {
  initialData: z.infer<typeof ProfileFormSchema>
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm({
    actionType: 'UPDATE_PROFILE',
    onlineSubmit: async (value) => {
      const result = await updateProfileAction(value)
      return result.success ? { success: true } : { success: false, error: result.error?.formErrors?.[0] }
    },
    onSuccess: () => toaster.success({ title: 'Профиль сохранён' }),
    onQueued: () => toaster.info({ title: 'Сохранено локально, синхронизируем позже' }),
    onError: (error) => toaster.error({ title: 'Ошибка', description: error }),
  })

  const form = useAppForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      await submit(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <Fieldset.Root>
        <Stack gap={4}>
          {/* Индикаторы статуса */}
          <HStack>
            <FormOfflineIndicator label="Оффлайн" />
            <FormSyncStatus pendingLabel={(count) => `Ожидает: ${count}`} />
          </HStack>

          {/* Поля формы */}
          <form.AppField name="name" children={(field) => <field.TextField label="Имя" />} />
          <form.AppField name="email" children={(field) => <field.TextField label="Email" type="email" />} />
          <form.AppField name="phone" children={(field) => <field.PhoneField label="Телефон" />} />

          {/* Кнопка отправки */}
          <Button type="submit" colorPalette={isOffline ? 'orange' : 'blue'}>
            {isOffline ? <LuCloudOff /> : <LuSave />}
            {isOffline ? 'Сохранить локально' : 'Сохранить'}
          </Button>
        </Stack>
      </Fieldset.Root>
    </form>
  )
}
```

---

## Жизненный цикл

```
┌─────────────────────────────────────────────────────────────┐
│                    Отправка формы                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌───────────────┐                       │
│  │   submit()  │───▶│  isOffline?   │                       │
│  └─────────────┘    └───────────────┘                       │
│                            │                                │
│           ┌────────────────┼────────────────┐               │
│           ▼                                 ▼               │
│    ┌─────────────┐                  ┌─────────────┐         │
│    │  Оффлайн    │                  │   Онлайн    │         │
│    │ addAction() │                  │onlineSubmit │         │
│    └─────────────┘                  └─────────────┘         │
│           │                                 │               │
│           ▼                                 ▼               │
│    ┌─────────────┐                  ┌─────────────┐         │
│    │  IndexedDB  │                  │   Сервер    │         │
│    │   очередь   │                  │   ответ     │         │
│    └─────────────┘                  └─────────────┘         │
│           │                                 │               │
│           ▼                                 ▼               │
│    ┌─────────────┐                  ┌─────────────┐         │
│    │ onQueued()  │                  │ onSuccess() │         │
│    └─────────────┘                  │ onError()   │         │
│                                     └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Автосинхронизация

При восстановлении соединения `useOfflineForm` автоматически:

1. Проверяет `isOffline === false && pendingCount > 0`
2. Вызывает `processQueue()` с `handleQueuedAction`
3. Фильтрует действия по `actionType`
4. Отправляет через `onlineSubmit()`
5. Удаляет успешные из очереди
6. Логирует неудачные

---

## Интеграция с Server Actions

```typescript
// app/profile/_actions/update-profile.ts
'use server'

import { actionClient } from '@/lib/safe-action'
import { ProfileFormSchema } from '../_schemas/profile.schema'

export const updateProfileAction = actionClient.schema(ProfileFormSchema).action(async ({ parsedInput, ctx }) => {
  const db = await getEnhancedPrisma(ctx.session.user)

  await db.user.update({
    where: { id: ctx.session.user.id },
    data: parsedInput,
  })

  return { success: true }
})
```

---

## См. также

- [sync-queue.md](sync-queue.md) — useSyncQueue хук
- [hooks.md](hooks.md) — useOfflineStatus
- [ui-components.md](ui-components.md) — FormOfflineIndicator, FormSyncStatus
