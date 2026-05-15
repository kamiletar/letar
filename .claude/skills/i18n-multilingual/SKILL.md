---
name: i18n-multilingual
description: |
  Мультиязычность с next-intl. Используй при:
  - Настройке i18n в Next.js приложении
  - Создании переводов для компонентов
  - SEO оптимизации для разных языков
  - Форматировании дат и чисел по локали
---

# i18n Multilingual

Мультиязычность приложений с next-intl: переводы, SEO, форматирование.

## Когда использовать

- Добавление поддержки нескольких языков
- Создание переводов для UI
- SEO оптимизация для локалей
- Форматирование дат, чисел, валют

## Быстрый старт

```typescript
// i18n.config.ts
export const locales = ['ru', 'en'] as const
export const defaultLocale = 'ru' as const
export type Locale = (typeof locales)[number]
```

## Переводы

```typescript
// messages/ru.json
{
  "common": {
    "hello": "Привет",
    "welcome": "Добро пожаловать, {name}!"
  },
  "products": {
    "title": "Каталог товаров",
    "addToCart": "В корзину"
  }
}
```

## Использование

```tsx
import { useTranslations } from 'next-intl'

export function Header() {
  const t = useTranslations('common')
  return <h1>{t('hello')}</h1>
} // С параметрами

;<p>{t('welcome', { name: 'Иван' })}</p>
```

## Критичные правила

- **MUST** использовать `useTranslations` для клиентских компонентов
- **MUST** использовать `getTranslations` для серверных компонентов
- **SHOULD** структурировать переводы по доменам (common, products, etc)
- **NEVER** хардкодить текст напрямую в компонентах

## Reference файлы

- `reference/next-intl-setup.md` — настройка next-intl
- `reference/translations.md` — структура переводов
- `reference/seo-multilingual.md` — SEO для локалей
- `reference/date-number-formatting.md` — форматирование
- `reference/rtl-support.md` — поддержка RTL языков
