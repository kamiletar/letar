# date-fns v4 — Документация

> Пакет: `date-fns` | Docs: https://date-fns.org
> Утилиты для работы с датами. Иммутабельные, tree-shakeable функции.

## Установка

```bash
bun add date-fns date-fns-tz  # date-fns-tz для часовых поясов
```

---

## Форматирование

```typescript
import { format, formatDistance, formatDistanceToNow, formatRelative } from 'date-fns'
import { ru } from 'date-fns/locale'

const date = new Date('2024-03-15T14:30:00')

// Форматирование строки
format(date, 'dd.MM.yyyy') // '15.03.2024'
format(date, 'dd MMMM yyyy', { locale: ru }) // '15 марта 2024'
format(date, 'HH:mm') // '14:30'
format(date, 'dd.MM.yyyy HH:mm') // '15.03.2024 14:30'
format(date, "yyyy-MM-dd'T'HH:mm:ssXXX") // ISO 8601

// Относительное время
formatDistance(date, new Date(), { locale: ru }) // '3 месяца назад'
formatDistanceToNow(date, { locale: ru, addSuffix: true }) // '3 месяца назад'
formatRelative(date, new Date(), { locale: ru }) // 'прошлая пятница в 14:30'
```

---

## Парсинг

```typescript
import { isValid, parse, parseISO } from 'date-fns'

// ISO строка
const date1 = parseISO('2024-03-15T14:30:00Z')

// Кастомный формат
const date2 = parse('15.03.2024', 'dd.MM.yyyy', new Date())

// Проверка валидности
isValid(date1) // true
isValid(new Date('invalid')) // false
```

---

## Арифметика с датами

```typescript
import { addDays, addHours, addMinutes, addMonths, addWeeks, addYears, subDays, subMonths, subWeeks } from 'date-fns'

const today = new Date()

addDays(today, 7) // +7 дней
addMonths(today, 1) // +1 месяц
addYears(today, 1) // +1 год
subDays(today, 30) // -30 дней
addHours(today, 2) // +2 часа
addMinutes(today, 30) // +30 минут
```

---

## Сравнение дат

```typescript
import {
  compareAsc,
  compareDesc,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  isSameMonth,
  isSameYear,
  max,
  min,
} from 'date-fns'

const date1 = new Date('2024-01-01')
const date2 = new Date('2024-06-15')

isBefore(date1, date2) // true
isAfter(date2, date1) // true
isEqual(date1, date1) // true

isSameDay(date1, date2) // false
isSameMonth(date1, date2) // false

differenceInDays(date2, date1) // 165
differenceInMonths(date2, date1) // 5
  [
    // Сортировка
    (date2, date1)
  ].sort(compareAsc) // [date1, date2] — по возрастанию
  [(date2, date1)].sort(compareDesc) // [date2, date1] — по убыванию

// Минимум / максимум
min([date1, date2]) // date1
max([date1, date2]) // date2
```

---

## Начало и конец периодов

```typescript
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { ru } from 'date-fns/locale'

const date = new Date()

startOfDay(date) // 00:00:00.000
endOfDay(date) // 23:59:59.999

startOfWeek(date, { locale: ru }) // Понедельник (ru: неделя начинается в пн)
endOfWeek(date, { locale: ru }) // Воскресенье

startOfMonth(date) // 1-е число, 00:00
endOfMonth(date) // последний день, 23:59

startOfYear(date) // 1 января, 00:00
```

---

## Проверки

```typescript
import { isDate, isFuture, isPast, isToday, isTomorrow, isWeekday, isWeekend, isYesterday } from 'date-fns'

isWeekend(new Date()) // true если суббота или воскресенье
isPast(someDate) // true если дата в прошлом
isFuture(someDate) // true если в будущем
isToday(someDate) // true если сегодня
isDate(someDate) // true если объект Date
```

---

## Локализация (русский язык)

```typescript
import { format, formatDistance, formatRelative } from 'date-fns'
import { ru } from 'date-fns/locale'

// Всегда передавай locale: ru для русского
format(new Date(), 'EEEE', { locale: ru }) // 'пятница'
format(new Date(), 'MMMM', { locale: ru }) // 'март'
format(new Date(), 'd MMMM yyyy г.', { locale: ru }) // '15 марта 2024 г.'

formatDistance(pastDate, new Date(), { locale: ru, addSuffix: true })
// '3 дня назад' | 'через 2 часа'
```

---

## Часовые пояса (date-fns-tz)

```typescript
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { ru } from 'date-fns/locale'

const tz = 'Europe/Moscow'

// Форматирование в конкретном часовом поясе
formatInTimeZone(new Date(), tz, 'dd.MM.yyyy HH:mm', { locale: ru })

// Конвертация
const moscowDate = toZonedTime(new Date(), tz) // UTC → Москва
const utcDate = fromZonedTime(moscowDate, tz) // Москва → UTC
```

---

## Диапазоны дат

```typescript
import { eachDayOfInterval, eachMonthOfInterval, isWithinInterval } from 'date-fns'

const interval = {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-07'),
}

// Все дни в интервале
eachDayOfInterval(interval)
// [Jan 1, Jan 2, ..., Jan 7]

// Все месяцы в интервале
eachMonthOfInterval({ start: new Date('2024-01'), end: new Date('2024-12') })

// Проверка — входит ли дата в интервал
isWithinInterval(new Date('2024-01-04'), interval) // true
```

---

## Паттерны в letar

```typescript
// Форматирование для отображения в UI (по-русски)
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

// Дата создания записи
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd MMMM yyyy', { locale: ru })
}

// Относительное время
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { locale: ru, addSuffix: true })
}

// Для input[type="date"]
export function toInputDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Диапазон для фильтра по датам
export function getMonthRange(date: Date) {
  import { startOfMonth, endOfMonth } from 'date-fns'
  return {
    gte: startOfMonth(date),
    lte: endOfMonth(date),
  }
}
```

---

## Ссылки

- Docs: https://date-fns.org/docs/Getting-Started
- GitHub: https://github.com/date-fns/date-fns
- Форматы: https://date-fns.org/docs/format
