# Pravda - Выполненные задачи

## tsconfig.json — убраны `references` на `libs/*`, добавлен явный `rootDir` (2026-08-07)

Убраны 4 ссылки (`chakra-provider`, `ui`, `hooks`, `analytics`) из `references` — тот же хрупкий
редирект, что чинили в `dashboard-agent` (0.11.1, `.claude/rules/libs.md`). После удаления
всплыл `TS6059`: `pravda` наследует через `tsconfig.next-app.json` → `tsconfig.base.json`
`composite: true`, а composite-режим требует, чтобы `rootDir` содержал все файлы программы;
TypeScript вычисляет `rootDir` по `include`-паттернам приложения, не видя в них `libs/*`. Фикс —
явный `"rootDir": "${configDir}/../.."` в `apps/pravda/tsconfig.json`. `nx typecheck:tsgo` и
`nx build` зелёные.

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

## v1.9.0 — 2026-07-28 (152-ФЗ: минимальное cookie-уведомление)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика (в
`Header`/`Footer` уже был статический экспорт, `output: 'export'`), без аккаунтов/форм.
`CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД),
`analytics-consent.tsx` (Umami только после согласия), минимальная страница `/privacy` — ссылка
добавлена в уже существующий блок дисклеймера футера.

---

## Фазы 1–7 — полностью выполненные разделы PLAN.md

> Перенесено из PLAN.md: 2026-08-09

### Фаза 1: Инициализация

- [x] Создать проект Next.js
- [x] Настроить project.json (format, oxlint, typecheck:tsgo)
- [x] Создать документацию (README, PLAN, CHANGELOG)
- [x] Настроить Chakra UI Provider
- [x] Настроить базовый layout
- [x] Настроить поддержку тёмной/светлой темы
- [x] Настроить MDX
- [x] Настроить Vitest для unit-тестов
- [x] Создать кастомную систему темы (tokens, semanticTokens)

### Фаза 2: Сайт законодательства

- [x] Создать MDX компоненты для законов (Article, Section, Chapter, LawTable, CrossRef, Quote, Penalty)
- [x] Создать DocsLayout с header, sidebar, main content, TOC
- [x] Создать Sidebar навигацию с 22 документами (4 категории)
- [x] Создать Table of Contents (sticky справа)
- [x] Создать Breadcrumbs для навигации
- [x] Создать главную страницу с hero и карточками категорий
- [x] Создать страницы категорий (Кодексы, Уставы, Регламенты)
- [x] Конвертировать документы в MDX (3 документа-образца)
- [x] Создать скрипт автоматической конвертации документов
- [x] Создать поиск с Fuse.js (fuzzy search)
- [x] Создать страницу поиска с UI
- [x] ~~Настроить русские URL~~ Мигрировать на ASCII URL (из-за бага Next.js #10084)

Структура роутов:

```
app/
├── page.tsx                    # Главная страница
├── search/page.tsx             # Страница поиска
├── bookmarks/page.tsx          # Страница закладок
└── (docs)/
    ├── layout.tsx              # DocsLayout
    ├── constitution/page.mdx
    ├── pravda/page.mdx
    ├── codes/
    │   ├── page.tsx            # Список кодексов
    │   ├── tax/page.mdx
    │   ├── criminal/page.mdx
    │   ├── family/page.mdx
    │   ├── labor/page.mdx
    │   ├── digital/page.mdx
    │   ├── medical/page.mdx
    │   ├── ordeals/page.mdx
    │   ├── criminal-procedure/page.mdx
    │   ├── penal/page.mdx
    │   ├── construction/page.mdx
    │   └── state-secrets/page.mdx
    ├── statutes/
    │   ├── page.tsx            # Список уставов
    │   ├── church/page.mdx
    │   ├── trade/page.mdx
    │   ├── military/page.mdx
    │   ├── education/page.mdx
    │   ├── road/page.mdx
    │   ├── postal/page.mdx
    │   └── fair/page.mdx
    └── regulations/
        ├── page.tsx            # Список регламентов
        ├── duel/page.mdx
        ├── veche/page.mdx
        └── volost/page.mdx
```

### Фаза 3: Расширение контента

- [x] Конвертировать все 22 документа в MDX (скрипт convert-docs.ts)
- [x] Расширить поисковый индекс на все статьи (скрипт generate-search-index.ts, 1337 статей)
- [x] Добавить полнотекстовый поиск (Fuse.js fuzzy search)
- [x] Добавить подсветку найденных фрагментов (компонент Highlight)

### Фаза 4: Оптимизация и качество

Задачи v0.9.0:

- [x] Тесты для хуков (useSearch, useBookmarks)
- [x] Единый реестр документов lib/documents.ts
- [x] Константы lib/constants.ts
- [x] Компонент HomeLink (DRY)
- [x] Dynamic import для search-index (bundle size)
- [x] Объединение useEffect в toc.tsx
- [x] Server Components (убрать 'use client' где не нужно)
- [x] Accessibility roles

Задачи v1.0.0:

- [x] useDebounce хук для оптимизации поиска (300ms)
- [x] React.memo мемоизация (NavItem, NavSection, Highlight, BookmarkButton)
- [x] SidebarNav compound component (DRY)
- [x] requestAnimationFrame throttle для scroll в toc.tsx
- [x] aria-current и aria-expanded для accessibility
- [x] Footer использует navData (DRY)
- [x] Тесты для isPending состояния

### Фаза 5: SEO оптимизация

Задачи v1.5.0:

- [x] robots.ts — инструкции для поисковых роботов
- [x] sitemap.ts — карта сайта (22 документа + категории)
- [x] metadataBase и title template в root layout
- [x] OpenGraph и Twitter Cards теги
- [x] JSON-LD структурированные данные (WebSite, Article, BreadcrumbList)
- [x] Уникальные title/description для каждого документа
- [x] OG Image для главной страницы (Edge Runtime)
- [x] Динамические OG Images через API (22 документа)
- [x] noindex для служебных страниц (search, bookmarks)
- [x] SearchAction в JSON-LD для поиска по сайту в Google

### Фаза 6: Перекрёстные ссылки

Задачи v1.6.0:

- [x] Скрипт `convert-cross-refs.ts` для автоматической конвертации
- [x] Маппинг названий документов → slug (30+ вариантов)
- [x] Преобразование 36 текстовых ссылок в компонент `CrossRef`
- [x] Поддержка "см. также" (проп `also`)
- [x] Якорные ссылки на статьи (`#article-N`)
- [x] E2E тесты для перекрёстных ссылок (6 тестов)

### Фаза 7: Переименование страны — Русь

Задачи v1.8.0:

- [x] Страна переименована из «Российская Федерация» во всех формах на «Русь» (Конституция, кодексы, уставы, регламенты — 22 документа)
- [x] Столица перенесена из Москвы в Киев (Конституция, все упоминания в кодексах)
- [x] Обновлены заголовки, метаданные (SEO), OG Images, manifest.json, header/layout
- [x] Перегенерирован поисковый индекс (`generate-search-index.ts`)
- [x] Обновлён e2e-тест навигации под новый текст заголовка

---

### Стейджинг e2e — раунд 2 (§18.7, 2026-08-12)

По итогам staging-прогона BlackCove после предыдущей серии фиксов TOC (`toc.spec.ts` href.slice):
214/240 passed, 18 failed, 5 flaky, 3 skipped.

- [x] **TOC — застрявший прогресс-бар + случайный активный пункт.** Два независимых бага в
      `toc.tsx`/`mobile-toc.tsx`: (1) cleanup эффекта отменял `requestAnimationFrame` через
      `cancelAnimationFrame`, но не сбрасывал `rafIdRef.current` в `null` — `handleScroll()`
      следующей инстанции эффекта (после StrictMode double-invoke или смены pathname) видел
      «устаревший» ненулевой id и навсегда пропускал планирование кадра; (2) два конкурирующих
      `IntersectionObserver` — на Section-контейнере (огромный, оборачивает всю Chapter) и на самой
      вложенной Chapter — оба считали себя «intersecting» одновременно, `aria-current` доставался
      случайному победителю по порядку колбэка, а не по факту прокрутки. Коммит `850f0f62`
- [x] **webkit — дублированная разметка `Article` ломала bookmarks и cross-refs.**
      `mdx/article.tsx` рендерил КАЖДУЮ статью ДВАЖДЫ — отдельный `Flex`-блок для мобильного
      лейаута и отдельный для десктопного, оба одновременно в DOM (переключение только через
      `display:{base,md}`), каждый со своей копией `{children}` и своим `<BookmarkButton>`.
      Следствия: `bookmarks.spec.ts` матчил `[aria-label="Добавить в закладки"]` на ДВА элемента,
      `.first()` резолвился в скрытый мобильный экземпляр — `toBeVisible()`/`.click()` таймаутились;
      `cross-refs.spec.ts` ловил `strict mode violation: resolved to 2 elements` на задвоенном
      `<CrossRef>`. Баг воспроизводился одинаково на всех трёх браузерах, но первым и чаще
      проявлялся на webkit из-за порядка параллельных workers — отсюда изначальная неверная
      пометка «только webkit». Коммит `bbc5aad2`
- [x] Диагностика и фикс делегированы через worktree-агента `pravda-dev`; коммиты интегрированы
      в `main` через `git cherry-pick` (worktree без настроенного upstream, общий object store с
      основным репо)
- [ ] **Не закрыто** — TOC всё ещё пустой (`toc.locator('a').count() === 0`, все 3 браузера,
      стабильно) — другой баг, чем прогресс-бар/активный пункт; RSC-навигация Firefox/WebKit не
      меняет URL; Command Palette Escape (webkit) — флейк без стабильного репро. Детали и статус —
      `PLAN.md` §Backlog

**Последнее обновление:** 2026-08-12
