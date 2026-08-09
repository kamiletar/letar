# @letar/yandex-metrika

Компонент для интеграции Яндекс Метрики в Next.js приложения.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { YandexMetrika } from '@letar/yandex-metrika'
```

## Использование

### Базовая интеграция

Добавьте компонент в корневой layout:

```tsx
// app/layout.tsx
import { YandexMetrika } from '@letar/yandex-metrika'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <YandexMetrika YM_COUNTER_ID={12345678} />
      </body>
    </html>
  )
}
```

### С переменной окружения

```tsx
// app/layout.tsx
import { YandexMetrika } from '@letar/yandex-metrika'

const YM_COUNTER_ID = Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID)

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {YM_COUNTER_ID && <YandexMetrika YM_COUNTER_ID={YM_COUNTER_ID} />}
      </body>
    </html>
  )
}
```

## API

### `YandexMetrika`

| Prop            | Тип      | Описание                      |
| --------------- | -------- | ----------------------------- |
| `YM_COUNTER_ID` | `number` | ID счётчика из Яндекс Метрики |

## Возможности

Компонент автоматически включает:

| Опция                 | Описание                                  |
| --------------------- | ----------------------------------------- |
| `defer`               | Асинхронная загрузка скрипта              |
| `webvisor`            | Запись действий посетителей (Вебвизор)    |
| `clickmap`            | Карта кликов                              |
| `trackLinks`          | Отслеживание переходов по внешним ссылкам |
| `accurateTrackBounce` | Точный расчёт показателя отказов          |

## Автоматический трекинг

Компонент автоматически отслеживает навигацию между страницами с помощью `usePathname()` из Next.js и вызывает `ym('hit', pathname)` при каждом изменении URL.

## Зависимости

- `react-yandex-metrika` — официальная React-библиотека для Яндекс Метрики
- `next/navigation` — для отслеживания изменений URL

## Получение ID счётчика

1. Зайдите в [Яндекс Метрику](https://metrika.yandex.ru/)
2. Создайте счётчик для вашего сайта
3. Скопируйте номер счётчика (8-значное число)
4. Добавьте в `.env.local`:

```env
NEXT_PUBLIC_YM_COUNTER_ID=12345678
```

---

**Последнее обновление:** 2026-01-03
