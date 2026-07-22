# Pravda - План разработки

## Текущая версия: 1.5.0

## Текущий статус

✅ **Фаза 1: Инициализация** — Завершена
✅ **Фаза 2: Сайт законодательства** — Завершена
✅ **Фаза 3: Расширение контента** — Завершена
✅ **Фаза 4: Оптимизация и качество** — Завершена
✅ **Фаза 5: SEO оптимизация** — Завершена

---

## Фаза 1: Инициализация

### Задачи

- [x] Создать проект Next.js
- [x] Настроить project.json (format, oxlint, typecheck:tsgo)
- [x] Создать документацию (README, PLAN, CHANGELOG)
- [x] Настроить Chakra UI Provider
- [x] Настроить базовый layout
- [x] Настроить поддержку тёмной/светлой темы
- [x] Настроить MDX
- [x] Настроить Vitest для unit-тестов
- [x] Создать кастомную систему темы (tokens, semanticTokens)

---

## Фаза 2: Сайт законодательства

### Задачи

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

### Структура роутов

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

---

## Фаза 3: Расширение контента

### Задачи

- [x] Конвертировать все 22 документа в MDX (скрипт convert-docs.ts)
- [x] Расширить поисковый индекс на все статьи (скрипт generate-search-index.ts, 1337 статей)
- [x] Добавить полнотекстовый поиск (Fuse.js fuzzy search)
- [x] Добавить подсветку найденных фрагментов (компонент Highlight)

---

## Фаза 4: Оптимизация и качество

### Задачи v0.9.0

- [x] Тесты для хуков (useSearch, useBookmarks)
- [x] Единый реестр документов lib/documents.ts
- [x] Константы lib/constants.ts
- [x] Компонент HomeLink (DRY)
- [x] Dynamic import для search-index (bundle size)
- [x] Объединение useEffect в toc.tsx
- [x] Server Components (убрать 'use client' где не нужно)
- [x] Accessibility roles

### Задачи v1.0.0

- [x] useDebounce хук для оптимизации поиска (300ms)
- [x] React.memo мемоизация (NavItem, NavSection, Highlight, BookmarkButton)
- [x] SidebarNav compound component (DRY)
- [x] requestAnimationFrame throttle для scroll в toc.tsx
- [x] aria-current и aria-expanded для accessibility
- [x] Footer использует navData (DRY)
- [x] Тесты для isPending состояния

---

## Фаза 5: SEO оптимизация

### Задачи v1.5.0

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

---

## Фаза 6: Перекрёстные ссылки

### Задачи v1.6.0

- [x] Скрипт `convert-cross-refs.ts` для автоматической конвертации
- [x] Маппинг названий документов → slug (30+ вариантов)
- [x] Преобразование 36 текстовых ссылок в компонент `CrossRef`
- [x] Поддержка "см. также" (проп `also`)
- [x] Якорные ссылки на статьи (`#article-N`)
- [x] E2E тесты для перекрёстных ссылок (6 тестов)

---

## Фаза 7: Переименование страны — Русь

### Задачи v1.8.0

- [x] Страна переименована из «Российская Федерация» во всех формах на «Русь» (Конституция, кодексы, уставы, регламенты — 22 документа)
- [x] Столица перенесена из Москвы в Киев (Конституция, все упоминания в кодексах)
- [x] Обновлены заголовки, метаданные (SEO), OG Images, manifest.json, header/layout
- [x] Перегенерирован поисковый индекс (`generate-search-index.ts`)
- [x] Обновлён e2e-тест навигации под новый текст заголовка

---

## Backlog

### 🔴 Приоритетные баги — staging e2e (найдено BlackCove, §18.7 Тираж M1, 2026-07-22)

Полный e2e-прогон на `pravda-stage.s3.letar.best` после фикса `toc.spec.ts` (см. `PLAN_COMPLETED.md`):
187 passed / 49 failed / 1 flaky / 3 skipped. Реальные баги приложения (не тестовые):

- **TOC пустой** — `TOC содержит пункты из документа` (все 3 браузера): `toc.locator('a[href^="#"]').count()` возвращает `0`. Либо TOC не рендерится, либо селектор больше не матчит структуру после недавних изменений.
- **Подсветка активного пункта не работает** — `aria-current` ожидается `"location"`, получено `""`/`null`.
- **RSC-навигация не меняет URL в Firefox/WebKit** (`navigation.spec.ts`) — клик по `nav a[href="..."]`, `page.toHaveURL()` таймаутит, `page.url()` остаётся на предыдущей странице. Chromium работает. `trace.zip` собраны и лежат на s3 (`apps/pravda-e2e/test-output/playwright/output/navigation-*-{firefox,webkit}-retry1/trace.zip`) — не проверил лично, ждёт диагностики с трейсами.
- **`bookmarks.spec.ts`** — кнопка «Добавить в закладки» скрыта/таймаут клика.
- **`cross-refs.spec.ts`** — `strict mode violation: resolved to 2 elements` (текст «см. …» матчит два элемента).
- **`documents.spec.ts`** — проблемы с `BookmarkButton`.

Не диагностировано глубже в этой сессии — не входило в скоуп (только `toc.spec.ts` href.slice
чинился явно). `retries: 1` уже в `playwright.config.ts` (нужен для сбора trace.zip на реальных
фейлах) — можно вернуть на дефолт после диагностики, если больше не нужен.

- [x] Печать документов (кнопка + CSS @media print)
- [x] Экспорт в PDF (через диалог печати браузера)
- [ ] Сравнение редакций
- [ ] История изменений статей
- [ ] Комментарии к статьям
- [x] Закладки пользователя (localStorage + страница /bookmarks)
- [x] SEO оптимизация (robots, sitemap, meta, OG, JSON-LD)
- [x] Перекрёстные ссылки (CrossRef компонент)

---

**Последнее обновление:** 2025-12-28
