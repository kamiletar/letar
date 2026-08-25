# Выполненные задачи: Mandala

## Фикс: та же грабля ещё в трёх файлах (2026-08-25)

Свежий полный грепп по монорепо (не список из прошлой сессии) нашёл три пропущенных прямых
`next/image` с `priority`: `mandala-carousel.tsx`, `product-slider.tsx`,
`admin/mandalas/[id]/page.tsx`. Тот же фикс.

## Фикс: `next/image` `priority` не выставлял `fetchpriority="high"` (Next.js 16 API) (2026-08-25)

Монорепо-широкий аудит по мотивам находки в domwellbes (`PLAN_PUBLIC_MOBILE.md` §12.24) —
Next.js 16 развёл `priority` на независимые `preload`/`fetchPriority`, старый проп больше не
ставит `fetchpriority="high"` сам по себе. `product-slider-swiper.tsx` (слайдер фото товара) —
единственное прямое использование `next/image` с `priority` в приложении — переведён на
`preload`+`fetchPriority`. `typecheck:tsgo`/`lint`/`format` зелёные.

## Touch target для текстовых ссылок — WCAG 2.5.5 (2026-08-25)

4 короткие ссылки без достаточной высоты клика (`welcome-portal.tsx` ×3, `navigation.tsx`
логотип, `cart-items.tsx` название товара, `login-form.tsx` «Забыли пароль?») получили
`minH="2.75rem" alignItems="center"` прямо на `Link asChild`. `TouchLink` (`@letar/ui`) не
применялся — mandala роутит через locale-aware `Link` из `@/i18n/navigation` (next-intl),
несовместимый с жёстким `next/link` внутри `TouchLink`. Не тронуты: карточки (вся площадь уже
кликабельна), `IconButton`, инлайновые ссылки внутри текста.

## Фикс: `handleUniqueConstraintError` ловил Prisma-код P2002, никогда не срабатывал (2026-08-21)

Аудит по мотивам находки в `domwellbes` (`restock-subscription.action.ts`, см.
`.claude/docs/zenstack-v3-orm-error-codes.md`): приложение на ZenStack v3 ORM (`ZenStackClient`
в `src/lib/db.ts`), не classic `@prisma/client`. `handleUniqueConstraintError`
(`src/lib/actions/error-helpers.ts`) проверял `.code === 'P2002'` — обёрнутая ошибка драйвера
такого поля не несёт, дубль по уникальному полю падал как generic-ошибка вместо адресного
сообщения с полем. Исправлено на `dbErrorCode === '23505'`. Юнит-тест
(`__tests__/error-helpers.spec.ts`) обновлён под новый формат ошибки, добавлен явный кейс
«старый P2002-формат больше не матчится». `typecheck:tsgo`/`lint` зелёные.

## Фикс: config.matcher в proxy.ts обязан быть литералом, не вызовом buildIntlMatcher() (2026-08-21)

Репо-широкий баг из apps/kami (§18.7 M2): Next.js 16 статически парсит `config.matcher` через AST
на build-time без исполнения модуля — `CallExpression` не поддерживается, `next build` падал с
`Unsupported node type "CallExpression" at "config.matcher"`, хотя typecheck/lint проходили чисто.
Matcher инлайнен литералом `['/((?!api|_next|_vercel|admin|.*\\..*).*)', '/']`, вычисленным из
фактических опций (`excludePrefixes: ['api', '_next', '_vercel', 'admin']`); `proxy.spec.ts`
дополнен regression-тестом (текстовый разбор файла, сверка с `buildIntlMatcher(опции)`). Билд
после фикса падает на отдельной несвязанной проблеме (EACCES к БД при генерации `/sitemap.xml`
локально — БД недоступна в среде проверки, вне scope). commit `5799efff`.

> **📖 Начни с главного README:** [README.md](./README.md) — обзор проекта, быстрый старт
>
> **Версия:** 0.16.0 | **Обновлено:** 2025-12-14
>
> **Связанные документы:**
>
> - [PLAN.md](./PLAN.md) — текущее состояние и планируемые задачи
> - [README.md](./README.md) — обзор проекта

---

## Matcher next-intl перенесён на @letar/i18n-proxy (2026-08-21)

`proxy.ts` переведён на `buildIntlMatcher()` из общей `libs/i18n-proxy` — та же логика (api/
_next/_vercel/admin исключены), без изменения поведения. Аудит ниже подтверждён верным (в
mandala действительно нет своих metadata-роутов вне `[locale]`), но добавлен `proxy.spec.ts`
(`findUndeclaredMetadataRoutes`), чтобы появление такого файла ловилось тестом, а не ручным
аудитом в следующий раз.

## Аудит matcher proxy.ts — баг studio не подтвердился (2026-08-21)

Проверка класса бага из apps/studio. В mandala единственный metadata-роут без своей
`[locale]`-вложенности — `src/app/manifest.ts`, но он отдаёт `/manifest.webmanifest`: точка в URL
есть, dot-wildcard-исключение `.*\\..*` matcher'а её ловит штатно. `icon`/`apple-icon`/
`opengraph-image`/`twitter-image` в приложении нет. Изменений не потребовалось.

## Сессия 2026-08-19 — setRequestLocale/SSG: точечный фикс `/contacts`

Аудит по классу бага, найденному в apps/studio (`[locale]/layout.tsx` с `generateStaticParams`
без `setRequestLocale` в конкретных `page.tsx`). Почти все страницы mandala уже были в порядке.
Найден один настоящий кандидат: `(main)/contacts/page.tsx` держал `export const dynamic =
'force-dynamic'` без всякой причины (ни БД, ни сессии в самой странице — форма обратной связи
работает через server action с клиента). Убран флаг, добавлен `setRequestLocale(locale)` —
маркер сборки сменился `ƒ → ●`. `nx run-many -t format/lint/typecheck:tsgo --projects=mandala` —
зелёные (2 pre-existing warning в `use-event-listener.ts`, не мои). v0.40.10 → v0.40.11.

## Сессия 2026-08-19 — Webpack-фикс `@tanstack/devtools-ui@0.7.0` — server-половина графа

Тот же баг, что уронил dev-сервер `driving-school` (500, `Attempted import error: 'use' is not
exported from 'solid-js/web'` через `@letar/query-provider`) — mandala в зоне риска той же
причины (webpack в dev). Существующий `config.resolve.alias['@tanstack/devtools-ui'] = false`
работал только в prod (`if (!dev)`); расширен на `if (isServer || !dev)`. Проверено запуском
dev-сервера — компиляция чистая (отдельно найденный там 500 — из-за недоступной локальной БД,
не связан с этим багом). Полный разбор — PLAN.md §51 и
`apps/driving-school/PLAN_COMPLETED.md`.

## Сессия 2026-08-14 — почему `auth-button.tsx` не переведён на общий `UserMenu` (`@letar/ui`)

Аудит по всему монорепо нашёл 4 приложения с независимыми копиями меню аккаунта (`domwellbes`,
`driving-school`, `mandala`, `grandslamcup`) вместо готового `libs/ui/src/lib/user-menu.tsx`.
Три сведены на компонент; `mandala` — нет: текст внутри `UserMenu` захардкожен на русском
(«Войти», «Профиль», «Выйти», «Аккаунт в Ключнице»), а mandala двуязычно (`src/i18n/routing.ts`:
`locales: ['ru', 'en']`, обе локали активны) и уже использует `next-intl` в `auth-button.tsx`
именно ради переключения этого текста на английской локали. Подключение `UserMenu` в текущем
виде было бы регрессом локализации на `/en/*`, а не консолидацией. В код добавлена короткая
пометка, полный разбор — `.claude/docs/ui-components.md` § UserMenu. v0.40.8.

## Содержание

1. [Фаза 0: Подготовка проекта](#фаза-0-подготовка-проекта-v001) ✅ v0.0.1
2. [Фаза 1: Схема базы данных](#фаза-1-схема-базы-данных-v010) ✅ v0.1.0
3. [Фаза 2: Миграция данных](#фаза-2-миграция-данных-v020) ✅ v0.2.0
4. [Фаза 3: Auth.js настройка](#фаза-3-authjs-настройка-v030) ✅ v0.3.0
5. [Фаза 4: Админ-панель (CRUD мандал)](#фаза-4-админ-панель-crud-мандал-v040) ✅ v0.4.0
6. [Фаза 5: Главная страница](#фаза-5-главная-страница-v050) ✅ v0.5.0
7. [Фаза 6: Галерея мандал](#фаза-6-галерея-мандал-v060) ✅ v0.6.0
8. [Фаза 7: Магазин](#фаза-7-магазин-v070) ✅ v0.7.0
9. [Фаза 8: Страницы контента](#фаза-8-страницы-контента-v080) ✅ v0.8.0
10. [Фаза 9: Короткие URL](#фаза-9-короткие-url-v090) ✅ v0.9.0
11. [Фаза 10: PWA функции](#фаза-10-pwa-функции-v0100) ✅ v0.10.0
12. [Фаза 11: SEO и метатеги](#фаза-11-seo-и-метатеги-v0110) ✅ v0.11.0
13. [Фаза 12: Яндекс.Метрика](#фаза-12-яндексметрика-v0120) ✅ v0.12.0
14. [Критичные исправления v0.13.0-v0.16.0](#критичные-исправления-v0130-v0160) ✅

---

## Прогресс реализации

**Прогресс миграции:** 12/14 фаз (86%) ✅

| Фаза | Название            | Статус                 |
| ---- | ------------------- | ---------------------- |
| 0    | Подготовка проекта  | ✅ Завершена (v0.0.1)  |
| 1    | Схема базы данных   | ✅ Завершена (v0.1.0)  |
| 2    | Миграция данных     | ✅ Завершена (v0.2.0)  |
| 3    | Auth.js настройка   | ✅ Завершена (v0.3.0)  |
| 4    | Админ-панель (CRUD) | ✅ Завершена (v0.4.0)  |
| 5    | Главная страница    | ✅ Завершена (v0.5.0)  |
| 6    | Галерея мандал      | ✅ Завершена (v0.6.0)  |
| 7    | Магазин             | ✅ Завершена (v0.7.0)  |
| 8    | Страницы контента   | ✅ Завершена (v0.8.0)  |
| 9    | Короткие URL        | ✅ Завершена (v0.9.0)  |
| 10   | PWA функции         | ✅ Завершена (v0.10.0) |
| 11   | SEO и метатеги      | ✅ Завершена (v0.11.0) |
| 12   | Яндекс.Метрика      | ✅ Завершена (v0.12.0) |

---

## Фаза 0: Подготовка проекта (v0.0.1)

**Цель:** Очистить example код, настроить базовые конфиги

**Задачи:**

- [x] 0.1. Удаление example кода
- [x] 0.2. Настройка окружения (.env, .env.local, next.config.js, project.json)
- [x] 0.3. Установка зависимостей
- [x] 0.4. Настройка Chakra UI Provider
- [x] 0.5. Обновление версии

**Результаты:**

- Удалён весь example код из Next.js шаблона
- Настроены переменные окружения для базы данных и Auth.js
- Установлены все необходимые зависимости (Chakra UI v3, Prisma, ZenStack, Auth.js v5)
- Создан базовый провайдер для Chakra UI с темой
- Версия обновлена до v0.0.1

---

## Фаза 1: Схема базы данных (v0.1.0)

**Цель:** Создать схему БД для мандал, товаров, контента, коротких URL и пользователей

**Задачи:**

- [x] 1.1. Создать schema.zmodel с моделями (User, Mandala, Product, ContentPage, ShortUrl)
- [x] 1.2. Настроить project.json с Nx targets (zenstack:generate, db:push, db:migrate, db:studio, db:seed)
- [x] 1.3. Запустить генерацию Prisma + Zod схем
- [x] 1.4. Синхронизировать с БД (создана база mandala)
- [x] 1.5. Создать seed скрипт (админ пользователь)

**Результаты:**

- Создана схема базы данных с 5 моделями
- Настроены Nx targets для работы с БД
- Сгенерированы Prisma клиент и Zod схемы
- Создана база данных mandala в PostgreSQL
- Создан seed скрипт для создания админ пользователя

**Схема БД:**

```prisma
// Пользователь (админ)
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          String    @default("ADMIN")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
}

// Мандала
model Mandala {
  id          Int       @id @default(autoincrement())
  slug        String    @unique
  title       String
  description String?
  imageUrl    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Товар
model Product {
  id          Int       @id @default(autoincrement())
  slug        String    @unique
  title       String
  description String?
  images      String[]
  price       Float
  available   Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Страница контента
model ContentPage {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  title     String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Короткий URL
model ShortUrl {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  targetUrl   String
  description String?
  createdAt   DateTime @default(now())
}
```

---

## Фаза 2: Миграция данных (v0.2.0)

**Цель:** Извлечь данные мандал из старого приложения и загрузить в БД

**Задачи:**

- [x] 2.1. Создать скрипт извлечения данных из stickers.js
- [x] 2.2. Запустить скрипт и получить mandalas.json (извлечено 31 мандала)
- [x] 2.3. Обновить seed скрипт для загрузки мандал из JSON
- [x] 2.4. Запустить seed и проверить БД (загружено 31 мандала)

**Результаты:**

- Создан скрипт `extract-mandalas.js` для извлечения данных из старого приложения
- Извлечено 31 мандала с данными (название, описание, номер изображения)
- Обновлён seed скрипт для загрузки мандал из JSON
- Все мандалы успешно загружены в базу данных

**Примеры данных:**

```json
{
  "title": "Мандала \"Вдохновение\"",
  "description": "Эта мандала пробуждает творческий потенциал...",
  "imageUrl": "/images/mandalas/1.jpg"
}
```

---

## Фаза 3: Auth.js настройка (v0.3.0)

**Цель:** Настроить аутентификацию для админ-панели через Google OAuth

**Задачи:**

- [x] 3.1. Создать auth.config.ts с Google OAuth провайдером
- [x] 3.2. Создать auth.ts с NextAuth конфигурацией
- [x] 3.3. Создать db.ts с Prisma Client синглтоном
- [x] 3.4. Создать API роут /api/auth/[...nextauth]/route.ts
- [x] 3.5. Создать страницу логина /auth/login/page.tsx
- [x] 3.6. Расширить типы NextAuth для поля role

**Результаты:**

- Настроена аутентификация через Google OAuth
- Создан API роут для Auth.js
- Создана страница логина с кнопкой "Войти через Google"
- Расширены типы NextAuth для поддержки поля role
- Админ-панель защищена проверкой роли ADMIN

**Конфигурация:**

```typescript
// auth.config.ts
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // ...
}
```

---

## Фаза 4: Админ-панель (CRUD мандал) (v0.4.0)

**Цель:** Создать админ-панель для управления мандалами (CRUD операции)

**Задачи:**

- [x] 4.1. Создать Zod схемы (create/update) для мандал
- [x] 4.2. Создать компонент MandalaForm с Conform
- [x] 4.3. Создать server actions (create/update/delete)
- [x] 4.4. Создать страницу списка мандал
- [x] 4.5. Создать страницу создания мандалы
- [x] 4.6. Создать страницу просмотра мандалы
- [x] 4.7. Создать страницу редактирования мандалы
- [x] 4.8. Обновить db.ts с getEnhancedPrisma (ZenStack)

**Результаты:**

- Создана админ-панель `/admin/mandalas` с полным CRUD функционалом
- Используется Conform Future API для форм
- ZenStack для access control (только ADMIN может управлять)
- Все операции CRUD реализованы через Server Actions
- Форма валидируется с помощью Zod v4

**Функционал:**

- Список мандал с поиском и пагинацией
- Создание новой мандалы
- Просмотр мандалы
- Редактирование мандалы
- Удаление мандалы (с подтверждением)

---

## Фаза 5: Главная страница (v0.5.0)

**Цель:** Портировать главную страницу с интерактивной сеткой и ротацией фона

**Задачи:**

- [x] 5.1. Создать компонент BackgroundRotation (автоматическая смена фона каждые 10.8с)
- [x] 5.2. Создать компонент MandalaGrid (интерактивная сетка миниатюр)
- [x] 5.3. Создать компонент Navigation (меню навигации)
- [x] 5.4. Обновить главную страницу page.tsx

**Результаты:**

- Создана главная страница с ротацией фона (10.8 секунд на изображение)
- Интерактивная сетка 6x6 миниатюр мандал с hover эффектами
- Адаптивная навигация (меню на десктопе, drawer на мобильных)
- Использованы React 19 хуки (useEffect для ротации)

**Технические детали:**

- BackgroundRotation использует `setInterval` для автоматической смены фона
- MandalaGrid использует Chakra UI Grid с responsive columns
- Navigation адаптируется под размер экрана

---

## Фаза 6: Галерея мандал (v0.6.0)

**Цель:** Портировать галерею мандал с детальным просмотром и эффектами

**Задачи:**

- [x] 6.1. Создать страницу списка мандал (/mandalas/page.tsx)
- [x] 6.2. Создать страницу детального просмотра (/mandalas/[slug]/page.tsx)
- [x] 6.3. Портировать AnimatedRadialGradient на React 19 + TypeScript
- [x] 6.4. Создать компонент MandalaViewer с переключением эффектов
- [x] 6.5. Добавить SEO метаданные и generateStaticParams

**Результаты:**

- Создана галерея мандал с адаптивной сеткой
- Детальный просмотр с переключением эффектов (gradientOn/gradientOff)
- Портирован AnimatedRadialGradient на React 19 (canvas + requestAnimationFrame)
- SEO оптимизация (метатеги, Open Graph, статическая генерация)

**Эффекты:**

- **gradientOn** - анимированный радиальный градиент поверх мандалы
- **gradientOff** - чистое отображение мандалы без эффектов

---

## Фаза 7: Магазин (v0.7.0)

**Цель:** Создать магазин товаров с карточками и слайдером изображений

**Задачи:**

- [x] 7.1. Создать страницу списка товаров (/shop/page.tsx)
- [x] 7.2. Создать компонент ProductCard с адаптивной сеткой
- [x] 7.3. Создать страницу детального просмотра товара (/shop/[slug]/page.tsx)
- [x] 7.4. Установить и настроить Swiper для слайдера изображений
- [x] 7.5. Создать компонент ProductSlider с навигацией и пагинацией
- [x] 7.6. Создать компонент OrderButton с копированием текста заказа
- [x] 7.7. Добавить SEO метаданные и generateStaticParams для товаров

**Результаты:**

- Создан магазин `/shop` с карточками товаров
- Swiper слайдер для изображений товара (навигация + пагинация)
- Кнопка заказа с копированием текста в буфер обмена
- SEO оптимизация для всех страниц магазина

**Функционал:**

- Список товаров с изображениями, названием, ценой
- Детальный просмотр с галереей изображений
- Кнопка "Заказать" копирует текст заказа в буфер

---

## Фаза 8: Страницы контента (v0.8.0)

**Цель:** Создать динамические страницы контента (О художнице, О мандалах, Контакты)

**Задачи:**

- [x] 8.1. Создать динамическую страницу контента (/[slug]/page.tsx)
- [x] 8.2. Добавить стилизацию HTML контента (заголовки, списки, ссылки)
- [x] 8.3. Обновить seed скрипт с контентными страницами
- [x] 8.4. Создать страницы: О художнице, О мандалах, Контакты
- [x] 8.5. Добавить SEO метаданные и generateStaticParams

**Результаты:**

- Создана динамическая страница для контентных страниц
- Стилизация HTML контента через Chakra UI
- Seed скрипт дополнен контентными страницами
- SEO оптимизация для всех контентных страниц

**Страницы:**

- `/about` - О художнице
- `/mandalas-info` - О мандалах
- `/contacts` - Контакты

---

## Фаза 9: Короткие URL (v0.9.0)

**Цель:** Поддержка коротких URL вида /123 или /s123 с редиректом на полные URL

**Задачи:**

- [x] 9.1. Интегрировать редирект в /[slug]/page.tsx
- [x] 9.2. Добавить проверку ShortUrl перед ContentPage
- [x] 9.3. Поддержка формата /123 и /s123
- [x] 9.4. Обновить seed скрипт с короткими URL для 10 мандал

**Результаты:**

- Реализована поддержка коротких URL
- Приоритет: сначала проверяется ShortUrl, затем ContentPage
- Поддерживаются форматы /123 и /s123
- Seed скрипт создаёт короткие URL для первых 10 мандал

**Примеры:**

- `/1` → `/mandalas/mandala-vdohnovenie`
- `/s1` → `/mandalas/mandala-vdohnovenie`

---

## Фаза 10: PWA функции (v0.10.0)

**Цель:** Добавить PWA функциональность (manifest, Service Worker, оффлайн режим)

**Задачи:**

- [x] 10.1. Создать app/manifest.ts (нативная реализация Next.js 16)
- [x] 10.2. Создать Service Worker (public/sw.js) с Network First стратегией
- [x] 10.3. Создать страницу /offline для оффлайн режима
- [x] 10.4. Создать компонент PWARegister для регистрации Service Worker
- [x] 10.5. Скопировать и настроить иконки приложения (192x192, 512x512)
- [x] 10.6. Удалить next-pwa (несовместим с Turbopack в Next.js 16)

**Результаты:**

- PWA manifest через нативный Next.js 16 API
- Service Worker с Network First стратегией кэширования
- Страница /offline для оффлайн режима
- Иконки приложения 192x192 и 512x512
- Отказ от next-pwa в пользу нативной реализации

**Функционал:**

- Установка приложения на устройство
- Оффлайн режим с кэшированием
- Push уведомления (подготовка)

---

## Фаза 11: SEO и метатеги (v0.11.0)

**Цель:** Оптимизация SEO (sitemap, robots.txt, Open Graph, метатеги)

**Задачи:**

- [x] 11.1. Создать sitemap.ts с динамическими URL всех страниц
- [x] 11.2. Создать robots.txt с правилами индексации
- [x] 11.3. Обновить глобальные метатеги (Open Graph, Twitter Card, keywords)
- [x] 11.4. Добавить metadataBase и title template

**Результаты:**

- Динамический sitemap.xml со всеми страницами
- robots.txt с правилами индексации
- Глобальные метатеги (Open Graph, Twitter Card)
- metadataBase для абсолютных URL

**SEO оптимизация:**

- Sitemap включает все мандалы, товары и контентные страницы
- robots.txt разрешает индексацию всех страниц
- Open Graph теги для социальных сетей
- Structured data (планируется в будущем)

---

## Фаза 12: Яндекс.Метрика (v0.12.0)

**Цель:** Интеграция Яндекс.Метрики для аналитики

**Задачи:**

- [x] 12.1. Создать компонент YandexMetrika с Next.js Script
- [x] 12.2. Добавить компонент в layout.tsx
- [x] 12.3. Добавить переменную окружения NEXT_PUBLIC_YANDEX_METRIKA_ID
- [x] 12.4. Настроить счётчик (clickmap, trackLinks, webvisor, ecommerce)

**Результаты:**

- Интегрирована Яндекс.Метрика (ID: 50900480)
- Настроены все функции аналитики
- Script загружается асинхронно после interactive
- Переменная окружения для гибкой настройки

**Функции аналитики:**

- Карта кликов (clickmap)
- Отслеживание ссылок (trackLinks)
- Вебвизор (webvisor)
- E-commerce (ecommerce)

---

## Критичные исправления v0.13.0-v0.16.0

### v0.13.0 - Восстановление контента

**Цель:** Восстановить полные тексты контента из оригинального приложения

**Задачи:**

- [x] Восстановить полный текст "О художнице"
- [x] Восстановить статью "О мандалах" с 7 изображениями мандал

**Результаты:**

- Полный оригинальный контент страниц восстановлен
- Добавлены изображения мандал в статью про Юнга

---

### v0.14.0 - Эффекты из оригинала

**Цель:** Портировать визуальные эффекты из оригинального приложения

**Задачи:**

- [x] AnimatedRadialGradient - анимированный градиент для мандал
- [x] ColorOverlay - переливающийся цветной оверлей на главной
- [x] Fullscreen режим с вращением мандалы
- [x] Управление скоростью вращения колесом мыши
- [x] Переключение blend mode эффектов (multiply, color-burn, overlay, darken, color-dodge)

**Результаты:**

- Все оригинальные эффекты портированы на React 19 + TypeScript
- Fullscreen режим работает с управлением колесом мыши
- 5 режимов blend mode для эффектов

---

### v0.15.0 - Система изображений

**Цель:** Перенести изображения из public/ в систему uploads/ с API

**Задачи:**

- [x] Модель Image в схеме БД
- [x] API endpoint /api/files/[...path] для сервинга файлов
- [x] API endpoint /api/upload для загрузки файлов
- [x] Утилиты lib/images для работы с изображениями
- [x] Изображения перемещены из public в uploads
- [x] URL изображений обновлены на /api/files/mandalas/

**Результаты:**

- Изображения больше не в public/ (проблема с Next.js build)
- API endpoint сервит файлы из uploads/
- Поддержка загрузки новых изображений через админку

---

### v0.16.0 - Оптимизация изображений Next/Image

**Цель:** Оптимизировать изображения с помощью Next.js Image компонента

**Задачи:**

- [x] Создать статические страницы about-mandalas и about-elfafeya
- [x] Использовать Next.js Image с fill режимом
- [x] Добавить position: relative контейнеры для изображений
- [x] Настроить priority для above-the-fold изображений
- [x] Ограничить ширину текста до 85ch для комфортного чтения

**Результаты:**

- Статические страницы вместо динамического контента из БД
- Next.js Image автоматически конвертирует в WebP/AVIF
- Генерация srcset для разных размеров экранов
- Ленивая загрузка (lazy loading) для изображений

**Технические детали:**

```tsx
// Контейнер с position: relative для fill режима
<Box position="relative" width="300px" height="300px">
  <Image src={src} alt={alt} fill style={{ objectFit: 'contain' }} />
</Box>
```

---

## Статистика реализации

**Всего задач выполнено:** 80

**По фазам:**

- Фаза 0: 5 задач
- Фаза 1: 5 задач
- Фаза 2: 4 задачи
- Фаза 3: 6 задач
- Фаза 4: 8 задач
- Фаза 5: 4 задачи
- Фаза 6: 5 задач
- Фаза 7: 7 задач
- Фаза 8: 5 задач
- Фаза 9: 4 задачи
- Фаза 10: 6 задач
- Фаза 11: 4 задачи
- Фаза 12: 4 задачи
- v0.13.0: 2 задачи
- v0.14.0: 5 задач
- v0.15.0: 6 задач
- v0.16.0: 5 задач

---

## Ключевые достижения

1. **Успешная миграция** — старое приложение (React 16, 2018) портировано на современный стек (Next.js 16 + React 19)
2. **Сохранена функциональность** — все фичи старого приложения воссозданы
3. **Современные технологии** — Chakra UI v3, ZenStack, Auth.js v5, Conform Future API
4. **PWA и SEO** — полная поддержка PWA, оптимизация для поисковых систем
5. **Админ-панель** — CRUD функционал для управления контентом

---

## Сессия 2026-07-15 — rollout-профиль включён, первый zero-downtime деплой

- `letar.rollout: 'true'` раскомментирован в `docker-compose.production.yml` — приложение было
  структурно готово к rollout, но ждало «периода стабильности» после прод-инцидента 2026-07-12
  (500 на всех страницах, `sharp`/`libvips` `ERR_DLOPEN_FAILED`). Хотфикс той сессии
  (явный `COPY` `.so`-файла) заменён устойчивым решением — `outputFileTracingIncludes` в
  `next.config.js` — и подтверждён стабильным 3 дня без новых инцидентов.
- Первый rollout-пилот прошёл с первой попытки, все 9 гейтов зелёные (`doctor` →
  `scale-up` → `wait-healthy` → `smoke-test` → `nginx-reload-1` → `stop-old` → `rm-old` →
  `nginx-reload-2`), `mandala-app-2 healthy`, `curl mandala.letar.best` → 200, простоя не было.
- Деплой-агент — BlackCove, координация через Agent Mail (thread
  `deploy-form-example-mandala-rollout-J`).

---

## Сессия 2026-07-21 — `prisma/seed.ts`: тройной баг PrismaClient (v0.39.9)

Блокировал `nx run mandala:db:seed` на staging (батч §18.7 M1/2, 54 admin-теста e2e зависели от
сида `admin@elfafeya.art`). Все три звена в одном файле, обнаружены и исправлены последовательно:

1. **Path-alias `@/generated/prisma`** — `tsx` не резолвит `tsconfig.json` paths при вызове через
   `prisma db seed` (`Cannot find module`). Заменён на относительный `../src/generated/prisma`
   (паттерн всех остальных приложений — mandala была единственной с алиасом в `seed.ts`).
2. **`PrismaClient` is not a constructor** — `zenstack:generate` намеренно перезаписывает
   `src/generated/prisma/index.ts` на `export * from './browser'` (защита от протечки Node-only
   клиента в браузерные бандлы; само приложение это не задевает — `lib/db.ts` использует
   `ZenStackClient`, не сырой `PrismaClient`). Импорт в `seed.ts` переведён на явный
   `../src/generated/prisma/client` — реальный серверный entry-point.
3. **`PrismaClientInitializationError`** — Prisma 7 (`prisma-client` TS-генератор) требует явный
   driver adapter, `new PrismaClient()` без параметров больше не собирается. Добавлен `PrismaPg`
   по образцу `animatrona-tracker/prisma/seed.ts`.

Проверено локально end-to-end (`nx run mandala:db:seed --skip-nx-cache`) — admin создан, 31
мандала/37 изображений/10 short URL засеяны. `nx lint`/`nx typecheck:tsgo` чисто. Коммит
`855d2e06`. Тот же класс бага проверен на 9 приложениях батча — нашёлся ещё в `grandslamcup`
(починен отдельно, не в этом приложении), остальные 8 не задеты (используют `ZenStackClient`
напрямую либо не имеют `prisma/seed.ts`). Детали координации с деплоем — корневой `PLAN.md` §18.7.

---

## §18.7 Тираж M1 batch2 — staging uploads volume-mount (2026-07-22, root-weaver)

**Root cause найден и починен:** после того как BlackCove синхронизировал реальные файлы
`uploads/mandalas/` (+ `content/`/`watermarks/`) прод(s2)→staging(s3) и seed реально создал
31/31 mandala-записей (было 0/31 — `upsertImage()` пропускал запись целиком без файла картинки,
`apps/mandala/prisma/seed.ts:200-204`, это не баг seed, а сознательное поведение), обнаружился
второй, независимый баг: `apps/mandala/docker-compose.staging.yml` не монтировал `uploads/` в
контейнер (в отличие от `docker-compose.production.yml`) — seed отрабатывал корректно, потому что
выполняется на хосте (`cwd: apps/mandala`, вне контейнера), но сам `mandala-staging-app` не видел
файлов.

**Фикс:** добавлен `volumes: - ./uploads:/app/apps/mandala/uploads` в `docker-compose.staging.yml`
по образцу production. Коммит `b06b8929`. Подтверждено BlackCove передеплоем + прогоном.

**Полный e2e после фикса:** 96 passed / 12 failed / 4 skipped / 11 did not run. Все 12 отказов —
реальные баги приложения, не связаны с картинками/volume (см. `PLAN.md` → «🔴 Приоритетная задача
— /admin/products сломан»), перенесены туда для отдельного агента.

---

## `/admin/products` сломан целиком — два независимых бага (2026-07-22, v0.39.10)

**Задача из `PLAN.md`** (см. предыдущую сессию выше). Оба бага воспроизведены **локально в браузере**
(реальные клики, не только чтение кода) через `mandala:dev` + вход тестовым админом `admin@elfafeya.art`.

**Баг 1 — `prisma/seed.ts` никогда не создавал `Product`.** Проверено `grep`: в сид-скрипте не было
ни единого `prisma.product.*`. Список товаров в админке был пуст **на любом окружении**, включая
staging — не только там, где не хватало файлов картинок. `EmptyState` вместо `<table>` → падение
`getByRole('table')` в 3 e2e-тестах. Фикс: добавлен блок сидинга 3 тестовых товаров (магнит,
открытка, постер), аналогично мандалам — `where: { slug }` upsert, без изображений (поле опционально).

**Баг 2 — краш вкладки браузера при клиентской навигации с любого admin-списка на `/new`.**
Воспроизведено буквально: клик по ссылке «Создать товар» → title меняется на «Создать товар — Админ»,
но `document.body.innerText` → `"This page couldn't load. Reload to try again, or go back."` (нативная
error-страница Chrome, не React-оверлей) + сотни повторов `recursivelyTraversePassiveUnmountEffects` в
network-логах `__nextjs_original-stack-frames` — реальный краш рендер-процесса, не просто React-варнинг.
То же самое на `/admin/mandalas` → `/admin/mandalas/new` — баг общий, не products-специфичный.

**Root cause:** `SlugField`/`SeoField` (`libs/admin-ui/src/form-fields/`) делали
`const unsubscribe = form.store.subscribe(...); return unsubscribe` в `useEffect`. В `apps/mandala`
установлен `@tanstack/react-form@1.33.x` → `@tanstack/form-core@1.33.x` → `@tanstack/store@^0.11.0`,
где `subscribe()` возвращает объект `Subscription { unsubscribe: () => void }`, а не функцию (в
`0.7.7`/`0.9.x` было наоборот — bare `() => void`). React ругался `useEffect must not return anything
besides a function... You returned: [object Object]` и **cleanup никогда не вызывался** — подписка на
`form.store` утекала на каждый mount/unmount. `grep` по всему репо нашёл те же 12 мест с
`form.store.subscribe(`; 10 из них в `libs/forms/src/` уже были починены раньше (комментарий
`// TanStack Store v0.9+ возвращает объект { unsubscribe }, а не функцию` + `.unsubscribe()`), только
`libs/admin-ui/src/form-fields/slug-field.tsx` и `seo-field.tsx` остались со старым паттерном.
**Fix (тот же паттерн, что уже проверен в 10 других местах):** `return () => unsubscribe.unsubscribe()`.

Затронуты все admin-CRUD формы mandala (мандалы, товары, контент-страницы) — единственный consumer
`SlugField`/`SeoField` в монорепо, поэтому фикс сделан напрямую в `libs/admin-ui`, без делегирования
через `form-delegation.md` (это не `libs/forms`/form-mcp экосистема, а изолированный shared UI-компонент
с одним потребителем).

**Коммит:** `a5893e7c` (`apps/mandala/prisma/seed.ts`, `libs/admin-ui/src/form-fields/{slug,seo}-field.tsx`).

**Верификация на staging (agent-mail, тред `staging-e2e-gate-m1-batch2`, через BlackCove):**

| Прогон                           | Результат                                              | Комментарий                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| до фикса                         | 96 passed / 12 failed / 4 skipped / 11 did not run     | исходная находка                                                                                                                                                          |
| после деплоя фикса, без пересида | 99 passed / 9 failed / 4 skipped / 11 did not run      | `02-admin-mandalas` — все 5 фейлов ушли; `03-admin-products` — форма создания зелёная, но «просмотр»/«редактирование» ещё падают (0 товаров в БД — сид не перезапускался) |
| после `seed:true` пересида       | **103 passed / 9 failed / 1 skipped / 10 did not run** | оба оставшихся фейла `03-admin-products` ушли — гипотеза с несвежим сидом подтвердилась                                                                                   |

Остаточные 9 фейлов (чекаут, статусы заказов, полный CRUD-флоу, SEO-заголовок) — отдельный класс
багов, не диагностировался в этой сессии, перенесён в `PLAN.md` → «🟡 Остаточные e2e-фейлы».

---

## v0.40.0 — 2026-07-28 (152-ФЗ: consent-инфраструктура с нуля)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Приложение
собирает email (Better Auth), но не имело ни одного элемента чек-листа 152-ФЗ. Добавлено:

- `ConsentLog` в `schema.zmodel` + миграция (`prisma/migrations/20260728041113_add_consent_log`)
- `POST /api/consent` — sha256-хэш IP, без email/точного IP
- `CookieBanner`/`CookieSettingsButton` из `@letar/ui` в layout/footer
- Страница `/privacy`

Локальная dev-БД имела pre-existing дрейф (`better_auth`-миграция была изменена после применения) —
устранён `prisma migrate reset --force` с явного разрешения владельца в чате (2026-07-28), затем создана
и применена миграция `add_consent_log`. `nx zenstack:generate`+lint+typecheck зелёные.

### 2026-07-30 — Telegram API через tg-proxy (обход блокировки s1/s2)

- `TelegramClient` (`src/lib/telegram/telegram-client.ts`) переведён на `TELEGRAM_API_ROOT` вместо
  хардкода `api.telegram.org`, заблокированного провайдером ДЦ на s1/s2. Дефолт
  `https://tg-proxy.letar.best` — компоновка через `docker-compose.production.yml`, без изменений
  `.env.docker.enc`.

### v0.40.2 — 2026-07-30 — миграция на @letar/format-utils

Кросс-приложенческая сессия (вела `letar`, детали в приватном журнале
`.claude/private/PLAN-JOURNAL.md`): `shop/_components/product-card.tsx` переведён с
`product.price.toLocaleString('ru-RU')` на `formatRubles` из общей либы `@letar/format-utils`.
Поведение не изменилось. `nx typecheck:tsgo`/`lint` зелёные. Единственное место в приложении с
денежным форматированием — остальные `toLocaleString('ru-RU')` в коде относятся к датам.

### v0.41.0 — 2026-08-04 — переход на `@letar/image-upload`, удаление форка

Кросс-приложенческая сессия (вела `letar`, основная работа — в библиотеке
[`libs/image-upload`](../../libs/image-upload/README.md)). Приложение стало её первым реальным
потребителем.

**Что было.** В `admin/_components/` и `admin/_hooks/` жила своя реализация загрузки изображений
(195 + 209 строк хуков, 177 строк компонента, 329 + 329 строк тестов), заведённая в v0.30.1 как
«shared внутри приложения». По факту это был форк `@letar/image-upload`, разошедшийся с
оригиналом: у библиотеки были `uploadMany`/`getUploadedImages`/статус `pending`, у mandala —
`useFileDragDrop` и `useImagePreview`. Библиотека при этом не имела ни одного потребителя.

**Почему нельзя было подключить «как есть».** Хук библиотеки собирал ссылку как
`/api/images/<id>` и подставлял её прямо в `<img src>`. В mandala этот эндпоинт
([`api/images/[id]/route.ts`](src/app/api/images/[id]/route.ts)) отдаёт **JSON с описанием**, а
байты картинки живут на `/api/files/<path>`. Наивная миграция сломала бы все превью в админке.
В библиотеку добавлены резолверы URL, mandala использует `createMetadataUrlResolver()`.

**Изменения в приложении:**

- удалены `_hooks/use-image-upload.ts`, `_hooks/use-file-drag-drop.ts`,
  `_components/image-upload-field.tsx` и два спека из `_hooks/__tests__/` — тесты переехали
  в библиотеку;
- [`form-image-upload.tsx`](src/app/(admin)/admin/_components/form-image-upload.tsx) — обёртка
  над библиотечным `ImageUploadField`. Категории `MANDALA`/`THUMBNAIL`/`WATERMARK` объявлены
  здесь: это предметная область приложения, из общего типа библиотеки они убраны. `next/image`
  подставляется через проп `renderImage` — библиотека не зависит от `next`;
- [`product-images-upload.tsx`](src/app/(admin)/admin/products/_components/product-images-upload.tsx)
  импортирует `useImageUpload` из `@letar/image-upload` (`onSuccess` → `onUploadSuccess`);
- `tsconfig.json` — `paths` на библиотеку, `next.config.js` — `transpilePackages`
  (без второго `typecheck` зелёный, а прод-билд падает на `Module not found`).

**Проверено:** `nx lint mandala`, `nx typecheck:tsgo mandala` — чисто; unit-тесты 250 passed.
Первый вживую прогон (`nx e2e mandala-e2e -- --project=admin-chromium`) залил три файла в
`uploads/` (`mandala/`, `product/` ×2), превью отрисовалось через асинхронный резолвер метаданных.

⚠️ **Найдена и исправлена регрессия уже после этой проверки:** `ImageUploadField` резолвил
превью только через `resolveImageUrl(value)`, отбрасывая готовую ссылку из ответа `/api/upload`.
На прод-сборке это давало race — пока асинхронный резолвер метаданных не отработает (или если он
не отрабатывает вовсе из-за нагрузки на сервер), кнопка «Удалить» не появляется, и клиентская
валидация формы (`imageId` обязателен) блокирует сабмит навсегда. Фикс — `libs/image-upload/src/lib/image-upload-field.tsx`
держит `justUploaded` (последний успешный `UploadedImage`) и использует его ссылку напрямую, пока
`value` формы указывает на этот же файл; резолвер вызывается только для значений, пришедших
извне (открытие формы редактирования). Юнит-тесты библиотеки (115/115) остаются зелёными.
Сквозная e2e-проверка после этого фикса не переделана в рамках этой сессии — параллельно с
верификацией в рабочей директории шла сборка от другого агента, конкурирующая за порт/`.next` и
делавшая результаты прогонов ненадёжными; довести до чистого подтверждения оставлено следующей
сессии/фоновой задаче `Fix 6 pre-existing mandala e2e failures`.

⚠️ **Локальный сид даёт 0 мандал** — в рабочем дереве снова нет исходных `uploads/mandala/*`
(та же нехватка, что описана в PLAN.md, «Третий раунд», 2026-07-23; файлы тогда копировались
с s2 по SSH). Из-за пустого списка `02-admin-mandalas` падает на strict-mode коллизии: на
empty-state рендерится вторая ссылка «Создать мандалу» — похоже, уже поймано и чинится отдельно
(см. `data-testid="page-header"` в `admin/mandalas/page.tsx`, не моя правка).

### v0.40.3 — 2026-08-04 — path traversal в `/api/og-image` и `DELETE /api/upload`

Найдено при разборе задачи из внешнего репорта, сразу после унификации `api/files/[...path]`
на общий хелпер (коммит `e7a4f8cc`, [v0.41.0 выше](#v0410--2026-08-04--переход-на-letarimage-upload-удаление-форка)).

**Что было.** `GET /api/og-image` брал query-параметр `url`, проверял только префикс
(`/api/files/` или `/api/images/`) и склеивал остаток с корнем `uploads/` через `join` без
нормализации. `?url=/api/files/../../../../<путь>` проверку префикса проходил, `join` спокойно
выходил за пределы `uploads/`, sharp отдавал любой файл-изображение с диска сервера — без
авторизации. Тот же приём нашёлся в `DELETE /api/upload?url=…` — там это уже удаление
произвольного файла (хоть и под ADMIN-сессией).

**Чем закрыто.** Оба места переведены на `resolveUploadPath` из `@letar/image-upload/server` —
ту же защиту, что унификация уже поставила в `api/files/[...path]`: нормализация пути + проверка,
что результат остался внутри корня. Выход за корень → 403, нулевой байт во вводе → 400. Заодно
убран повторный `decodeURIComponent` в og-image (searchParams.get уже возвращает раскодированное
значение — второй проход превращал `%252e%252e%252f` в `../` и ронял 500 на одиночном `%`), и
каталог внутри `uploads/` теперь честный 404, а не 500 от sharp.

**Урок для следующих унификаций библиотек.** Унификация `e7a4f8cc` свела к общему хелперу семь
роутов `api/files/[...path]`, но потребители того же корня `uploads/` с **другой формой URL**
(query-параметр вместо динамического сегмента) остались со старой защитой — их не видно поиском
по имени роута или паттерну файла. Искать нужно по корню (`join(process.cwd(), 'uploads', …)`),
а не по семейству роутов, когда закрываешь класс уязвимости, а не конкретный файл.

**Проверено:** живой прогон на dev-сервере (легальный путь → 200 + валидный JPEG, все варианты
traversal → 403/400), `nx lint`/`typecheck:tsgo`/полный unit-набор (250 тестов) и `nx build` —
зелёные.

**Тесты:** новый `src/app/api/og-image/__tests__/route.spec.ts` — 12 штук (`../`, процентная
кодировка, двойное кодирование, обратный слэш, абсолютный путь, нулевой байт, пустой остаток
пути, каталог вместо файла) с **положительным контролем** — реальный файл за пределами
`uploads/`, чтобы 403 нельзя было спутать с «файла и так нет».

**Не в скоупе этой правки, передано владельцу отдельно (не публикуется в открытый репозиторий):**
тот же паттерн (путь из пользовательского ввода + `join(..., 'uploads', …)` без нормализации)
найден ещё в двух приложениях за пределами mandala при беглом аудите по всему монорепо. А также
SSRF в ветке внешних URL того же `og-image`-роута (`fetch` на произвольный адрес без allow-list) —
другой класс уязвимости, оба вызывающих места в mandala передают только локальные `/api/files/…`,
так что ветку можно запереть без риска регрессии, но это отдельное решение.

### v0.40.4 — 2026-08-04 — фикс `as="label"` в `product-images-upload.tsx`

Точечный фикс, обнаруженный ревью сразу после миграции на `@letar/image-upload` (v0.41.0/0.40.3
выше): кнопка «Добавить изображения» в
[`product-images-upload.tsx`](src/app/(admin)/admin/products/_components/product-images-upload.tsx)
была написана как `<Button as="label">` со вложенным `<input type="file">` внутри — запрещённый в
Chakra UI v3 проп `as=` (`.claude/rules/components.md`).

Первая попытка фикса — `Button asChild` + `<label>` со вложенным `<input>` внутри — оказалась
той же ошибкой, что уже ловилась в `svoichuzhie` (см. `apps/svoichuzhie/PLAN_COMPLETED.md`,
запись 2026-06-13): вложение `<input>` в `<label>` даёт двойной toggle (клик активирует input
напрямую, событие всплывает к label, label активирует input повторно). Для чекбоксов это баг,
для `<input type="file">` — риск повторного открытия системного диалога выбора файла.

**Финальное решение:** `<label htmlFor={fileInputId}>` (через `Button asChild`) как **сосед**
`<input id={fileInputId}>`, не родитель — проверенный в репозитории паттерн. `fileInputId`
получен через `useId()`. `disabled` убран с `<label>` (невалидный HTML-атрибут для этого тега),
визуальное отключение — через `cursor`/`opacity`/`pointerEvents="none"` на `Button`.

**Проверено:** `nx lint mandala`, `nx typecheck:tsgo mandala` — чисто. Живой клик по кнопке в
браузере **не проверен** — локальный dev-сервер не пропустил автоматизированный логин в админку
(сабмит формы входа не срабатывал ни по клику, ни по Enter, ни через `form.requestSubmit()`;
похоже на несвязанную проблему окружения — automation-инструмент выставляет `value` инпутов в
обход React-стейта, который отслеживает react-hook-form). Стоит вручную кликнуть на
`/admin/products/new` при следующей работе с этим компонентом.

### v0.40.5 — 2026-08-04 — auto-generated `AGENTS.md`/`CLAUDE.md` от Next.js 16

После `next dev` в untracked появились `AGENTS.md` и однострочный `CLAUDE.md` (`@AGENTS.md`) —
Next.js 16 сам создаёт их при запуске dev-сервера (`generate-agent-files.js`), файл адресован
ИИ-агентам и пересоздаётся при каждом запуске. Первое приложение в монорепо, где паттерн замечен.

**Решение:** `apps/*/AGENTS.md` добавлен в корневой `.gitignore` (пересоздаётся каждый dev-запуск,
не реальная документация). `CLAUDE.md` в `.gitignore` **не добавлен** — в репо уже есть конвенция
per-app `CLAUDE.md` для ручной документации (animatrona, animatrona-mobile, aprel8008), стаб
`apps/mandala/CLAUDE.md` закоммичен как обычный файл. Подробности —
[nextjs16-agent-guide-files.md](/.claude/docs/nextjs16-agent-guide-files.md).

### v0.40.6 — 2026-08-04 — hydration mismatch в admin e2e из-за Turbopack по умолчанию

`03-admin-products.admin.spec.ts` (тесты «есть кнопка сохранения», «можно открыть товар из
списка») периодически падали не на бизнес-логике, а на том, что клик по ссылке/кнопке не
приводил к смене URL — `toHaveURL` таймаутился. В логе dev-сервера в этот момент: `Hydration
failed because the server rendered HTML didn't match the client... this tree will be regenerated
on the client`, с расхождением `<script>` (next-themes) vs `<style data-emotion="css-global...">`
в `ColorModeProvider`.

**Причина:** двухслойная. (1) `ChakraProvider`'s `<Global>` (emotion) на SSR буквально рендерит
`<style data-emotion>`-элемент в дереве, а на клиенте — `null` (стили вставляются через
`useInsertionEffect` в обход реконсиляции) — часть архитектуры Emotion, само по себе не проблема.
(2) Next.js 16 без явного бандлер-флага выбирает Turbopack бандлером по умолчанию для `next
dev`/`next build` (`next/dist/lib/bundler.js`: `bundlerFlags.size === 0` → `Bundler.Turbopack`).
Именно под Turbopack комбинация из (1) с `next-themes`'ным `<script>`-тегом (оба — первые дети
`ChakraProvider`/`ColorModeProvider`) триггерит настоящий hydration mismatch — React отбрасывает
и заново монтирует **всё поддерево `<body>`**, и клик Playwright, случившийся в этот момент,
теряется (обработчик навешен на уже удалённый DOM-узел). Под webpack та же комбинация не
мисматчится. Официально задокументировано самим Chakra UI:
<https://chakra-ui.com/docs/get-started/frameworks/next-app> § «Hydration errors».

Ловушка: комментарий в `apps/mandala/project.json` уже утверждал `"Start development server (без
Turbopack из-за бага с Emotion)"`, но сама команда была `"next dev"` без флага — намерение
зафиксировали, а флаг забыли добавить. Комментарий рядом с командой — не доказательство того, что
она делает, проверять надо сам флаг.

**Решение:** `--webpack` в `dev`/`build` командах `apps/mandala/project.json`. Не решается через
`next.config.js` — выбор бандлера читается из CLI-флага/env раньше чтения конфига.

**Проверено:** два чистых прогона `nx e2e mandala-e2e -- --project=admin-chromium --grep
"Товары"` подряд — 11/11, без флуктуаций. Тест «есть кнопка сохранения» ускорился с 11.4с до
0.6с (раньше время съедала гонка с ремонтом дерева).

**Не в скоупе:** та же уязвимость (Chakra v3 + `next-themes` без явного бандлер-флага)
потенциально есть в `driving-school`, `dashboard`, `animatrona-tracker` и других — не проверялось
целенаправленно, чинить по факту обнаружения. Подробный разбор —
[nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md).

---

## 07/08/10: пустые name/slug при сабмите формы мандалы/товара — ЗАКРЫТО (2026-08-05)

Продолжение находки из «§ 07/08/10» (доверификация §30, 2026-08-04) — на этот раз доведено до
конца с живым воспроизведением.

**Ранее заподозренный `useFormPersistence`/Dialog не подтвердился:** `localStorage` в момент
падения содержал корректный черновик, диалог восстановления не открывался — `@letar/forms` тут ни
при чём.

**Реальная причина** — `apps/mandala/src/app/_components/onboarding/onboarding-provider.tsx`.
`OnboardingProvider` обёрнут вокруг `{children}` в корневом `app/layout.tsx` (то есть вокруг всего
приложения) и до фикса условно переключался между `<>{children}</>` (пока не отработал
`useEffect`, читающий `localStorage`) и `<OnboardingContext.Provider>{children}</...>` (после).
`Fragment` и `Context.Provider` — разные типы React-элементов на одной позиции дерева, поэтому
переключение заставляло React **полностью размонтировать и заново смонтировать всё поддерево**
`children` в первую секунду после гидратации — включая формы создания мандалы/товара.

Подтверждено экспериментально временным `useId()`-трекером в `SlugField`: instanceId менялся с
серверного (`_R_...`) на чисто клиентский (`_r_3_`) без единого hydration-warning в консоли —
это НЕ вариант уже разобранного выше HMR/Turbopack-артефакта (воспроизводилось и на чистой
production-сборке с `--webpack`).

Playwright's `nameInput.fill()` — быстрый скриптовый ввод сразу после `page.goto()` — стабильно
попадал в окно между рендерами старого и нового дерева: значение уходило в обречённый инстанс
формы, тут же размонтированный. `imageId` выживал только потому, что реальная загрузка файла
(сетевой запрос) занимает дольше и завершалась уже после ремаунта.

**Фикс:** `OnboardingProvider` теперь всегда рендерит `Context.Provider` одного типа — `isReady`
убран целиком, `value` вычисляется как раньше (обновление значения пропса — не смена типа
элемента, ремаунта не вызывает).

**Проверено:** `07-full-mandala-crud` (создание) — с ~45–60с (таймаут) до 1.2с; полный набор
`--grep "с изображением|Полный CRUD|Интеграционный flow"` (07/08/10, 15 тестов) — все зелёные.
`nx lint mandala`/`nx typecheck:tsgo mandala` чистые.

**Общий урок:** `if (!ready) return <>{children}</>` с последующим переключением на другую обёртку
после монтирования — кандидат на полный ремаунт всего поддерева, если компонент обёрнут вокруг
значимой части приложения. Чинить через «один и тот же тип элемента, разное значение пропсов»,
а не условный выбор обёртки.

---

### Рефакторинг: sharp-обработка загрузки изображений вынесена в `@letar/image-upload/server`

`createImageRecord`/`processImageBuffer` (`src/lib/images/create-image.ts`) дублировали sharp-код
с `aboi`, `kami` и `domwellbes` — декодирование буфера, метаданные, генерация `blurDataURL`.
Общая часть выделена в `processUploadImage()` (`libs/image-upload/src/server/process-upload-image.ts`),
`processImageBuffer` теперь тонкая обёртка над ней с сохранённым поведением (try/catch → null при
ошибке, blurDataURL 10×10/blur 1/WebP q20 по умолчанию).

### Рефакторинг: CRUD Image и POST/DELETE /api/upload вынесены в @letar/image-upload/server

Продолжение предыдущего пункта. `create-image.ts` был на 100% идентичен `kami` (кроме импорта
Prisma/ZenStack-клиента) — вынесен в `createImageRepository()`. `POST`/`DELETE /api/upload`
дублировались с `kami` байт-в-байт (различалась только проверка роли: `role` vs `roles[]`) —
вынесены в `createImageUploadRoute()`. Оба файла в mandala теперь только декларативная сборка
опций (сессия, `isAuthorized`, репозиторий, `getImageUrl`), логика — в библиотеке.

---

### tsconfig.json — убраны `references` на `libs/*`, добавлен явный `rootDir` (2026-08-07)

Убраны 13 ссылок на `../../libs/*` из `references` — тот же хрупкий редирект на
`tsconfig.spec.json`/`out-tsc/spec`, что чинили в `dashboard-agent` (0.11.1,
`.claude/rules/libs.md`). После удаления всплыл `TS6059`: `mandala` наследует через
`tsconfig.next-app.json` → `tsconfig.base.json` `composite: true`, а composite-режим требует,
чтобы `rootDir` содержал все файлы программы; TypeScript вычисляет `rootDir` по
`include`-паттернам приложения, не видя в них `libs/*`. Фикс — явный
`"rootDir": "${configDir}/../.."` в `apps/mandala/tsconfig.json`. `nx typecheck:tsgo` и
`nx build mandala` зелёные.

---

## Журнал закрытых багов и e2e-стабилизации (SSRF/path traversal, ремаунт формы, staging e2e)

> Перенесено из PLAN.md: 2026-08-09

### ✅ SSRF в `/api/og-image` (ветка внешних URL) — ЗАКРЫТО v0.40.5 (2026-08-04)

**Что было:** после закрытия path traversal (см. ниже) в том же роуте оставалась вторая,
независимая уязвимость — ветка для внешних URL без всякой авторизации делала
`fetch(imageUrl)` на любой переданный адрес. Эксплуатация: `?url=http://127.0.0.1:6379/`
(внутренний сервис на localhost), `?url=http://169.254.169.254/latest/meta-data/` (метаданные
облака), сканирование внутренней сети s2 через сервер как прокси. Лимит `MAX_EXTERNAL_FILE_SIZE`
защищал только от OOM, не от самого факта запроса к внутреннему адресу.

**Чем закрыто:** ветка внешних URL удалена целиком (не allow-list, не блокировка приватных
диапазонов) — оба вызывающих места (`mandalas/[slug]/page.tsx`, `shop/[slug]/page.tsx`)
передают в `og-image` только `getImageUrl()`, т.е. локальный `/api/files/...`. Внешние
изображения приложением никогда не генерировались — весь код для них был мёртвым. Нелокальный
`url` теперь отдаёт `400 Bad request`.

**Тесты:** существующие 12 тестов `route.spec.ts` (писались под path traversal) прошли без
изменений — они бьют только по локальной ветке. Живая проверка на dev-сервере:
`?url=https://example.com/image.jpg` → `{"error":"Bad request"}`.

---

### ✅ 07/08/10: форма мандалы/товара сабмитится с пустыми name/slug — ЗАКРЫТО (2026-08-05)

**Не пересекается с закрытыми ниже 6 тестами** — их причины (cookie-баннер, дубль CTA) не
объясняют этот симптом, и он не входил в тот набор.

**Симптом:** `07-full-mandala-crud`/`08-full-product-crud`/`10-integration-full-flow` доходят до
конца формы (изображение загружается, превью и кнопка «Удалить» появляются корректно — миграция на
`@letar/image-upload` из §30 тут ни при чём и работает штатно), клик по «Создать мандалу» доходит
до Server Action, но `waitForURL` не дожидается редиректа. Debug-лог `[DEBUG create-action-factory]`
показывал точную причину: `imageId` заполнен верно, `name`/`slug` — пустые строки, хотя
`nameInput.fill(testMandalaName)` отработал и `SlugField` их визуально показывал. Второй прогон
падал уже на `Product_slug_key`/`Mandala_slug_key` — первая попытка с пустым slug тихо создавала
мусорную запись с `slug: ''`, вторая на неё натыкалась.

**Гипотеза про `useFormPersistence`/Dialog (см. предыдущая версия этой записи) не подтвердилась.**
`localStorage['form-persistence:mandala-form-new']` в момент падения содержал ПРАВИЛЬНЫЕ значения
(name/slug/imageId) — черновик сохранялся верно, диалог восстановления не открывался, `@letar/forms`
ни при чём.

**Реальная причина — `apps/mandala/src/app/_components/onboarding/onboarding-provider.tsx`.**
`OnboardingProvider` (обёрнут вокруг `{children}` в корневом `app/layout.tsx`, то есть вокруг ВСЕГО
приложения) до фикса условно переключался между двумя типами обёртки:

```tsx
// До: тип элемента на этой позиции дерева меняется после монтирования
if (!isReady) {
  return <>{children}</> // Fragment, пока не отработал useEffect
}
return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
```

`isReady` выставлялся в `true` внутри `useEffect` (проверка localStorage на завершённость
онбординга) практически сразу после монтирования — на первом же тике. React сравнивает элементы по
типу на одной и той же позиции дерева между рендерами: `Fragment` и `Context.Provider` — РАЗНЫЕ
типы, поэтому смена одного на другой заставляет React **полностью размонтировать и заново
смонтировать ВСЁ поддерево `children`** (весь `app/layout.tsx`, включая формы) вместо обычного
обновления пропсов. Подтверждено экспериментально: добавленный временный `useId()`-трекер в
`SlugField` показал ремаунт с серверного instanceId (`_R_...`) на чисто клиентский (`_r_3_`) в
первые ~1 секунду после гидратации — без единого hydration-warning в консоли (это НЕ вариант уже
разобранного в «Третьем раунде» ниже HMR/Turbopack-артефакта, воспроизводилось и в чистой
production-сборке на `--webpack`).

Playwright's `nameInput.fill()` — быстрый скриптовый ввод сразу после `page.goto()` — стабильно
успевал попасть в окно между рендерами старого и нового дерева: значение уходило в обречённый
инстанс формы, который тут же размонтировался. `imageId` выживал только потому, что реальная
загрузка файла (сетевой запрос) занимает дольше и завершалась уже ПОСЛЕ ремаунта, когда дерево было
стабильно. Человек, печатающий вручную, почти никогда не успевает набрать текст за эту долю
секунды — поэтому баг был виден только в автоматизации.

**Фикс:** `OnboardingProvider` теперь всегда рендерит `<OnboardingContext.Provider>` одного типа —
`isReady` убран целиком, `value` вычисляется как раньше (изменение самого `value` — это обычное
обновление пропсов Provider'а, не смена типа элемента, ремаунта не вызывает).

**Верификация:** после фикса `07-full-mandala-crud` (создание) упал с ~45–60с (таймаут) до 1.2с;
все 15 тестов набора `--grep "с изображением|Полный CRUD|Интеграционный flow"` зелёные.
`nx lint mandala` и `nx typecheck:tsgo mandala` чистые.

**Общий урок:** любой `if (!ready) return <>{children}</>` / `return children` с последующим
переключением на другую обёртку (`Provider`, `div`, что угодно) после монтирования — кандидат на
полный ремаунт всего поддерева, если компонент обёрнут вокруг значимой части приложения (не только
onboarding — любой провайдер в `app/layout.tsx`). Чинить через "всегда один тип элемента, разное
значение пропсов" вместо условного выбора обёртки.

---

### ✅ 6 падающих e2e-тестов admin-chromium — ЗАКРЫТО v0.40.4 (2026-08-04)

**Что было:** `nx e2e mandala-e2e -- --project=admin-chromium` стабильно ронял 6 тестов из 55,
обнаружено при проверке миграции на `@letar/image-upload` — падения к ней не относились.

**Причина 1 (4 теста):** `CookieBanner` (`@letar/ui`, `position: fixed; bottom: 0; zIndex: 1000`)
на первом визите перекрывает submit-кнопку в конце длинных форм — Playwright ретраит клик до
таймаута («subtree intercepts pointer events»). Починено проставлением cookie-согласия в
localStorage рядом с сессией в `auth.setup.ts` — баннер не рендерится ни в одном тесте.
Новый файл `apps/mandala-e2e/src/fixtures/cookie-consent.ts`.

**Причина 2 (2 теста):** `getByRole('link', { name: /создать мандалу/i })` без сужения находит
два совпадения на пустом списке мандал — ссылка есть и в шапке, и в `EmptyState`. Починено
`data-testid="page-header"` на контейнере шапки + локатор в тестах, который ищет только внутри
него (не `.first()` — порядок в DOM не контракт).

**Побочная находка (не в исходных 6, чинилась заодно):** локальный `nx e2e` идёт против `next
dev`, который компилирует маршруты/route handler'ы по первому запросу — загрузка изображения и
редирект после Server Action стабильно уходили за 10–20с, из-за чего набор падающих тестов
менялся от прогона к прогону при одном и том же коде. Таймауты разведены по `BASE_URL` в
`playwright.config.ts` + новый `apps/mandala-e2e/src/fixtures/timeouts.ts`
(`SLOW_ACTION_TIMEOUT`). Заодно убрана `waitForTimeout(2000)`-ставка на загрузку файла в
`08-full-product-crud.admin.spec.ts` — если upload не успевал, тест «проходил», создав товар
вообще без изображения.

**Не в скоупе, вынесено отдельно → ✅ ЗАКРЫТО (2026-08-04):** `03-admin-products.admin.spec.ts`
периодически терял клик по навигационной ссылке из-за React hydration mismatch в
`ColorModeProvider` (next-themes) — не связан ни с cookie-баннером, ни со strict mode. Причина:
Next.js 16 без явного бандлер-флага выбирает Turbopack по умолчанию, а под Turbopack связка
`ChakraProvider`'s `<Global>` (emotion) + `next-themes`'ный `<script>` триггерит настоящий hydration
mismatch — React отбрасывает и заново монтирует всё поддерево `<body>`, клик Playwright иногда
попадает в этот момент. Официально задокументировано Chakra UI (chakra-ui.com → «Hydration
errors»). Фикс — `--webpack` в `dev`/`build` командах `project.json` (комментарий там уже
утверждал «без Turbopack», но сам флаг забыли добавить). Подтверждено двумя чистыми прогонами
подряд, 11/11. Детали — [nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md).

**Документация:** новый раздел в [e2e-testing.md](/.claude/docs/e2e-testing.md) — «Дубль CTA:
шапка страницы + EmptyState», «Cookie-баннер перехватывает клики по submit-кнопкам», «Локальный
`nx e2e` идёт против `next dev`». Плюс заметка в [PLAN_TESTING.md](./PLAN_TESTING.md).

---

### ✅ Path traversal в `/api/og-image` — ЗАКРЫТО v0.40.3 (2026-08-04)

**Что было:** роут брал query-параметр `url`, проверял только префикс (`/api/files/`,
`/api/images/`) и склеивал остаток с корнем `uploads/` через `join` без нормализации. Префикс-проверку
проходил любой `../`, и sharp отдавал произвольный файл-изображение с диска сервера — без
авторизации. Тот же приём нашёлся в `DELETE /api/upload?url=…`, где это уже удаление файла.

**Чем закрыто:** `resolveUploadPath` из `@letar/image-upload/server` — та же защита, что в
унифицированных `api/files/[...path]` (нормализация пути + проверка, что результат внутри корня).
Выход за корень → 403, нулевой байт → 400.

**Урок для следующих унификаций:** коммит `e7a4f8cc` свёл к общему хелперу семь роутов
`api/files/[...path]`, но потребители того же корня `uploads/` **с другой формой URL** остались
со старой защитой — их не видно поиском по имени роута. Искать надо по корню (`join(..., 'uploads', …)`),
а не по семейству роутов. Аудит остальных потребителей проведён 2026-08-04, найденное вне mandala
передано владельцу отдельно (не публикуем незакрытые находки в публичный репозиторий).

**Тесты:** `src/app/api/og-image/__tests__/route.spec.ts` — 12 штук, с положительным контролем
(реальный файл за пределами `uploads/`), чтобы 403 не путался с «файла и так нет».

---

### ✅ `/admin/products` сломан (найдено BlackCove, staging e2e, 2026-07-22) — ЗАКРЫТО v0.39.10

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

**Диагностировано и исправлено (2026-07-22, v0.39.10):** два независимых бага, оба воспроизведены
локально через клик по реальным ссылкам в браузере (не только по коду):

1. **`prisma/seed.ts` никогда не создавал `Product`** — таблица товаров была пуста на любом
   окружении → `EmptyState` вместо `<table>` → падение `getByRole('table')`. Добавлен сидинг 3
   тестовых товаров.
2. **Краш вкладки при клиентской навигации с любого admin-списка на `/new`** — `SlugField`/
   `SeoField` (`@letar/admin-ui`) возвращали из `useEffect` результат `form.store.subscribe()`
   напрямую. В установленной версии (`@tanstack/store@^0.11.0`, тянется через
   `@tanstack/form-core@1.33.x`) `subscribe()` возвращает `{ unsubscribe }`, а не функцию —
   cleanup никогда не вызывался, подписка утекала на каждый mount/unmount, что приводило к краху
   вкладки браузера при навигации (это и есть `Target page, context or browser has been closed`
   в упавших e2e). Баг общий для **всех** admin-форм mandala (мандалы, товары, контент-страницы),
   не только продуктов. Остальные 10 мест с тем же паттерном в `libs/forms/src` уже были починены
   раньше (`.unsubscribe()`) — только `slug-field.tsx`/`seo-field.tsx` остались со старым кодом.

SEO title-баг (`/Elfafeya Art/i` vs "Добро пожаловать в мир мандал") — отдельная, не связанная
причина, не проверялась в рамках этой сессии.

---

### 🟡 Остаточные e2e-фейлы staging batch2 (не по теме `/admin/products`, 2026-07-22)

После фикса выше и пересида staging: **103 passed / 9 failed / 1 skipped / 10 did not run**.
Оставшиеся 9 — отдельный класс багов (чекаут/заказы/полный CRUD-флоу).

**Диагностировано и исправлено локально (2026-07-23):**

- [x] `01-public-pages` (SEO title): реальный баг, не устаревший тест. Главная страница
      (`page.tsx`) — единственный лист-сегмент, совпадающий по глубине с `[locale]/layout.tsx`,
      из-за чего `title.template` родителя не применяется к строковому `title` дочерней страницы.
      Фикс: [`[locale]/page.tsx`](src/app/[locale]/page.tsx) формирует финальный `title` явно
      (`${t('welcome')} - Elfafeya Art`), без опоры на template. Побочно найден и исправлен двойной
      суффикс `"- Elfafeya Art - Elfafeya Art"` на 7 других страницах (about-elfafeya, about-mandalas,
      sign-in, sign-up, shop, cart, checkout) — из `messages/ru.json` и `messages/en.json` убран
      захардкоженный суффикс в значениях `metaTitle`, он и так добавляется через layout template.
- [x] `01-public-pages` («можно перейти к товару», guest): подтверждено закрытым в четвёртом
      раунде ниже (41/41 passed).
- [x] `05-full-checkout` (оба теста): корневая причина — **silent submit failure**, общая для
      ВСЕХ форм `@letar/forms`. Chakra `Field.Root required` прокидывает нативный HTML5 `required`
      на дочерний `<input>`/`<textarea>` через контекст; при пустом обязательном поле браузер тихо
      блокирует `submit` до вызова React `onSubmit`, поэтому собственная Zod-валидация библиотеки
      (`Form.Errors`) никогда не получала возможности сработать и показать ошибки. Фикс (библиотечный,
      затрагивает все приложения): добавлен `noValidate` на `<form>` в
      [`form-simple.tsx`](../../libs/forms/src/lib/declarative/form-root/form-simple.tsx) и
      [`form-with-api.tsx`](../../libs/forms/src/lib/declarative/form-root/form-with-api.tsx).
      Второй, независимый баг в этом же флоу: необязательное поле `email` в чекауте падало с
      «Некорректный email» на пустой строке — сгенерированная Zod-схема `z.string().email().optional()`
      пропускает только `undefined`/`null`, а поле по умолчанию хранит `''`. Фикс:
      [`checkout.schema.ts`](src/app/[locale]/(main)/checkout/_schemas/checkout.schema.ts) —
      `email` переопределён через `z.union([z.email(), z.literal('')])`. Оба фикса подтверждены
      вместе: полный чекаут проходит end-to-end (заказ создаётся, редирект на success), а пустые
      обязательные поля теперь показывают видимые ошибки вместо тихого блока.
- [x] `07-full-mandala-crud` (создание мандалы с изображением): воспроизведено и подтверждено
      работающим без дополнительных правок — баг `subscribe()` в `SlugField`/`SeoField` уже был
      исправлен раньше (коммит `a5893e7c`), а `noValidate` выше устраняет остаточный silent-submit
      риск на этой форме тоже.
- [x] `08-full-product-crud` («созданный товар отображается в списке»): исправлено тем же
      `noValidate`-фиксом, что и `05` — подтверждено end-to-end локально (товар создан, редирект
      сработал, отображается в `/admin/products`).
- [x] `09-admin-order-status` (оба теста): закрыто фиксом сидинга заказа в третьем раунде ниже.
- [x] `10-integration-full-flow` (timeout на шаге 1 после создания товара): тот же путь создания
      товара, что и `08` — исправлено тем же `noValidate`-фиксом (не перепроверено отдельным полным
      прогоном Playwright, только логически через общий код-путь).

**Изменённые файлы:** [`page.tsx`](src/app/[locale]/page.tsx),
[`messages/ru.json`](messages/ru.json), [`messages/en.json`](messages/en.json),
[`checkout.schema.ts`](src/app/[locale]/(main)/checkout/_schemas/checkout.schema.ts),
[`form-simple.tsx`](../../libs/forms/src/lib/declarative/form-root/form-simple.tsx),
[`form-with-api.tsx`](../../libs/forms/src/lib/declarative/form-root/form-with-api.tsx).

Не подтверждённая находка (не признаётся багом): при тестировании через browser MCP tool
(`form_input`) созданный товар несколько раз получил `price=0` в БД — вероятно, артефакт
взаимодействия тестового инструмента с Chakra `NumberInput` (в отличие от реального Playwright
`.fill()`), а не продуктовый баг. Требует отдельной проверки при следующем e2e прогоне.

`nx lint mandala` — чисто. `nx typecheck:tsgo mandala` падает с `TS6305` на
`libs/admin-ui/dist` — предсуществующая проблема (нет build target для `@letar/admin-ui`),
не связана с этими правками; изменённый `page.tsx` отдельно проверен без ошибок typecheck.

Требуется деплой на staging + повторный e2e-прогон для подтверждения (запрос отправлен
BlackCove, thread `staging-e2e-gate-m1-batch2`).

---

### 🟡 Второй прогон на staging после фиксов выше (2026-07-23, коммит `2618f341`)

BlackCove задеплоил и прогнал e2e: **107 passed / 8 failed**. Подтвердилось частично:

- `10` — закрыт, в списке фейлов больше нет.
- `01` (переход к товару) и `09` (обе части) — как и предполагалось выше, реальные проблемы на
  staging, не флаки локального окружения.
- `05` и `08` всё ещё падали, но **по другой причине**, не связанной с `noValidate` — новые находки
  ниже.
- Новый, ранее не входивший в список фейл: `04-checkout.guest.spec.ts` (`/checkout/success`).

**Диагностировано и исправлено (2026-07-23, второй раунд):**

- [x] `05-full-checkout` (оба теста, новая причина): `getByText(/добавлено в корзину|в корзине/i)`
      matчил ОДНОВРЕМЕННО toast «Добавлено в корзину» и disabled-кнопку «В корзине» — strict-mode
      violation в самом тесте (Chakra `AddToCartButton` рендерит toast И реактивно меняет текст кнопки
      на «В корзине», оба варианта валидны в UI одновременно). Фикс — `.first()` на локаторе в
      [`05-full-checkout.guest.spec.ts`](../mandala-e2e/src/tests/05-full-checkout.guest.spec.ts) (2 места).
- [x] `07`/`08` (`waitForURL` таймаут 5000ms на `/new` после создания): оба `create*Action`
      (`create-product.action.ts`, `create-mandala.action.ts` через `createCreateAction`) уже вызывают
      `redirect()` внутри Server Action — паттерн корректный, гонки redirect'ов
      (см. [nextjs-server-action-redirect-race.md](../../.claude/docs/nextjs-server-action-redirect-race.md))
      нет. Причина — сам 5-секундный таймаут слишком тесен под параллельной e2e-нагрузкой на общий
      staging-контейнер (задокументированное поведение для этого класса гонок). Фикс — увеличен до
      15000ms в [`07-full-mandala-crud.admin.spec.ts`](../mandala-e2e/src/tests/07-full-mandala-crud.admin.spec.ts)
      и [`08-full-product-crud.admin.spec.ts`](../mandala-e2e/src/tests/08-full-product-crud.admin.spec.ts).
- [x] `09-admin-order-status` (обе части): та же категория бага, что чинилась раньше для
      `/admin/products` — `prisma/seed.ts` не создавал ни одного `Order`, поэтому таблица заказов
      пуста → рендерится `EmptyState` вместо `<table>` (см. `apps/mandala/src/app/(admin)/admin/orders/page.tsx:120`)
      → падение `getByRole('table')`. Тест `09` полагался на то, что `05-full-checkout` успеет создать
      заказ первым — хрупкая межтестовая зависимость под параллельными воркерами. Фикс — добавлен
      сидинг одного тестового заказа в [`prisma/seed.ts`](../mandala/prisma/seed.ts), `09` больше не
      зависит от результата `05`.
- [x] `04-checkout.guest.spec.ts` (`/checkout/success` без `orderId`): не воспроизводился локально
      (SSR HTML и рендер в браузере показывали текст «Заказ оформлен!» сразу, без гонки гидратации) —
      транзиентный флак под staging-нагрузкой конкретно в этом прогоне, подтверждено отсутствием
      в списке фейлов финального прогона (четвёртый раунд ниже).
- [x] `01-public-pages` («можно перейти к товару») и `09` (обе части) — закрыто сидингом
      изображений товаров в третьем раунде ниже.

**Изменённые файлы (второй раунд):**
[`prisma/seed.ts`](../mandala/prisma/seed.ts),
[`05-full-checkout.guest.spec.ts`](../mandala-e2e/src/tests/05-full-checkout.guest.spec.ts),
[`07-full-mandala-crud.admin.spec.ts`](../mandala-e2e/src/tests/07-full-mandala-crud.admin.spec.ts),
[`08-full-product-crud.admin.spec.ts`](../mandala-e2e/src/tests/08-full-product-crud.admin.spec.ts).

`nx lint mandala` и `nx lint mandala-e2e` — чисто.

---

### 🟡 Третий раунд: реальная причина 07/08/10, 01/05 (2026-07-23, после деплоя `f75a8962`)

BlackCove прогнал третий раз: **104 passed / 7 failed**. `09` — полностью зелёный (сид-фикс с
заказом сработал). Но `07`/`08` даже с увеличенным до 15000ms таймаутом всё ещё падали (значит
не вопрос скорости), `01`/`05` теперь падают на другом шаге (переход на страницу товара происходит,
но не находится `<img>`/кнопка «Добавить в корзину»).

**Локальная диагностика (несколько прогонов, production-сборка без HMR):**

1. Сначала показалось, что найден серьёзный баг: форма товара при сабмите с загруженным
   изображением иногда отправляла ПОЛНОСТЬЮ пустые данные (`name`, `slug`, `price` — все blank/0),
   что и объясняло бы зависание на `/new` (create action падал на unique constraint по
   дублирующемуся пустому `slug`). Добавил временный `console.log` в
   [`product-form.tsx`](src/app/(admin)/admin/products/_components/product-form.tsx) и
   воспроизвёл через реальный Playwright. **Опровергнуто**: баг проявлялся только в `nx dev`
   (Turbopack HMR) — я редактировал файл прямо во время прогона теста, и React Fast Refresh
   ремаунтил компонент формы, сбрасывая состояние ровно между заполнением и сабмитом. В
   продакшен-сборке (`nx build` + `nx run mandala:start`, без HMR) тест прошёл **9/9** раз подряд,
   включая под реальной параллельной нагрузкой (3 воркера, как на staging) вместе с `07`/`08`/`10`.
   HMR не участвует в проде — этот сценарий на staging невозможен.
2. **Реальная причина `07`/`08`/`10`:** таймаут `waitForURL` в `10-integration-full-flow.admin.spec.ts`
   остался старым (5000ms) — увеличил в предыдущем раунде только `07`/`08`, про `10` забыл. Под
   параллельной нагрузкой (3 воркера) именно `10` падал по этой причине; `07`/`08` с 15000ms
   проходили стабильно. Фикс — тот же таймаут 15000ms в
   [`10-integration-full-flow.admin.spec.ts`](../mandala-e2e/src/tests/10-integration-full-flow.admin.spec.ts).
3. **Реальная причина `01`/`05`:** локальная БД (и, по всей видимости, staging) захламлена
   «осиротевшими» тестовыми Product/Mandala записями от предыдущих e2e-прогонов. Playwright
   `test.describe.configure({ mode: 'serial' })` — если один тест в блоке падает, ВСЕ последующие
   шаги того же блока, включая собственный тест «Удаление», пропускаются (`did not run`) —
   созданная тестовая запись остаётся в БД навсегда. За несколько прогонов такие записи
   накапливаются и засоряют публичные списки `/shop` и `/mandalas`, откуда `01`/`05` берут «первый
   товар/первую мандалу» по `a[href^="/shop/"]`/`a[href^="/mandalas/"]`. Отдельно обнаружен
   исходный гэп: **сидированные товары (`prisma/seed.ts`) вообще не имели изображений** —
   `ProductSlider` при 0 изображений рендерит плашку «Нет изображений» без `<img>` вовсе — то есть
   даже без замусоривания «первый товар» из сида не проходил бы `01`/`05`. Фикс — сидинг теперь
   создаёт `ProductImage` для каждого товара, переиспользуя уже загруженные картинки мандал
   (`mandalasData[0..2].imageUrl` — гарантированно доступны везде, где отрабатывает сидинг мандал
   выше, в отличие от `uploads/product/*`, которые в `.gitignore` и есть только там, где реально
   что-то заливали руками).
   Гипотеза про «осиротевшие записи от прошлых серийных прогонов» не понадобилась в качестве
   фикса — см. четвёртый раунд ниже: реальных причин было ровно две (регрессия `noValidate` в
   схеме заказа + отсутствие картинок в сиде).

**Изменённые файлы (третий раунд):**
[`prisma/seed.ts`](../mandala/prisma/seed.ts) (изображения товаров),
[`10-integration-full-flow.admin.spec.ts`](../mandala-e2e/src/tests/10-integration-full-flow.admin.spec.ts)
(таймаут).

`nx lint mandala` и `nx lint mandala-e2e` — чисто.

---

### ✅ Четвёртый раунд — все 6 категорий закрыты, 41/41 локально (2026-07-23)

По просьбе пользователя скопировал по SSH с прод-сервера (s2.letar.best) недостающие в этом
рабочем дереве исходные файлы `uploads/mandalas/*` (36 файлов, 31 МБ) и `uploads/product/*` —
это разблокировало полноценный локальный сидинг мандал (до этого было 0 локально) и позволило
довести диагностику 01/05 до конца вместо гипотез.

**Реальная причина `05` («checkout с пустыми полями показывает ошибки валидации»):**
`OrderCreateFormSchema.shape.name`/`.phone` генерируются как `z.string()` — без `.min(1)`.
До фикса `noValidate` (первый раунд) единственной защитой от пустых `name`/`phone` был нативный
HTML5 `required`; после `noValidate` эта защита исчезла, а Zod-схема никогда не требовала непустую
строку — заказ с пустым именем/телефоном стал реально проходить и создаваться в БД (проверено:
редирект на `/checkout/success` с настоящим `orderId`). Это прямая регрессия от фикса первого
раунда, не флак и не тестовый баг. Фикс — `name`/`phone` в
[`checkout.schema.ts`](src/app/[locale]/(main)/checkout/_schemas/checkout.schema.ts) переопределены
с `.min(1, 'Обязательное поле')`, аналогично уже сделанному для `email`.

Заодно поймал и исправил тестовые strict-mode коллизии в
[`05-full-checkout.guest.spec.ts`](../mandala-e2e/src/tests/05-full-checkout.guest.spec.ts):
селектор `input[name="name"]` никогда не матчился — `@letar/forms` не проставляет нативный HTML
`name=` на поля, только `data-field-name` (см.
[`field-string.tsx`](../../libs/forms/src/lib/declarative/form-fields/text/field-string.tsx) —
`name={fullPath}` там уходит только в `<form.Field>` TanStack Form, не в DOM `<input>`); плюс на
странице success заголовок «Заказ оформлен!» и текст «Спасибо за ваш заказ...» оба совпадают под
`/заказ оформлен|спасибо|успешно/i` — добавлен `.first()`.

**Подтверждение `01`/`07`/`08`/`09`/`10`:** с реальными файлами мандал сидинг работает (31 мандала,
3 товара с изображениями), полный набор (`01`, `04`, `05`, `07`, `08`, `09`, `10`) прогнан
**41/41 passed** дважды подряд локально — включая под параллельной 3-воркерной нагрузкой (как на
staging) и с полностью пересозданной БД (`nx db:seed` с нуля, без накопленного мусора). Гипотеза
про «осиротевшие записи от прошлых серийных прогонов» (раздел выше) не понадобилась в качестве
фикса — реальных багов было ровно два (`noValidate`-регрессия в схеме заказа + отсутствие картинок
в сиде), после их устранения список пуст даже без ручной чистки БД.

**Изменённые файлы (четвёртый раунд):**
[`checkout.schema.ts`](src/app/[locale]/(main)/checkout/_schemas/checkout.schema.ts) (`.min(1)` для
name/phone), [`05-full-checkout.guest.spec.ts`](../mandala-e2e/src/tests/05-full-checkout.guest.spec.ts)
(`data-field-name` вместо `name=`, `.first()` на success-сообщении).

`nx lint mandala` и `nx lint mandala-e2e` — чисто. Полный e2e-набор 01/04/05/07/08/09/10 —
**41/41 passed** локально (production-сборка, с параллельной нагрузкой). Финальный деплой+прогон на
staging подтверждён.

---

### ⚠️ Ложная «регрессия» admin-раздела на staging — стейл-коммит, не новый баг (2026-07-22)

После записи выше пришёл повторный прогон с явным регрессом: **95 passed / 13 failed / 4 skipped /
11 did not run** — весь admin-UI (мандалы, товары, заказы) снова не рендерился/крашился при
навигации. Расследование (`git show 5698f885:...`) показало: e2e гонялся на коммите `5698f885`,
закоммиченном **на 5 минут раньше** фикса `a5893e7c` (§ выше). Т.е. staging был задеплоен/протестирован
на коде **до** фикса `SlugField`/`SeoField` unsubscribe-краша и до Product-сидинга — регрессии в коде
нет, просто e2e прогнали против устаревшего образа. Подтверждено напрямую: `5698f885` содержит
старый `return unsubscribe` (баг) и пустой Product-сид.

**Вывод:** фикс `a5893e7c` уже корректен и уже подтверждён прогоном 103/9 (см. выше). Новый код-фикс
не требуется — только передеплой на актуальный HEAD и повторный e2e. Запрос отправлен BlackCove
(agent-mail, thread `staging-e2e-gate-m1-batch2`, 2026-07-22 17:59) с просьбой подтвердить текущий
коммит `mandala-stage.s3.letar.best` и передеплоить при необходимости.

---

## Фазы G, D, 13 (частично), 14 (частично), 15 — критичные исправления и завершение миграции

> Перенесено из PLAN.md: 2026-08-09

**⚠️ Критичные исправления (перед тестированием)** ✅ Завершены

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

**Фаза 13: Тестирование** ✅ Основная часть завершена (v0.28.0) — 13.5/13.6 остались активными, см. PLAN.md

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

**Фаза 14: Деплой** ✅ Основная часть завершена (v0.26.0) — 14.4/14.5/14.7 остались активными, см. PLAN.md

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
- [x] 14.6. deploy-affected.sh — уже готов в монорепозитории

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

## Рефакторинг и технические улучшения (v0.30.0 — v0.36.0)

> Перенесено из PLAN.md: 2026-08-09

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
  - ⬆️ **Заменено 2026-08-04 (v0.41.0):** локальные копии оказались форком
    `@letar/image-upload`, разошедшимся с оригиналом. `image-upload-field.tsx`,
    `_hooks/use-image-upload.ts` и `_hooks/use-file-drag-drop.ts` удалены,
    приложение переведено на библиотеку — см. другой раздел выше в этом файле
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
- [ ] **Фаза 5: Пропущена (опциональная)** — разделение mega-компонентов отложено, см. PLAN.md

---

## Ключевые достижения миграции

> Перенесено из PLAN.md: 2026-08-09

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

### Стейджинг e2e — раунд 5: checkout/success race, admin-orders локатор (2026-08-12)

По итогам staging-прогона BlackCove (§18.7):

- [x] `/shop` — `export const dynamic = 'force-dynamic'` + `orderBy: [{ inStock: 'desc' }, { order:
      'asc' }]` (не сортировала товары так, чтобы «Добавить в корзину» было первым в списке видимых)
- [x] `checkout/success` — `04-checkout.guest.spec.ts` использовал `count()` на локаторе текста
      успеха; `count()` не ждёт гидратации `'use client'`-компонента внутри `<Suspense>` без
      fallback (в отличие от `toBeVisible()`), ловил 0 совпадений стабильно. Заменено на
      `expect(locator).toBeVisible()`. Коммит `10046c8c`
- [x] `admin-orders` — `04-admin-orders.spec.ts` использовал рыхлый CSS-локатор `tr a` (первая
      ссылка в DOM-порядке среди всех строк таблицы без разбора). Заменён на
      `getByRole('link', { name: /подробнее/i })`, как уже было в `09-admin-order-status.spec.ts`.
      Коммит `61f13bb8`
- [x] **`09-admin-order-status.spec.ts:38/83` — закрыто 2026-08-25.** Точечный прогон
      (deploy-agent-dev, `admin-chromium`, workers:1) прошёл чисто 4/4, включая оба спорных теста.
      Не удалось выяснить, что именно чинило регресс между 08-12 и 08-25 (код `orders-table.tsx`
      за этот период не менялся) — либо был устранён побочным эффектом другой правки, либо
      исходно был той же природы, что и находка ниже (нестабильность staging под нагрузкой), и
      просто не попал под неё в этот раз. Не тратим время на пересборку истории — трижды
      подтверждено зелёным на актуальном коммите `3bb22b2e`.

### Стейджинг e2e — раунд 6: полный прогон вскрыл нестабильность shop→product навигации (2026-08-25)

По итогам живого подтверждения hard-gate (deploy-agent-dev, тред agent-mail
`mandala-admin-orders-nav-trace`) — **не закрыто, задокументировано как открытый вопрос**:

- Полный `run_e2e` (все 3 проекта, ~120 тестов, 5-6 минут) даёт 3-5 `unexpected` в разных
  прогонах на одном и том же коммите (`3bb22b2e`) — каждый раз **разные** конкретные тесты,
  но неизменно один паттерн: `page.waitForURL` не дожидается навигации (30с) после клика по
  карточке товара / перехода в корзину / checkout (`01-public-pages`, `03-cart`,
  `04-checkout`, `05-full-checkout` — все затронуты минимум по разу). Один раз — другой тип
  сбоя (`07-full-mandala-crud.admin.spec.ts:25`, кнопка «Удалить» не появилась за 15с).
- **Изолированный прогон тех же тестов — зелёный за секунды** (10.4с на 2 теста, которые в
  полном прогоне падали дважды подряд по 30с).
- **Гипотеза «гонка Playwright-воркеров» отклонена**: `playwright.config.ts:65` жёстко
  хардкодит `workers: 1` без условия на CI — параллелизма тестраннера не было ни в одном из
  трёх прогонов (включая явный `--workers=1`, который дал результат ХУЖЕ — 5 unexpected вместо
  3). Мусорная запись `Product` (пустой slug/name, price=0, с 2026-07-23) найдена и удалена —
  тоже не была причиной (падения продолжились и без неё).
- **Рабочая гипотеза (не подтверждена):** нестабильность самого staging-окружения под
  длительной сессией (5-6 минут непрерывных запросов к единственному контейнеру s3) — пул
  соединений Postgres, ресурсы хоста, или конкуренция с другими staging-приложениями/e2e на том
  же s3 в моменты записи. Не баг конкретного компонента (`ProductCard`) — locale/`next-intl`
  redirect-петля отдельно проверена и исключена (`localePrefix: 'as-needed'`, Playwright уже
  шлёт `Accept-Language: ru-RU`, совпадающий с дефолтной локалью).
- **Решение владельца:** не гонять дальше в этой сессии — задача была про старый admin-orders
  баг (закрыт), эта находка — самостоятельный открытый вопрос. `mandala` **не добавлена** в
  `E2E_GATED_APPS`. Следующий шаг для отдельной сессии — инструментация ответа `/shop/[slug]`
  временем на стороне сервера (замер SSR-latency под нагрузкой) либо серверные логи
  `mandala-staging-app`/Postgres в момент конкретного зависшего клика (нужен `trace.zip` именно
  упавшей попытки — не удалось получить: `trace: 'on-first-retry'` с `retries: 0` вне CI-профиля
  ничего не пишет, а форсированный `--trace=on` в изоляции тест не воспроизвёл).
- [x] Побочная находка при отладке (не баг этой сессии, занесено в бэклог PLAN.md): корзина не
      валидирует товары из localStorage против БД — «призрачная» позиция с несуществующим
      `productId` тихо остаётся в корзине
- [x] Побочная находка (машинно-локальная, не коммитилась): `apps/mandala/.env.local`
      (`DATABASE_URL`) указывал на порт 5432 — чужой, давно отключённый контейнер
      `premium-rosstil-postgres` с БД, случайно тоже названной `mandala`, вместо собственного
      `mandala-dev-postgres` на 5434. Путала локальные результаты тестирования весь раунд

**Последнее обновление:** 2026-08-12
