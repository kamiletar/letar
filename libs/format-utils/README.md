# @letar/format-utils

Утилиты форматирования данных: даты и деньги.

⚠️ Форматирование телефонов сюда не входит — единый источник истины `@letar/forms-core/phone`
(`formatPhoneNumber`/`stripPhoneNumber`/`PHONE_MASKS`, framework-free mask-движок). Локальный
дубликат `formatPhone`/`getDigitsOnly` был удалён 2026-08-12; app-specific обёртка для RU —
`apps/driving-school/src/lib/phone.ts`.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { formatDate } from '@letar/format-utils'
```

## API

### Деньги

```typescript
import { formatKopecks, formatRubles } from '@letar/format-utils'

// Сумма в рублях
formatRubles(150000) // 150 000 ₽

// Сумма, хранящаяся в копейках
formatKopecks(15000000) // 150 000 ₽

// Fallback для null/undefined
formatRubles(null, { fallback: 'по запросу' }) // по запросу

// Префикс и суффикс
formatRubles(1500, { prefix: 'от ', suffix: ' / занятие' }) // от 1 500 ₽ / занятие
```

### Даты

```typescript
import {
  calculateYearsFromDate,
  formatDate,
  formatDateLong,
  formatDateShort,
  formatDateTime,
  formatDuration,
  formatExperience,
  formatTime,
} from '@letar/format-utils'

const date = new Date('2025-01-15T14:30:00')

// Разные форматы
formatDate(date) // 15.01.2025
formatDateShort(date) // 15 янв
formatDateLong(date) // 15 января 2025
formatDateTime(date) // 15.01.2025 14:30
formatTime(date) // 14:30

// Длительность
formatDuration(90) // 1 ч 30 мин

// Опыт работы
formatExperience(new Date('2020-01-01')) // 5 лет

// Возраст
calculateYearsFromDate(new Date('1990-05-15')) // 34
```

## Экспорты

### Деньги

- `formatRubles` — форматирование суммы в рублях
- `formatKopecks` — форматирование суммы, хранящейся в копейках

### Даты

- `formatDate` — базовый формат DD.MM.YYYY
- `formatDateShort` — короткий формат
- `formatDateLong` — полный формат
- `formatDateTime` — дата и время
- `formatTime` — только время
- `formatDuration` — длительность
- `formatExperience` — опыт в годах
- `calculateYearsFromDate` — расчёт лет

## Команды

```bash
nx build format-utils
nx test format-utils
nx lint format-utils
```
