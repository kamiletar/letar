# Date & Number Formatting

## Форматирование дат

```tsx
import { useFormatter } from 'next-intl'

export function OrderDate({ date }: { date: Date }) {
  const format = useFormatter()

  return (
    <time dateTime={date.toISOString()}>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </time>
  )
}

// Русский: "15 января 2025"
// Английский: "January 15, 2025"
// Немецкий: "15. Januar 2025"
```

## Форматы дат

```tsx
const format = useFormatter()
const date = new Date('2025-01-15T14:30:00')

// Полная дата
format.dateTime(date, { dateStyle: 'full' })
// ru: "среда, 15 января 2025 г."
// en: "Wednesday, January 15, 2025"

// Короткая дата
format.dateTime(date, { dateStyle: 'short' })
// ru: "15.01.2025"
// en: "1/15/25"

// Только время
format.dateTime(date, { timeStyle: 'short' })
// ru: "14:30"
// en: "2:30 PM"

// Дата и время
format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
// ru: "15 янв. 2025 г., 14:30"
// en: "Jan 15, 2025, 2:30 PM"

// Кастомный формат
format.dateTime(date, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
// ru: "ср, 15 янв."
// en: "Wed, Jan 15"
```

## Относительное время

```tsx
const format = useFormatter()

// Относительно текущего момента
format.relativeTime(new Date()) // "сейчас" / "now"
format.relativeTime(subDays(new Date(), 1)) // "вчера" / "yesterday"
format.relativeTime(subHours(new Date(), 3)) // "3 часа назад" / "3 hours ago"
format.relativeTime(addDays(new Date(), 2)) // "через 2 дня" / "in 2 days"

// Относительно другой даты
format.relativeTime(orderDate, { now: paymentDate })
```

## Форматирование чисел

```tsx
const format = useFormatter()

// Обычное число
format.number(1234567.89)
// ru: "1 234 567,89"
// en: "1,234,567.89"
// de: "1.234.567,89"

// Валюта
format.number(1500, { style: 'currency', currency: 'RUB' })
// ru: "1 500 ₽"
// en: "RUB 1,500.00"

format.number(99.99, { style: 'currency', currency: 'USD' })
// ru: "99,99 $"
// en: "$99.99"

// Проценты
format.number(0.156, { style: 'percent' })
// ru: "16 %"
// en: "16%"

// Единицы измерения
format.number(5, { style: 'unit', unit: 'kilogram' })
// ru: "5 кг"
// en: "5 kg"

format.number(100, { style: 'unit', unit: 'kilometer' })
// ru: "100 км"
// en: "100 km"
```

## Хелпер для цен

```tsx
// lib/format-price.ts
import { useFormatter } from 'next-intl'

export function useFormatPrice() {
  const format = useFormatter()

  return (kopecks: number) => {
    return format.number(kopecks / 100, {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    })
  }
}

// Использование
export function ProductPrice({ price }: { price: number }) {
  const formatPrice = useFormatPrice()
  return <span>{formatPrice(price)}</span>
}
```

## Серверное форматирование

```tsx
// В Server Components
import { getFormatter } from 'next-intl/server'

export async function OrderSummary({ order }: { order: Order }) {
  const format = await getFormatter()

  return (
    <div>
      <p>Дата заказа: {format.dateTime(order.createdAt, { dateStyle: 'long' })}</p>
      <p>
        Сумма: {format.number(order.total / 100, {
          style: 'currency',
          currency: 'RUB',
        })}
      </p>
    </div>
  )
}
```

## Диапазоны дат

```tsx
const format = useFormatter()

// Диапазон дат
format.dateTimeRange(startDate, endDate, { dateStyle: 'medium' })
// ru: "15 янв. – 20 янв. 2025 г."
// en: "Jan 15 – 20, 2025"

// Если в разных месяцах
// ru: "15 янв. – 5 февр. 2025 г."
// en: "Jan 15 – Feb 5, 2025"
```

## Списки

```tsx
const format = useFormatter()

// Перечисление
format.list(['яблоки', 'груши', 'апельсины'], { type: 'conjunction' })
// ru: "яблоки, груши и апельсины"
// en: "apples, pears, and oranges"

format.list(['красный', 'синий', 'зелёный'], { type: 'disjunction' })
// ru: "красный, синий или зелёный"
// en: "red, blue, or green"
```

## Компоненты для форматирования

```tsx
// components/FormattedDate.tsx
'use client'

import { useFormatter } from 'next-intl'

interface FormattedDateProps {
  date: Date | string
  format?: 'short' | 'medium' | 'long' | 'full'
  showTime?: boolean
}

export function FormattedDate({ date, format = 'medium', showTime = false }: FormattedDateProps) {
  const formatter = useFormatter()
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    dateStyle: format,
    ...(showTime && { timeStyle: 'short' }),
  }

  return <time dateTime={dateObj.toISOString()}>{formatter.dateTime(dateObj, options)}</time>
}
```

```tsx
// components/FormattedPrice.tsx
'use client'

import { useFormatter } from 'next-intl'

interface FormattedPriceProps {
  amount: number // В копейках
  currency?: string
  showFraction?: boolean
}

export function FormattedPrice({ amount, currency = 'RUB', showFraction = false }: FormattedPriceProps) {
  const format = useFormatter()

  return (
    <span>
      {format.number(amount / 100, {
        style: 'currency',
        currency,
        maximumFractionDigits: showFraction ? 2 : 0,
      })}
    </span>
  )
}
```

## Timezone handling

```typescript
// i18n/request.ts
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || 'ru'

  // Timezone по локали
  const timezones: Record<string, string> = {
    ru: 'Europe/Moscow',
    en: 'America/New_York',
    de: 'Europe/Berlin',
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: timezones[locale] || 'UTC',
    now: new Date(),
  }
})
```

## Правила

- **MUST** использовать `useFormatter` для клиентских компонентов
- **MUST** использовать `getFormatter` для серверных компонентов
- **SHOULD** хранить цены в копейках, конвертировать при отображении
- **SHOULD** использовать `<time>` тег с `dateTime` атрибутом для дат
- **NEVER** форматировать даты/числа вручную через строковые операции
