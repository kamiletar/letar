# Аналитика форм

Field-level аналитика для отслеживания поведения пользователей при заполнении форм.

## Quick Start

```tsx
import { AnalyticsPanel, createUmamiAdapter, useFormAnalytics } from '@letar/forms/analytics'

function MyForm() {
  const analytics = useFormAnalytics({
    formId: 'registration',
    adapters: [createUmamiAdapter()],
  })

  return (
    <Form schema={Schema} initialValue={data} onSubmit={save}>
      <Form.Field.String name="email" />
      <Form.Field.String name="name" />
      <Form.Button.Submit />

      {/* Dev-only панель аналитики */}
      {process.env.NODE_ENV === 'development' && <AnalyticsPanel analytics={analytics} />}
    </Form>
  )
}
```

---

## useFormAnalytics

Основной хук для трекинга событий формы.

```typescript
function useFormAnalytics(config?: FormAnalyticsConfig): UseFormAnalyticsResult
```

### Конфигурация

```typescript
interface FormAnalyticsConfig {
  enabled?: boolean // Включить трекинг (default: true)
  formId?: string // ID формы для адаптеров
  adapters?: AnalyticsAdapter[] // Список адаптеров
  trackCorrections?: boolean // Трекать возвраты к полям (default: true)
  onFieldFocus?: (field: string, timestamp: number) => void
  onFieldBlur?: (field: string, timestamp: number, timeSpentMs: number) => void
  onFieldError?: (field: string, error: string) => void
  onStepChange?: (from: number, to: number) => void
  onAbandon?: (lastField: string, filledFields: number, totalFields: number) => void
  onComplete?: (totalTimeMs: number, fieldTimes: Map<string, FieldAnalytics>) => void
}
```

### Результат

```typescript
interface UseFormAnalyticsResult {
  // Метрики
  fieldAnalytics: Map<string, FieldAnalytics> // Метрики по каждому полю
  completionRate: number // 0-100%
  lastFocusedField: string | null
  totalTimeMs: number // Общее время
  totalErrors: number // Сумма ошибок

  // Методы
  trackError: (field: string, error: string) => void
  trackAbandon: () => void
  trackComplete: () => void
  reset: () => void
}
```

### Метрики поля

```typescript
interface FieldAnalytics {
  focusCount: number // Количество фокусов
  totalTimeMs: number // Общее время на поле
  errorCount: number // Ошибки валидации
  correctionCount: number // Возвраты к полю (re-focus после blur)
  firstFocusAt: number | null
  lastBlurAt: number | null
}
```

---

## AnalyticsPanel

Dev-only панель с live-метриками формы.

```tsx
<AnalyticsPanel
  analytics={analytics}
  position="bottom-right" // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
/>
```

**Отображает:**

- Процент заполнения (цветовая индикация)
- Количество ошибок
- Общее время заполнения
- Top-5 полей по времени
- Последнее активное поле

---

## Адаптеры

### Интерфейс адаптера

```typescript
interface AnalyticsAdapter {
  name: string
  track: (event: FormAnalyticsEvent, formId?: string) => void
  init?: () => void
  destroy?: () => void
}
```

### Umami

```typescript
import { createUmamiAdapter } from '@letar/forms/analytics'

const adapter = createUmamiAdapter({ websiteId?: string })
```

Требует `window.umami.track()`. Отправляет все события как `form_<event_type>`.

### Яндекс Метрика

```typescript
import { createYandexMetrikaAdapter } from '@letar/forms/analytics'

const adapter = createYandexMetrikaAdapter(counterId: number)
```

Требует `window.ym()`. Использует `reachGoal` с именем `form_${formId}_${eventType}`.
Трекает: field_focus, field_error, form_abandon, form_complete.

### Google Analytics 4

```typescript
import { createGtagAdapter } from '@letar/forms/analytics'

const adapter = createGtagAdapter()
```

Требует `window.gtag()`. Маппинг событий:

- `field_blur` → `form_field_interaction`
- `field_error` → `form_field_error`
- `form_abandon` → `form_abandon`
- `form_complete` → `form_complete`

### PostHog

```typescript
import { createPostHogAdapter } from '@letar/forms/analytics'

const adapter = createPostHogAdapter()
```

Требует `window.posthog.capture()`. Отправляет все события.

---

## События

```typescript
type FormAnalyticsEvent =
  | { type: 'field_focus'; field: string; timestamp: number }
  | { type: 'field_blur'; field: string; timestamp: number; timeSpentMs: number }
  | { type: 'field_error'; field: string; error: string; timestamp: number }
  | { type: 'field_correction'; field: string; timestamp: number; correctionCount: number }
  | { type: 'step_change'; from: number; to: number; timestamp: number }
  | {
      type: 'form_abandon'
      lastField: string
      filledFields: number
      totalFields: number
      timestamp: number
      totalTimeMs: number
    }
  | { type: 'form_complete'; totalTimeMs: number; fieldTimes: Map<string, FieldAnalytics>; timestamp: number }
```

**Автоматический трекинг:**

- `field_focus` / `field_blur` — через глобальные `focusin`/`focusout` listeners
- `form_abandon` — через `beforeunload` event
- `field_correction` — re-focus после blur (если `trackCorrections: true`)

---

## Кастомный адаптер

```typescript
const myAdapter: AnalyticsAdapter = {
  name: 'my-analytics',
  track(event, formId) {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ formId, ...event }),
    })
  },
}

const analytics = useFormAnalytics({
  formId: 'checkout',
  adapters: [myAdapter],
})
```

---

## Связанные документы

- [README.md](../README.md) — обзор библиотеки
- [form-level.md](./form-level.md) — Form-level компоненты

---

**Добавлено:** v0.80.0 | **Последнее обновление:** 2026-04-04
