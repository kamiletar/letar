# Changelog

Все важные изменения в проекте Pravda документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [1.8.2] - 2026-07-21

### Fixed

- **Клиентская RSC-навигация между статьями не работала на статическом экспорте**
  (`navigation.spec.ts` «Клиентская навигация (RSC)», PLAN.md §18.7 батч M1) — известный баг
  Next.js 16 ([vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374)): RSC-сегменты
  (Cache Components, включены всегда с Next.js 16, не только при явном использовании фичи)
  пишутся на диск вложенными директориями (`__next/section/__PAGE__.txt`), а клиентский роутер
  запрашивает их плоским dot-separated именем (`__next.section.__PAGE__.txt`) — путь расходится,
  prefetch получает 404, дальнейшая клиентская навигация ломается. Апстрим-фикс не смёржен
  (PR #86948 открыт) — добавлен build adapter (`build/adapter.js`, `adapterPath` в
  `next.config.mjs`), переименовывающий файлы в плоский путь после сборки (см.
  [разбор Axiorema](https://blog.axiorema.com/engineering/uncurious-case-broken-static-exports-404s-nextjs-16/)).
  Проверено локальным `next build`: адаптер отрабатывает (`Running onBuildComplete from
  fix-issue-85374`), плоские файлы появляются на месте вложенных, старые пути пусты.

## [1.8.1] - 2026-07-21

### Fixed

- **`CONNECTION_REFUSED` на URL без завершающего слэша (staging e2e, PLAN.md §18.7 батч M1)** —
  nginx автогенерировал 301-редирект `$uri` → `$uri/` через `$server_port` (внутренний `3007`,
  не проброшенный наружу — публично доступен только хостовый `3028` через NPM), из-за чего
  браузер получал `Location: http://.../<path>/:3007/...` и не мог достучаться. Добавлен
  `port_in_redirect off;` в `nginx.conf`.

## [1.8.0] - 2026-07-04

### Changed

- Страна переименована из «Российская Федерация» в «Русь» во всех документах (Конституция, кодексы, уставы, регламенты)
- Столица перенесена из Москвы в Киев
- Обновлены заголовки, SEO-метаданные, OG Images, manifest.json
- Перегенерирован поисковый индекс

## [1.7.0] - 2025-12-29

### Changed

- **OG Images:** Рефакторинг генерации — изображения генерируются при билде, не хранятся в git
- Использование полного Noto Sans TTF для корректного отображения кириллицы

### Added

- Версия из package.json отображается в футере

### Fixed

- Исправлена клиентская навигация в статическом экспорте Next.js 16
- TOC теперь обновляется при клиентской навигации

## [1.6.1] - 2025-12-28

### Changed

- **Статический экспорт:**
  - Изменён `output: 'standalone'` → `output: 'export'` для nginx
  - Добавлен `trailingSlash: true` для корректных путей
  - Удалены динамические API роуты (Edge Runtime)

- **OG Images:**
  - Динамическая генерация заменена на статические PNG (24 файла)
  - Скрипт `scripts/generate-og-images.ts` генерирует изображения через satori
  - Шрифт Noto Sans (кириллица) загружается из jsDelivr CDN

- **Docker конфигурация:**
  - `Dockerfile.production` — nginx:alpine вместо Node.js
  - `nginx.conf` — gzip, кэширование статики (1 год), SPA роутинг
  - `docker-compose.production.yml` — порт 3007

### Removed

- `src/app/opengraph-image.tsx` — динамический OG для главной
- `src/app/api/og/[...path]/route.tsx` — динамический OG API

### Fixed

- TypeScript конфигурация для статического экспорта:
  - Удалён `rootDir` из tsconfig.json (конфликт с path aliases)
  - Добавлен `webworker` в lib для Service Worker типов
  - Добавлен `skipLibCheck: true` для обхода конфликтов типов
  - Явно указаны `types: ["node", "react", "react-dom"]`
- `robots.ts` и `sitemap.ts` — добавлен `export const dynamic = 'force-static'`
- `/offline` — добавлен `'use client'` для Icon компонента

### Dependencies

- `satori@0.18.3` — генерация SVG из JSX (перенесён в корневой package.json)
- `@types/minimatch@6.0.0` — типы для minimatch

## [1.6.0] - 2025-12-28

### Added

- **Кликабельные перекрёстные ссылки:**
  - Скрипт `convert-cross-refs.ts` для автоматического преобразования
  - 36 перекрёстных ссылок преобразованы в компонент `CrossRef`
  - Поддержка "см. также" через проп `also`
  - Якорные ссылки на статьи внутри документов (`#article-N`)

### Changed

- Компонент `CrossRef` расширен:
  - Добавлен проп `also` для "см. также"
  - Улучшен маппинг названий документов → URL

### Technical

- Маппинг 30+ названий документов (включая аббревиатуры: УПК, УИК)
- Автоматическое определение категории документа по названию
- Поддержка разделов, глав и статей в ссылках

## [1.5.0] - 2025-12-28

### Added

- **SEO оптимизация:**
  - `robots.ts` — инструкции для поисковых роботов
  - `sitemap.ts` — карта сайта с 22 документами и 3 категориями
  - `lib/seo.ts` — SEO утилиты и константы

- **Metadata для всех страниц:**
  - metadataBase и title template в root layout
  - OpenGraph и Twitter Cards теги
  - Уникальные title/description для каждого из 22 документов
  - noindex для служебных страниц (search, bookmarks)

- **JSON-LD структурированные данные:**
  - `WebSiteJsonLd` — schema.org WebSite с SearchAction
  - `ArticleJsonLd` — schema.org Article для документов
  - `BreadcrumbJsonLd` — schema.org BreadcrumbList

- **OpenGraph Images:**
  - Статическое OG изображение для главной страницы (Edge Runtime)
  - Динамическая генерация OG изображений для 22 документов через API
  - Цветовое кодирование по категориям

### Technical

- 22 layout файла для документов с metadata + JSON-LD
- Edge Runtime для быстрой генерации изображений
- Утилита `getDocumentMetadata()` для переиспользования

## [1.4.0] - 2025-12-28

### Added

- **Комплексное покрытие тестами:**
  - Unit тесты для `documents.ts` (22 теста)
  - Integration тесты для `bookmark-button.tsx` (8 тестов)
  - Integration тесты для `header.tsx` (13 тестов)
  - Integration тесты для `command-palette.tsx` (14 тестов)
  - Integration тесты для `toc.tsx` (12 тестов)
  - E2E тесты навигации (8 тестов)
  - E2E тесты закладок (6 тестов)
  - E2E тесты поиска (8 тестов)
  - E2E тесты документов (10 тестов)

### Technical

- Общее покрытие тестами: ~65%+
- Критичные компоненты покрыты на 85%+
- Vitest 4.0 для unit/integration тестов
- Playwright для E2E тестов

## [1.3.0] - 2025-12-28

### Added

- **PWA с оффлайн режимом:**
  - Service Worker через Serwist (`@serwist/next`, `serwist`)
  - Кэширование всех 22 документов и поискового индекса
  - Работа без интернета после согласия пользователя

- **Consent Flow (согласие на оффлайн):**
  - Banner запроса внизу экрана с задержкой 2 секунды
  - Кнопки "Включить оффлайн" и "Не сейчас"
  - Повторный показ через 7 дней после отказа
  - Хук `useOfflineConsent` с useSyncExternalStore

- **Индикатор статуса сети:**
  - Компонент `NetworkStatusIndicator` в header
  - Иконка Wi-Fi / Wi-Fi-Off с tooltip
  - Показывается только если оффлайн включён
  - Хук `useOnlineStatus` для отслеживания navigator.onLine

- **PWA манифест и иконки:**
  - `manifest.json` с полной конфигурацией
  - Иконки 72-512px сгенерированы из het.svg
  - `apple-touch-icon.png`, `favicon.ico`
  - Метаданные в layout.tsx (manifest, viewport, icons)

- **Offline fallback:**
  - Страница `/offline` с сообщением "Нет подключения"
  - Service Worker возвращает её для некэшированных страниц

### Dependencies

- `@serwist/next@9.4.2` — Serwist плагин для Next.js
- `serwist@9.4.2` — Service Worker runtime
- `sharp@0.34.5` — генерация иконок (devDependency)

## [1.2.1] - 2025-12-28

### Fixed

- **Таблицы в MDX документах:**
  - Добавлен плагин `remark-gfm` для поддержки GitHub Flavored Markdown
  - Маркдаун-таблицы теперь рендерятся как HTML-таблицы (Chakra UI Table)
  - Используется строковый формат плагина для совместимости с Turbopack

### Dependencies

- `remark-gfm@4.0.1` — поддержка GFM (таблицы, strikethrough, autolinks)

## [1.2.0] - 2025-12-28

### Added

- **Skip Link для accessibility:**
  - Компонент `SkipLink` в header.tsx
  - Визуально скрыт, появляется при фокусе
  - Переход к `#main-content` (WCAG 2.1 AA)

- **Command Palette (Cmd+K / Ctrl+K):**
  - Новый компонент `command-palette.tsx`
  - Fuzzy search по статьям с использованием `useSearch`
  - Keyboard navigation (↑↓ Enter Esc)
  - Подсветка совпадений через `Highlight`
  - Глобальный listener в header.tsx

- **Mobile TOC:**
  - Новый компонент `mobile-toc.tsx` с FAB + Drawer
  - Отображается на экранах < 1280px
  - IntersectionObserver для активного раздела
  - Плавный scroll при клике

- **Skeleton Loading:**
  - `ArticleSkeleton`, `SectionSkeleton`, `DocumentSkeleton`
  - `loading.tsx` для (docs) route group
  - Устранение CLS (Cumulative Layout Shift)

- **Визуальная иерархия:**
  - Sticky Section headers с градиентной линией
  - Цветовое кодирование Chapter (accent border)
  - Левая вертикальная линия для глубины

- **Микро-анимации:**
  - Bookmark button: translateX hover эффект
  - TOC active item: glow shadow
  - Progress bar: отображение процента чтения

### Changed

- **Accessibility:**
  - `toc.tsx` — добавлены `role="progressbar"`, aria-valuenow/min/max
  - `breadcrumbs.tsx` — добавлен `as="nav" aria-label`
  - `document-actions.tsx` — добавлен `aria-haspopup="menu"`
  - `layout.tsx` — `id="main-content" tabIndex={-1}` на main

- **highlight.tsx:**
  - Тип `matches` теперь `readonly FuseResultMatch[]`

### Performance

| Улучшение        | Влияние                               |
| ---------------- | ------------------------------------- |
| Skip Link        | WCAG 2.1 AA compliance                |
| Mobile TOC       | UX для 40%+ мобильных пользователей   |
| Skeleton Loading | Устранение CLS, perceived performance |
| Command Palette  | Power users productivity              |

## [1.1.0] - 2025-12-28

### Added

- **Тактильная обратная связь (Haptic Feedback):**
  - Button recipe с `scale(0.95)` на `:active` (размер зависит от size)
  - Link recipe с `scale(0.95)` на `:active`
  - IconButton recipe с `scale(0.85)` на `:active`
  - Accordion, Menu, Tabs, Tag slot recipes с микро-анимациями

- **Animation Styles:**
  - `fade-in`, `fade-out` — плавное появление/исчезновение
  - `slide-in-*` — slide анимации (right, left, top, bottom)
  - `scale-in`, `scale-out` — масштабирование
  - `pulse`, `spin` — бесконечные анимации
  - `slide-fade-in`, `scale-fade-in` — комбинированные

- **TopLoader с цветом темы:**
  - Компонент `TopLoader` получает brand.500 из темы через `useToken`
  - Интеграция в `Providers`

### Changed

- **Theme structure:**
  - Добавлена папка `recipes/` с button, link, slotRecipes
  - Добавлена папка `styles/` с animationStyles
  - Обновлён `theme/index.ts` с интеграцией recipes и animation styles

- **tsconfig.json:**
  - Добавлен reference на `libs/ui`

### Dependencies

- `@letar/ui` — добавлен TopLoader с поддержкой кастомного цвета

## [1.0.0] - 2025-12-28

### Added

- **Debounce для поиска:**
  - Хук `useDebounce` для оптимизации поисковых запросов
  - 300ms задержка снижает нагрузку при быстром вводе
  - Новое состояние `isPending` для индикации ожидания

- **Compound component `SidebarNav`:**
  - Объединение логики из sidebar.tsx и mobile-sidebar.tsx
  - Поддержка `onItemClick` callback для мобильной версии

- **Тест для `isPending`:**
  - Проверка отображения состояния debounce в UI

### Changed

- **React.memo мемоизация:**
  - `NavItem` — предотвращает ререндеры 22+ элементов навигации
  - `NavSection` — мемоизация секций с aria-expanded
  - `Highlight` — мемоизация компонента подсветки
  - `BookmarkButton` — memo + useCallback для обработчика

- **Scroll throttling:**
  - `toc.tsx` — requestAnimationFrame для scroll handler
  - Снижение частоты обновлений прогресс-бара

- **Footer DRY:**
  - Использует navData вместо хардкода ссылок
  - Динамическая генерация категорий

### Accessibility

- `toc.tsx` — добавлен `aria-current="location"` для активного элемента
- `nav-section.tsx` — добавлен `aria-expanded` для collapsible секций

### Performance

| Метрика           | v0.9.0        | v1.0.0               |
| ----------------- | ------------- | -------------------- |
| Ререндеры NavItem | Каждый раз    | Только при изменении |
| Поиск при вводе   | Каждый символ | После 300ms паузы    |
| Scroll handler    | ~60 fps       | throttled RAF        |

## [0.9.0] - 2025-12-28

### Added

- **Тесты для хуков:**
  - 8 тестов для `useSearch` — поиск, группировка, matches
  - 10 тестов для `useBookmarks` — CRUD, localStorage, sync

- **Единый реестр документов `lib/documents.ts`:**
  - Все 22 документа в одном месте (single source of truth)
  - Функции: `getDocumentBySlug()`, `getDocumentsByCategory()`, `getTitleMap()`
  - Удалены дублирующиеся TITLE_MAP из article.tsx и generate-search-index.ts

- **Константы `lib/constants.ts`:**
  - `HEADER_HEIGHT`, `SCROLL_MARGIN_TOP`
  - `scrollbarStyles` — общие стили скроллбара

- **Компонент `HomeLink`:**
  - Вынесен из sidebar.tsx и mobile-sidebar.tsx
  - Устранено дублирование кода

### Changed

- **Bundle size:** Dynamic import для search-index.ts (672KB)
  - Индекс загружается асинхронно при монтировании
  - Добавлены состояния `isLoading` и `error` в `useSearch`

- **Performance:**
  - `toc.tsx` — объединены 3 useEffect в 1 с общим cleanup
  - `highlight.tsx` — добавлен useMemo для вычислений

- **Server Components:**
  - Удалён `'use client'` из: section.tsx, chapter.tsx, quote.tsx, penalty.tsx, cross-ref.tsx, law-table.tsx
  - Эти компоненты теперь рендерятся на сервере

- **Accessibility:**
  - `header.tsx` — добавлен `role="banner"`
  - `footer.tsx` — добавлен `role="contentinfo"`
  - `sidebar.tsx` — добавлен `aria-label="Основная навигация"`
  - `penalty.tsx` — добавлены `role="note" aria-label="Информация о наказании"`

### Refactored

- Используются константы из `lib/constants.ts` вместо hardcoded значений
- `nav-data.ts` теперь импортирует из `lib/documents.ts`
- `scripts/generate-search-index.ts` использует единый реестр

## [0.8.0] - 2025-12-28

### Added

- **TOC с индикатором прогресса:**
  - Прогресс-бар чтения документа (красная полоска под заголовком)
  - Вертикальная линия-индикатор слева от списка
  - Активный раздел выделяется красной полоской с анимацией
  - Плавный smooth scroll при клике на элемент
  - Улучшена accessibility (`aria-label="Содержание документа"`)

- **Footer с навигацией:**
  - Декоративный градиент-разделитель (brand → accent → brand)
  - Сетка навигации по 4 разделам: Основные, Кодексы, Уставы, Регламенты
  - Адаптивная сетка (2 колонки на мобильных, 4 на десктопе)

### Changed

- **Article компонент:**
  - Номер статьи теперь в Badge (красный, subtle variant)
  - Добавлены `role="article"` и `aria-labelledby` для accessibility
  - Кнопка закладки скрыта на десктопе, появляется при hover
  - На мобильных кнопка закладки всегда видна

## [0.7.0] - 2025-12-28

### Changed

- **Модернизация терминологии:** замена архаизмов на современные аналоги
  - Административное деление: губерния → область, уезд → район, волость → муниципалитет
  - Учреждения: острог → колония, сословный острог → VIP-колония, казна → бюджет
  - Органы власти: Казначейский приказ → Министерство финансов, Острожный приказ → ФСИН
  - Должности: казначей → финансист, приказчик → управляющий
  - Социальные термины: холоп → должник в отработке
  - Суды: уездный суд → районный суд, губернский суд → областной суд
- Переименован роут `/regulations/volost` → `/regulations/municipality`
- Обновлена навигация: «Волостной регламент» → «Муниципальный регламент»
- Обновлены все связанные цифровые системы: ГосОстрог → ГосФСИН, ГосВолость → ГосМуниципалитет

## [0.6.0] - 2025-12-28

### Changed

- **BREAKING:** Миграция на ASCII URL из-за бага Next.js #10084
  - Кириллические URL не работают локально в `next dev`
  - Все роуты переименованы на английские:
    - `/поиск` → `/search`
    - `/закладки` → `/bookmarks`
    - `/конституция` → `/constitution`
    - `/правда` → `/pravda`
    - `/кодексы/*` → `/codes/*`
    - `/уставы/*` → `/statutes/*`
    - `/регламенты/*` → `/regulations/*`
  - Обновлён поисковый индекс (1337 статей)
  - Обновлена навигация и все ссылки

### Fixed

- Ошибка `chakra() from the server` в mdx-components.tsx
  - Заменено `chakra('pre')` на `Box as="pre"` для совместимости с Server Components

## [0.5.3] - 2025-12-28

### Added

- Компонент `Footer` с дисклеймером:
  - Объяснение литературно-юмористического характера проекта
  - Указание на альтернативную вселенную с традициями XI века
  - Лицензия MIT для использования в литературных произведениях
  - Скрытие при печати

### Changed

- Все страницы теперь используют Flex layout с футером внизу
- Главная, Поиск, Закладки — добавлен футер с дисклеймером
- DocsLayout — добавлен футер с дисклеймером

## [0.5.2] - 2025-12-28

### Added

- Система закладок пользователя:
  - Хук `useBookmarks` с сохранением в localStorage
  - Кнопка закладки в каждой статье (`BookmarkButton`)
  - Страница закладок `/закладки` с группировкой по категориям
  - Ссылка на закладки в Header
- Кнопка закладки автоматически определяет документ и категорию из URL

### Changed

- Компонент `Article` теперь содержит кнопку закладки
- Header: добавлена иконка закладок

## [0.5.1] - 2025-12-28

### Added

- Компонент `DocumentActions` — меню с действиями:
  - Печать документа (Ctrl+P)
  - Сохранить как PDF (через диалог печати браузера)
  - Подсказка для пользователя
- CSS стили для печати `globals.css` (@media print):
  - Скрытие навигации, sidebar, TOC, breadcrumbs при печати
  - Оптимизация шрифтов (12pt основной, 24pt заголовок)
  - Правила разрыва страниц (статьи не разрываются)
  - Отображение URL для внешних ссылок
  - Чёрно-белая печать без теней и фонов

### Changed

- DocsLayout: добавлен `data-print-hide` на sidebar и TOC
- Breadcrumbs обёрнуты в HStack вместе с DocumentActions

### Removed

- Удалён устаревший компонент `PrintButton` (заменён на `DocumentActions`)

## [0.5.0] - 2025-12-28

### Added

- Скрипт генерации поискового индекса `scripts/generate-search-index.ts`
- Полный поисковый индекс из 1337 статей всех 22 документов
- Компонент `Highlight` для подсветки найденных фрагментов
- Подсветка совпадений в результатах поиска

### Changed

- Увеличен лимит результатов поиска до 50
- Обновлён хук `useSearch` для передачи данных о совпадениях
- Страница поиска теперь показывает подсвеченные фрагменты

## [0.4.0] - 2025-12-28

### Added

- Конвертированы все 22 документа в MDX:
  - Кодексы (10): Налоговый, Уголовный, Семейный, Трудовой, Цифровой, Медицинский, Ордалий, УПК, Строительный, Государственных тайн
  - Уставы (7): Церковный, Торговый, Военный, Образовательный, Дорожный, Почтовый, Ярмарочный
  - Регламенты (3): Дуэльный, Вечевой, Волостной
  - Основные законы (2): Конституция, Русская Правда

### Changed

- Улучшен скрипт конвертации `scripts/convert-docs.ts`:
  - Построчная обработка документов
  - Правильное закрытие тегов Section, Chapter, Article
  - Автоматическая нумерация разделов

## [0.3.0] - 2025-12-28

### Added

- MDX компоненты для законодательства: Article, Section, Chapter, LawTable, CrossRef, Quote, Penalty
- DocsLayout с трёхколоночной структурой (Sidebar | Content | TOC)
- Sidebar навигация с 22 документами в 4 категориях
- Table of Contents (TOC) — sticky справа на десктопе, автогенерация из h2/h3
- Breadcrumbs для навигации по разделам
- Главная страница с hero секцией и карточками категорий
- Страницы категорий: Кодексы, Уставы, Регламенты
- Русские URL: /конституция, /правда, /кодексы/налоговый, /регламенты/дуэльный
- Поиск с Fuse.js (fuzzy search по статьям)
- Страница поиска /поиск с результатами и подсветкой
- Скрипт конвертации документов `scripts/convert-docs.ts`
- 3 документа-образца в MDX формате:
  - Конституция (/конституция)
  - Русская Правда (/правда)
  - Дуэльный регламент (/регламенты/дуэльный)
- Поисковый индекс с образцами статей `src/lib/search-index.ts`
- Хук useSearch для fuzzy-поиска

### Changed

- Header: добавлена кнопка поиска
- mdx-components.tsx: зарегистрированы все новые MDX компоненты
- Обновлена структура навигации в nav-data.ts

### Dependencies

- Добавлен fuse.js для fuzzy search

## [0.2.0] - 2025-12-28

### Added

- Vitest конфигурация для unit-тестов
- Полифилы и моки для тестовой среды (jsdom, Next.js mocks)
- Кастомная система темы `src/theme/`
- Цветовые токены: brand (красный), accent (оранжевый), gray, success, warning, error, info
- Семантические токены с полной поддержкой Dark Mode

### Changed

- Providers теперь использует кастомную тему через `system`

## [0.1.0] - 2025-12-28

### Added

- Chakra UI Provider с поддержкой тёмной/светлой темы
- ColorModeButton для переключения темы
- MDX поддержка с кастомными компонентами
- Глобальные MDX компоненты (Heading, Text, Link, Code, Pre)
- Тестовая MDX страница `/test-mdx`

### Changed

- Обновлён layout.tsx с Providers
- Конфигурация next.config.mjs с MDX плагином

## [0.0.1] - 2025-12-28

### Added

- Инициализация проекта Next.js
- Настройка project.json с targets: format, oxlint, typecheck:tsgo
- Базовая структура приложения (layout.tsx, page.tsx)
- Документация проекта (README, PLAN, CHANGELOG)
- Команда разработки `.claude/commands/pravda.md`
