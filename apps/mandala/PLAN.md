# План миграции: elfafeya.art → apps/mandala

**Миграция старого приложения (React 16, 2018) на современный стек (Next.js 16 + React 19)**

> **Версия:** 0.39.6 (UI/UX аудит: SEO title fix, image optimization)
> **Стек:** Next.js 16.0.6, React 19.2.0, Chakra UI v3.30.0, PostgreSQL + Prisma 6.19.0 + ZenStack 2.22.0

**📚 Документация:** [README.md](./README.md)

---

## 📋 Содержание

1. [Обзор миграции](#обзор-миграции)
2. [Фазы реализации](#фазы-реализации)
3. [Схема базы данных](#схема-базы-данных)
4. [Критичные файлы](#критичные-файлы)
5. [Документация](#документация)

---

## 🔴 Приоритетная задача — `/admin/products` сломан (найдено BlackCove, staging e2e, 2026-07-22)

**Контекст:** §18.7 Тираж M1 batch2 (staging-e2e-гейт монорепо, `PLAN-INFRA.md`) — после того как
staging-инфра mandala была полностью починена (auth/seed/uploads-volume, см. историю в
корневом `PLAN.md`/`PLAN-INFRA.md`), полный e2e-прогон на `mandala-stage.s3.letar.best` дал
**96 passed / 12 failed / 4 skipped / 11 did not run** — все 12 отказов не связаны с
инфраструктурой (картинки/сид/БД уже в порядке), это реальные баги приложения:

- **`/admin/products` похоже сломан целиком:**
  - `getByRole('table')` не находится на `/admin/products` (3 теста) — таблица товаров не рендерится
  - `heading('Создать товар')` не появляется — форма создания не грузится
  - `toHaveURL(/admin/products/new/)` — клик по ссылке создания не переходит на `/new`, остаётся на `/admin/products`
  - Из-за этого падает и `10-integration-full-flow`, и order-status тесты (тоже на `getByRole('table')` — возможно общий баг рендера таблиц, не только products)
- **"Полный flow создания X с изображением"** (и mandala, и product) — падают на `Target page, context or browser has been closed` посреди заполнения формы (таймаут 30s) — похоже на краш/неожиданный редирект страницы, не на 404 картинки
- **SEO title не совпадает** — ожидали `/Elfafeya Art/i`, получили `"Добро пожаловать в мир мандал"`

**Не диагностировано глубже** — передано владельцу приложения. Полные `error-context.md` — в
`apps/mandala-e2e/test-output/playwright/output/*/` на s3 (BlackCove может прислать пути по
запросу через agent-mail, тред `staging-e2e-gate-m1-batch2`).

---

## Обзор миграции

### Что мигрируем

**Старое приложение (C:\web\elfafeya.art):**

- React 16.3 (2018), React Router 4, Styled Components 3
- 25 компонентов (13 презентационных + 12 контейнеров)
- 122 изображения мандал и фотографий
- ~15-20 мандал с данными в stickers.js
- PWA функциональность (Service Worker, manifest.json, localforage)
- Яндекс.Метрика (50900480)
- Сложные анимации (AnimatedRadialGradient, react-transition-group)

**Функциональность:**

1. ✅ Галерея мандал (список + детальный просмотр + эффекты + SEO)
2. ✅ Магазин (карточки товаров + слайдеры + цены + заказ)
3. ✅ Контент (О художнице, О мандалах, Контакты)
4. ✅ Главная (интерактивная сетка + ротация фона)
5. ✅ PWA (оффлайн, установка, кэширование)
6. ✅ SEO (метатеги, OG, sitemap)
7. ✅ Короткие URL редиректы (/123 → полный URL)
8. ✅ Аналитика (Яндекс.Метрика)

### Новый стек

**apps/mandala:**

- Next.js 16 + React 19 + TypeScript
- Chakra UI v3 (темная тема + фиолетовый #201380)
- PostgreSQL + Prisma + ZenStack
- Conform Future API + Zod v4
- Better Auth (для админки)
- Next.js PWA plugin
- Playwright E2E тесты

---

## Прогресс реализации

**Прогресс миграции:** 17/17 фаз (100%)

| Фаза | Название               | Статус                 |
| ---- | ---------------------- | ---------------------- |
| 0    | Подготовка проекта     | ✅ Завершена (v0.0.1)  |
| 1    | Схема базы данных      | ✅ Завершена (v0.1.0)  |
| 2    | Миграция данных        | ✅ Завершена (v0.2.0)  |
| 3    | Better Auth настройка  | ✅ Завершена (v0.3.0)  |
| 4    | Админ-панель (CRUD)    | ✅ Завершена (v0.4.0)  |
| 5    | Главная страница       | ✅ Завершена (v0.5.0)  |
| 6    | Галерея мандал         | ✅ Завершена (v0.6.0)  |
| 7    | Магазин                | ✅ Завершена (v0.7.0)  |
| 8    | Страницы контента      | ✅ Завершена (v0.8.0)  |
| 9    | Короткие URL           | ✅ Завершена (v0.9.0)  |
| 10   | PWA функции            | ✅ Завершена (v0.10.0) |
| 11   | SEO и метатеги         | ✅ Завершена (v0.11.0) |
| 12   | Яндекс.Метрика         | ✅ Завершена (v0.12.0) |
| G    | Улучшенный просмотрщик | ✅ Завершена (v0.23.0) |
| D    | DnD сортировка админки | ✅ Завершена (v0.24.0) |
| 13   | Тестирование           | ✅ Завершена (v0.25.0) |
| 14   | Деплой                 | ✅ Завершена (v0.26.0) |
| 15   | Мультиязычность (i18n) | ✅ Завершена (v0.33.0) |

> **Детали выполненных фаз:** [PLAN_COMPLETED.md](./PLAN_COMPLETED.md)

---

## Планируемые фазы

**⚠️ Критичные исправления (перед тестированием)**

- [x] **Восстановить эффекты из оригинала** ✅ v0.14.0
  - ✅ AnimatedRadialGradient - анимированный градиент для мандал
  - ✅ ColorOverlay - переливающийся цветной оверлей на главной
  - ✅ Fullscreen режим с вращением мандалы
  - ✅ Управление скоростью вращения колесом мыши
  - ✅ Переключение blend mode эффектов (multiply, color-burn, overlay, darken, color-dodge)
- [x] **Восстановить полные тексты контента** ✅ v0.13.0
  - ✅ "О художнице" - полный оригинальный текст
  - ✅ "О мандалах" - полная статья про Юнга с 7 изображениями мандал
- [x] **Система изображений (API вместо public)** ✅ v0.15.0
  - ✅ Модель Image в схеме БД
  - ✅ API endpoint /api/files/[...path] для сервинга файлов
  - ✅ API endpoint /api/upload для загрузки файлов
  - ✅ Утилиты lib/images для работы с изображениями
  - ✅ Изображения перемещены из public в uploads
  - ✅ URL изображений обновлены на /api/files/mandalas/
- [x] **Оптимизация изображений Next/Image** ✅ v0.16.0
  - ✅ Статические страницы about-mandalas и about-elfafeya с React компонентами
  - ✅ Next.js Image с fill режимом и position: relative контейнерами
  - ✅ Автоматическая конвертация в WebP/AVIF
  - ✅ Ленивая загрузка изображений (priority для above-the-fold)
  - ✅ Ограничение ширины текста до 85ch для комфортного чтения
- [x] **Навигация и мобильная оптимизация** ✅ v0.17.0
  - ✅ AuthButton в навигации (вход/выход/админка)
  - ✅ Мобильное меню (Drawer + hamburger)
  - ✅ Responsive главная страница (адаптивные ссылки)
  - ✅ Адаптивные шрифты на страницах контента
  - ✅ SessionProvider для клиентских компонентов
- [x] **Контактная форма** ✅ v0.17.0
  - ✅ Модель ContactMessage в schema.zmodel
  - ✅ Страница /contacts с формой обратной связи
  - ✅ Валидация Conform + Zod
  - ✅ Админка для просмотра сообщений (/admin/contacts)
  - ✅ Кнопка "Отметить как прочитанное"
- [x] **Расширенная админ-панель** ✅ v0.18.0
  - ✅ Middleware для защиты /admin/\* роутов
  - ✅ Admin layout с боковой навигацией
  - ✅ Dashboard со статистикой (мандалы, товары, сообщения, пользователи)
  - ✅ CRUD для Products (список, создание, просмотр, редактирование, удаление)
  - ✅ CRUD для ContentPages (список, создание, просмотр, редактирование, удаление)
- [x] **Корзина и заказы** ✅ v0.19.0
  - ✅ Модели Order и OrderItem в schema.zmodel
  - ✅ Корзина с localStorage (CartProvider + useCart)
  - ✅ Иконка корзины в навигации с счётчиком
  - ✅ Страница корзины /cart (список товаров, количество, итого)
  - ✅ Форма оформления заказа /checkout (контакты, сводка)
  - ✅ Страница успешного заказа /checkout/success
  - ✅ Кнопка "Добавить в корзину" на странице товара
  - ✅ Админка заказов /admin/orders (список, детали, смена статуса)
  - ✅ Dashboard с подсчётом заказов

**Фаза G: Улучшение интерфейса просмотра мандалы** ✅ Завершена (v0.23.0)

**G.1. Навигация между мандалами** ✅

- [x] G.1.1. Получить список всех мандал в page.tsx (для prev/next)
- [x] G.1.2. Создать компонент MandalaNavigation (стрелки влево/вправо)
- [x] G.1.3. Добавить обработку клавиш ArrowLeft/ArrowRight
- [x] G.1.4. Добавить swipe жесты для мобильных (touch events)
- [x] G.1.5. Показать миниатюры prev/next при наведении на стрелки

**G.2. Плавающая панель управления в fullscreen** ✅

- [x] G.2.1. Создать Zod схему ViewerSettingsSchema
- [x] G.2.2. Создать ViewerControls с Chakra UI (Slider, Switch, Select)
- [x] G.2.3. Панель появляется при движении мыши, скрывается через 3 сек
- [x] G.2.4. Индикатор текущей скорости вращения
- [x] G.2.5. Кнопки +/- для скорости на мобильных

**G.3. Улучшение эффектов** ✅

- [x] G.3.1. Превью эффектов при наведении (миниатюра с blend mode)
- [x] G.3.2. Плавный transition между эффектами (fade)
- [x] G.3.3. Режим "авто" — автоматическая смена эффектов каждые N секунд
- [x] G.3.4. Сохранение любимых настроек в localStorage

**G.4. Атмосферные функции** ✅

- [x] G.4.1. Режим медитации (таймер + подсказки дыхания)
- [x] G.4.2. Анимация "дыхания" — пульсация с подсказками вдох/выдох
- [x] G.4.3. Ночной режим с приглушёнными цветами

**G.5. Технические улучшения** ✅

- [x] G.5.1. Кнопка "Поделиться" (копирование URL с настройками в query params)
- [x] G.5.2. Скачать мандалу как обои (разные разрешения: 1920x1080, 2560x1440, оригинал)

**Фаза D: Улучшения админ-панели** ✅ Завершена (v0.24.0)

- [x] D.1. DnD сортировка мандал в /admin/mandalas
  - ✅ Drag-n-drop для изменения порядка (@dnd-kit)
  - ✅ Автоматическое сохранение при перетаскивании (Server Action)
  - ✅ Визуальный индикатор перетаскивания (ручка LuGripVertical)
  - ✅ Оптимистичное обновление UI
- [x] D.2. DnD сортировка товаров в /admin/products
  - ✅ Аналогичная реализация для таблицы товаров
- [x] D.3. Image FK миграция (ранее завершена)
  - ✅ /api/og-image для автоматической генерации OG-изображений
  - ✅ Product.ogImageId вместо ogImage URL
  - ✅ ContentPage.ogImageId вместо ogImage URL
  - ✅ ProductImagesUpload компонент для множественной загрузки

**Фаза 13: Тестирование** ✅ Завершена (v0.28.0)

- [x] 13.1. Создать E2E проект (Playwright)
  - ✅ Конфигурация playwright.config.ts с проектами guest/admin/mobile
  - ✅ Фикстуры аутентификации (auth.setup.ts, auth.fixture.ts)
  - ✅ Storage state для сохранения сессий админа
- [x] 13.2. Написать E2E тесты для критичных сценариев
  - ✅ Публичные страницы (главная, галерея, магазин, контент, корзина)
  - ✅ Защищённые редиректы (админка → sign-in без авторизации)
  - ✅ Админ-панель (dashboard, мандалы, товары, заказы, сообщения, страницы)
  - ✅ Корзина и checkout (добавление товаров, оформление)
  - ✅ Просмотрщик мандал (fullscreen, навигация, эффекты, share)
  - ✅ Контактная форма (валидация)
  - ✅ Короткие URL (редиректы)
  - ✅ SEO (title, description, OG теги, sitemap, robots)
- [x] 13.3. Мобильные тесты
  - ✅ Hamburger menu и drawer
  - ✅ Адаптивность страниц
  - ✅ Touch взаимодействия
- [x] 13.4. Расширенные E2E тесты (v0.28.0)
  - ✅ 07-full-mandala-crud.admin.spec.ts — полный CRUD мандал
  - ✅ 08-full-product-crud.admin.spec.ts — полный CRUD товаров
  - ✅ 05-full-checkout.guest.spec.ts — полный checkout flow
  - ✅ 09-admin-order-status.admin.spec.ts — управление статусами заказов
  - ✅ 10-integration-full-flow.admin.spec.ts — интеграционный тест (товар → заказ → управление)
- [ ] 13.5. Unit-тесты для компонентов (опционально)
- [ ] 13.6. Настроить CI/CD с автоматическим запуском тестов

**Фаза 14: Деплой** ✅ Завершена (v0.26.0)

- [x] 14.1. Создать Dockerfile для приложения
  - ✅ Dockerfile.production для standalone сборки
- [x] 14.2. Настроить docker-compose.yml
  - ✅ docker-compose.production.yml с PostgreSQL и Next.js app
  - ✅ Порт 3004 для mandala, 5434 для PostgreSQL
  - ✅ mandala-network для коммуникации
- [x] 14.3. Настроить env переменные для продакшена
  - ✅ .env.docker.example с описанием всех переменных
  - ✅ Better Auth (Google, Yandex OAuth, Credentials)
  - ✅ Email (Nodemailer)
  - ✅ Yandex Metrika (50900480)
- [ ] 14.4. Настроить Nginx Proxy Manager — выполняется на сервере
- [ ] 14.5. Настроить SSL сертификат (Let's Encrypt) — выполняется на сервере
- [x] 14.6. deploy-affected.sh — уже готов в монорепозитории
- [ ] 14.7. Настроить автоматический деплой при push в main — опционально

**Фаза 15: Мультиязычность (i18n)** ✅ Завершена (v0.33.0)

- [x] 15.1. Настройка next-intl
  - ✅ next-intl v4.6.1 уже в проекте
  - ✅ proxy.ts с createIntlMiddleware для определения локали
  - ✅ Структура роутинга: `localePrefix: 'as-needed'` (ru без префикса, en с /en)
  - ✅ Создана структура `i18n/` (routing.ts, request.ts, navigation.ts)
  - ✅ Созданы `messages/ru.json` и `messages/en.json`
- [x] 15.2. Перевод статического контента
  - ✅ Навигация (меню, header)
  - ✅ Аутентификация (signIn, signOut)
  - ✅ Мобильное меню
  - ✅ Сообщения валидации
- [x] 15.3. Перевод контентных страниц ✅ v0.34.0
  - ✅ "О художнице" — полный перевод в messages/en.json
  - ✅ "О мандалах" — полный перевод в messages/en.json
  - ✅ about-elfafeya/page.tsx мигрирован на getTranslations
  - ✅ about-mandalas/page.tsx мигрирован на getTranslations
- [x] 15.4. Мультиязычность в базе данных ✅ v0.34.0
  - ✅ Добавлены поля `nameEn`, `descriptionEn`, `metaTitleEn`, `metaDescriptionEn` в Mandala, Product
  - ✅ Добавлены поля `titleEn`, `contentEn`, `metaTitleEn`, `metaDescriptionEn` в ContentPage
  - ✅ Хелпер `getLocalizedField(item, field, locale)` в lib/i18n-helpers.ts
  - ✅ Хелпер `useLocalizedField(locale)` для компонентов
  - ✅ Хелпер `getLocalizedFields(item, fields, locale)` для batch операций
- [x] 15.5. Переключатель языка
  - ✅ Компонент LanguageSwitcher в навигации
  - ✅ Переключение через next-intl router
  - ✅ Флаги языков (🇷🇺/🇬🇧)
- [x] 15.6. SEO для мультиязычности
  - ✅ hreflang alternates в sitemap.ts
  - ✅ alternates.languages в metadata (layout.tsx)
  - ✅ Canonical URLs с учётом локали

---

## Рефакторинг и технические улучшения

**v0.30.0 — Рефакторинг canvas эффектов и контролов**

- [x] **useCanvasEffect хук** — общая логика для 6 animated-\* компонентов
  - ✅ animated-aurora.tsx: 179 → 82 строк (-54%)
  - ✅ animated-conic-gradient.tsx: 165 → 74 строк (-55%)
  - ✅ animated-plasma.tsx: 203 → 117 строк (-42%)
  - ✅ animated-radial-gradient.tsx: 169 → 79 строк (-53%)
  - ✅ animated-tunnel.tsx: 177 → 91 строк (-49%)
  - ✅ animated-solid-color.tsx: 183 → 97 строк (-47%)
  - ✅ Общая экономия: 1076 → 753 строк (30%)

- [x] **SliderControl компонент** — переиспользуемый слайдер
  - ✅ slider-control.tsx: новый компонент (151 строк)
  - ✅ Встроенные форматтеры: formatPercent, formatSeconds, formatMsToSeconds, formatDuration
  - ✅ Поддержка variant (normal/fullscreen) и hideLabel

**v0.30.1 — Рефакторинг кодовой базы**

- [x] **Barrel exports** — index.ts для \_components и \_hooks
  - ✅ `_hooks/index.ts` — чистые экспорты всех хуков
  - ✅ `controls/index.ts` — экспорт контролов
- [x] **Server Actions factory** — `lib/actions/with-admin-auth.ts`
  - ✅ `assertAdminAuth()` — проверка админ-прав + enhanced Prisma
  - ✅ `handleUniqueConstraintError()` — обработка уникальных constraint ошибок
  - ✅ Применено к ~15 admin action файлам (экономия ~10 строк на файл)
- [x] **ImageUploadZone shared** — перенос в `admin/_components/`
  - ✅ `image-upload-field.tsx` — drag-drop загрузка изображений
  - ✅ `form-image-upload.tsx` — интеграция с MandalaForm
  - ✅ Удалены дублирующие импорты между admin секциями
- [x] **audio-controls.tsx разбит на модули** — 505 → 141 строк
  - ✅ `track-selector.tsx` — выбор треков (139 строк)
  - ✅ `audio-sync-controls.tsx` — настройки синхронизации (284 строк)
  - ✅ Общая экономия: модульность и переиспользование
- [x] **Type safety fixes**
  - ✅ Исправлены несуществующие экспорты в `_hooks/index.ts`
  - ✅ Исправлен импорт NativeSelect (Chakra UI v3 API)
  - ✅ Typecheck проходит успешно

**v0.31.0 — CRUD Actions Factory**

- [x] **createBulkActions()** — фабрика для массовых операций
  - ✅ `lib/actions/bulk-actions-factory.ts` — типизированная фабрика
  - ✅ Генерирует bulkPublish, bulkUnpublish, bulkDelete
  - ✅ Применено к Mandala, Product, ContentPage (экономия ~90 строк)
- [x] **createDeleteAction()** — фабрика для удаления
  - ✅ `lib/actions/delete-action-factory.ts` — типизированная фабрика
  - ✅ Генерирует delete action с redirect
  - ✅ Применено к Mandala, Product, ContentPage (экономия ~30 строк)
- [x] **Рефакторинг bulk-actions.ts**
  - ✅ `mandalas/_actions/bulk-actions.ts`: 39 → 19 строк (-51%)
  - ✅ `products/_actions/bulk-actions.ts`: 39 → 19 строк (-51%)
  - ✅ `content-pages/_actions/bulk-actions.ts`: 39 → 19 строк (-51%)
- [x] **Рефакторинг delete-\*.action.ts**
  - ✅ `delete-mandala.action.ts`: 22 → 10 строк (-55%)
  - ✅ `delete-product.action.ts`: 20 → 10 строк (-50%)
  - ✅ `delete-content-page.action.ts`: 20 → 10 строк (-50%)

**v0.32.0 — Form & Upload Helpers**

- [x] **createFormPersistence()** — хелпер для persistence конфигурации
  - ✅ `admin/_helpers/form-persistence.ts` — единый конфиг для localStorage persistence
  - ✅ Применено к ProductForm, MandalaForm, ContentPageForm (экономия ~50 строк)
  - ✅ Удалено дублирование getPersistenceKey функций
- [x] **useFileDragDrop()** — хук для drag-n-drop загрузки
  - ✅ `admin/_hooks/use-file-drag-drop.ts` — инкапсуляция drag/drop логики
  - ✅ Поддержка single/multiple файлов, валидация MIME типов
  - ✅ Применено к ImageUploadField, ProductImagesUpload (экономия ~80 строк)
  - ✅ Barrel exports в `_helpers/index.ts` и `_hooks/index.ts`

**v0.35.0 — Рефакторинг хуков и компонентов**

- [x] **useEventListener / useEventListeners** — универсальные хуки для DOM событий
- [x] **useVariantStyles** — стили для 'normal' | 'fullscreen' режимов
- [x] **useImageUpload / useImagePreview** — загрузка изображений через API
- [x] **useTooltipPosition / useTargetHighlight** — позиционирование онбординг-тултипов
- [x] **useAdminForm** — общая логика админ-форм (defaultValues, handleSubmit, persistence)
- ✅ Общая экономия: ~350 строк

**v0.39.4 — i18n для OfflineConsentBanner**

- [x] Добавлены переводы для OfflineConsentBanner (баннер оффлайн режима)
  - ✅ Заголовок и описание
  - ✅ Преимущества: работает без интернета, 35+ мандал, музыка, полноэкранный просмотр
  - ✅ Кнопки «Не сейчас» и «Включить оффлайн»
  - ✅ Английские и русские переводы в messages/

**v0.39.3 — i18n для WelcomePortal**

- [x] Добавлены переводы для WelcomePortal (приветственный портал на главной)
  - ✅ Заголовок, описание, кнопка «Начать медитацию»
  - ✅ Навигационные ссылки: Галерея, О художнице, О мандалах
  - ✅ Подсказка «Нажмите в любом месте, чтобы закрыть»
  - ✅ Английские и русские переводы в messages/

**v0.36.0 — Безопасность, Server Actions фабрики и UI компоненты**

- [x] **Фаза 1: Безопасность и обработка ошибок**
  - ✅ try/catch в mark-as-read.action.ts и update-order-status.action.ts
  - ✅ Валидация пустых массивов в bulk-actions-factory.ts
  - ✅ Type-safe JSON парсинг в create-order.action.ts (CartItemDataSchema)
- [x] **Фаза 2: Фабрики Server Actions**
  - ✅ `create-action-factory.ts` — фабрика для create actions
  - ✅ `update-action-factory.ts` — фабрика для update actions
  - ✅ Применено к create-mandala, update-mandala, create-content-page, update-content-page
  - ✅ Экономия: ~100 строк
- [x] **Фаза 3: Консолидация типов**
  - ✅ `lib/types/auth.types.ts` — единый источник UserWithRole, SessionWithRole
  - ✅ Реэкспорт типов из auth.ts и auth-client.ts
  - ✅ CartItemData импортируется из checkout.schema.ts в order.schema.ts
- [x] **Фаза 4: UI компоненты**
  - ✅ `ToggleControl` — универсальный Switch компонент для viewer контролов
  - ✅ Применено к ~17 Switch паттернам в atmosphere, audio, effects, hue-rotate контролах
  - ✅ `useImageRotation` — ротация изображений с интервалом
  - ✅ `useWelcomePortalState` — состояние приветственного портала
  - ✅ Экономия: ~100 строк
- [x] **Фаза 5: Пропущена (опциональная)**
  - ⏭️ Разделение mega-компонентов отложено на будущее

---

## Ключевые достижения

1. **Успешная миграция** — старое приложение (React 16, 2018) портировано на современный стек (Next.js 16 + React 19)
2. **Сохранена функциональность** — все фичи старого приложения воссозданы
3. **Современные технологии** — Chakra UI v3, ZenStack, Better Auth, TanStack Form
4. **PWA и SEO** — полная поддержка PWA, оптимизация для поисковых систем
5. **Админ-панель** — CRUD функционал для управления контентом
6. **Улучшенный просмотрщик** — навигация между мандалами, плавающая панель управления, превью эффектов, медитация с таймером, ночной режим, кнопка "Поделиться"
7. **DnD сортировка** — drag-and-drop изменение порядка мандал и товаров в админке с оптимистичным обновлением UI
8. **E2E тестирование** — полное покрытие критичных сценариев (публичные страницы, админка, корзина, SEO)
9. **Production-ready** — Docker конфигурация для деплоя, готовность к запуску через deploy-affected.sh
10. **Mobile-friendly админка** — адаптивный UI с drawer-навигацией, карточками вместо таблиц, touch-friendly DnD, упрощённой пагинацией
11. **Учёт количества товаров** — поле stock для товаров, автоматический расчёт inStock, списание при заказе, блокировка кнопки при stock=0

---

**Последнее обновление:** 2026-01-10
