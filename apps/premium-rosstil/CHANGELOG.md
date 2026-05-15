# Changelog

Все значимые изменения в этом проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект придерживается [Семантического Версионирования](https://semver.org/lang/ru/).

## [Unreleased]

## [0.73.4] - 2026-05-05

### Fixed

- **Навигация: страницы «не открываются»** — убран `<AnimatePresence mode="wait">` из `[locale]/template.tsx`. В Next.js 16 `template.tsx` сам полностью перемонтируется на каждой навигации, поэтому AnimatePresence не имеет старого ребёнка для exit-анимации и блокирует mount нового. Оставлена только enter-анимация через `motion.div initial → animate`
- **Хедер: одновременно «Войти» и имя залогиненного юзера** — `<AuthButton>` переписан как Server Component через `getSession()` (симметрично `<UserMenu>`). Раньше использовал client-side `useSession()` и при рассинхронизации server-cookie ↔ client-fetch обе кнопки показывались одновременно

## [0.73.3] - 2026-05-05

### Performance

- **Корзина: мгновенный отклик при SPA-навигации** — добавлен `loading.tsx` для `/cart`. Без него Next.js ждал весь Server Component (requireAuth + getCart с тяжёлыми JOIN), и URL/UI не обновлялись до завершения — пользователь думал, что корзина «не открывается» (и был вынужден открывать в новой вкладке). Теперь сразу показывается skeleton-UI

### Fixed

- **Sitemap fault-tolerant** — каждый запрос к БД (`products`/`categories`/`sellers`/`collections`) обёрнут в try/catch с fallback `[]`. Теперь билд `/sitemap.xml` не падает, если таблица отсутствует или БД временно недоступна (помогает избежать ситуации, когда `_marketplace` миграция блокирует деплой)

## [0.73.2] - 2026-05-05

### Fixed

- **Migration `20260311162047_marketplace`** — добавлен backfill для existing Product. Без backfill миграция падала на проде с PG error 23502 (`column "sellerId" of relation "Product" contains null values`), потому что `sellerId NOT NULL` добавлялся в непустую таблицу. Теперь:
  1. `sellerId` создаётся как nullable
  2. Создаётся default Seller "Премиум РосСтиль" из первого ADMIN
  3. Все Product без seller привязываются к default Seller
  4. `sellerId` финализируется как `NOT NULL`
     Перед redeploy на проде нужно `prisma migrate resolve --rolled-back 20260311162047_marketplace`

## [0.73.1] - 2026-05-05

### Fixed

- **Checkout: React error #130** на `/checkout` — заменён `<style jsx global>` в `address-input.tsx` на Chakra `css` prop с child-селекторами. styled-jsx ломался в production-сборке Next.js 16 + Turbopack, из-за чего рендер падал и срабатывал `error.tsx`

## [0.73.0] - 2026-04-04

### Added

- FormI18nProvider с `locale="ru"` для русскоязычных форм
- Юридические документы по ФЗ-289

### Fixed

- Lint fixes

## [0.72.1] - 2026-03-11

### Доработка юридических документов маркетплейса

**Changed:**

- **terms** — добавлена ссылка на ФЗ-289 «О платформенной экономике» (п.1.4), процедура жалоб на продавцов (п.8.4–8.7), условия приостановки и удаления аккаунта (п.3.5–3.7)
- **seller-agreement** — добавлен перечень запрещённых товаров (п.4.2–4.3), ограничение ответственности перед продавцами (п.14.3–14.4), уточнён escrow через ЮKassa (п.7.1)
- **returns** — уточнено хранение escrow-средств в уполномоченном банке (п.9.1), добавлен альтернативный способ возврата при сбое ЮKassa (п.6.4)
- **offer** — добавлена ссылка на процедуру жалоб из Пользовательского соглашения (п.11.4)
- **Все документы** — обновлена дата редакции (3 марта → 11 марта 2026 г.)

## [0.70.0] - 2026-03-03

### Тестирование: Фаза 5 — Zod-схемы + E2E каталог

**Added:**

- **Unit: Zod-схемы** — 5 файлов тестов: checkout-form (32), seller-application (25), review (19), payout-request (17), return-request (14)
- **E2E: Каталог** — 5 файлов: коллекции, рекомендации, недавно просмотренные, infinite scroll, уведомления о наличии

## [0.69.0] - 2026-03-03

### Тестирование: Фаза 4 — Интеграционные E2E

**Added:**

- **E2E: Интеграционные тесты** — 6 файлов (41 тест): order-flow (rewritten), seller-flow, reviews-flow, returns-flow, loyalty-flow, promo-codes
- Тесты используют `auth.fixture` для `userPage`/`adminPage` (API-based auth, ~100ms)

## [0.68.0] - 2026-03-03

### Тестирование: Фаза 3 — Маркетплейс и продавцы

**Added:**

- **Unit: Маркетплейс** — 8 файлов (74 теста): submit/manage-application, create-seller-product, update-sub-order, create-payout-request, process-payouts, newsletter, stock-notifications

## [0.67.0] - 2026-03-03

### Тестирование: Фаза 2 — Пользовательские потоки

**Added:**

- **Unit: Корзина** — 3 файла (27 тестов): add-to-cart, update-cart-item, remove-from-cart
- **Unit: Отзывы** — 4 файла (52 теста): create-review, respond-review, manage-review, review-utils
- **Unit: Возвраты** — 2 файла (37 тестов): create-return, manage-return

## [0.66.0] - 2026-03-03

### Тестирование: Фаза 1 — Критическая бизнес-логика

**Added:**

- **Unit: Бизнес-логика** — 6 файлов (159 тестов): loyalty (pure), yookassa, validate-promo, create-order, yookassa webhook, loyalty actions
- **Инфраструктура тестирования** — action-test-helpers, vitest.setup моки, E2E хелперы (page, locators, form)

## [0.65.0] - 2026-03-03

### Адаптация для планшетов + Visual Regression тесты

**Added:**

- **Visual regression тесты** — Playwright `toHaveScreenshot()` для 9 ключевых страниц (десктоп, планшет, мобильный)
- Проект `visual-chromium` в playwright.config.ts

**Improved:**

- **Каталог** — сетка товаров: 2 колонки на md (768px), 3 на lg (1024px), 4 на xl (1280px+)
- **Страница товара** — 2-колоночная раскладка (галерея + детали) активируется с md вместо lg
- **Профиль layout** — sidebar виден с md (220px), расширяется до 280px на lg
- **Продавец layout** — sidebar виден с md (200px), расширяется до 240px на lg
- **ProductButtons** — justify `center` на мобилке, `flex-start` на планшете (убран `space-around`)

## [0.64.0] - 2026-03-03

### Infinite Scroll для каталога

**Added:**

- **products-infinite-scroll.tsx** — компонент бесконечной прокрутки с `useInfiniteQuery` + IntersectionObserver
- **view-mode-toggle.tsx** — переключатель: пагинация (по умолчанию) ↔ бесконечная прокрутка (`?view=scroll`)
- Автозагрузка следующей страницы при приближении к концу списка (rootMargin 200px)
- Кнопка «Загрузить ещё» как fallback для автозагрузки
- Счётчик «Показано X из Y товаров» в конце списка
- Кэширование загруженных страниц (staleTime 2 мин, как у пагинации)

**Changed:**

- **products-list-client.tsx** — рефакторинг: выделен `ProductsPaginatedView`, добавлен условный рендер по URL-параметру `view`

## [0.63.0] - 2026-03-03

### Accessibility (a11y) + Микроанимации

**Improved:**

- **IconButton** — добавлены `aria-label` для кнопки мобильного меню и кнопки телефона в header
- **variant-selector** — `role="button"`, `tabIndex`, `aria-label`, `aria-pressed`, `onKeyDown` (Enter/Space), `_focusVisible`
- **size-selector** — `role="button"`, `tabIndex`, `aria-label`, `aria-pressed`, `aria-disabled`, `onKeyDown`, `_focusVisible`
- **image-gallery** — главное фото и миниатюры: `role="button"`, `tabIndex`, `aria-label`, `onKeyDown`, `_focusVisible`
- **review-form (StarSelector)** — `role="radiogroup"` + `role="radio"`, навигация стрелками (ArrowLeft/ArrowRight), `_focusVisible`

**Added:**

- **Микроанимация heartPulse** — пульсация сердечка при добавлении в избранное (карточка товара + страница товара)

## [0.62.0] - 2026-03-03

### Оптимизация производительности и тесты

**Improved:**

- **React `cache()`** — дедупликация запроса продукта между `generateMetadata` и page (экономия 1 DB-запроса на каждый просмотр)
- **Параллелизация auth-запросов** — 5 последовательных запросов (wishlist, measurements, company, profile, stockNotifications) объединены в `Promise.all`
- Вынесена `getProduct` утилита в `_lib/get-product.ts` с React cache

**Added:**

- **Unit тесты** для `buildCatalogWhere` — 17 тестов: все фильтры, комбинации (цвет+размер+цена), пустые/falsy параметры

## [0.61.0] - 2026-03-03

### TanStack Query для каталога

**Improved:**

- **Каталог товаров** — миграция ProductsList на TanStack Query с SSR гидратацией
- `keepPreviousData` — без мерцания при смене фильтров/страниц
- Кэш 2 минуты — мгновенная навигация назад к предыдущим результатам
- Извлечена `buildCatalogWhere` утилита — устранено дублирование логики фильтрации
- Server action `fetchCatalogProducts` — единая точка загрузки данных каталога
- ProductsList: 272 строки → 30 строк (тонкая SSR-обёртка + клиентский компонент)

## [0.60.0] - 2026-03-03

### Унификация auth форм на PremiumRosstilForm

**Improved:**

- **Sign-in форма** — рефакторинг с 7 useState на PremiumRosstilForm (встроенная валидация, loading, error handling)
- **Register форма** — рефакторинг с 5 useState на PremiumRosstilForm + PasswordStrength + Alert при успехе
- Единый паттерн PremiumRosstilForm для всех форм приложения

## [0.59.0] - 2026-03-03

### Admin useOptimistic toggle

**Improved:**

- **useOptimistic** для toggle «Новая коллекция» в admin product card — мгновенное переключение с автоматическим rollback при ошибке
- **Мобильная версия** — switch «Новинка» теперь доступен и на мобильных устройствах

## [0.58.0] - 2026-03-03

### Lookbook / Коллекции

**Added:**

- **Модели** `Collection`, `CollectionProduct` с enum `Season` (SPRING_SUMMER/FALL_WINTER/CRUISE/ALL_SEASON)
- **Публичная страница** `/collections` — карточки коллекций с обложками и описаниями
- **Детальная страница** `/collections/[slug]` — товары коллекции с ценами и изображениями
- **Admin страница** `/admin/collections` — таблица коллекций со статусами (черновик/опубликована)
- **Навигация** — пункт «Коллекции» в главном меню сайта
- **SEO** — коллекции добавлены в sitemap.xml

## [0.57.0] - 2026-03-03

### Предзаказы

**Added:**

- **Поля** `isPreOrder` и `availableFrom` в ProductItem
- **Статус** `PREORDER` в OrderStatus — автоматически при предзаказных товарах в корзине
- **Бейдж** «Предзаказ» с датой поступления на странице товара
- **Кнопка** «Предзаказ» вместо «В корзину» для предзаказных товаров
- **Order status badge** обновлён в профиле и админ-панели (PREORDER = purple)
- Предзаказные товары не уменьшают остатки при оформлении заказа

## [0.56.0] - 2026-03-03

### Программа лояльности

**Added:**

- **Модели БД** — `LoyaltyAccount` (баланс, уровень, totalEarned), `LoyaltyTransaction` (история операций)
- **Enum'ы** — `LoyaltyLevel` (BRONZE/SILVER/GOLD), `LoyaltyTransactionType` (EARN/SPEND/ADJUSTMENT)
- **Утилиты** `src/lib/loyalty.ts` — пороги уровней, кэшбэк (3%/5%/7%), расчёт баллов, лимиты списания
- **Server actions** `earnLoyaltyPoints` / `spendLoyaltyPoints` — начисление при доставке, списание при оформлении
- **Страница профиля** `/profile/loyalty` — карточка лояльности с прогрессом до следующего уровня, история транзакций
- **Виджет checkout** `LoyaltyPointsInput` — слайдер + поле ввода для списания баллов (до 50% от суммы)
- **Admin страница** `/admin/loyalty` — статистика и таблица участников программы
- **Интеграция** — поля `loyaltyPointsUsed`/`loyaltyPointsEarned` в Order, автоначисление при DELIVERED

## [0.55.0] - 2026-03-03

### Email-рассылка

**Added:**

- **Модель `NewsletterSubscriber`** — подписка на рассылку (email, unsubToken, привязка к User)
- **Форма подписки в футере** — email-поле с кнопкой, валидация, дедупликация, реактивация
- **Server actions** `subscribeToNewsletter` / `unsubscribeFromNewsletter` — подписка/отписка по токену
- **Страница отписки** `/unsubscribe?token=...` — отписка по уникальной ссылке из email
- **Admin страница** `/admin/newsletter` — таблица подписчиков с фильтрами и статусами
- **Quick action** «Рассылка» в admin dashboard

## [0.54.0] - 2026-03-03

### SEO оптимизация

**Added:**

- **sitemap.xml** — динамический sitemap с товарами, категориями, магазинами, статическими страницами
- **robots.txt** — разрешает индексацию публичных страниц, блокирует admin/profile/api
- **JSON-LD Product** — schema.org разметка на страницах товаров (цена, наличие, рейтинг, продавец)
- **JSON-LD Organization** — schema.org разметка организации в layout
- **Meta title template** — `%s — Премиум РосСтиль` для всех страниц
- **Canonical URLs** — через `alternates.canonical` в metadata
- **OpenGraph улучшения** — type, locale, siteName

## [0.53.0] - 2026-03-03

### Подписка на уведомления о поступлении

**Added:**

- **Модель `StockNotification`** — подписка пользователя на уведомление о конкретном ProductItem
- **Кнопка «Сообщить о поступлении»** — появляется на странице товара, когда выбранный размер недоступен
- **Server actions** `subscribeToStockNotification` / `unsubscribeFromStockNotification` — подписка/отписка
- **Email-уведомление** — HTML-шаблон «Товар снова в наличии» с кнопкой перехода
- **Cron `/api/cron/stock-notifications`** — проверяет наличие товара и отправляет email подписчикам
- **Карточка «Ожидают товар»** в admin dashboard с подсчётом активных подписок

## [0.52.0] - 2026-03-03

### Промокоды и скидки

**Added:**

- **Модель `Promo`** — процентные и фиксированные скидки, условия по дате, минимум заказа, лимит использований
- **Admin CRUD** `/admin/promos` — создание, редактирование, удаление, toggle активности
- **Поле промокода в checkout** — ввод кода при оформлении заказа
- **Валидация промокода** — проверка срока, лимитов, минимума, использования на пользователя
- **Server action `validatePromo`** — preview скидки в реальном времени
- **Карточка "Промокоды"** в admin dashboard с подсчётом активных
- **Поля `promoId`, `discountAmount`** в модели Order

## [0.51.0] - 2026-03-03

### ЮKassa Refund API

**Added:**

- **Автоматический возврат средств** — при переходе RECEIVED → REFUNDED вызывается ЮKassa Refund API (POST /v3/refunds)
- **Корректировка баланса продавца** — пропорциональный вычет sellerAmount из pendingAmount при возврате
- **Восстановление остатков** — availableCount товаров восстанавливается при возврате
- **Обновление SubOrder** — статус переводится в RETURNED при возврате средств
- **Обработка ошибок** — если ЮKassa отклоняет refund, возврат не помечается как завершённый

## [0.50.0] - 2026-03-03

### История просмотров

**Added:**

- **Хук `useRecentlyViewed`** — localStorage с LRU-стратегией (макс. 20 записей), автоматическое перемещение повторных просмотров наверх
- **Трекинг просмотров** — автоматическая запись при посещении страницы товара
- **Server action `getProductsByIds`** — загрузка товаров по массиву ID с wishlist и сериализацией
- **Виджет "Недавно просмотренные" на главной** — макс. 4 товара, скрывается если история пуста
- **Страница "Просмотренные" в профиле** `/profile/recently-viewed` — все 20 товаров, кнопка "Очистить историю", empty state
- **Навигация** — пункт "Просмотренные" (FaHistory) в профиле после "Избранное"

## [0.49.0] - 2026-03-03

### Рекомендации товаров

**Added:**

- **"Похожие товары"** на странице товара — по категории и полу с fallback по рейтингу
- **"Вам может понравиться"** на главной — персонализация по wishlist (авторизован) или топ по рейтингу (гость)
- **"Может пригодиться"** в корзине — рекомендации на основе товаров в корзине
- **Утилита `recommendation-utils.ts`** — единая функция `getRecommendedProducts()` с fallback-стратегией, `getWishlistVariantIds()` для реюза

## [0.48.0] - 2026-03-03

### Отзывы и рейтинги

**Added:**

- **Модель Review** в schema.zmodel — рейтинг 1-5, текст, фото (до 3), статусы (PUBLISHED/HIDDEN/DELETED)
- **Создание отзыва** `/profile/orders/[orderNumber]/review/` — форма с звёздами, текстом и защитой:
  - Проверка покупки (DELIVERED/COMPLETED SubOrder)
  - Минимум 1 день после доставки
  - Rate limit: макс 3 отзыва в день
  - Один отзыв на товар от покупателя (`@@unique([authorId, productId])`)
- **Отображение отзывов** на странице товара `/catalog/[id]` — сводка рейтинга с распределением по звёздам, карточки отзывов
- **Ответы продавца** `/seller/reviews/` — inline-форма ответа на отзывы к своим товарам
- **Админ-модерация** `/admin/reviews/` — таблица с фильтрами по статусу, скрытие/публикация/удаление отзывов
- **Агрегированные рейтинги** — averageRating и reviewCount на Product и Seller, автопересчёт при изменениях
- **Мини-рейтинг на карточке товара** — звезда + оценка под ценой
- **Рейтинг продавца** в шапке магазина `/shop/[slug]`
- **Карточка "Отзывы"** на dashboard админа и продавца
- **Навигация** — пункт "Отзывы" в панели продавца

## [0.47.0] - 2026-03-03

### Маркетплейс — Фаза 7: Возвраты и защита покупателя

**Added:**

- **Форма возврата** `/profile/orders/[orderNumber]/return/` — покупатель выбирает подзаказ, причину, описание проблемы
- **Админ-панель возвратов** `/admin/returns/` — список возвратов с фильтрацией по статусу, детальная страница с одобрением/отклонением
- **Управление статусами возвратов** — полный flow: REQUESTED → APPROVED → SHIPPED_BACK → RECEIVED → REFUNDED
- **Панель возвратов для продавца** `/seller/returns/` — просмотр возвратов по своим подзаказам
- **Кнопка "Оформить возврат"** на странице доставленного заказа
- **Карточка "Возвраты"** на dashboard админа с счётчиком ожидающих рассмотрения
- **Ссылка "Возвраты"** в навигации продавца и quick actions админа

## [0.46.0] - 2026-03-03

### Маркетплейс — Фаза 6: Уведомления для продавцов

**Added:**

- **`seller-notifications.ts`** — единый модуль Email + Telegram уведомлений для продавцов:
  - Новый подзаказ (товары, суммы, комиссия, доход)
  - Одобрение заявки (ссылка на панель продавца)
  - Отклонение заявки (причина + ссылка на повторную подачу)
  - Выплата выполнена (сумма, дата)
- **Интеграция с ЮKassa webhook** — уведомления продавцам при успешной оплате (fire-and-forget)
- **Интеграция с одобрением/отклонением заявок** — автоматическая отправка email при обработке заявки

## [0.45.0] - 2026-03-03

### Маркетплейс — Фаза 5: Расширение админ-панели

**Added:**

- **Управление продавцами** `/admin/sellers` — табы "Продавцы" (таблица: магазин, владелец, статус, комиссия, товары, заказы) и "Заявки" (таблица + одобрение/отклонение)
- **Одобрение заявок** — `manage-application.ts`: транзакция создаёт Seller, SellerBalance, обновляет User.role → SELLER; отклонение с причиной
- **Финансовый отчёт** `/admin/finances` — сводные карточки (комиссия, доступно к выплате, ожидает, заморожено), таблица балансов продавцов, запросы на выплату, история выплат
- **Dashboard карточки** — "Продавцы" с бейджем заявок + "Комиссия" с общей суммой, быстрые ссылки на продавцов и финансы

## [0.44.0] - 2026-03-03

### Маркетплейс — Фаза 4: Каталог + страница магазина

**Added:**

- **Имя продавца в карточке товара** — `product-card.tsx` отображает `seller.shopName` под названием товара
- **Фильтр по продавцу** — URL-параметр `?seller=slug` в каталоге для фильтрации товаров одного продавца
- **Блок "О продавце"** на странице товара — shopName, description, ссылки на магазин и все товары продавца
- **Страница магазина** `/shop/[slug]` — шапка с информацией, сетка товаров с пагинацией
- **Форма подачи заявки** `/become-seller` — заявка на продавца (SellerApplication):
  - Валидация через Zod v4 (shopName, contactEmail, contactPhone, ИНН, ОГРН)
  - Проверка дубликатов (одна активная заявка на пользователя)
  - Отображение статуса: на рассмотрении / одобрена / отклонена (с причиной)
  - Предзаполнение email и телефона из профиля пользователя

**Changed:**

- `products-list.tsx` — добавлен include seller в запрос, prop `seller` для фильтрации
- `catalog/page.tsx` — добавлен URL-параметр `seller` в searchParams и where-условие
- `catalog/[id]/page.tsx` — загрузка seller данных через include, рендеринг блока продавца

**Files (7 новых, 4 изменённых):**

- `src/app/[locale]/shop/[slug]/page.tsx` — страница магазина
- `src/app/[locale]/become-seller/page.tsx` — форма подачи заявки
- `src/app/[locale]/become-seller/_actions/submit-application.ts`
- `src/app/[locale]/become-seller/_schemas/seller-application.schema.ts`
- `src/app/[locale]/become-seller/_components/application-form.tsx`
- `src/app/[locale]/catalog/_components/product-card.tsx` — + seller prop
- `src/app/[locale]/catalog/_components/products-list.tsx` — + seller filter

---

## [0.43.0] - 2026-03-03

### Маркетплейс — Фаза 3: Checkout + интеграция ЮKassa

**Added:**

- **ЮKassa HTTP клиент** (`src/lib/yookassa.ts`) — создание платежа, проверка статуса, возврат. Через fetch, без SDK. Верификация IP webhook'ов по CIDR.
- **Webhook** (`/api/webhooks/yookassa`) — обработка уведомлений:
  - `payment.succeeded` → подтверждение заказа, SubOrders → PAID, начисление pendingAmount продавцу
  - `payment.canceled` → отмена заказа, восстановление остатков товаров
  - `refund.succeeded` → обновление статуса Payment
- **Cron** (`/api/cron/process-payouts`) — автоматический перевод средств из pending в available после истечения protection period (7 дней после доставки)
- **Квест юридических документов** в PLAN.md — исследование + 6 обязательных документов

**Changed:**

- **create-order.ts** — полная переработка для маркетплейса:
  - Группировка товаров корзины по продавцам (sellerId)
  - Создание SubOrder и SubOrderItem для каждого продавца
  - Снимок комиссии (commissionRate) и расчёт sellerAmount
  - Создание Payment + вызов ЮKassa API
  - Редирект на страницу оплаты ЮKassa
  - Fallback на старый flow если ЮKassa не настроена
- **Checkout success page** — отображение статуса оплаты (успех/ожидание/отмена), кнопка "Перейти к оплате" для незавершённых платежей

**Environment:**

- `YOOKASSA_SHOP_ID` — ID магазина в ЮKassa
- `YOOKASSA_SECRET_KEY` — секретный ключ API
- `CRON_SECRET` — токен для защиты cron endpoints

---

## [0.42.0] - 2026-03-03

### Маркетплейс — Фаза 2: Панель продавца + миграция данных

**Added:**

- **Скрипт миграции данных** (`prisma/seed-seller.ts`) — создание Seller-профиля для ADMIN, привязка всех товаров к продавцу, создание SellerBalance
- **Панель продавца** `/seller/*` — полноценная панель для управления магазином:
  - **Dashboard** — статистика: товары, заказы, доступный баланс, ожидаемые выплаты
  - **Товары** — CRUD: список товаров с поиском, создание, редактирование (реюз `ProductForm`)
  - **Заказы** (SubOrders) — список подзаказов с фильтрацией по статусу, детали заказа, отправка (tracking number)
  - **Финансы** — баланс (доступно/ожидает/заморожено), запрос выплаты с чеком для самозанятых, история
  - **Настройки** — профиль магазина (11 полей: название, описание, контакты, ИНН, реквизиты)
- **Select-компоненты** для маркетплейс-enum'ов: SellerStatus, SubOrderStatus, ApplicationStatus, PayoutRequestStatus
- **Labels** для всех маркетплейс-enum'ов (7 справочников)

**Changed:**

- `Product.sellerId` — сделан обязательным (String вместо String?)
- `create-product.ts` / `update-product.ts` — разрешён доступ для SELLER, автопривязка sellerId
- `premium-rosstil-form.tsx` — зарегистрированы 4 новых Select-компонента

**Files (35 новых/изменённых):**

- `prisma/seed-seller.ts` — миграция данных
- `schema.zmodel` — sellerId обязательный
- `src/app/[locale]/seller/` — layout, dashboard, products, orders, finances, settings (20+ файлов)
- `src/premium-rosstil-form/` — selects + labels

---

## [0.41.0] - 2026-03-02

### Маркетплейс — Фазы 0-1: Схема данных + инфраструктура

**Added:**

- **Роль SELLER** в UserRole enum
- **9 новых моделей** в schema.zmodel: Seller, SellerApplication, SubOrder, SubOrderItem, Payment, Payout, PayoutRequest, SellerBalance, Return
- **8 новых enum'ов**: SellerStatus, ApplicationStatus, SubOrderStatus, PaymentStatus, PayoutStatus, ReturnStatus, SellerTaxSystem, PayoutRequestStatus
- **Access policies** для всех новых моделей (ZenStack)
- `requireSeller()` в auth.ts — проверка роли SELLER/ADMIN
- Разрешение загрузки изображений для SELLER

**Changed:**

- `Product` — добавлен `sellerId` (опциональный на этой фазе)
- `Order` — добавлена связь с SubOrders и Payments
- `User` — добавлены связи с Seller и SellerApplication

---

## [0.40.0] - 2026-03-02

### Завершение Фазы 1 MVP

**Added:**

- **Сохранение фильтров каталога в localStorage** — при повторном входе на `/catalog` фильтры восстанавливаются из localStorage (если URL-параметры отсутствуют). Поисковый запрос и страница не сохраняются.
- **Подсказки при вводе (autocomplete)** — при вводе 2+ символов в поиске появляется dropdown с подсказками товаров. API route `GET /api/search/suggestions`, хук `useSearchSuggestions`, UI для desktop и mobile.
- **Уведомление админа о низких остатках** — после создания заказа проверяются остатки купленных товаров; если ≤ порога (`LOW_STOCK_THRESHOLD`, по умолчанию 5), отправляются уведомления через Telegram и Email (fire-and-forget).

**Files:**

- `catalog-filters.tsx` — `useLocalStorage` для persist/restore фильтров
- `header-search.tsx` — autocomplete dropdown с подсказками
- `src/hooks/use-search-suggestions.ts` — новый хук (debounce 250ms)
- `src/app/api/search/suggestions/route.ts` — новый API route
- `telegram-notify.ts` — `LowStockItem`, `sendLowStockTelegramNotification`
- `order-emails.ts` — `sendLowStockAdminNotification` + HTML/text шаблоны
- `create-order.ts` — проверка остатков после транзакции

---

## [0.39.3] - 2026-01-19

### Рефакторинг на @letar/auth

**Changed:**

- `connected-accounts-list.tsx` — переписан как обёртка над `ConnectedAccountsList` из `@letar/auth`
  - Сохранён `TelegramLinkButton` как `telegramWidget` prop
  - Удалено ~150 строк дублирующегося кода
- `unlink-account.ts` — использует `createUnlinkAccountAction` из `@letar/auth`
  - Удалено ~80 строк кода

**Dependencies:**

- Добавлена зависимость от `@letar/auth@0.2.0`

---

## [0.39.2] - 2026-01-16

### Исправлено

- **Оптимизация памяти** — устранены утечки памяти для снижения потребления ~400-700MB
  - Connection Pool: добавлены лимиты (max: 20, idleTimeout: 30s) в `db.ts`
  - File serving: переписан на streaming вместо загрузки файла в память
  - OG-image: явная очистка буферов после обработки Sharp
  - Avatar upload: очистка canvas и event listeners после использования

---

## [0.39.0] - 2026-01-03

### Добавлено

- **Оптимистичные обновления (useOptimistic)** — мгновенный отклик UI без ожидания сервера
  - Корзина: изменение количества товара
  - Корзина: добавление товара
  - Wishlist: toggle в карточке товара
  - Wishlist: toggle на странице товара

- **Фильтр по цене** в каталоге товаров
  - Двойной Slider для выбора диапазона
  - NumberInput для точного ввода значений
  - Синхронизация slider ↔ input
  - URL параметры `?minPrice=` и `?maxPrice=`

- **Mega Menu для категорий**
  - Dropdown меню при наведении на "Каталог"
  - Быстрый доступ: Все товары, Новинки, Женское
  - Сетка категорий из базы данных
  - Server Component для загрузки категорий

---

## [0.38.0] - 2026-01-03

### Добавлено

- **Полнотекстовый поиск товаров** — header search с Popover результатами
- **Отображение остатков** — информация о наличии товара на складе
- **Фильтр по цвету** — выбор цветов с визуальными индикаторами
- **Фильтр по размеру** — multi-select по доступным размерам

---

## [0.37.3] - 2026-01-03

### Добавлено

- **Swipe для галереи изображений товара** — листание фото пальцем на мобильных устройствах
  - Touch события (onTouchStart/onTouchEnd) для навигации
  - Порог 50px для распознавания свайпа
  - Работает совместно со стрелками навигации

---

## [0.37.2] - 2026-01-03

### Добавлено

- **Кнопка авторизации в мобильном header** — неавторизованным пользователям показывается кнопка "Войти" вместо иконки телефона
- **Fallback проп в OnlyFor** — компонент OnlyFor теперь поддерживает `fallback` для отображения альтернативного контента

---

## [0.37.1] - 2025-12-22

### Изменено

- **Миграция measurements-form на PremiumRosstilForm** — форма измерений переведена на декларативный API с Zod валидацией

---

## [0.37.0] - 2025-12-19

### Добавлено

- **Автосохранение адреса при оформлении заказа** — если пользователь вводит новый адрес, показывается галочка "Сохранить в мои адреса" (отмечена по умолчанию), адрес сохраняется в профиле пользователя

### Исправлено

- Добавлены недостающие env переменные в docker-compose
- Добавлен console transport для логов в production
- Исправлен баг с посимвольным логированием messageId

---

## [0.36.0] - 2025-12-15

### Добавлено

- **Админ-панель для заказов из корзины** (`/admin/orders`)
  - Список всех заказов с фильтрацией по статусу и дате
  - Поиск по номеру заказа, имени клиента
  - Детальный просмотр заказа
  - Изменение статуса заказа
  - Email уведомления о смене статуса
  - Уведомления о новых заказах (Email, Telegram)
  - Страница статистики заказов
  - Экспорт заказов в Excel

---

## [0.35.0] - 2025-12-08

### Добавлено

- **Стрелки навигации в галерее изображений товара**:
  - Стрелки влево/вправо на большом фото для листания изображений
  - Циклическая навигация (после последнего идёт первое)
  - Индикатор загрузки (спиннер) при смене изображения
  - Стрелки отображаются только если больше одного фото

- **E2E тесты для галереи**:
  - Тест наличия стрелок навигации
  - Тест клика на правую стрелку
  - Тест клика на левую стрелку
  - Тест циклической навигации

## [0.31.0] - 2025-12-06

### Добавлено

- **Интернационализация (i18n)**: настроен next-intl с поддержкой русского языка
  - Все страницы перемещены в `src/app/[locale]/`
  - Middleware для автоматического определения локали
  - Роутинг через `src/i18n/routing.ts`
  - Создана структура файлов переводов в `messages/`

- **Переключение тем (light/dark)**:
  - Библиотека `@letar/chakra-provider` доработана с поддержкой next-themes
  - `ColorModeProvider` - обёртка над ThemeProvider из next-themes
  - `useColorMode()` - хук для управления темой
  - `ColorModeButton` - кнопка переключения light/dark
  - `ColorModeSelect` - выбор light/system/dark
  - Кнопка переключения тем добавлена в header и мобильное меню

### Изменено

- Обновлён `@letar/chakra-provider` с экспортом компонентов для работы с темой
- Header теперь использует токен `bg={'bg'}` вместо жёстко заданного `bg={'white'}`

## [0.30.0] - 2025-12-03

### Добавлено

- **Централизованное управление изображениями**:
  - Модель `Image` с метаданными (filename, path, mimeType, size, width, height)
  - Enum `ImageCategory`: PRODUCT, AVATAR, REFERENCE, NOTIFICATION
  - Админ-панель `/admin/images` с таблицей, статистикой, фильтрами
  - Синхронизация: обнаружение сиротских файлов и битых записей
  - API эндпоинты: `/api/images/[id]`, обновлённый `/api/upload`

### Изменено

- Связи VariantImage, UserProfile, CustomOrder теперь используют модель Image
- Хелпер `get-image-url.ts` для получения URL изображений

## [0.29.0] - 2025-12-02

### Добавлено

- **Push-уведомления** (Web Push API):
  - Подписка/отписка с UI компонентом
  - Настройка категорий: новые товары, статус заказа, акции
  - Service Worker для получения уведомлений
  - VAPID ключи для безопасной отправки

## [0.28.0] - 2025-12-01

### Добавлено

- **Индивидуальные заказы (Custom Orders)**:
  - 3 типа заказов: MADE_TO_ORDER, CUSTOM_DESIGN, B2B_PARTNERSHIP
  - Загрузка фото-ориентиров (до 5 фото, drag & drop)
  - Интерактивная таблица размеров для B2B
  - Email и Telegram уведомления при создании/смене статуса

- **Профиль компании (B2B)**:
  - Сохранение реквизитов компании
  - Автозаполнение при создании B2B заказов

## [0.27.0] - 2025-11-30

### Добавлено

- **PWA манифест** с иконками и скриншотами
- **Service Worker** для базовой поддержки PWA

## Ранние версии

Детальный changelog для версий до 0.27.0 не велся.
Основные функции реализованные до этого:

- E-commerce: каталог, корзина, checkout, заказы
- Профиль пользователя: данные, измерения, адреса, избранное
- Аутентификация: email/password, OAuth (Yandex, Telegram)
- Админ-панель: товары, размеры, пользователи
- Информационные страницы: о бренде, контакты, доставка

---

[0.35.0]: https://github.com/your-repo/compare/v0.31.0...v0.35.0
[0.31.0]: https://github.com/your-repo/compare/v0.30.0...v0.31.0
[0.30.0]: https://github.com/your-repo/compare/v0.29.0...v0.30.0
[0.29.0]: https://github.com/your-repo/compare/v0.28.0...v0.29.0
[0.28.0]: https://github.com/your-repo/compare/v0.27.0...v0.28.0
[0.27.0]: https://github.com/your-repo/releases/tag/v0.27.0
