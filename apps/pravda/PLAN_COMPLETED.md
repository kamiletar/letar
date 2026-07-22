# Pravda - Выполненные задачи

## Фаза 1: Инициализация

### v0.0.1 — Инициализация проекта (2025-12-28)

**Создание проекта:**

- Создан проект Next.js через Nx
- Удалены example файлы (global.css, api/hello)
- Упрощены layout.tsx и page.tsx

**Настройка инструментов:**

- Добавлен target `format` (dprint)
- Добавлен target `oxlint` (быстрый линт)
- Добавлен target `typecheck:tsgo` (быстрая проверка типов)

**Документация:**

- Создан README.md
- Создан PLAN.md
- Создан PLAN_COMPLETED.md
- Создан PLAN_TESTING.md
- Создан CHANGELOG.md
- Создана команда `.claude/commands/pravda.md`

## v1.4.0 — Комплексное покрытие тестами (2025-12-28)

**Unit тесты:**

- `src/lib/documents.test.ts` — тесты для реестра документов (22 теста)
- Существующие тесты для хуков (`use-bookmarks`, `use-search`, `theme`)

**Integration тесты:**

- `src/app/_components/bookmark-button.test.tsx` — тесты кнопки закладок (8 тестов)
- `src/app/_components/header.test.tsx` — тесты header с keyboard shortcuts (13 тестов)
- `src/app/_components/command-palette.test.tsx` — тесты Command Palette (14 тестов)
- `src/app/_components/toc.test.tsx` — тесты Table of Contents (12 тестов)

**E2E тесты (Playwright):**

- `apps/pravda-e2e/src/navigation.spec.ts` — навигация по сайту (8 тестов)
- `apps/pravda-e2e/src/bookmarks.spec.ts` — система закладок (6 тестов)
- `apps/pravda-e2e/src/search.spec.ts` — поиск и Command Palette (8 тестов)
- `apps/pravda-e2e/src/documents.spec.ts` — отображение документов (10 тестов)

**Покрытие:**

- Общее: ~65%+
- Критичные компоненты: 85%+

---

## v1.5.0 — SEO оптимизация (2025-12-28)

**Базовые SEO файлы:**

- `src/app/robots.ts` — инструкции для роботов (allow /, disallow /search, /bookmarks, /api/, /\_next/)
- `src/app/sitemap.ts` — карта сайта с 22 документами, 3 категориями, главной страницей
- `src/lib/seo.ts` — SEO утилиты и константы (BASE_URL, SITE_NAME, getDocumentMetadata)

**Metadata:**

- Обновлён `layout.tsx` с metadataBase, title template, OpenGraph, Twitter Cards
- Добавлены metadata для страниц категорий (codes, statutes, regulations)
- Добавлен noindex для служебных страниц (search/layout.tsx, bookmarks/layout.tsx)
- Созданы 22 layout файла для документов с уникальными title/description

**JSON-LD структурированные данные:**

- `src/app/_components/json-ld.tsx`:
  - `WebSiteJsonLd` — schema.org WebSite с SearchAction для поиска в Google
  - `ArticleJsonLd` — schema.org Article для документов
  - `BreadcrumbJsonLd` — schema.org BreadcrumbList для хлебных крошек
  - `DocumentBreadcrumbJsonLd` — автогенерация хлебных крошек из категории документа

**OpenGraph Images:**

- `src/app/opengraph-image.tsx` — Edge Runtime, OG Image для главной (1200x630)
- `src/app/api/og/[...path]/route.tsx` — динамические OG Images для 22 документов
- Цветовое кодирование по категориям: красный (Основные законы), синий (Кодексы), зелёный (Уставы), фиолетовый (Регламенты)

**Layout файлы документов (22 шт.):**

- Каждый документ имеет layout.tsx с:
  - `export const metadata: Metadata = getDocumentMetadata(HREF)`
  - `ArticleJsonLd` компонент
  - `DocumentBreadcrumbJsonLd` компонент

**Ожидаемые улучшения:**

- Google индексирует все 22 документа
- Rich Snippets в поиске (статьи, хлебные крошки)
- Красивые карточки при шаринге в соцсетях
- Поиск по сайту в Google (SearchAction)

---

## §18.7 Тираж M1 batch2 — staging e2e-гейт (2026-07-22, root-weaver)

**Фикс `toc.spec.ts` (`apps/pravda-e2e/src/toc.spec.ts`):** в трёх тестах (клик по пункту TOC,
автоскролл к активному, подсветка активного пункта при скролле) переменной
`href`/`firstHref`/`lastHref` присваивался сам Playwright `Locator` вместо строки атрибута —
`await locator.getAttribute('href')` возвращал не вызывался, затем на `Locator` вызывался
`.slice(1)` → `TypeError: href.slice is not a function`. Исправлено на `await
locator.getAttribute('href')` перед `.slice()`. Коммит `6d4833aa`.

**Подтверждено BlackCove живым прогоном на staging:** три `href.slice`-фейла ушли. Но `toc.spec.ts`
остался частично красным на других ассертах (TOC не находит пункты, подсветка не работает) —
это реальные баги приложения, не тестовые. Плюс получен `trace.zip` для `navigation.spec.ts`
(RSC-навигация не меняет URL в Firefox/WebKit) благодаря ранее добавленному `retries: 1`. Все
новые находки перенесены в `PLAN.md` → Backlog → «🔴 Приоритетные баги — staging e2e».

---

**Последнее обновление:** 2026-07-22
