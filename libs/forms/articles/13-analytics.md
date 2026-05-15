# 67% пользователей бросают форму. Как найти, где именно

> **Уровень сложности:** Простой

**TL;DR:**

- Один хук `useFormAnalytics` включает field-level трекинг: focus, blur, ошибки, corrections, abandon и completion rate
- 5 готовых адаптеров (Umami, Яндекс Метрика, GA4, PostHog, кастомный) — данные на ваших серверах, не в чужом SaaS
- Dev-only `AnalyticsPanel` показывает live-метрики прямо в углу экрана во время разработки

**Кому полезно:**

- Junior: понять какие события формы важно трекать и как подключить аналитику одним хуком
- Middle: настроить воронку мультистеп-формы через адаптеры Umami/Метрика и найти проблемные поля
- Senior: оценить архитектуру адаптеров, field-level corrections tracking и сравнение с SaaS-решениями ($200+/мес)

---

> Тринадцатая статья из цикла «@letar/forms — от боли к декларативным формам». Встроенная аналитика форм — field-level трекинг, drop-off, completion rate — без коммерческих SaaS.

---

## Проблема: 67% форм бросают

Статистика жёсткая:

- **67%** форм бросают незавершёнными (Zuko, 2025)
- Поле **пароля** — рекордсмен drop-off: **10.5%** пользователей уходят именно на нём
- **35%** пользовательских ошибок — из-за непонятных сообщений валидации
- Оптимизация формы даёт **+30-50%** к completion rate

Бизнес хочет знать: на каком поле пользователь ушёл? Сколько времени провёл? Сколько ошибок сделал? Но инструменты стоят дорого: Zuko — $200/мес, Formstack — от $50/мес, Hotjar — ещё дороже.

---

## Решение: один проп — и ты видишь всё

```tsx
import { AnalyticsPanel, useFormAnalytics } from '@letar/forms'

function RegistrationForm() {
  const analytics = useFormAnalytics({
    formId: 'registration',
    adapters: [createUmamiAdapter()],
  })

  return (
    <Form schema={RegistrationSchema} onSubmit={save}>
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
      <Form.Field.Password name="password" />
      <Form.Field.Phone name="phone" />
      <Form.Button.Submit>Зарегистрироваться</Form.Button.Submit>

      {/* Dev-only панель с live-метриками */}
      {process.env.NODE_ENV === 'development' && <AnalyticsPanel analytics={analytics} position="bottom-right" />}
    </Form>
  )
}
```

---

## Что трекается

| Событие            | Данные                                       | Зачем                            |
| ------------------ | -------------------------------------------- | -------------------------------- |
| `field_focus`      | Поле, таймстамп                              | Порядок заполнения               |
| `field_blur`       | Поле, время на поле (мс)                     | Какие поля сложные               |
| `field_error`      | Поле, текст ошибки                           | Где валидация раздражает         |
| `field_correction` | Поле, счётчик возвратов                      | Какие поля приходится исправлять |
| `form_abandon`     | Последнее поле, заполнено/всего, общее время | Воронка                          |
| `form_complete`    | Общее время, время по полям                  | Успешное завершение              |

---

## Адаптеры: куда отправлять данные

### Umami (наш стек)

```tsx
import { createUmamiAdapter } from '@letar/forms/analytics'

const analytics = useFormAnalytics({
  adapters: [createUmamiAdapter()],
})
```

Umami — open-source аналитика. Данные формы отправляются как custom events через `umami.track()`.

### Яндекс Метрика

```tsx
import { createYandexMetrikaAdapter } from '@letar/forms/analytics'

// Передаём ID счётчика
const analytics = useFormAnalytics({
  adapters: [createYandexMetrikaAdapter(12345678)],
})
```

Отправляет goals: `form_{formId}_field_focus`, `form_{formId}_abandon`, `form_{formId}_complete`. С параметрами визитов (lastField, filledFields, totalTimeMs).

### Google Analytics 4

```tsx
import { createGtagAdapter } from '@letar/forms/analytics'

const analytics = useFormAnalytics({
  adapters: [createGtagAdapter()],
})
```

Отправляет events: `form_field_interaction`, `form_field_error`, `form_abandon`, `form_complete`.

### PostHog

```tsx
import { createPostHogAdapter } from '@letar/forms/analytics'

const analytics = useFormAnalytics({
  adapters: [createPostHogAdapter()],
})
```

Отправляет через `posthog.capture()` с полными свойствами.

### Кастомный адаптер

```tsx
const myAdapter: AnalyticsAdapter = {
  name: 'my-backend',
  track(event, formId) {
    navigator.sendBeacon('/api/form-analytics', JSON.stringify({ event, formId }))
  },
}
```

---

## AnalyticsPanel — dev-only панель

Плавающая панель в углу экрана с live-метриками:

- **Completion** — процент заполнения
- **Errors** — общее количество ошибок
- **Time** — время с начала заполнения
- **Top fields** — 5 полей с наибольшим временем

```tsx
<AnalyticsPanel analytics={analytics} position="bottom-right" />
```

---

## API

```typescript
const analytics = useFormAnalytics({
  enabled: true,                    // Включить/выключить
  formId: 'registration',          // Идентификатор формы
  adapters: [...],                 // Массив адаптеров
  trackCorrections: true,          // Считать возвраты к полю
  onFieldFocus: (field, ts) => {}, // Callback на focus
  onFieldBlur: (field, ts, ms) => {}, // Callback на blur
  onFieldError: (field, error) => {},  // Callback на ошибку
  onAbandon: (last, filled, total) => {}, // Callback при уходе
  onComplete: (totalMs, fieldTimes) => {}, // Callback при submit
})

// Возвращает:
analytics.fieldAnalytics    // Map<string, FieldAnalytics>
analytics.completionRate    // 0-100
analytics.lastFocusedField  // string | null
analytics.totalTimeMs       // number
analytics.totalErrors       // number
analytics.trackAbandon()    // Принудительно отправить abandon
analytics.trackComplete()   // Принудительно отправить complete
analytics.reset()           // Сбросить аналитику
```

---

## Пример: мультистеп регистрация + воронка

```tsx
const analytics = useFormAnalytics({
  formId: 'multi-step-registration',
  adapters: [createUmamiAdapter(), createYandexMetrikaAdapter(12345)],
  onStepChange: (from, to) => {
    console.log(`Step ${from + 1} → ${to + 1}`)
  },
  onAbandon: (lastField, filled, total) => {
    console.log(`Abandoned at "${lastField}" (${filled}/${total} fields)`)
  },
})
```

Результат в Umami/Метрике: воронка Step 1 (100%) → Step 2 (72%) → Step 3 (58%) → Submit (45%).

---

## Почему встроенная аналитика лучше SaaS

| Критерий     | SaaS (Zuko, Hotjar)      | @letar/forms |
| ------------ | ------------------------ | ------------ |
| Цена         | $200+/мес                | Бесплатно    |
| Приватность  | Данные на чужих серверах | Ваши серверы |
| Интеграция   | JavaScript сниппет       | React hook   |
| Кастомизация | Ограничена               | Полная       |
| Field-level  | Да                       | Да           |
| Corrections  | Нет                      | Да           |

---

## Ссылки

- **Документация:** [forms.letar.best](https://forms.letar.best)
- **Примеры:** [forms-example.letar.best](https://forms-example.letar.best)
- **GitHub:** [github.com/letar/forms](https://github.com/letar/forms)
- **npm MCP:** `npx @letar/form-mcp`
- **Analytics:** [forms-example.letar.best/examples/analytics](https://forms-example.letar.best/examples/analytics)

---

_Это тринадцатая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: MCP](11-mcp-ai.md) | [Следующая: Релиз](12-open-source.md)._

---

**Отслеживаете ли вы abandon rate форм?**
