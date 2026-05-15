# CHANGELOG — НейроАбоИ

## [0.17.0] — 2026-05-13

E2E тесты оформления заказа + багфиксы формы.

### Добавлено

- `apps/aboi-e2e/src/checkout.spec.ts` — 5 Playwright тестов: пустая корзина, валидация, оформление заказа (MANAGER_CALL → success), email-ошибка, DaData мок. Все 3 браузера (Chromium, Firefox, WebKit).
- `apps/aboi-e2e/playwright.config.ts` — `locale: 'ru-RU'` для корректного Accept-Language во всех браузерах.

### Исправлено

- `checkout-form.tsx` — `AboiForm.Group name="contact/shipping/discounts/extras"` заменены на `Stack` — вложенные пути ломали Zod валидацию (`contact.customerName` вместо `customerName`).
- `checkout-form.tsx` — `router.push('/checkout/success/...')` → `window.location.href` (next-intl `localePrefix: 'as-needed'` убирает `/ru/` из URL; client-side push не проходит через middleware).
- `checkout-form.tsx` — пустые строки optional полей конвертируются в `undefined` перед отправкой (`fullAddress: z.string().min(5)` отвергало `''`).

## [0.16.0] — 2026-05-13

Настройка почты для домена neyroaboi.ru.

### Добавлено

- `src/lib/auth.ts` — `sendResetPassword` хук в `emailAndPassword` конфиге Better Auth (БАГ: письмо сброса пароля не отправлялось).
- `.env.docker` — `EMAIL_HEADER_COLOR=#C25E3A`, `EMAIL_BUTTON_COLOR=#5B4FB8` — брендинг писем в цветах aboi.

### Изменено

- `.env.docker` — `SMTP_FROM_EMAIL` переключён с `noreply@letar.best` на `noreply@neyroaboi.ru`.

### Инфраструктура (Maddy / DNS — вне кода)

- Maddy `maddy.conf`: добавлен `neyroaboi.ru` в `$(local_domains)`, RSA DKIM ключ сгенерирован в `/opt/maddy/data/dkim_keys/neyroaboi.ru_default.*`.
- Mailbox `vitaliy@neyroaboi.ru` создан в Maddy.
- DNS записи для `neyroaboi.ru` требуют настройки у регистратора (см. ниже).

## [0.15.0] — 2026-05-12

W2 — Интеграция СДЭК API v2: автоматический расчёт доставки, выбор ПВЗ, автосоздание заказа после оплаты, трекинг.

### Добавлено

- `src/lib/shipping/cdek-types.ts` — TypeScript интерфейсы CDEK API v2 (token, tarifflist, deliverypoints, orders, webhook).
- `src/lib/shipping/package-estimator.ts` — расчёт габаритов рулона обоев по метражу (формула спирального намотки).
- `src/lib/shipping/cdek.ts` — OAuth-клиент с модульным кешом токена, `calculateShippingCosts` (тарифы 136/137), `getDeliveryPoints`, `createCdekOrder`, `getCdekOrderStatus`.
- `src/lib/shipping/cdek-order.ts` — идемпотентный хелпер создания СДЭК заказа после оплаты.
- `src/app/_actions/shipping.action.ts` — server actions: `calculateShippingCostAction`, `getDeliveryPointsAction`.
- `src/app/[locale]/(shop)/checkout/_components/pvz-picker.tsx` — выбор пункта выдачи СДЭК с поиском по адресу.
- `src/app/[locale]/(shop)/checkout/_components/checkout-client-wrapper.tsx` — клиентская обёртка, поднимает state стоимости доставки между формой и саммари.
- `src/app/api/webhooks/cdek/route.ts` — СДЭК tracking webhook (HMAC-SHA256, статусы SHIPPED/DELIVERED, email клиенту при отгрузке).

### Изменено

- `schema.zmodel` — добавлены поля `cdekOrderUuid` и `pvzCode` в модель `Order`. Миграция `cdek_order_fields`.
- `checkout-form.tsx` — динамические цены доставки с дебаунсом 500 мс, выбор метода с реальными тарифами, PvzPicker для CDEK_POINT, fallback → MANAGER_CALL.
- `checkout-summary.tsx` — динамическая стоимость доставки и итоговая сумма с доставкой.
- `checkout/page.tsx` — расчёт `totalMeters` из корзины, рендер через `CheckoutClientWrapper`.
- `src/lib/checkout.ts` — добавлены `shippingCostKopecks`/`pvzCode` в схему, серверная перепроверка стоимости ±5%, `totalToPay` включает доставку, сохранение `shippingCost`/`pvzCode` в Order.
- `src/lib/payments/tinkoff.ts` — `buildReceipt()` принимает `shippingKopecks`, добавляет строку «Доставка СДЭК» (PaymentObject: service, 54-ФЗ).
- `src/app/api/webhooks/tinkoff/route.ts` — после PAID асинхронно вызывает `createCdekOrderForOrder`.
- `admin/orders/[orderNumber]/page.tsx` — блок доставки: СДЭК UUID, код ПВЗ, трек-ссылка, стоимость доставки; таблица позиций с строкой доставки.

### ENV (требуется настроить)

```bash
CDEK_CLIENT_ID=                 # из ЛК СДЭК (тестовые: EMscd6r9JnFiQ3bLoyjJY6eM)
CDEK_CLIENT_SECRET=             # из ЛК СДЭК (тестовые: PjLZkKBHEiLK3Tlwr9lamDwFtjTwY1CZpzB9WjYK3aM)
CDEK_TEST_MODE=true             # false на production
CDEK_FROM_POSTAL_CODE=107076    # индекс отправителя (Москва, 3-я Прядильная, 8)
CDEK_FROM_CITY=Москва
```

## [0.14.1] — 2026-05-12

### Тесты

- `apps/aboi-e2e/src/checkout.spec.ts` — 4 e2e теста для checkout: редирект пустой корзины, валидация обязательных полей, полный flow оформления заказа без DaData (MANAGER_CALL), проверка ошибки невалидного email.
- `apps/aboi-e2e/playwright.config.ts` — исправлен порт (3000 → 3018), добавлено отключение Tinkoff в тестовом окружении (`TBANK_TERMINAL_KEY=''`).
- `apps/aboi/.env.local` — добавлен `NEXT_PUBLIC_DADATA_TOKEN` (общий токен проекта).

## [0.14.0] — 2026-05-11

W1 — Подключение T-Bank эквайринга.

### Добавлено

- `src/lib/payments/tinkoff.ts` — T-Bank API клиент: `initPayment()`, `validateWebhookToken()`, `buildReceipt()`. HMAC-токен по правилам T-Bank (SHA-256, алфавитный порядок, без Receipt/Shops/DATA).
- `src/app/api/webhooks/tinkoff/route.ts` — обработчик webhook от T-Bank. HMAC-валидация, идемпотентность, обновление `Order.status = PAID` / `paymentMethod = TINKOFF` / `paidAt`. Email клиенту «Оплата подтверждена».
- `checkout/payment-failed/[orderNumber]/page.tsx` — страница при неуспешной оплате (FailURL от T-Bank).
- Receipt для 54-ФЗ: `taxation: usn_income`, `tax: none` (ИП на УСН 6%).

### Изменено

- `src/lib/checkout.ts` — после создания заказа вызывает `initPayment()`, сохраняет `paymentExternalId`, возвращает `paymentUrl`. Деградация: если T-Bank недоступен — заказ остаётся в PLACED (менеджер обрабатывает вручную).
- `checkout/_components/checkout-form.tsx` — при наличии `paymentUrl` редиректит на T-Bank. Кнопка переименована в «Перейти к оплате».
- `checkout/success/[orderNumber]/page.tsx` — показывает статус: PAID = «Оплата подтверждена» / PLACED = «Ожидаем оплату».
- Email клиенту обновлён: при наличии `paymentUrl` — «ожидаем оплату», иначе — «менеджер свяжется».

### ENV (требуется настроить)

- `TBANK_TERMINAL_KEY` — TerminalKey из ЛК T-Bank
- `TBANK_PASSWORD` — Password для HMAC
- `TBANK_NOTIFICATION_URL` — URL webhook (опц., можно настроить в ЛК Тинькофф)

## [0.13.0] — 2026-05-07

Хедер сайта, фикс главной страницы, технический долг (форм-компоненты).

### Добавлено

- `_components/header.tsx` — sticky-хедер с логотипом, навигацией (Каталог, Доставка), badge-счётчиком корзины (async Server Component + Suspense) и кнопкой Войти / именем пользователя.
- Хедер подключён в `[locale]/layout.tsx` — виден на всех страницах.

### Исправлено

- Главная: кнопка «Каталог (скоро)» → рабочая ссылка `/catalog` без `disabled`.

### Изменено (рефакторинг)

- `product-form.tsx` — переписан с сырого `useState` на `AboiForm`. Сгенерированная схема `ProductCreateFormSchema.omit/extend`, конвертация рублей↔копейки в форме.
- `address-list.tsx` — выделен `AddressForm` компонент на `AboiForm`. `AddressCreateFormSchema.omit({userId})` как база формы.

## [0.12.0] — 2026-05-06

E10.a — подготовка к staging-деплою.

### Добавлено

- `Dockerfile.production` — standalone output на `node:24-alpine`, порт 3018, bind-mount `/app/apps/aboi/uploads`.
- `docker-compose.production.yml` — `aboi-postgres` :5444 (БД `neyroaboi_prod`) + `aboi-app` :3018, сеть `premium-network`. Все секреты через `${VAR}`.
- `.env.docker.example` — шаблон production-env с placeholder'ами.
- `next.config.mjs` — `output: 'standalone'` для production-сборки.

### Готовность к деплою

- Файлы Docker готовы. DNS-запись `aboi.letar.best → 194.164.245.97` (s1) — задача Виталия / DeployAgent.
- Запрос на деплой отправлен в BlackCove через Agent Mail.

## [0.11.0] — 2026-05-06

E7 — Реферальная программа.

### Добавлено

- **schema.zmodel**: `Referral` (ownerUserId unique, code 8 Crockford, isActive), `ReferralAttribution` (refereeUserId nullable, visitorAnonymousId, ipHash), `ReferralEarning` (orderId unique, status PENDING/APPROVED/PAID/REVERSED, pendingUntil), `UserBalance` (balance + lifetimeEarned), `BalanceTransaction` (REFERRAL_PAYOUT/ORDER_USE/ADJUST). Миграция `20260505_referral`.
- **`lib/referral.ts`**: `getOrCreateReferralForUser`, `setReferralCookie`/`getReferralFromCookie` (cookie aboi.ref last-click 60 дней), `createReferralEarningForOrder` (% из env `ABOI_REFERRAL_PERCENT`=12, защита self-referral), `spendBalanceForOrder`, `approveReferralEarningAction` (admin: PENDING → APPROVED + начисление в транзакции).
- **`proxy.ts`**: атрибуция при `?ref=<code>`.
- **`placeOrderAction` расширен**: `useBalance` (списание бонусов в транзакции), создание ReferralEarning после оплаты.
- **`/profile/referrals`** — статистика (доступно/всего/в ожидании), партнёрская ссылка с copy-кнопкой, история заработков.
- **`/admin/referrals`** + кнопка «Одобрить» (PENDING → APPROVED).

### Решения

- **Settings модель не создана** — % и сроки через env. Перенести в БД позже.
- **Cron auto-approve** отложен — админ одобряет вручную.

## [0.10.0] — 2026-05-06

E6 — Промокоды и подарочные сертификаты.

### Добавлено

- **schema.zmodel**: `Promo` (PERCENT/FIXED, value, minOrderAmount, maxUses, validFrom/Until), `PromoUsage` (orderId unique), `GiftCertificate` (Crockford Base32 16, pinHash bcrypt, currentBalance), `GiftCertificateTransaction` (PURCHASE/REDEEM/ADJUST). Миграция `20260505_promo_gift`.
- **`lib/promo.ts`** `validatePromo` — проверка активности, срока, лимита, минимальной суммы.
- **`lib/gift-certificate.ts`** — `createCertificate`, `validateCertificate`, generate code 16 символов в формате `XXXX-XXXX-XXXX-XXXX`. PIN хранится только bcrypt-хэшем.
- **`placeOrderAction` расширен** — применение промокода (PromoUsage + usedCount++) и сертификата (decrement balance + REDEEM transaction) в транзакции.
- **Чекаут**: новая группа «Скидки» (промокод + код+PIN сертификата).
- **Админка** `/admin/promos` (CRUD) и `/admin/gift-certificates` (выпуск + список + деактивация).

### Решения

- **Crockford Base32** (без I/L/O/U) — меньше путаницы при ручном вводе.
- **Сертификаты не сжигают баланс при истечении** — текст ошибки рекомендует обратиться в поддержку.

## [0.9.0] — 2026-05-06

E5 — Личный кабинет (заказы, адреса, избранное, настройки).

### Добавлено

- **schema.zmodel**: модель `Wishlist` (m2m User↔Product, unique-pair, cascade-delete с обеих сторон). Связи `User.wishlist[]`, `Product.wishlistItems[]`. Миграция `20260505215904_wishlist`.
- **`profile.action.ts`**: `createAddressAction`, `updateAddressAction`, `deleteAddressAction`, `toggleWishlistAction`, `updateProfileSettingsAction`, `deleteAccountAction` (152-ФЗ право на удаление).
- **`/profile`** — обзор-дашборд с 4 карточками: Заказы / Адреса / Избранное / Настройки.
- **`/profile/orders`** + `/profile/orders/[orderNumber]` — таблица заказов клиента с защитой от чужих заказов.
- **`/profile/addresses`** + `AddressList` — CRUD с inline-формой, флагом «По умолчанию».
- **`/profile/favorites`** + `WishlistRemoveButton` — сетка избранного.
- **`/profile/settings`** + `ProfileSettingsForm` — имя/телефон + «Опасная зона» с deleteAccount.

### Решения

- **deleteAccount каскад**: `User.delete()` каскадно убирает Account, Session, UserProfile, Address, Cart, CartItem, Wishlist. Order/ConsentLog с `SetNull` — сохраняются для отчётности.
- **AddressList на чистом Chakra Input** — тех. долг для миграции на @letar/forms вместе с ProductForm.

## [0.8.0] — 2026-05-06

E4 — Чекаут (без онлайн-оплаты) + админ-управление заказами.

### Добавлено

- **schema.zmodel**: `Order` (orderNumber unique, статусы PLACED/CONFIRMED/PAID/PRINTING/SHIPPED/DELIVERED/CANCELLED/REFUNDED, snapshot полей customer*, shippingAddressSnapshot Json, суммы в копейках, paidAt/shippedAt/deliveredAt/cancelledAt timestamps, trackingNumber для СДЭК), `OrderItem` (productId nullable + snapshots productNameSnapshot/productImageSnapshot/lengthMeters/unitPrice/total). Enum'ы `OrderStatus`, `ShippingMethod`, `PaymentMethod`. Связи User.orders[] и Product.orderItems[].
- Миграция `20260505_order` применена.
- **`src/lib/checkout.ts`** (`placeOrderAction`): Zod-валидация `PlaceOrderInputSchema` с `.strip()`, проверка корзины (товары всё ещё в продаже), генерация `ORD-YYYYMMDD-NNNNN` через счётчик за день, `$transaction(create Order + create OrderItems + clear cart + status CONVERTED)`, отправка email клиенту и админу через `@letar/email/sendGenericEmail`.
- **`@letar/forms`** подключён к aboi (tsconfig paths, package.json implicitDependencies, transpilePackages в next.config).
- **`src/aboi-form/aboi-form.tsx`** — app-specific Form инстанс через `createForm()`. DaData-токен передаётся в `<AboiForm.Field.Address token={...} />` напрямую (через `NEXT_PUBLIC_DADATA_TOKEN`); если токена нет — обычный input.
- **`/checkout`** (`app/[locale]/(shop)/checkout/page.tsx`) с двумя колонками: форма (CheckoutForm через AboiForm с группами «Контактные данные / Доставка / Дополнительно») + sticky CheckoutSummary с позициями и итогом. Поля: `Field.String`, `Field.Phone` (с маской), `Field.RadioGroup` (3 способа доставки), `Field.Address` (DaData), `Field.Textarea`, `Field.Checkbox` (consent). Редирект на /cart если корзина пуста.
- **`/checkout/success/[orderNumber]`** — экран благодарности с deталями заказа, ссылками в каталог и /profile/orders.
- **Админ-страницы заказов**:
  - `/admin/orders` — список с фильтрами `?status=active|placed|completed|cancelled|all`, цветные бейджи статусов, колонки number / date / customer / email-phone / total / status.
  - `/admin/orders/[orderNumber]` — деталь с двумя секциями (Клиент / Доставка), таблицей позиций со снэпшотами, комментарием клиента, блоком `OrderControls`.
  - `OrderControls` — кнопки переходов статусов (валидируется граф `ALLOWED_ORDER_TRANSITIONS`), input трек-номера, textarea внутренних заметок.
- **Server actions**: `setOrderStatusAction` (валидирует переход, проставляет timestamp `paidAt/shippedAt/deliveredAt/cancelledAt`, отправляет клиенту email-шаблон под статус), `setTrackingNumberAction`, `setInternalNotesAction`. Все требуют `requireAdmin()`.
- **`orders-status-config.ts`** — plain module с `ALL_ORDER_STATUSES` + `ALLOWED_ORDER_TRANSITIONS` (импортируется в server и client; вынесено из `'use server'`-файла, так как Next.js запрещает экспорт объектов из server-action модулей).
- Дашборд админки: 2 новые карточки — «Активных заказов» и «Заказов сегодня».
- Кнопка «Оформить заказ» в /cart теперь активна (раньше disabled-заглушка).

### Verified

- preview: добавил товар в корзину (4 м × 1500 ₽ = 6000 ₽) → /checkout рендерит форму со всеми полями + summary; валидация показывает корректные ошибки при пустой submit.
- Создан тестовый заказ напрямую в БД → /admin/orders показывает его в списке («Иван Тестов», 6000 ₽, статус «Принят») → деталь корректно отрисовывает все секции и кнопки переходов («→ Подтвердить», «→ Отменить»).
- Click «→ Подтвердить» → POST /admin/orders/[n] + setOrderStatusAction → БД status=CONFIRMED + email клиенту «Заказ ORD-20260506-00001 подтверждён» в Mailhog. Test order удалён из БД после verify.

### Решения

- **DaData без addressProvider в createForm** — `createDaDataProvider` не реэкспортирован из top-level `@letar/forms`. Используем `<Field.Address token={...} />` напрямую — тот же результат, без subpath-импортов.
- **`'use server'` файл может экспортировать только async функции** — Next.js 16 ругается на `export const STATUS_TRANSITIONS = {...}`. Вынесли в `orders-status-config.ts`.
- **proxy.ts: `request as never`** — bun-cache содержит две версии next (16.1.7 и 16.2.3) с несовместимыми типами `NextRequest`. На рантайме это один класс.
- **Email уведомления через Promise.allSettled** в placeOrderAction — не валим заказ, если SMTP в dev упадёт.

### Технический долг

- TanStack Form (declarative API в @letar/forms) не реагирует на программное заполнение через native `value` setter в preview-тестах. Реальный пользователь печатает через клавиатуру — работает. Для E2E-теста чекаута через Playwright нужно использовать `page.fill()`, который правильно симулирует input events.
- Email-шаблоны переходов статусов сейчас в коде — позже вынести в `messages/{locale}.json` для i18n.

## [0.7.0] — 2026-05-05

E3 — Корзина (гостевая + пользовательская + слияние).

### Добавлено

- **schema.zmodel**: `Cart` (1 active per user, status ACTIVE/CONVERTED/ABANDONED, expiresAt 30 дней), `CartItem` (cartId+productId unique, `lengthMeters Decimal(6,2)`, `unitPrice` snapshot копейки), enum `CartStatus`. Связи User.cart? и Product.cartItems[].
- Миграция `20260505201832_cart` применена.
- **`src/lib/cart.ts`** (server actions):
  - `addToCartAction(productId, lengthMeters)` — создаёт anonymous-сессию через `auth.api.signInAnonymous()` если нет, ensureCart, валидирует против `Product.minLengthMeters`, snapshot цены. Если позиция уже есть — суммирует длину.
  - `updateCartItemAction(itemId, lengthMeters)` — ownership-check через `cart.userId`.
  - `removeFromCartAction(itemId)`, `clearCartAction()`.
  - `getCartViewAction()` — НЕ создаёт anonymous-юзера, возвращает пустую корзину для гостя без сессии (важно для счётчика в header без побочных эффектов).
- **Расширение `merge-anonymous.ts`**: при логине anonymous-юзера → корзины объединяются по стратегии MergeWithExistingCustomerCart (одинаковые productId — суммируем lengthMeters), либо ownership корзины переносится. Anon-cart удаляется.
- **Страница `/cart`** (`app/[locale]/(shop)/cart/page.tsx`) с компонентом `CartLines` (изменение длины с onBlur, удаление, итог в ₽). `robots: noindex`.
- **Компонент `AddToCart`** в карточке товара заменил disabled-заглушку «В корзину (E3)»: input длины + расчёт total в реальном времени + onclick → addToCartAction → ссылка «Перейти в корзину».
- Кнопка «Оформить заказ» disabled до E4.

### Verified

- preview: на /catalog/kosmicheskiy-orbit ввёл 3 м → click «В корзину» → POST /catalog/kosmicheskiy-orbit + addToCartAction за 55мс → кнопка показала «Добавлено в корзину ✓». Перешёл на /cart → строка «Космический Орбит, 1500 ₽/м, длина 3, итого 4500 ₽», итого внизу 4500 ₽. Click «✕» → POST /cart + removeFromCartAction → «Корзина пуста». БД подтвердила: создан Cart с userId anonymous-юзера (Better Auth ID-шаблон), CartItem удалён.

### Решения

- **Anonymous-сессия не для view-actions**: `getCartViewAction()` не плодит anonymous user-ов на каждой загрузке страницы. Только при первом mutating action (`addToCart`).
- **`unitPrice` snapshot** при добавлении: цена в корзине не меняется, даже если админ обновил `Product.pricePerMeter`.
- **`@@unique([cartId, productId])`** — упрощает merge и `add` (вместо проверки existence).

## [0.6.1] — 2026-05-05

E2 подэтап B4 — unit-тесты + полировка.

### Добавлено

- `src/lib/slugify.test.ts` — 8 кейсов (RU→EN транслит, регистр, спецсимволы, ограничение длины 80, цифры, пустой результат).
- `src/lib/seo.test.ts` — 8 кейсов (Product/Offer корректный shape, цена в копейках → ₽ с 2 знаками, BASE_URL из env, breadcrumb позиции 1..N, Organization).

### Изменено

- `src/lib/seo.ts` — `BASE_URL` читается из env при каждом вызове (was: top-level const), чтобы юнит-тесты могли подменять через `process.env.NEXT_PUBLIC_BASE_URL` в beforeAll.
- `nx format aboi` прошёл — 20 файлов отформатированы dprint.

### Verified

- `bunx vitest run` → **16/16 passed**, длительность 1.13s.
- `nx typecheck:tsgo aboi` зелёный.

### Технический долг (TODO)

- Форма товара (`ProductForm`) написана вручную на Chakra Input/Switch — не через `@letar/forms` + `createForm` инстанс. По `forms.md` MUST использовать createForm. Перенести в E2.B5 или отдельной задаче (не блокер для E3).
- API endpoints `/api/upload` и `/api/files/[...path]` — по правилу `image-management.md` ожидаются `/api/images/upload` и `/api/images/[id]`. Перенести в E2.B5.

## [0.6.0] — 2026-05-05

E2 подэтап B3 — витрина и SEO.

### Добавлено

- `src/lib/seo.ts` — `productJsonLd`, `breadcrumbJsonLd`, `organizationJsonLd` (Schema.org).
- **Каталог** `app/[locale]/catalog/page.tsx` — сетка карточек 1/2/3 колонки, выводит published+!deleted товары, превью первого изображения галереи, цена в ₽ за пог. метр.
- **Карточка товара** `app/[locale]/catalog/[slug]/page.tsx` — главное изображение + thumbnail-grid, бейджи аффирмаций, цена, минимальная длина, JSON-LD (Product+Offer+BreadcrumbList), `generateMetadata` с canonical и Open Graph. Кнопка «В корзину» disabled до E3.
- `app/sitemap.ts` — динамический, главная + /catalog/ + все опубликованные товары с `lastModified` из БД.
- `app/robots.ts` — на staging/dev `Disallow: /`, на production-домене `neyroaboi.ru` открывает индексацию + закрывает /admin /profile /cart /checkout /sign-\* /api.

### Verified

- preview: /catalog показывает «Космический Орбит» (1500 ₽), клик → /catalog/kosmicheskiy-orbit с хлебными крошками, описанием, JSON-LD с `@type:"Product"` в DOM. /sitemap.xml содержит главную + каталог + товар. /robots.txt в dev корректно `Disallow: /`.

### Решения

- **JSON-LD через outsourced компонент `JsonLdScript`** с явной экранировкой `</script>` — стандартный Next.js паттерн, безопасный (контент сериализуется JSON.stringify, источник — наша БД).
- **Robots привязан к `NEXT_PUBLIC_BASE_URL`** — переключение домена `aboi.letar.best` → `neyroaboi.ru` автоматически открывает индексацию (E10.b).

## [0.5.0] — 2026-05-05

E2 подэтап B2 — админ-панель товаров.

### Добавлено

- `prisma/seed.ts` — создаёт админ-пользователя через Better Auth `signUpEmail` + назначает роли ADMIN+CUSTOMER + emailVerified=true. Запуск: `nx db:seed aboi`. Параметры через env: `ABOI_ADMIN_EMAIL`, `ABOI_ADMIN_PASSWORD`, `ABOI_ADMIN_NAME` (дефолт: admin@aboi.local / adminpass123).
- **Server actions** `_actions/products.action.ts`: createProductAction, updateProductAction, softDeleteProductAction, restoreProductAction, setPublishedAction, addProductImageAction, removeProductImageAction, moveProductImageAction. Zod v4 валидация с `.strip()`, requireAdmin guard, revalidatePath после изменений.
- **Админ-layout** `/admin/layout.tsx` с `requireAdmin()`, header с навигацией.
- **Дашборд** `/admin/page.tsx` — счётчики товаров (всего / опубликованных / удалённых) с переходом по фильтру.
- **Список товаров** `/admin/products` с фильтрами `?status=all|published|draft|deleted`, превью первого изображения галереи, колонками: name / slug / цена / статус.
- **Создание товара** `/admin/products/new` через универсальный `ProductForm` (name, slug, description, pricePerMeter копейки, minLengthMeters Decimal, affirmations[], published).
- **Редактирование товара** `/admin/products/[id]` с табами `Описание | Галерея`. Кнопки `Опубликовать/Снять с публикации`, `Удалить/Восстановить`.
- **Менеджер галереи** `ProductImageManager` — загрузка через `/api/upload`, отображение grid 2/3/4 колонки, ↑↓ стрелки для reorder через `moveProductImageAction`, кнопка удаления.

### Verified

- preview: signin admin@aboi.local → /admin/products → +Новый товар → форма → submit → редирект на edit → Опубликовать → БД published=true. Скриншот сохранён.

### Решения

- **DnD-reorder отложен** — на B2 простые ↑/↓ кнопки. Drag-drop запланирован в полировке (E2.B4) или R&D на E5.
- **Slug auto-generation** — если не передан, генерится через `slugify(name)`. При коллизии — ошибка с понятным сообщением.
- **Цены в копейках Int** — стандарт e-com, форматирование на клиенте.

## [0.4.0] — 2026-05-05

E2 подэтап B1 — каталог: схема Image/Product/ProductImage, file storage, API upload/files.

### Добавлено

- **schema.zmodel расширение**: `Image` (универсальная модель, category/path/mime/size/width/height/alt), `Product` (slug, name, description, pricePerMeter, minLengthMeters Decimal(6,2), affirmations[], published, soft-delete через deletedAt, @form.\* директивы для будущей формы), `ProductImage` (m2m с sortOrder).
- ZenStack policies: каталог public read для published+!deleted, full-access для админа.
- Миграция `20260505195753_product_image` применена.
- `src/lib/slugify.ts` — кириллица → латиница transliteration для URL-slug.
- `src/lib/images/upload.ts` — `createImageRecord()` через `sharp` (валидация MIME jpg/png/webp, max 10 MB, чтение width/height, сохранение в `apps/aboi/uploads/<category>/<uuid>.<ext>`).
- `app/api/upload/route.ts` — POST multipart/form-data, требует `requireAdmin()`.
- `app/api/files/[...path]/route.ts` — GET с `Cache-Control: public, max-age=31536000, immutable`, защитой от path traversal.
- Папка `apps/aboi/uploads/products/` (bind mount target в production Docker).

### Решения

- Image.id = UUID (а не cuid) — нужен синхронно до создания записи в БД, чтобы определить имя файла. Cuid и UUID совместимы в `String @id`.
- File storage в `uploads/` (вне `public/`) — `public/` ломается в standalone build, потому что Next.js копирует только то, что есть в момент билда.
- Sharp читает метаданные in-memory (без сохранения), это валидирует что буфер действительно картинка.

## [0.3.0] — 2026-05-05

E1 подэтап B2 — Better Auth, i18n каркас, страницы аутентификации, ЛК.

### Добавлено

- **Better Auth конфиг** (`src/lib/auth.ts`): email/password (bcrypt 12) + обязательное подтверждение email, anonymous-плагин для гостевых сессий, nextCookies, rateLimit (5/15мин на signin, 5/час на signup). OAuth (Google/Yandex/VK) — отложено в W-волну.
- `src/lib/auth-client.ts` — Better Auth React клиент с anonymousClient плагином.
- `src/lib/auth-utils.ts` — `getSession`/`getCurrentUser` с обогащением roles из БД (cache на уровне React render), `requireAuth`, `requireAdmin`, `hasRole`.
- `src/lib/merge-anonymous.ts` — перенос Address и ConsentLog с anonymous user на регистрирующегося.
- `app/api/auth/[...all]/route.ts` — Better Auth handler через `toNextJsHandler`.
- **i18n**: `src/i18n/routing.ts` (locales: ru/en/cn, default: ru, `localePrefix: 'as-needed'`), `src/i18n/request.ts`, `messages/{ru,en,cn}.json`. На MVP активна только ru.
- **next-intl plugin** в `next.config.mjs` + `transpilePackages` (@letar/auth, @letar/email и др.) + `skipTrailingSlashRedirect` (для Better Auth POST).
- **Страницы**: `app/[locale]/(auth)/{sign-in,sign-up,sign-out,verify-email}/page.tsx`, `app/[locale]/profile/{layout,page}.tsx` (auth-guard через `requireAuth` в layout).
- `src/proxy.ts` — next-intl middleware для всего, кроме `/api/`.
- Перенос `app/{layout,page}.tsx` → `app/[locale]/{layout,page}.tsx` с `NextIntlClientProvider`, `generateStaticParams`, `setRequestLocale`.

### Решения

- **Auth-проверка вынесена в layout**, не в proxy: Better Auth не работает в Edge runtime middleware. `/profile/layout.tsx` зовёт `requireAuth()` с redirect на /sign-in.
- **autoSignInAfterVerification**: переход по ссылке из письма автоматически логинит пользователя.
- **portable-types fix** (TS2883): `signUp` не реэкспортируется именованным экспортом — используем `authClient.signUp.email(...)` напрямую, иначе TS не может назвать тип без referencing внутренних модулей better-auth.

### Verified

- preview: signup → email в Mailhog (:8026 UI) → verify-link → /profile показывает имя «Тест Гость», `test2@aboi.local`, роль CUSTOMER.

### Известные проблемы

- В dev — hydration mismatch у Chakra emotion на `/profile` (className-хеш отличается между SSR и client). В prod build (turbopack) не воспроизводится — это известная dev-проблема Chakra v3.

## [0.2.0] — 2026-05-05

E1 подэтап B1 — фундамент БД и типы.

### Добавлено

- `docker-compose.dev.yml` — `aboi-postgres` :5443 (БД `neyroaboi_dev`) и `aboi-mailhog` :1026 SMTP / :8026 UI
- `schema.zmodel` — модели Better Auth (User, Account, Session, Verification) + UserProfile + Address + ConsentLog (152-ФЗ)
- ZenStack `type Auth` с булевыми флагами (isAdmin, isManager, isAnonymous) — обходит ограничение has()/in для массивов enum в auth()
- `prisma.config.ts` — конфиг для Prisma 7 + `@prisma/adapter-pg`
- `src/lib/prisma.ts` — нативный `PrismaClient` для Better Auth `prismaAdapter`
- `src/lib/db.ts` — `getEnhancedPrisma()` с `PolicyPlugin` для бизнес-логики, singleton ORM через globalThis
- `project.json` — таргеты `db:generate`, `db:push`, `db:migrate`, `db:studio`, `db:seed`, `zenstack:generate`
- `tsconfig.json` — paths для `@letar/auth`, `@letar/auth/{client,server}`, `@letar/email`
- `package.json` — implicitDependencies на `@letar/auth` и `@letar/email`
- Миграция `20260505192928_init` — применена к dev БД

### Решения

- Заменили делегирование в Ключницу (auth-hub) на собственную Better Auth конфигурацию: email/password + anonymous-плагин. OAuth (Google/Yandex/VK) — отложено в W-волну.
- ZenStack v3 ORM (Kysely под капотом) — для бизнес-логики; нативный Prisma Client — отдельно для Better Auth (Better Auth `prismaAdapter` несовместим с Kysely-обёрткой).

## [0.1.0] — 2026-05-05

Первый коммит. Голый каркас Next.js 16 + React 19 + Chakra UI v3.

### Добавлено

- Структура приложения: `src/app/`, `src/theme/`, `src/app/_components/`
- Тема Chakra UI: терракот (#C25E3A) + фиолетово-синий (#5B4FB8) + тёплая нейтраль
- `Providers` с `ColorModeProvider` и `RootChakraProvider`
- `RootLayout` с SEO мета-тегами + Umami скриптом
- Главная-заглушка с концепцией нейрообоев (hero, принцип «как это работает», тех. характеристики, дисклеймер)
- Конфиги: `next.config.mjs`, `vitest.config.ts`, `vitest.setup.tsx`, `project.json`, `tsconfig.json`
- Документация: `README.md`, `PLAN.md`, `PLAN_TESTING.md`
- `.env` (PORT=3018) и `.env.docker` (DOMAIN=neyroaboi.ru)

### Решения проектирования

- На уровне «голый каркас» — без БД, авторизации, схемы данных и i18n. Эти слои добавляются отдельной итерацией.
- Платёж/доставка/блог — во вторую волну (см. PLAN.md).
- Юр. язык: запрещены формулировки «лечит», «реабилитация», «одобрено врачами»; разрешены — «декор», «настроение», «осмысленный интерьер».

### Источники

- Концепция: [.claude/artifacts/aboi-landing-concept.md](../../.claude/artifacts/aboi-landing-concept.md)
- Требования: [.claude/artifacts/aboi-requirements.md](../../.claude/artifacts/aboi-requirements.md)
- Опросник к Виталию: [.claude/artifacts/aboi-questions-for-vitaliy.md](../../.claude/artifacts/aboi-questions-for-vitaliy.md)
