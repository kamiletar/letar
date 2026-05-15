# Тактильная обратная связь (Haptic Feedback)

Использование Vibration API для тактильной обратной связи на мобильных устройствах.

## Vibration API

### Браузерная поддержка

| Браузер           | Поддержка            |
| ----------------- | -------------------- |
| Chrome (Android)  | ✅                   |
| Firefox (Android) | ✅                   |
| Safari (iOS)      | ❌                   |
| WebKit            | ❌                   |
| Desktop           | ❌ (нет вибромотора) |

### Базовое использование

```typescript
// Простая вибрация (50ms)
navigator.vibrate(50)

// Паттерн [вибрация, пауза, вибрация, пауза, ...]
navigator.vibrate([100, 50, 100]) // вибрация 100ms, пауза 50ms, вибрация 100ms

// Длинный паттерн
navigator.vibrate([200, 100, 200, 100, 200])

// Отмена вибрации
navigator.vibrate(0)
// или
navigator.vibrate([])
```

---

## Хук useHapticFeedback

```typescript
// hooks/use-haptic-feedback.ts
'use client'

import { useCallback } from 'react'

interface HapticPatterns {
  light: number
  medium: number
  heavy: number
  success: number[]
  error: number[]
  warning: number[]
}

const patterns: HapticPatterns = {
  light: 10,
  medium: 50,
  heavy: 100,
  success: [50, 50, 50],
  error: [100, 50, 100, 50, 100],
  warning: [50, 100, 50],
}

export function useHapticFeedback() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

  const trigger = useCallback(
    (pattern: keyof HapticPatterns | number | number[] = 'medium') => {
      if (!canVibrate) return false

      const vibrationPattern = typeof pattern === 'string' ? patterns[pattern] : pattern

      try {
        return navigator.vibrate(vibrationPattern)
      } catch {
        return false
      }
    },
    [canVibrate]
  )

  const cancel = useCallback(() => {
    if (canVibrate) {
      navigator.vibrate(0)
    }
  }, [canVibrate])

  return {
    trigger,
    cancel,
    canVibrate,
    patterns,
  }
}
```

---

## Интеграция с Chakra компонентами

### Button с вибрацией

```tsx
'use client'

import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { Button, ButtonProps } from '@chakra-ui/react'

interface HapticButtonProps extends ButtonProps {
  hapticPattern?: 'light' | 'medium' | 'heavy' | number | number[]
}

export function HapticButton({ hapticPattern = 'light', onClick, ...props }: HapticButtonProps) {
  const haptic = useHapticFeedback()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    haptic.trigger(hapticPattern)
    onClick?.(e)
  }

  return <Button onClick={handleClick} {...props} />
}
```

### Использование

```tsx
<HapticButton colorPalette="blue" hapticPattern="light">
  Нажми меня
</HapticButton>

<HapticButton
  colorPalette="red"
  hapticPattern="error"
  onClick={handleDelete}
>
  Удалить
</HapticButton>

<HapticButton
  colorPalette="green"
  hapticPattern="success"
  onClick={handleSubmit}
>
  Сохранить
</HapticButton>
```

---

## Паттерны вибрации

### Рекомендуемые значения

| Паттерн | Длительность            | Использование       |
| ------- | ----------------------- | ------------------- |
| Light   | 10ms                    | Hover, переключение |
| Medium  | 50ms                    | Клик, выбор         |
| Heavy   | 100ms                   | Важное действие     |
| Success | [50, 50, 50]            | Успешное завершение |
| Error   | [100, 50, 100, 50, 100] | Ошибка              |
| Warning | [50, 100, 50]           | Предупреждение      |

### Кастомные паттерны

```typescript
const customPatterns = {
  // Двойной тап
  doubleTap: [30, 50, 30],

  // Длинное нажатие
  longPress: [200],

  // Notification
  notification: [100, 100, 100, 100, 100],

  // Heartbeat
  heartbeat: [100, 200, 100, 500, 100, 200, 100],
}
```

---

## Интеграция с формами

```tsx
'use client'

import { useHapticFeedback } from '@/hooks/use-haptic-feedback'

function ContactForm() {
  const haptic = useHapticFeedback()

  const handleSubmit = async (data: FormData) => {
    try {
      await submitForm(data)
      haptic.trigger('success')
      toast.success('Отправлено!')
    } catch (error) {
      haptic.trigger('error')
      toast.error('Ошибка отправки')
    }
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

---

## Интеграция с жестами

```tsx
'use client'

import { useHapticFeedback } from '@/hooks/use-haptic-feedback'

function SwipeableCard({ onSwipe }: { onSwipe: () => void }) {
  const haptic = useHapticFeedback()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = () => {
    setIsDragging(true)
    haptic.trigger('light')
  }

  const handleDragEnd = (info: { offset: { x: number } }) => {
    setIsDragging(false)

    if (Math.abs(info.offset.x) > 100) {
      haptic.trigger('medium')
      onSwipe()
    }
  }

  return (
    <Box
      onMouseDown={handleDragStart}
      onMouseUp={() => handleDragEnd({ offset: { x: 0 } })}
      // ... drag handlers
    >
      Свайпни меня
    </Box>
  )
}
```

---

## Best Practices

### ✅ Рекомендуется

1. **Используй для важных интеракций**
   - Подтверждение действия
   - Успех/ошибка операции
   - Переключение состояния

2. **Короткие паттерны**
   - Максимум 200ms для одиночной вибрации
   - Не более 3 вибраций подряд

3. **Предоставь возможность отключения**

   ```tsx
   const [hapticEnabled, setHapticEnabled] = useState(true)

   const trigger = (pattern) => {
     if (hapticEnabled) haptic.trigger(pattern)
   }
   ```

4. **Graceful degradation**
   ```typescript
   if (haptic.canVibrate) {
     haptic.trigger('light')
   }
   // Приложение работает и без вибрации
   ```

### ❌ Не рекомендуется

1. **Не используй для каждого касания**
   - Утомляет пользователя
   - Разряжает батарею

2. **Не делай длинные паттерны**

   ```typescript
   // ❌ Слишком долго
   navigator.vibrate([500, 200, 500, 200, 500])
   ```

3. **Не используй без явного действия пользователя**
   ```typescript
   // ❌ Автоматическая вибрация
   useEffect(() => {
     navigator.vibrate(100) // Раздражает
   }, [])
   ```

---

## Тестирование

### На реальном устройстве

```typescript
// Тестовый компонент
function HapticTest() {
  const haptic = useHapticFeedback()

  return (
    <VStack>
      <Text>Поддержка: {haptic.canVibrate ? '✅' : '❌'}</Text>

      <Button onClick={() => haptic.trigger('light')}>Light</Button>
      <Button onClick={() => haptic.trigger('medium')}>Medium</Button>
      <Button onClick={() => haptic.trigger('heavy')}>Heavy</Button>
      <Button onClick={() => haptic.trigger('success')}>Success</Button>
      <Button onClick={() => haptic.trigger('error')}>Error</Button>
      <Button onClick={() => haptic.trigger([50, 50, 50])}>Custom</Button>
    </VStack>
  )
}
```

### В DevTools

Chrome DevTools позволяет эмулировать мобильное устройство, но **вибрация не эмулируется**. Тестируй на реальном Android устройстве.

---

## Альтернативы для iOS

Safari не поддерживает Vibration API. Альтернативы:

1. **Визуальная обратная связь** (см. [visual-feedback.md](visual-feedback.md))
2. **Звуковая обратная связь** (Audio API)
3. **Анимации** (см. [animations.md](animations.md))

```tsx
// Комбинированный подход
const feedback = {
  trigger: (type: 'success' | 'error') => {
    // Вибрация (Android)
    haptic.trigger(type)

    // Визуальная обратная связь (все платформы)
    // Анимация, изменение цвета и т.д.
  },
}
```

## См. также

- [visual-feedback.md](visual-feedback.md) — Визуальная обратная связь
- [animations.md](animations.md) — Анимации
- [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
