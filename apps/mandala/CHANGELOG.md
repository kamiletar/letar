# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.40.5] - 2026-08-04

### Security

- **SSRF в `/api/og-image` (ветка внешних URL, без авторизации).** Роут без проверок делал
  `fetch()` на любой переданный `?url=` — `http://127.0.0.1:6379/` (внутренние сервисы),
  `http://169.254.169.254/...` (метаданные облака), сканирование внутренней сети сервера.
  Ветка внешних URL удалена целиком: оба вызывающих места приложения передают только локальный
  `getImageUrl()`, внешние изображения никогда не генерировались. Нелокальный `url` → `400`.

## [0.40.3] - 2026-08-04

### Security

- **Path traversal в `/api/og-image` (без авторизации).** Роут брал query-параметр `url`, проверял
  только префикс `/api/files/` / `/api/images/` и склеивал остаток с корнем `uploads/` через `join`
  без нормализации. `?url=/api/files/../../../../<путь>` проверку префикса проходил, `join` спокойно
  выходил за пределы `uploads/`, и sharp отдавал любой файл-изображение с диска сервера — включая
  загрузки соседних приложений монорепо. Путь теперь резолвится через `resolveUploadPath` из
  `@letar/image-upload/server` (та же защита, что в `api/files/[...path]`): выход за корень → 403,
  мусор во вводе (нулевой байт) → 400.
- **Тот же приём в `DELETE /api/upload?url=…`** — там это было уже не чтение, а удаление
  произвольного файла (под ADMIN-сессией). Закрыто тем же `resolveUploadPath`; заодно
  `url.replace('/api/files/', '')` заменён на якорный `^`-вариант.
- **Убран повторный `decodeURIComponent`** в `/api/og-image`: `searchParams.get` уже возвращает
  раскодированное значение, а лишний проход превращал `%252e%252e%252f` в `../` и ронял 500 на
  одиночном `%`.

### Fixed

- `/api/og-image` на каталог внутри `uploads/` отдаёт 404 вместо 500 (раньше sharp падал на
  директории).

### Tests

- 12 тестов на traversal рядом с роутом (`src/app/api/og-image/__tests__/route.spec.ts`):
  `../`, процентная кодировка `%2e%2e%2f`, двойное кодирование, обратный слэш, абсолютный путь,
  нулевой байт, пустой остаток. С **положительным контролем** — реальный файл за пределами
  `uploads/`, чтобы 403 нельзя было спутать с «файла всё равно нет».

## [0.40.1] - 2026-07-30

### Fixed

- **Telegram API через tg-proxy (обход блокировки s1/s2):** `TelegramClient` в
  `src/lib/telegram/telegram-client.ts` хардкодил `https://api.telegram.org`, заблокированный
  провайдером ДЦ на s1/s2. Переведён на `TELEGRAM_API_ROOT` с дефолтом `https://tg-proxy.letar.best`.

## [0.39.10] - 2026-07-22

### Fixed

- **`/admin/products` сломан целиком** (найдено BlackCove, staging e2e §18.7 batch2) — два независимых бага:
  - **`prisma/seed.ts` никогда не создавал записи `Product`** — список товаров в админке был пуст на любом
    окружении (не только staging), из-за чего 3 e2e-теста падали на `getByRole('table')`. Добавлен блок
    сидинга 3 тестовых товаров (аналогично мандалам).
  - **Клиентская навигация с любой admin-таблицы на `/new` крашила вкладку** (`SlugField`/`SeoField` из
    `@letar/admin-ui` подписывались на `form.store.subscribe()` и возвращали результат подписки прямо из
    `useEffect`). В установленной версии `@tanstack/form-core@1.33.x` → `@tanstack/store@^0.11.0`
    `subscribe()` возвращает объект `{ unsubscribe }`, а не функцию — React ругался
    `useEffect must not return anything besides a function` и **cleanup никогда не вызывался**, подписка
    утекала на каждый mount/unmount. При навигации это провоцировало крах вкладки браузера
    (`Target page, context or browser has been closed` в Playwright). Баг задевал не только товары, но и
    мандалы/контент-страницы — везде, где используются `SlugField`/`SeoField`. Остальные 10 мест в
    `libs/forms/src` уже были исправлены на `.unsubscribe()` ранее; `slug-field.tsx`/`seo-field.tsx`
    остались со старым паттерном. Исправлено по тому же паттерну.

## [0.39.8] - 2026-07-12

### Fixed

- **Устойчивый фикс `ERR_DLOPEN_FAILED: libvips-cpp.so`** — прод-инцидент 2026-07-12 (500 на
  всех страницах, ~17 минут простоя, см. корневой `PLAN.md` Сессия №70/№71) закрыт временным
  хотфиксом с захардкоженным путём к `.so`-файлу в `Dockerfile.production` (commit `8ba37d8f`).
  Заменён на `outputFileTracingIncludes` в `next.config.js` — Next.js standalone tracer теперь
  сам подхватывает `libvips-cpp.so` при `next build` через глоб
  `./node_modules/.bun/@img+sharp-libvips-*/**/*.so*`, без привязки к версии `sharp-libvips`.
  Явный `COPY` в `Dockerfile.production` убран как избыточный.

## [0.39.7] - 2026-01-10

### Fixed

- **Режим медитации — таймер не работал** — исправлены критические баги:
  - `MeditationTimer`: убран `onComplete` из deps useEffect, используется ref — интервал больше не рестартует при каждом ререндере
  - `BreathingOverlay`: исправлена утечка памяти — теперь очищаются ВСЕ вложенные таймауты при unmount
  - `MandalaViewer`: мемоизированы `handleMeditationComplete` и `handleMeditationCancel` через useCallback

### Added

- **E2E тесты для медитации** — добавлены 3 теста в `05-mandala-viewer.guest.spec.ts`:
  - Таймер отсчитывает время (проверка изменения за 3 секунды)
  - Индикатор дыхания появляется при включении (текст "Вдох..."/"Выдох...")
  - Таймер можно поставить на паузу

## [0.39.6] - 2026-01-10

### Fixed

- **SEO: исправлено дублирование title** — убрано "- Elfafeya Art" из title страниц, теперь template добавляет суффикс автоматически
  - mandalas/page.tsx: "Галерея мандал" → "Галерея мандал - Elfafeya Art"
  - contacts/page.tsx: "Контакты" → "Контакты - Elfafeya Art"
  - mandalas/[slug]/page.tsx: использует metaTitle или name
  - shop/[slug]/page.tsx: использует metaTitle или name
  - [slug]/page.tsx: использует metaTitle или title
  - page.tsx (главная): использует t('welcome')
- **Image optimization** — улучшены sizes для ParallaxImage (responsive вместо 100vw)
- **Lint fix** — добавлены фигурные скобки в pin-auth-adapters.ts
- **Hydration warning** — добавлен suppressHydrationWarning на body (частичное решение для next-themes + Emotion)

## [0.39.5] - 2026-01-10

### Fixed

- **i18n для viewer controls** — привязаны все aria-labels к системе переводов
  - MandalaViewer: закрытие, карусель, полноэкранный режим
  - FloatingMiniPlayer: переключение треков, shuffle, плейлист, громкость, воспроизведение
  - PlaylistDrawer: shuffle, закрытие
  - MeditationTimer: закрытие, пауза/продолжение, перезапуск
  - TrackSelector: выбор саундскейпа, управление треками
  - ControlButtons: направление вращения
  - ShareButton: поделиться
  - ViewerControls: режимы, скрытие панели
- **i18n для header компонентов** — CartIcon, LanguageSwitcher, ThemeSwitcher
- **Перемещён OfflineConsentBanner** — из корневого layout в [locale]/layout.tsx для корректного доступа к контексту i18n

## [0.39.4] - 2026-01-10

### Fixed

- **i18n для OfflineConsentBanner** — привязаны все тексты баннера оффлайн режима к системе переводов
  - Заголовок и описание
  - Преимущества (работает без интернета, 35+ мандал, музыка, полноэкранный просмотр)
  - Кнопки «Не сейчас» и «Включить оффлайн»

## [0.39.3] - 2026-01-10

### Fixed

- **i18n для WelcomePortal** — привязаны все тексты приветственного портала к системе переводов
  - Заголовок и описание
  - Кнопка «Начать медитацию»
  - Навигационные ссылки (Галерея, О художнице, О мандалах)
  - Подсказка закрытия

## [0.38.1] - 2026-01-08

### Fixed

- **Исправлен импорт UserRole** — заменён неправильный путь `@prisma/client` на `@/generated/prisma` в `with-admin-auth.ts`

## [0.37.0] - 2026-01-08

### Added

- **Unit-тесты для критичных модулей** — 309 тестов (7 skipped для OPFS API)
  - `vitest.config.ts` и `vitest.setup.ts` — инфраструктура тестирования
  - `lib/actions/__tests__/` — тесты для фабрик Server Actions (6 файлов, 55 тестов)
  - `lib/email/__tests__/` — тесты для email сервиса (2 файла, 29 тестов)
  - `lib/__tests__/` — тесты для audio/OPFS утилит (2 файла, 65 тестов)
  - `_schemas/__tests__/` — тесты для Zod схем (5 файлов, 113 тестов)
  - `_hooks/__tests__/` — тесты для хуков (3 файла, 54 теста)

### Technical

- Добавлен `test` target в `project.json` с `@nx/vitest:test` executor
- Настроен jsdom environment для React компонентов
- Полифилы: `structuredClone`, `ResizeObserver`
- OPFS API-зависимые функции помечены как skipped (требуют браузерный контекст)

## [0.36.0] - 2026-01-08

### Security

- **try/catch в Server Actions** — добавлена обработка ошибок в `mark-as-read.action.ts` и `update-order-status.action.ts`
- **Валидация пустых массивов** — защита от обработки пустых ids в `bulk-actions-factory.ts`
- **Type-safe JSON парсинг** — Zod схема `CartItemDataSchema` для валидации корзины в `create-order.action.ts`

### Added

- **Фабрики Server Actions** — переиспользуемые паттерны для CRUD операций
  - `create-action-factory.ts` — фабрика для create actions с валидацией uniqueField
  - `update-action-factory.ts` — фабрика для update actions с проверкой существования
- **ToggleControl компонент** — универсальный переключатель для viewer контролов
- **Хуки главной страницы** — выделение логики из компонентов
  - `useImageRotation` — ротация изображений с интервалом
  - `useWelcomePortalState` — состояние приветственного портала

### Changed

- **Консолидация типов** — единый источник правды
  - `lib/types/auth.types.ts` — UserWithRole, SessionWithRole
  - `checkout/_schemas/checkout.schema.ts` — CartItemData реэкспорт в order.schema.ts
- **Рефакторинг actions** — замена дублирующего кода на фабрики
  - `create-mandala.action.ts` — использует createCreateAction (сокращение ~25 строк)
  - `create-content-page.action.ts` — использует createCreateAction
  - `update-mandala.action.ts` — использует createUpdateAction (сокращение ~25 строк)
  - `update-content-page.action.ts` — использует createUpdateAction
- **Рефакторинг UI контролов** — замена Switch паттернов на ToggleControl
  - `atmosphere-controls.tsx` — ~9 Switch → ToggleControl
  - `audio-sync-controls.tsx` — ~4 Switch → ToggleControl
  - `effects-controls.tsx` — ~1 Switch → ToggleControl
  - `hue-rotate-controls.tsx` — ~1 Switch → ToggleControl
  - `control-buttons.tsx` — ~2 Switch → ToggleControl

### Technical

- Общее сокращение кода: ~200 строк
- Улучшена типизация ColorPalette для ToggleControl (9 цветов)
- Исправлена ошибка типа form action в orders/[id]/page.tsx
- Добавлен package.json в tsconfig.include для footer.tsx

## [0.35.0] - 2026-01-08

### Changed

- **Рефакторинг хуков и компонентов** — улучшение переиспользуемости кода
  - `useEventListener` / `useEventListeners` — универсальный хук для DOM событий с автоматическим cleanup
  - `useVariantStyles` — стили для 'normal' | 'fullscreen' режимов просмотра
  - `useImageUpload` / `useImagePreview` — загрузка изображений через API с drag-n-drop
  - `useTooltipPosition` / `useTargetHighlight` — позиционирование онбординг-тултипов
  - `useAdminForm` — общая логика админ-форм (defaultValues, handleSubmit, persistence)

### Technical

- Рефакторинг `use-audio-playback.ts` на `useEventListeners`
- Рефакторинг `use-gesture-controls.ts` на `useEventListeners`
- Рефакторинг `atmosphere-controls.tsx` на `useVariantStyles`
- Рефакторинг `image-upload-field.tsx` на `useImageUpload`
- Рефакторинг `product-images-upload.tsx` на `useImageUpload`
- Рефакторинг `content-page-form.tsx` на `useAdminForm`
- Рефакторинг `onboarding-tooltip.tsx` на `useTooltipPosition` (289 → 139 строк)
- Общее сокращение кода: ~350 строк

## [0.34.0] - 2026-01-03

### Added

- **i18n для контентных страниц**
  - Полный перевод страницы "О художнице" (aboutArtist) на английский
  - Полный перевод страницы "О мандалах" (aboutMandalas) на английский с 9 параграфами и 7 alt-текстами для мандал
  - Миграция about-elfafeya/page.tsx на getTranslations
  - Миграция about-mandalas/page.tsx на getTranslations

- **i18n для динамического контента БД**
  - Новые поля в schema.zmodel: nameEn, descriptionEn, metaTitleEn, metaDescriptionEn
  - Модели Mandala, Product, ContentPage получили EN-поля
  - Хелпер `getLocalizedField(item, field, locale)` в lib/i18n-helpers.ts
  - Хелпер `useLocalizedField(locale)` для компонентов
  - Хелпер `getLocalizedFields(item, fields, locale)` для batch операций

### Technical

- Использован messages-подход вместо MDX для контентных страниц
- Все EN поля опциональные (String?) для обратной совместимости
- Хелперы возвращают оригинальное значение если EN перевод отсутствует

## [0.33.0] - 2026-01-03

### Added

- **Мультиязычность (i18n)** — поддержка русского и английского языков
  - Интеграция next-intl v4.6.1 для интернационализации
  - Структура i18n/ (routing.ts, request.ts, navigation.ts)
  - Файлы переводов messages/ru.json и messages/en.json
  - LanguageSwitcher компонент в навигации
  - Переводы для навигации, аутентификации, магазина, галереи, корзины

### Changed

- Структура App Router перенесена в [locale]/
  - (main)/, (auth)/, [slug]/ перемещены в [locale]/
  - Admin панель остаётся без локализации (только русский)
- navigation.tsx, mobile-menu.tsx, auth-button.tsx мигрированы на useTranslations
- sitemap.ts обновлён с поддержкой hreflang alternates

### Technical

- Стратегия URL: `localePrefix: 'as-needed'` — /ru не показывается для дефолтной локали
- proxy.ts интегрирован с createIntlMiddleware
- next.config.js обновлён с next-intl/plugin

## [0.30.1] - 2026-01-03

### Changed

- Рефакторинг Server Actions — вынесена общая логика в `lib/actions/with-admin-auth.ts`
  - `assertAdminAuth()` — проверка админ-прав + enhanced Prisma client
  - `handleUniqueConstraintError()` — обработка unique constraint ошибок
  - Применено к ~15 admin action файлам (экономия ~10 строк на файл)
- audio-controls.tsx разбит на модули: 505 → 141 строк
  - track-selector.tsx: выбор аудио треков (139 строк)
  - audio-sync-controls.tsx: настройки синхронизации (284 строк)
- ImageUploadZone перенесён в `admin/_components/` (shared между секциями)

### Added

- Barrel exports (`index.ts`) для `_hooks/` и `controls/`
- `lib/actions/index.ts` — централизованный экспорт action helpers

### Fixed

- Исправлен импорт NativeSelect в hue-rotate-controls.tsx (Chakra UI v3 API)
- Удалены несуществующие экспорты типов в `_hooks/index.ts`

## [0.30.0] - 2026-01-03

### Changed

- Рефакторинг canvas эффектов — вынесена общая логика в `useCanvasEffect` хук
  - animated-aurora.tsx: 179 → 82 строк (-54%)
  - animated-conic-gradient.tsx: 165 → 74 строк (-55%)
  - animated-plasma.tsx: 203 → 117 строк (-42%)
  - animated-radial-gradient.tsx: 169 → 79 строк (-53%)
  - animated-tunnel.tsx: 177 → 91 строк (-49%)
  - animated-solid-color.tsx: 183 → 97 строк (-47%)
  - Общая экономия: 1076 → 753 строк (30%)

### Added

- `useCanvasEffect` хук — общая логика для canvas эффектов (resize, animation loop, transitions)
- `SliderControl` компонент — переиспользуемый слайдер с лейблом и форматтером значения
- Встроенные форматтеры: `formatPercent`, `formatSeconds`, `formatMsToSeconds`, `formatDuration`

## [0.29.0] - 2025-12-31

### Changed

- Динамическое прекеширование для полной оффлайн-работы
  - Новый API `/api/precache-manifest` для получения списка ресурсов из БД
  - SW теперь прекеширует страницы мандал и товаров динамически
  - Изображения из `/api/files/` кешируются для оффлайн-доступа
  - Удалён устаревший статический список `PRECACHE_IMAGES`

### Added

- API эндпоинт `/api/precache-manifest` — возвращает URL всех страниц и изображений для прекеширования

## [0.28.1] - 2025-12-31

### Changed

- Добавлен `output: 'standalone'` в next.config.js для Docker production сборки
- Усилена безопасность VerificationToken: `@@deny('all', true)` вместо `@@allow('all', true)`

### Added

- Global error boundary (`error.tsx`) для graceful error handling

## [0.28.0] - 2025-12-31

### Added

- Расширенные E2E тесты для полного покрытия пользовательских сценариев
  - `07-full-mandala-crud.admin.spec.ts` — полный CRUD мандал (создание с изображением, редактирование, удаление)
  - `08-full-product-crud.admin.spec.ts` — полный CRUD товаров (создание, редактирование цены, удаление)
  - `05-full-checkout.guest.spec.ts` — полный checkout flow (магазин → корзина → оформление → успех)
  - `09-admin-order-status.admin.spec.ts` — управление статусами заказов в админке
  - `10-integration-full-flow.admin.spec.ts` — интеграционный тест (админ создаёт товар → гость заказывает → админ управляет)
- Поддержка двух browser contexts в тестах (admin + guest)
- Cleanup тестовых данных после каждого CRUD блока

### Testing

- Всего тестов: 120 (включая 20 новых)
- Покрытие: публичные страницы, админка, корзина, checkout, SEO, мобильная версия

## [0.27.0] - 2025-12-30

### Added

- Учёт количества товаров (stock)
- Автоматический расчёт inStock
- Списание stock при оформлении заказа
- Блокировка кнопки "Добавить в корзину" при stock=0

## [0.26.0] - 2025-12-30

### Added

- Docker конфигурация для production деплоя
  - Dockerfile.production для standalone сборки Next.js
  - docker-compose.production.yml с PostgreSQL и Next.js app
  - .env.docker.example с описанием всех переменных окружения
- Интеграция с deploy-affected.sh для автоматического деплоя
- Порт 3004 для mandala-app, 5434 для PostgreSQL
- mandala-network для Docker коммуникации

### Changed

- Миграция завершена: 16/16 фаз (100%)

## [0.25.2] - 2025-12-30

### Added

- Компонент SeoField для автокопирования SEO полей из title/description
  - Кнопка копирования значения из основного поля
  - Режим привязки для автоматического обновления при изменении источника
  - Счётчик символов с цветовой индикацией (60 для title, 160 для description)
  - Автоматическое удаление HTML тегов из description
- Интеграция SeoField в формы мандал, товаров и контентных страниц

## [0.25.1] - 2025-12-30

### Fixed

- Устранено мигание светлой темы при загрузке страницы с тёмной системной темой (FOUC)
  - Убран globalCss из theme.ts (применялся через JS слишком поздно)
  - Добавлен global.css с CSS стилями для prefers-color-scheme и .dark/.light классов
  - next-themes теперь корректно применяет тему до hydration

## [0.25.0] - 2025-12-30

### Changed

- Оптимизация изображений в галерее и магазине через next/image fill
- MandalaCard: заменена Chakra Image на NextImage с fill и responsive sizes
- ProductCard: заменена Chakra Image на NextImage с fill и responsive sizes
- ProductSlider: заменена Chakra Image на NextImage с fill и responsive sizes
- MandalaNavigation: заменена Chakra Image на NextImage с fill (превью при hover)
- ParallaxImage: заменена Chakra Image на NextImage с fill
- ImageUploadField: заменена Chakra Image на NextImage с fill (админка)
- ProductImagesUpload: заменена Chakra Image на NextImage с fill (админка)
- Admin Mandala details: заменена Chakra Image на NextImage с fill

### Performance

- Автоматическая конвертация изображений в WebP/AVIF
- Responsive sizes для оптимальной загрузки на разных экранах
- Ленивая загрузка изображений ниже viewport

## [0.24.0] - 2025-12-28

### Added

- DnD сортировка мандал в админ-панели (/admin/mandalas)
- DnD сортировка товаров в админ-панели (/admin/products)
- Визуальные индикаторы перетаскивания (ручка, подсветка)
- Оптимистичное обновление UI при сортировке
- Автоматическое сохранение порядка на сервере

### Dependencies

- Добавлен @dnd-kit/modifiers@9.0.0

## [0.22.1] - 2025-12-24

### Added

- Галерея мандал
- Магазин товаров ручной работы
- Личный кабинет пользователя
