# SEO Audit — Аудит SEO и метаданных

Проведи полный SEO аудит приложения $ARGUMENTS (или текущего, если не указано).

## Когда использовать

- Перед релизом в продакшн
- После добавления новых страниц
- При проблемах с шерингом (ссылки ведут не туда)
- При проблемах с индексацией в поисковиках
- Регулярно при активной разработке

## Области проверки

### 1. Canonical URLs (КРИТИЧНО)

**Проблема наследования:** layout.tsx может задавать `alternates.canonical` на главную — все дочерние страницы без собственного `alternates` наследуют его. Это ломает шеринг и SEO.

**Проверить:**

- Каждая публичная page.tsx ОБЯЗАНА иметь собственный `alternates.canonical`
- `use client` страницы без metadata — нужен layout.tsx с canonical
- Canonical должен указывать на саму страницу, не на главную

```bash
# Найти страницы без canonical
grep -rL "alternates" apps/APP/src/app/\[locale\]/**/page.tsx | grep -v admin | grep -v auth | grep -v _

# Проверить canonical в layout (наследуется!)
grep -n "canonical" apps/APP/src/app/\[locale\]/layout.tsx
```

### 2. hreflang (мультиязычность)

- Каждая страница с canonical должна иметь `alternates.languages`
- Все языки из `routing.locales` должны быть представлены

### 3. Metadata качество

- `title` — уникальный на каждой странице, < 60 символов
- `description` — уникальный, 120-160 символов
- `generateMetadata` для динамических `[slug]` роутов
- Нет страниц совсем без metadata

### 4. OpenGraph & Twitter Cards

- `og:title`, `og:description`, `og:url` (должен совпадать с canonical!)
- `og:image` 1200x630px на ключевых страницах
- `twitter:card` — `summary_large_image`

### 5. Structured Data (JSON-LD)

| Тип            | Где              |
| -------------- | ---------------- |
| Organization   | Главная / layout |
| Article        | Блог посты       |
| Product        | Товары           |
| BreadcrumbList | Навигация        |
| FAQ            | FAQ страницы     |

### 6. Технический SEO

- `robots.ts` — правила индексации
- `sitemap.ts` — все публичные страницы
- Нет `noindex` на публичных страницах
- `manifest.ts` для PWA

### 7. Контент

- H1 — ровно один на страницу
- Иерархия H1→H2→H3 без пропусков
- `alt` на всех изображениях
- `next/image` вместо `<img>`

## Формат отчёта

### Критичные (ломают шеринг/индексацию)

- Страницы без canonical / с неправильным canonical
- Нет metadata на публичной странице
- Нет robots.ts / sitemap.ts

### Важные (снижают позиции)

- Нет JSON-LD
- Изображения без alt
- Description > 160 символов
- Нет hreflang

### Рекомендации

- Расширить structured data
- Улучшить OG images
- Добавить BreadcrumbList

## После аудита

Исправь найденные проблемы, начиная с критичных. Для canonical — добавь `alternates` в `generateMetadata` каждой публичной страницы.
