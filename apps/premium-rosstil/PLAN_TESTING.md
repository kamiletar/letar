# План тестирования — Premium Rosstil

> **Версия:** 0.70.0 | **Обновлено:** 2026-03-03
>
> **Связанные документы:** [PLAN.md](./PLAN.md) | [CHANGELOG.md](./CHANGELOG.md)

---

## Текущее покрытие

### Unit-тесты (45 файлов, ~793+ тестов)

| Файл                                    | Тестов | Что покрывает                                 |
| --------------------------------------- | ------ | --------------------------------------------- |
| `product-size-form.schema.test.ts`      | 97     | Zod-схема размеров (админ)                    |
| `validations/product.test.ts`           | 88     | Zod-схема товаров                             |
| `validations/product-size.test.ts`      | 82     | Zod-схема размеров                            |
| `item-form.schema.test.ts`              | 61     | Zod-схема SKU (админ)                         |
| `email-templates.test.ts`               | 56     | HTML шаблоны верификации и сброса пароля      |
| `slugify.test.ts`                       | 47     | Транслитерация, генерация slug                |
| `variant-form.schema.test.ts`           | 38     | Zod-схема вариантов (админ)                   |
| **`create-order.test.ts`**              | **35** | **Создание заказа (Фаза 1)** ✅               |
| **`loyalty.test.ts` (lib)**             | **30** | **Pure-функции лояльности (Фаза 1)** ✅       |
| **`manage-return.test.ts`**             | **25** | **Управление возвратами (Фаза 2)** ✅         |
| `upload/route.test.ts`                  | 25     | Upload API (placeholders)                     |
| **`route.test.ts` (webhook)**           | **25** | **Webhook ЮKassa (Фаза 1)** ✅                |
| **`yookassa.test.ts`**                  | **25** | **ЮKassa API + IP (Фаза 1)** ✅               |
| **`loyalty.test.ts` (actions)**         | **22** | **Loyalty actions (Фаза 1)** ✅               |
| `build-catalog-where.test.ts`           | 22     | Фильтры каталога                              |
| **`validate-promo.test.ts`**            | **22** | **Валидация промокодов (Фаза 1)** ✅          |
| `only-for.test.tsx`                     | 20     | Role-based visibility                         |
| `format.test.ts`                        | 20     | Форматирование телефонов                      |
| `rate-limit.test.ts`                    | 19     | Rate limiting                                 |
| **`manage-review.test.ts`**             | **16** | **Модерация отзывов (Фаза 2)** ✅             |
| **`create-review.test.ts`**             | **15** | **Создание отзывов (Фаза 2)** ✅              |
| **`add-to-cart.test.ts`**               | **13** | **Добавление в корзину (Фаза 2)** ✅          |
| `db.test.ts`                            | 13     | Prisma client, getEnhancedPrisma              |
| **`create-return.test.ts`**             | **12** | **Создание возврата (Фаза 2)** ✅             |
| `product-card.test.tsx`                 | 12     | Карточка товара                               |
| **`respond-review.test.ts`**            | **11** | **Ответ продавца на отзыв (Фаза 2)** ✅       |
| **`review-utils.test.ts`**              | **10** | **Пересчёт рейтингов (Фаза 2)** ✅            |
| `user-menu.test.tsx`                    | 9      | Меню пользователя                             |
| **`update-cart-item.test.ts`**          | **8**  | **Обновление корзины (Фаза 2)** ✅            |
| `auth-button.test.tsx`                  | 8      | Кнопка авторизации                            |
| `tokens.test.ts`                        | 8      | Генерация токенов                             |
| **`remove-from-cart.test.ts`**          | **6**  | **Удаление из корзины (Фаза 2)** ✅           |
| **`manage-application.test.ts`**        | **16** | **Управление заявками продавцов (Фаза 3)** ✅ |
| **`newsletter.test.ts`**                | **10** | **Подписка/отписка рассылки (Фаза 3)** ✅     |
| **`submit-application.test.ts`**        | **9**  | **Заявка на продавца (Фаза 3)** ✅            |
| **`create-payout-request.test.ts`**     | **9**  | **Запрос выплаты (Фаза 3)** ✅                |
| **`process-payouts/route.test.ts`**     | **9**  | **Cron обработка выплат (Фаза 3)** ✅         |
| **`stock-notifications/route.test.ts`** | **8**  | **Cron уведомления о наличии (Фаза 3)** ✅    |
| **`create-seller-product.test.ts`**     | **7**  | **Создание товара продавцом (Фаза 3)** ✅     |
| **`update-sub-order.test.ts`**          | **6**  | **Отметка отправки подзаказа (Фаза 3)** ✅    |
| **`checkout-form.schema.test.ts`**      | **32** | **Zod-схема оформления заказа (Фаза 5)** ✅   |
| **`seller-application.schema.test.ts`** | **25** | **Zod-схема заявки продавца (Фаза 5)** ✅     |
| **`review.schema.test.ts`**             | **19** | **Zod-схема отзывов (Фаза 5)** ✅             |
| **`payout-request.schema.test.ts`**     | **17** | **Zod-схема запроса выплаты (Фаза 5)** ✅     |
| **`return-request.schema.test.ts`**     | **14** | **Zod-схема возврата (Фаза 5)** ✅            |

### E2E-тесты (46 файлов, ~326+ тестов)

| Группа          | Файлов | Тестов | Покрытие                                                                                       |
| --------------- | ------ | ------ | ---------------------------------------------------------------------------------------------- |
| Auth (guest)    | 4      | ~55    | registration, password-reset, redirects, API protection                                        |
| Catalog (user)  | 3      | ~48    | browsing, filters, wishlist                                                                    |
| Profile (user)  | 8      | ~75    | profile, measurements, addresses, password, company, OAuth, orders, settings                   |
| Commerce (user) | 3      | ~61    | cart, checkout, custom-orders                                                                  |
| Admin           | 5      | ~39    | sizes, products, images (x2), users, categories, custom-orders                                 |
| Integration     | 8      | ~56    | order-flow, custom-order-flow, user-admin, seller-flow, reviews, returns, loyalty, promo-codes |
| Mobile          | 3      | ~30    | responsive, touch, navigation                                                                  |
| Static          | 2      | ~30    | info-pages, public-pages                                                                       |
| Notifications   | 1      | ~6     | email-verification (Mailhog)                                                                   |
| Catalog         | 5      | ~16    | collections, recommendations, recently-viewed, infinite-scroll, stock-notifications            |
| Visual          | 1      | 9      | screenshots desktop/tablet/mobile                                                              |

### Запуск тестов

```bash
nx test premium-rosstil           # Unit
nx e2e premium-rosstil-e2e        # E2E (все)
nx e2e premium-rosstil-e2e -- --project=chromium  # Только chromium
```

---

## Что НЕ покрыто (критические пробелы)

### Бизнес-логика — оставшиеся пробелы

| Модуль              | Файл                             | Строк | Описание                |
| ------------------- | -------------------------------- | ----- | ----------------------- |
| ~~Создание заказа~~ | ~~`create-order.ts`~~            | ~507  | ~~✅ Покрыто в Фазе 1~~ |
| ~~Webhook ЮKassa~~  | ~~`webhooks/yookassa/route.ts`~~ | ~310  | ~~✅ Покрыто в Фазе 1~~ |
| ~~Лояльность~~      | ~~`loyalty.ts`~~                 | —     | ~~✅ Покрыто в Фазе 1~~ |
| ~~Промокоды~~       | ~~`validate-promo.ts`~~          | —     | ~~✅ Покрыто в Фазе 1~~ |
| ~~Корзина~~         | ~~cart actions~~                 | —     | ~~✅ Покрыто в Фазе 2~~ |
| ~~Отзывы~~          | ~~review actions~~               | —     | ~~✅ Покрыто в Фазе 2~~ |
| ~~Возвраты~~        | ~~return actions~~               | —     | ~~✅ Покрыто в Фазе 2~~ |
| ~~Продавцы~~        | ~~seller actions~~               | —     | ~~✅ Покрыто в Фазе 3~~ |
| ~~Рассылки~~        | ~~newsletter actions~~           | —     | ~~✅ Покрыто в Фазе 3~~ |
| ~~Cron~~            | ~~cron routes~~                  | —     | ~~✅ Покрыто в Фазе 3~~ |

### E2E пробелы

- ~~Маркетплейс seller flow~~ — ✅ Покрыто в Фазе 4
- ~~Лояльность~~ — ✅ Покрыто в Фазе 4
- ~~Промокоды в checkout~~ — ✅ Покрыто в Фазе 4
- ~~Отзывы и ответы~~ — ✅ Покрыто в Фазе 4
- ~~Возвраты~~ — ✅ Покрыто в Фазе 4
- ~~Коллекции/Lookbook~~ — ✅ Покрыто в Фазе 5
- ~~Рекомендации~~ — ✅ Покрыто в Фазе 5
- ~~Infinite scroll~~ — ✅ Покрыто в Фазе 5
- ~~Недавно просмотренные~~ — ✅ Покрыто в Фазе 5
- ~~Интеграционные тесты order-flow~~ — ✅ Перезаписано в Фазе 4

---

## Инфраструктура (реализовано)

### `src/test-utils/action-test-helpers.ts` — хелперы для action-тестов

По образцу driving-school, адаптированные под premium-rosstil:

| Экспорт                | Описание                                              |
| ---------------------- | ----------------------------------------------------- |
| `MOCK_USER`            | Стандартный пользователь (role: USER)                 |
| `MOCK_ADMIN_USER`      | Администратор (role: ADMIN)                           |
| `MOCK_SELLER_USER`     | Продавец (role: SELLER)                               |
| `createMockPrisma()`   | Фабрика mock Prisma с нужными моделями и методами     |
| `mockGetSession()`     | Мок `@/lib/auth` — возвращает сессию с пользователем  |
| `mockGetSessionNull()` | Мок `@/lib/auth` — возвращает null (не авторизован)   |
| `mockDb()`             | Мок `@/lib/db` — prisma, getPrisma, getEnhancedPrisma |

```typescript
// Паттерн использования в action-тестах:
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { order: { findUnique: vi.fn(), create: vi.fn() }, $transaction: vi.fn((fn) => fn(mockPrisma)) },
}))

import { MOCK_USER, mockDb, mockGetSession } from '@test-utils/action-test-helpers'
vi.mock('@/lib/auth', () => mockGetSession(MOCK_USER))
vi.mock('@/lib/db', () => mockDb(mockPrisma))
// next/cache уже замокан глобально в vitest.setup.tsx
```

### `vitest.setup.tsx` — глобальный мок `next/cache`

Добавлен `vi.mock('next/cache')` с `revalidatePath`, `revalidateTag`, `unstable_cache`.

### `vitest.config.ts` — alias `@test-utils`

Добавлен `'@test-utils': resolve(__dirname, 'src/test-utils')` для коротких импортов в тестах.

### E2E инфраструктура (по образцу driving-school-e2e)

Хелперы добавлены РЯДОМ с существующими page objects. Новые тесты могут использовать оба подхода.

#### `src/fixtures/base-test.ts` — SSE-блокировка + Browser Recycling

| Экспорт  | Описание                                                      |
| -------- | ------------------------------------------------------------- |
| `test`   | Расширенный test с автоматической блокировкой SSE и recycling |
| `expect` | Re-export expect из @playwright/test                          |

- SSE_PATTERNS: пустой (premium-rosstil не использует SSE, но структура готова)
- Browser Recycling: каждые 25 тестов очистка permissions + GC

#### `src/helpers/page.helpers.ts` — Навигация, toast, загрузка

| Функция                | Описание                              |
| ---------------------- | ------------------------------------- |
| `navigateAndWait`      | goto + domcontentloaded               |
| `gotoAndExpectHeading` | goto + проверка заголовка             |
| `expectHeading`        | Проверка видимости heading            |
| `waitForPageLoad`      | Ожидание domcontentloaded             |
| `waitForFormHydration` | Ожидание React гидрации формы         |
| `checkEmptyState`      | Проверка empty state                  |
| `safeIsVisible`        | Безопасная проверка видимости         |
| `expectSignInRedirect` | Проверка редиректа на `/auth/signin`  |
| `expectToast`          | Ожидание toast через `[data-toaster]` |
| `expectSuccessToast`   | Ожидание success toast                |
| `expectErrorToast`     | Ожидание error toast                  |
| `waitForAction`        | Ожидание network idle                 |
| `clickAndWait`         | Клик кнопки + network idle            |

#### `src/helpers/locators.helpers.ts` — Стабильные Chakra UI v3 локаторы

25 локаторов (card, toast, modal, drawer, menu, checkbox, radio, switch, tab, alert, spinner, badge, accordion, popover, tooltip, pinInput, select, formField, formError, tagsInput, container, stepper, stat, statNumber, cardTitle) + 8 shortcut-функций (getCardByText, getMenuItem, getTab, getRadio, getCheckbox, getButton, getLink, getCombobox).

Заменяет хрупкие `.chakra-*` селекторы на data-scope атрибуты и ARIA роли.

#### `src/helpers/form.helpers.ts` — Работа с формами

| Функция                  | Описание                                    |
| ------------------------ | ------------------------------------------- |
| `fillAndSubmit`          | Заполнить поля по placeholder + submit      |
| `fillRegistrationForm`   | Заполнить форму регистрации premium-rosstil |
| `submitRegistrationForm` | Кнопка «Зарегистрироваться»                 |
| `fillLoginForm`          | Заполнить форму входа premium-rosstil       |
| `submitLoginForm`        | Кнопка «Войти»                              |
| `addTag` / `addTags`     | Работа с TagsInput                          |
| `enterPin`               | Ввод PIN-кода                               |
| `expectValidationError`  | Проверка ошибки валидации                   |
| `clearAndFill`           | Очистить + заполнить поле                   |

#### `src/helpers/index.ts` — Централизованный экспорт

Единая точка входа: `import { navigateAndWait, Locators, fillAndSubmit } from '../helpers'`

#### `playwright.config.ts` — Улучшенные таймауты

| Параметр            | Было | Стало | Причина                             |
| ------------------- | ---- | ----- | ----------------------------------- |
| `timeout`           | 30s  | 60s   | React SSR + гидрация на cold start  |
| `expect.timeout`    | 5s   | 10s   | Chakra UI анимации + async renders  |
| `navigationTimeout` | —    | 60s   | Next.js динамическая компиляция     |
| `actionTimeout`     | —    | 15s   | Формы с debounce и async validation |
| `globalTimeout` CI  | —    | 30мин | Предотвращает зависание CI          |
| Chrome args         | —    | ✅    | `--disable-dev-shm-usage`, памяти   |

---

## ✅ Фаза 1 — P0: Критическая бизнес-логика (Unit, 159 тестов, 6 файлов) — ВЫПОЛНЕНО v0.66.0

### 1.1 Loyalty System — pure functions (~30 тестов)

**Файл:** `src/lib/loyalty.test.ts`
**Тестирует:** `src/lib/loyalty.ts`

- `calculateLoyaltyLevel`: пороги BRONZE/SILVER/GOLD, граничные значения (0, 9999, 10000, 49999, 50000)
- `calculateLoyaltyPoints`: cashback 3%/5%/7% по уровням, дробные суммы (floor), нулевая сумма
- `maxPointsForOrder`: ограничение 50% от суммы, ограничение балансом, min(50%, balance)
- `pointsToNextLevel`: переходы между уровнями, GOLD → null

**Особенность:** Чистые функции без побочных эффектов — тестируются без моков. Идеальная точка старта.

### 1.2 YooKassa Utilities (~25 тестов)

**Файл:** `src/lib/yookassa.test.ts`
**Тестирует:** `src/lib/yookassa.ts`

- `isYooKassaIp`: разрешённые CIDR (6 диапазонов), граничные IP, запрещённые, IPv6-mapped, localhost в dev/prod
- `createPayment`: формирование запроса (amount, idempotenceKey, headers), обработка ошибок
- `createRefund`: параметры refund, amount format
- `getPayment`: получение статуса

**Мок:** `global.fetch` через `vi.fn()`

### 1.3 Validate Promo (~22 теста)

**Файл:** `src/app/[locale]/checkout/_actions/validate-promo.test.ts`
**Тестирует:** `src/app/[locale]/checkout/_actions/validate-promo.ts`

- Пустой код, не аутентифицирован, не найден, неактивен
- Даты: ещё не начался (`dateFrom > now`), истёк (`dateTo < now`)
- Лимиты: minAmount, maxUsages, perCustomer
- Расчёт: PERCENTAGE (округление), FIXED_AMOUNT (не превышает cartTotal)
- Нормализация кода (uppercase + trim)

### 1.4 Create Order (~35 тестов)

**Файл:** `src/app/[locale]/checkout/_actions/create-order.test.ts`
**Тестирует:** `src/app/[locale]/checkout/_actions/create-order.ts`

- **Auth:** не аутентифицирован, невалидные данные, пустая корзина
- **Stock:** недостаточно товара (с названием), предзаказные не требуют наличия
- **Order number:** формат `ORD-YYYYMMDD-XXXXX`, уникальность (retry)
- **Marketplace:** группировка по продавцам, расчёт commission/sellerAmount
- **Promo:** PERCENTAGE и FIXED_AMOUNT расчёт, increment usageCount, perCustomer лимит
- **Loyalty:** списание баллов, расчёт итоговой суммы
- **SubOrders:** создание SubOrder + SubOrderItem, уменьшение availableCount
- **ЮKassa:** создание платежа, fallback без env, graceful failure
- **Side effects:** очистка корзины, сохранение адреса, email/telegram уведомления
- **Статусы:** PREORDER при предзаказных товарах, NEW при обычных

**Моки:** `getSession`, `getEnhancedPrisma`, `getPrisma` (с `$transaction`), `createPayment`, email/telegram функции, `revalidatePath`

### 1.5 YooKassa Webhook (~28 тестов)

**Файл:** `src/app/api/webhooks/yookassa/route.test.ts`
**Тестирует:** `src/app/api/webhooks/yookassa/route.ts`

- **Security:** запрещённый IP → 403, invalid JSON → 400, unknown type → 400
- **`payment.succeeded`:** Payment→SUCCEEDED, Order→CONFIRMED, SubOrders→PAID, SellerBalance upsert, уведомления продавцам
- **`payment.canceled`:** Payment→CANCELLED, Order→CANCELLED, SubOrders→CANCELLED, восстановление availableCount
- **`refund.succeeded`:** полный возврат→REFUNDED, частичный→PARTIALLY_REFUNDED
- **Edge cases:** payment не найден → warn, ошибка обработки → 200

### 1.6 Loyalty Actions (~24 теста)

**Файл:** `src/app/_actions/loyalty.test.ts`
**Тестирует:** `src/app/_actions/loyalty.ts`

- `getLoyaltyAccount`: автосоздание при отсутствии
- `earnLoyaltyPoints`: расчёт по уровню, идемпотентность, level upgrade, нулевые points
- `spendLoyaltyPoints`: max 50%, min(pointsToSpend, maxAllowed), balance check
- `getLoyaltyTransactions`: пагинация, фильтрация по типу

---

## ✅ Фаза 2 — P0: Критические пользовательские потоки (Unit, 116 тестов, 9 файлов) — ВЫПОЛНЕНО v0.67.0

### 2.1 Cart Actions (~35 тестов, 3 файла)

**Файлы тестов:**

- `src/app/[locale]/cart/_actions/add-to-cart.test.ts` (~18)
- `src/app/[locale]/cart/_actions/update-cart-item.test.ts` (~10)
- `src/app/[locale]/cart/_actions/remove-from-cart.test.ts` (~7)

**addToCart:**

- auth check, quantity < 1, товар не найден, нет на складе
- создание корзины, новый/существующий CartItem
- revalidatePath

**updateCartItem:**

- auth, quantity, not found, stock check, success

**removeFromCart:**

- auth, success, access deny

### 2.2 Review System (~45 тестов, 4 файла)

**Файлы тестов:**

- `src/app/[locale]/profile/orders/_actions/create-review.test.ts` (~15)
- `src/app/[locale]/seller/reviews/_actions/respond-review.test.ts` (~10)
- `src/app/[locale]/admin/reviews/_actions/manage-review.test.ts` (~12)
- `src/lib/review-utils.test.ts` (~8)

**createReview:**

- auth, validation, не было покупки, доставка < 1 дня
- rate limit 3/день, уникальность, пересчёт рейтинга

**respondToReview:**

- не продавец, чужой товар, уже есть ответ, успех

**manage:**

- hide/publish/delete с проверкой статусов

**recalculateRatings:**

- среднее, reviewCount, рейтинг продавца, нет отзывов → null

### 2.3 Return System (~40 тестов, 2 файла)

**Файлы тестов:**

- `src/app/[locale]/profile/orders/[orderNumber]/return/_actions/create-return.test.ts` (~12)
- `src/app/[locale]/admin/returns/_actions/manage-return.test.ts` (~28)

**createReturn:**

- auth, validation, not found, чужой SubOrder
- не DELIVERED, активный возврат уже есть

**manage:**

- approve/reject (auth, not found, wrong status)
- Статусные переходы: APPROVED → SHIPPED_BACK → RECEIVED → REFUNDED
- processRefund: ЮKassa, SellerBalance, stock restore

---

## ✅ Фаза 3 — P1: Маркетплейс и продавцы (Unit, 74 теста, 8 файлов) — ВЫПОЛНЕНО v0.68.0

### 3.1 Seller Application Flow (~25 тестов, 2 файла)

**Файлы тестов:**

- `submit-application.test.ts` (~10)
- `manage-application.test.ts` (~15)

**submit:**

- auth, validation, duplicate PENDING/APPROVED, уже продавец, успех

**manage (approve):**

- Транзакция: Application→APPROVED, Seller+SellerBalance создан, role→SELLER

**manage (reject):**

- reviewNote, email уведомление

### 3.2 Seller Product Management (~20 тестов, 2 файла)

**Файлы тестов:**

- `create-seller-product.test.ts` (~10)
- `update-sub-order.test.ts` (~10)

**create:**

- не SELLER, validation, seller не найден, duplicate name, привязка к seller

**update-sub-order:**

- не продавец, чужой SubOrder, статусные переходы

### 3.3 Payout System (~22 теста, 2 файла)

**Файлы тестов:**

- `create-payout-request.test.ts` (~10)
- `process-payouts/route.test.ts` (~12)

**create:**

- не SELLER, validation, недостаточно средств, с чеком/без, успех

**process-payouts (cron):**

- auth (CRON_SECRET), нет для обработки
- DELIVERED + protection → COMPLETED
- SellerBalance update

### 3.4 Newsletter (~14 тестов, 1 файл)

**Файл:** `newsletter.test.ts`

- невалидный email, уже подписан, реактивация
- новая подписка, отписка (токен не найден, уже отписан, успех)

### 3.5 Stock Notifications Cron (~12 тестов, 1 файл)

**Файл:** `stock-notifications/route.test.ts`

- auth, нет подписок
- товар в наличии → email + notified
- товар нет → skip
- ошибка одного → остальные продолжают

---

## ✅ Фаза 4 — P1: Интеграционные E2E (41 тест, 6 файлов) — ВЫПОЛНЕНО v0.69.0

### 4.1 Order Lifecycle (~8 тестов)

**UN-SKIP:** `07-integration/01-order-flow.spec.ts`

Полный цикл: корзина → checkout → заказ → "Мои заказы" → админ видит → смена статуса → пользователь видит

### 4.2 Seller Flow (~10 тестов)

**НОВЫЙ:** `07-integration/04-seller-flow.spec.ts`

Заявка → одобрение → создание товара → каталог → покупка → подзаказ → баланс

### 4.3 Reviews Flow (~6 тестов)

**НОВЫЙ:** `07-integration/05-reviews-flow.spec.ts`

Кнопка отзыва после доставки → форма → отзыв на странице → ответ продавца → модерация админа

### 4.4 Returns Flow (~5 тестов)

**НОВЫЙ:** `07-integration/06-returns-flow.spec.ts`

Кнопка возврата → форма → запрос виден → админ одобряет/отклоняет

### 4.5 Loyalty Flow (~4 теста)

**НОВЫЙ:** `07-integration/07-loyalty-flow.spec.ts`

Виджет уровня/баллов → списание в checkout → история транзакций

### 4.6 Promo Codes (~5 тестов)

**НОВЫЙ:** `07-integration/08-promo-codes.spec.ts`

Применение в checkout → отображение скидки → невалидный → истёкший

---

## ✅ Фаза 5 — P2: Дополнительное покрытие (~123 теста, 10 файлов) — ВЫПОЛНЕНО v0.70.0

### E2E: Каталог расширенный (5 файлов, ~16 тестов)

| Файл                                        | Тестов | Покрытие                                        |
| ------------------------------------------- | ------ | ----------------------------------------------- |
| `10-catalog/01-collections.spec.ts`         | ~3     | список коллекций, детальная страница            |
| `10-catalog/02-recommendations.spec.ts`     | ~4     | "Похожие", "Вам может понравиться", "В корзине" |
| `10-catalog/03-recently-viewed.spec.ts`     | ~3     | виджет, очистка                                 |
| `10-catalog/04-infinite-scroll.spec.ts`     | ~3     | `?view=scroll`, автозагрузка, переключатель     |
| `10-catalog/05-stock-notifications.spec.ts` | ~3     | подписка, отображение                           |

### Unit: Zod-схемы (5 файлов, ~67 тестов)

| Файл                                | Тестов | Покрытие                |
| ----------------------------------- | ------ | ----------------------- |
| `checkout-form.schema.test.ts`      | ~20    | Схема оформления заказа |
| `seller-application.schema.test.ts` | ~15    | Схема заявки продавца   |
| `review.schema.test.ts`             | ~12    | Схема отзывов           |
| `return-request.schema.test.ts`     | ~10    | Схема запроса возврата  |
| `payout-request.schema.test.ts`     | ~10    | Схема запроса выплаты   |

---

## Сводка

| Фаза      | Приоритет | Тип      | Новых тестов | Новых файлов | Статус          |
| --------- | --------- | -------- | ------------ | ------------ | --------------- |
| 1         | P0        | Unit     | ~159         | 6            | ✅ v0.66.0      |
| 2         | P0        | Unit     | ~116         | 9            | ✅ v0.67.0      |
| 3         | P1        | Unit     | ~74          | 8            | ✅ v0.68.0      |
| 4         | P1        | E2E      | ~41          | 6            | ✅ v0.69.0      |
| 5         | P2        | Unit+E2E | ~123         | 10           | ✅ v0.70.0      |
| Инфра     | P0        | Util     | —            | 2+6          | ✅ v0.65.0      |
| **Итого** |           |          | **~513**     | **~47**      | **✅ Все фазы** |

### Итоговые метрики

| Метрика     | Было  | Стало |
| ----------- | ----- | ----- |
| Unit файлов | 17    | 45    |
| Unit тестов | ~589  | ~793  |
| E2E файлов  | 36    | 46    |
| E2E тестов  | ~280+ | ~326+ |

---

**Последнее обновление:** 2026-03-03
