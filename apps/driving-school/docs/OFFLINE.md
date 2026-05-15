# PWA и Оффлайн-режим: Платформа для автошкол

> Progressive Web App, Service Worker, синхронизация данных

---

## Содержание

1. [Обзор PWA](#обзор-pwa)
2. [Service Worker](#service-worker)
3. [Оффлайн-режим](#оффлайн-режим)
4. [Синхронизация данных](#синхронизация-данных)
5. [Стратегии кэширования](#стратегии-кэширования)
6. [Установка приложения](#установка-приложения)

---

## Обзор PWA

Платформа реализована как Progressive Web App с поддержкой:

- ✅ Установка на домашний экран
- ✅ Оффлайн-режим (просмотр кэшированных данных)
- ✅ Очередь действий (запись, отмена, подтверждение)
- ✅ Фоновая синхронизация
- ✅ Push-уведомления

### Манифест приложения

```json
{
  "name": "Driving School Platform",
  "short_name": "DriveSchool",
  "description": "Платформа для управления автошколами",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#CA9E67",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Service Worker

Service Worker обрабатывает:

- Кэширование статических ресурсов
- Кэширование API-ответов
- Фоновую синхронизацию
- Push-уведомления

### Регистрация

```typescript
// src/app/layout.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('SW registered:', registration)
    })
    .catch((error) => {
      console.error('SW registration failed:', error)
    })
}
```

### Стратегии

| Тип ресурса       | Стратегия     | Описание                            |
| ----------------- | ------------- | ----------------------------------- |
| HTML страницы     | Network-first | Всегда пытаться загрузить с сервера |
| API данные        | Network-first | Кэш как fallback                    |
| Статика (JS, CSS) | Cache-first   | Обновление в фоне                   |
| Изображения       | Cache-first   | Долговременное хранение             |

---

## Оффлайн-режим

### Что доступно оффлайн

| Функция             | Статус | Описание                |
| ------------------- | ------ | ----------------------- |
| Просмотр профиля    | ✅     | Кэшируется при загрузке |
| Список контактов    | ✅     | Инструкторы/ученики     |
| Расписание (7 дней) | ✅     | Слоты и занятия         |
| Просмотр занятий    | ✅     | История занятий         |
| Запись на занятие   | 🔄     | В очередь               |
| Отмена занятия      | 🔄     | В очередь               |
| Подтверждение       | 🔄     | В очередь               |
| Push-уведомления    | ✅     | Работают                |

### Что недоступно оффлайн

- ❌ Настройки профиля
- ❌ Управление расписанием
- ❌ Приглашения учеников
- ❌ Финансовые операции
- ❌ Создание школы
- ❌ Чаты (требуют WebSocket)

---

## Оффлайн-формы с TanStack Form

### UI-библиотека форм

Для унификации форм во всём монорепозитории создана библиотека `libs/forms` с предварительно связанными компонентами:

```typescript
import { useAppForm, withForm } from '@letar/forms'
import { useFieldContext, useFormContext } from '@letar/forms'
```

Подробнее см. [/.claude/docs/forms.md](../../../.claude/docs/forms.md)

### Хук useOfflineForm

Для форм с TanStack Form создан хук `useOfflineForm`, который автоматически:

- Определяет статус соединения
- Отправляет данные напрямую, если онлайн
- Сохраняет в очередь IndexedDB, если оффлайн
- Синхронизирует при восстановлении соединения

### Использование с useAppForm (рекомендуется)

```typescript
import { useAppForm } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus, useOfflineForm } from '@letar/forms/offline'

interface ProfileFormData {
  name: string
  bio: string
  isPublic: boolean
}

function ProfileForm({ initialData }) {
  const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<ProfileFormData>({
    actionType: 'UPDATE_INSTRUCTOR_PROFILE',
    onlineSubmit: async (value) => {
      const formData = new FormData()
      formData.set('name', value.name)
      formData.set('bio', value.bio)
      formData.set('isPublic', value.isPublic ? 'true' : 'false')

      const result = await updateProfileAction(undefined, formData)
      return result?.success
        ? { success: true }
        : { success: false, error: result?.error?.formErrors?.[0] }
    },
    onSuccess: () => toaster.success({ title: 'Профиль обновлён' }),
    onQueued: () => toaster.info({ title: 'Сохранено локально' }),
    onError: (error) => toaster.error({ title: 'Ошибка', description: error }),
  })

  const form = useAppForm({
    defaultValues: {
      name: initialData?.name ?? '',
      bio: initialData?.bio ?? '',
      isPublic: initialData?.isPublic ?? false,
    },
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
      {/* Индикатор оффлайн режима */}
      {(isOffline || pendingCount > 0) && (
        <HStack gap={2} mb={4}>
          {isOffline && <Badge colorPalette="orange">Оффлайн режим</Badge>}
          {pendingCount > 0 && (
            <Badge colorPalette="blue">
              {isProcessing ? 'Синхронизация...' : `Ожидает: ${pendingCount}`}
            </Badge>
          )}
        </HStack>
      )}

      {/* Поля с предварительно связанными компонентами */}
      <form.AppField name="name" children={(field) => <field.TextField label="Имя" />} />
      <form.AppField name="bio" children={(field) => <field.TextareaField label="О себе" />} />
      <form.AppField name="isPublic" children={(field) => <field.SwitchField label="Публичный профиль" />} />

      {/* Кнопка с адаптивным текстом */}
      <form.AppForm
        children={(formApi) => (
          <formApi.SubmitButton>
            {isOffline ? 'Сохранить локально' : 'Сохранить'}
          </formApi.SubmitButton>
        )}
      />
    </form>
  )
}
```

### Использование с useForm напрямую

```typescript
import { useOfflineForm } from '@letar/forms/offline'
import { useForm } from '@tanstack/react-form'

function ProfileForm({ initialData }) {
  const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<ProfileFormData>({
    // ... options
  })

  const form = useForm({
    defaultValues: {/* ... */},
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
      <form.Field name="name">
        {(field) => (
          <Field.Root invalid={field.state.meta.errors.length > 0}>
            <Field.Label>Имя</Field.Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <Field.ErrorText>{field.state.meta.errors.join(', ')}</Field.ErrorText>
            )}
          </Field.Root>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" loading={isSubmitting}>
            {isOffline ? 'Сохранить локально' : 'Сохранить'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
```

### API useOfflineForm

```typescript
interface UseOfflineFormOptions<T> {
  /** Тип действия для очереди синхронизации */
  actionType: SyncActionType
  /** Обработчик онлайн отправки (вызывается при наличии соединения) */
  onlineSubmit: (value: T) => Promise<{ success: boolean; error?: string }>
  /** Callback при успешной отправке */
  onSuccess?: () => void
  /** Callback при добавлении в очередь (оффлайн) */
  onQueued?: () => void
  /** Callback при ошибке */
  onError?: (error: string) => void
}

interface UseOfflineFormResult<T> {
  /** Функция отправки формы */
  submit: (value: T) => Promise<OfflineSubmitResult>
  /** Текущий статус оффлайн */
  isOffline: boolean
  /** Количество ожидающих синхронизации действий */
  pendingCount: number
  /** Общее количество элементов в очереди */
  queueLength: number
  /** Идёт ли обработка очереди */
  isProcessing: boolean
  /** Время последней попытки синхронизации */
  lastSyncAttempt: number | null
}
```

### Типы действий синхронизации

```typescript
export type SyncActionType =
  | 'BOOK_LESSON'
  | 'CANCEL_LESSON'
  | 'CONFIRM_LESSON'
  | 'COMPLETE_LESSON'
  | 'MARK_NO_SHOW'
  | 'UPDATE_INSTRUCTOR_PROFILE'
  | 'UPDATE_STUDENT_PROFILE'
  | 'UPDATE_SCHOOL_SETTINGS'
  | 'UPDATE_SCHEDULE_SETTINGS'
```

### Миграция форм на оффлайн

Чтобы добавить оффлайн-поддержку в форму TanStack Form:

1. Импортировать `useOfflineForm` из `@letar/forms/offline`
2. Определить тип данных формы (interface)
3. Добавить actionType в `SyncActionType` (если новый тип)
4. Обернуть вызов Server Action в `onlineSubmit`
5. Добавить индикатор оффлайн режима в UI
6. Адаптировать текст кнопки сохранения

---

## Синхронизация данных

### Архитектура

```
┌─────────────────┐
│   UI Component  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Offline Queue  │  ← LocalStorage/IndexedDB
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sync Manager    │  ← Background Sync API
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Server    │
└─────────────────┘
```

### Модель очереди (OfflineQueue)

```typescript
interface OfflineQueueItem {
  id: string // UUID
  userId: string
  action: 'CREATE_LESSON' | 'CANCEL_LESSON' | 'CONFIRM_LESSON'
  payload: Record<string, unknown>
  status: 'PENDING' | 'SYNCED' | 'FAILED'
  createdAt: Date
  syncedAt?: Date
  error?: string
}
```

### Процесс синхронизации

1. **Оффлайн-действие:**
   - Пользователь создаёт занятие без интернета
   - Запись добавляется в `OfflineQueue` со статусом `PENDING`
   - UI показывает индикатор "⏳ Ожидает синхронизации"

2. **Появление соединения:**
   - Service Worker ловит событие `online`
   - Запускается Background Sync
   - Элементы очереди отправляются на сервер

3. **Успешная синхронизация:**
   - Статус меняется на `SYNCED`
   - UI обновляется
   - Запись удаляется из очереди через 24 часа

4. **Ошибка синхронизации:**
   - Статус меняется на `FAILED`
   - Сохраняется текст ошибки
   - Пользователь видит уведомление

### Хук синхронизации

```typescript
// src/app/_hooks/use-offline-sync.ts
export function useOfflineSync() {
  const syncQueue = async () => {
    const items = await getOfflineQueue()

    for (const item of items) {
      try {
        await syncItem(item)
        await markAsSynced(item.id)
      } catch (error) {
        await markAsFailed(item.id, error.message)
      }
    }
  }

  return { syncQueue }
}
```

---

## Стратегии кэширования

### IndexedDB структура

```typescript
// База данных: DrivingSchoolCache
interface CachedProfile {
  id: string
  data: User
  timestamp: number
  expiresAt: number
}

interface CachedSchedule {
  instructorId: string
  startDate: string
  endDate: string
  slots: TimeSlot[]
  timestamp: number
  expiresAt: number
}

interface CachedLessons {
  userId: string
  role: 'student' | 'instructor'
  lessons: Lesson[]
  timestamp: number
  expiresAt: number
}
```

### TTL (Time To Live)

| Тип данных | TTL    | Обновление    |
| ---------- | ------ | ------------- |
| Профиль    | 1 час  | При изменении |
| Контакты   | 30 мин | При изменении |
| Расписание | 15 мин | При изменении |
| Занятия    | 10 мин | При изменении |
| Статика    | 7 дней | При деплое    |

---

## Установка приложения

### Поддержка платформ

| Платформа        | Поддержка | Примечания           |
| ---------------- | --------- | -------------------- |
| Android (Chrome) | ✅        | Полная поддержка PWA |
| iOS (Safari 16+) | ✅        | Ограничения push     |
| Windows (Edge)   | ✅        | Полная поддержка     |
| macOS (Safari)   | ✅        | Ограничения push     |
| Linux (Chrome)   | ✅        | Полная поддержка     |

### Критерии установки

Приложение можно установить если:

1. ✅ Есть валидный `manifest.json`
2. ✅ Есть Service Worker
3. ✅ Сайт использует HTTPS
4. ✅ Есть иконки 192x192 и 512x512

### Промпт установки

```typescript
// src/app/_components/install-prompt.tsx
let deferredPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  // Показать кнопку "Установить приложение"
})

const handleInstall = async () => {
  if (!deferredPrompt) return

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice

  if (outcome === 'accepted') {
    console.log('Приложение установлено')
  }

  deferredPrompt = null
}
```

---

## Оптимизация для мобильных

### Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
```

### Theme color

```html
<meta name="theme-color" content="#CA9E67" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1A202C" />
```

### Apple Meta Tags

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="DriveSchool" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

## Отладка PWA

### Инструменты

1. **Chrome DevTools → Application**
   - Manifest
   - Service Workers
   - Storage (IndexedDB, Cache)
   - Offline mode

2. **Lighthouse**
   - PWA Audit
   - Performance
   - Accessibility

3. **Service Worker logs**

```typescript
// sw.js
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
})

self.addEventListener('fetch', (event) => {
  console.log('[SW] Fetch:', event.request.url)
})
```

---

## Лучшие практики

### Do's ✅

- Показывать индикатор оффлайн-режима
- Кэшировать критичные данные
- Использовать оптимистичные UI-обновления
- Информировать о синхронизации
- Версионировать кэш при деплое

### Don'ts ❌

- Не кэшировать чувствительные данные (пароли, токены)
- Не блокировать UI при синхронизации
- Не скрывать статус синхронизации
- Не кэшировать навсегда (использовать TTL)
- Не игнорировать ошибки синхронизации

---

## Метрики PWA

### Lighthouse Score

| Метрика        | Цель | Текущее |
| -------------- | ---- | ------- |
| PWA Score      | 100  | 95+     |
| Performance    | 90+  | 85+     |
| Accessibility  | 95+  | 95+     |
| Best Practices | 95+  | 95+     |

### Использование

| Метрика                | Значение           |
| ---------------------- | ------------------ |
| Установок PWA          | 60%+ пользователей |
| Оффлайн-запросов       | 5-10%              |
| Успешная синхронизация | 98%+               |

---

## Будущие улучшения

### Планируется

- [ ] Periodic Background Sync (для обновления расписания)
- [ ] Web Share API (поделиться приглашением)
- [ ] File System Access API (сохранение Excel-отчётов)
- [ ] Contacts API (добавление учеников из контактов)
- [ ] Badging API (счётчик уведомлений на иконке)

---

## Связанные документы

- [../PLAN.md](../PLAN.md) — требования к PWA (Фаза 2)
- [SECURITY.md](./SECURITY.md) — безопасность в оффлайн-режиме
- [DATABASE.md](./DATABASE.md) — модели очереди синхронизации
