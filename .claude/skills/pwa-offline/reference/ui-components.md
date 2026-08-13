# UI Components

Компоненты для отображения оффлайн-статуса и синхронизации.

## FormOfflineIndicator

Индикатор оффлайн режима. Автоматически скрывается при онлайн.

```tsx
import { FormOfflineIndicator } from '@letar/forms/offline'

// Базовое использование
<FormOfflineIndicator />

// С настройками
<FormOfflineIndicator
  label="Нет связи"
  colorPalette="red"
  variant="solid"
/>
```

### Props

| Prop           | Тип                                | По умолчанию      | Описание         |
| -------------- | ---------------------------------- | ----------------- | ---------------- |
| `label`        | `string`                           | `'Оффлайн режим'` | Текст индикатора |
| `colorPalette` | `string`                           | `'orange'`        | Цветовая палитра |
| `variant`      | `'subtle' \| 'solid' \| 'outline'` | `'subtle'`        | Вариант Badge    |

### Реализация

```tsx
export function FormOfflineIndicator({
  label = 'Оффлайн режим',
  colorPalette = 'orange',
  variant = 'subtle',
  ...rest
}: OfflineIndicatorProps & BadgeProps) {
  const isOffline = useOfflineStatus()

  if (!isOffline) {
    return null
  }

  return (
    <Badge colorPalette={colorPalette} variant={variant} {...rest}>
      <HStack gap={1}>
        <Icon asChild boxSize={3}>
          <LuWifiOff />
        </Icon>
        <span>{label}</span>
      </HStack>
    </Badge>
  )
}
```

---

## FormSyncStatus

Индикатор статуса синхронизации очереди.

```tsx
import { FormSyncStatus } from '@letar/forms/offline'

// Базовое использование
<FormSyncStatus />

// С настройками
<FormSyncStatus
  showWhenEmpty={false}
  syncingLabel="Синхронизация..."
  pendingLabel={(count) => `Ожидает: ${count}`}
  syncedLabel="Всё синхронизировано"
/>
```

### Props

| Prop            | Тип                           | По умолчанию            | Описание                       |
| --------------- | ----------------------------- | ----------------------- | ------------------------------ |
| `showWhenEmpty` | `boolean`                     | `false`                 | Показывать когда очередь пуста |
| `syncingLabel`  | `string`                      | `'Синхронизация...'`    | Текст при синхронизации        |
| `pendingLabel`  | `string \| (count) => string` | `(n) => 'Ожидает: {n}'` | Текст ожидающих                |
| `syncedLabel`   | `string`                      | `'Синхронизировано'`    | Текст когда синхронизировано   |
| `colorPalette`  | `string`                      | `'blue'`                | Цветовая палитра               |

### Состояния

| Состояние        | Цвет   | Иконка  | Описание                |
| ---------------- | ------ | ------- | ----------------------- |
| Синхронизация    | blue   | Spinner | Идёт обработка очереди  |
| Ожидает          | orange | Clock   | Есть элементы в очереди |
| Синхронизировано | green  | Check   | Очередь пуста           |

### Использование в header

```tsx
// app/_components/header.tsx
import { FormSyncStatus } from '@letar/forms/offline'

export function Header() {
  return (
    <header>
      <Logo />
      <Navigation />
      <HStack>
        <FormSyncStatus />
        <UserMenu />
      </HStack>
    </header>
  )
}
```

---

## OnlineStatusBanner

Баннер, появляющийся при потере/восстановлении связи:

```tsx
'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { Box, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function OnlineStatusBanner() {
  const isOnline = useOnlineStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
      setShowBanner(true)
    } else if (wasOffline) {
      // Показываем "Соединение восстановлено" на 3 секунды
      setShowBanner(true)
      const timer = setTimeout(() => {
        setShowBanner(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (!showBanner) {
    return null
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg={isOnline ? 'green.500' : 'orange.500'}
      color="white"
      py={2}
      textAlign="center"
      zIndex="banner"
    >
      <Text fontWeight="medium">{isOnline ? 'Соединение восстановлено' : 'Нет подключения к интернету'}</Text>
    </Box>
  )
}
```

---

## OfflineIndicator (Portal)

Глобальный индикатор в углу экрана:

```tsx
'use client'

import { Badge, Box, HStack, Portal, Spinner } from '@chakra-ui/react'
import { useOfflineStatus, useSyncQueue } from '@letar/forms/offline'
import { LuCloud, LuCloudOff } from 'react-icons/lu'

export function OfflineIndicator() {
  const isOffline = useOfflineStatus()
  const { pendingCount, isProcessing } = useSyncQueue()

  // Скрываем если онлайн и очередь пуста
  if (!isOffline && pendingCount === 0 && !isProcessing) {
    return null
  }

  return (
    <Portal>
      <Box position="fixed" bottom={4} left={4} zIndex="docked">
        <HStack gap={2}>
          {isOffline && (
            <Badge colorPalette="orange" variant="solid">
              <HStack gap={1}>
                <LuCloudOff />
                <span>Оффлайн</span>
              </HStack>
            </Badge>
          )}

          {pendingCount > 0 && (
            <Badge colorPalette={isProcessing ? 'blue' : 'yellow'}>
              <HStack gap={1}>
                {isProcessing ? <Spinner size="xs" /> : <LuCloud />}
                <span>{pendingCount} ожидает</span>
              </HStack>
            </Badge>
          )}
        </HStack>
      </Box>
    </Portal>
  )
}
```

---

## StorageInfo

Виджет информации о хранилище:

```tsx
'use client'

import { useStorageQuota } from '@/hooks/use-storage-quota'
import { Progress, Stack, Text } from '@chakra-ui/react'

export function StorageInfo() {
  const quota = useStorageQuota()

  if (!quota) {
    return null
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) { return `${bytes} B` }
    if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB` }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <Stack gap={2}>
      <Text fontSize="sm" color="fg.muted">
        Использовано {formatBytes(quota.used)} из {formatBytes(quota.quota)}
      </Text>
      <Progress.Root value={quota.percent} size="sm">
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
    </Stack>
  )
}
```

---

## Кнопка с условным текстом

```tsx
import { Button } from '@chakra-ui/react'
import { useOfflineStatus } from '@letar/forms/offline'
import { LuCloudOff, LuSave } from 'react-icons/lu'

function SubmitButton({ loading }: { loading?: boolean }) {
  const isOffline = useOfflineStatus()

  return (
    <Button type="submit" colorPalette={isOffline ? 'orange' : 'blue'} loading={loading}>
      {isOffline ? <LuCloudOff /> : <LuSave />}
      {isOffline ? 'Сохранить локально' : 'Сохранить'}
    </Button>
  )
}
```

---

## Использование в layout

```tsx
// app/layout.tsx
import { OfflineIndicator } from '@/components/offline-indicator'
import { OnlineStatusBanner } from '@/components/online-status-banner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OnlineStatusBanner />
        {children}
        <OfflineIndicator />
      </body>
    </html>
  )
}
```

---

## См. также

- [form-components-offline.md](form-components-offline.md) — useOfflineForm
- [hooks.md](hooks.md) — useOfflineStatus
- [sync-queue.md](sync-queue.md) — useSyncQueue
