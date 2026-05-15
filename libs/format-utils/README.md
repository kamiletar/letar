# @letar/format-utils

Утилиты форматирования данных: телефоны и даты.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { formatDate, formatPhone } from '@letar/format-utils'
```

## API

### Телефоны

```typescript
import { formatPhone, getDigitsOnly, normalizePhone, validatePhone } from '@letar/format-utils'

// Форматирование для отображения
formatPhone('79001234567') // +7 (900) 123-45-67

// Нормализация (только цифры с +7)
normalizePhone('8 900 123 45 67') // 79001234567

// Валидация
validatePhone('79001234567') // true

// Только цифры
getDigitsOnly('+7 (900) 123-45-67') // 79001234567
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

### Телефоны

- `formatPhone` — форматирование для отображения
- `normalizePhone` — нормализация номера
- `validatePhone` — валидация номера
- `getDigitsOnly` — извлечение цифр

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
