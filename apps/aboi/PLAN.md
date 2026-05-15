# План разработки — НейроАбоИ (apps/aboi)

> Источник истины для скоупа. Жизненный документ — по мере выполнения отмечай `[x]` и
> переноси сделанное в [CHANGELOG.md](./CHANGELOG.md). Связанные документы:
> [README.md](./README.md), [PLAN_TESTING.md](./PLAN_TESTING.md),
> [.claude/artifacts/aboi-requirements.md](../../.claude/artifacts/aboi-requirements.md),
> [.claude/artifacts/aboi-landing-concept.md](../../.claude/artifacts/aboi-landing-concept.md),
> [.claude/artifacts/aboi-questions-for-vitaliy.md](../../.claude/artifacts/aboi-questions-for-vitaliy.md),
> [.claude/artifacts/aboi-plan-research.md](../../.claude/artifacts/aboi-plan-research.md).

---

## 0. TL;DR плана

- **Текущее состояние:** v0.16.0 — продакшен работает на `neyroaboi.ru`. Каталог, корзина, чекаут с СДЭК API, T-Bank эквайринг, промокоды, сертификаты, реферальная программа, ЛК, админка. SMTP на `neyroaboi.ru`, DKIM/SPF/DMARC настроены.
- **Что строим дальше:** B2C интернет-магазин **«НейроАбоИ»** для ИП Гаева В.В. — обои с зашитыми аффирмациями. Печать под заказ, погонный метр, флизелин 1.07 м, 1500 ₽/пог.м, доставка СДЭК (РФ + опционально РБ/КЗ).
- **Архитектура:** Next.js 16 App Router + PostgreSQL + Prisma + ZenStack v3 + **собственная Better Auth (email/password + anonymous, OAuth — позже)** + Chakra UI v3 + next-intl.
- **MVP:** 10 этапов (E1-E10). Без онлайн-оплаты и СДЭК API на старте — оплата заглушкой «менеджер свяжется», доставка считается вручную. Это даёт работающую витрину для первых заказов и сбора отзывов.
- **Вторая волна:** Tinkoff Эквайринг → СДЭК API → кастомные дизайны → блог → EN/CN локализации → реферальный cash-out для самозанятых.
- **Время оценочно:** MVP — ~3-4 недели работы при фокусе. Без жёсткого дедлайна.

---

## 1. Принятые решения и ограничения

### 1.1 Бизнес

| Решение                  | Значение                                                                               | Источник                   |
| ------------------------ | -------------------------------------------------------------------------------------- | -------------------------- |
| Юр. форма                | ИП Гаев В.В. (ИНН 246603783032)                                                        | заказчик, 2026-05-05       |
| ЦА                       | широкая B2C, без сегментации                                                           | заказчик, 2026-05-05       |
| Домен (production)       | `neyroaboi.ru` — **активен** (зарегистрирован, используется)                           | заказчик, 2026-05-11       |
| Домен (staging)          | `aboi.letar.best` — больше не используется, swap на neyroaboi.ru выполнен              | Ками, 2026-05-11           |
| Базовая цена             | 1500 ₽ за пог. м                                                                       | заказчик, 2026-05-05       |
| Минимальный заказ        | от 1 пог. м (без минимальной суммы)                                                    | заказчик, 2026-05-05       |
| Реферальный %            | **12% по умолчанию**, настраивается в админке                                          | заказчик, 2026-05-05       |
| Стандарт рулона          | флизелин, ширина 1.07 м, обычные чернила                                               | заказчик + чат, 2026-05-05 |
| География                | РФ обязательно, РБ + КЗ — желательно                                                   | заказчик                   |
| Производство             | собственный принтер, отгрузка на следующий день                                        | заказчик                   |
| Эквайринг                | Tinkoff (счёт ИП открыт) — **отложен во вторую волну**                                 | заказчик                   |
| ОФД для 54-ФЗ            | **Tinkoff Касса** (одним пакетом с эквайрингом)                                        | Ками, 2026-05-05           |
| Срок сертификатов        | **12 мес**, после истечения — возврат денег по заявлению                               | Ками, 2026-05-05           |
| Реферальный TTL          | **60 дней** last-click cookie                                                          | Ками, 2026-05-05           |
| СДЭК на MVP              | **Только РФ**; KZ/BY — кнопка «менеджер свяжется», полная интеграция в W2              | Ками, 2026-05-05           |
| Промоутерский режим (W7) | **Минимальный** — партнёрский лендинг с QR на базе E7 (никакого отдельного приложения) | Ками, 2026-05-05           |
| Роли пользователей       | На MVP — только Виталий-`ADMIN`; `MANAGER` роль заложена в схеме, но не используется   | Ками, 2026-05-05           |

### 1.2 Технические

| Решение                                                                                                                       | Обоснование                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth — собственная Better Auth** (email/password + anonymous), OAuth (Google/Yandex/VK) — отложен во вторую волну           | Решение заказчика 2026-05-05: магазин — отдельный продукт со своей пользовательской базой, не зависит от корпоративной Ключницы. Source: `.claude/rules/auth.md`, `apps/driving-school/src/lib/auth.ts` |
| **Anonymous-плагин Better Auth** локально в aboi для гостевой корзины                                                         | Cookie cart_id → anonymous user → миграция на OIDC user при логине через server action `mergeAnonymousAccount`. Source: research §2.1, §2.3                                                             |
| **ZenStack v3** для access-control + Custom Procedures                                                                        | Декларативные политики покрывают user-level доступ; для guest cart — server actions с raw Prisma (cookie не виден политикам). Source: research §2.2                                                     |
| **Cart server-side**, ID в HttpOnly cookie, TTL 30 дней                                                                       | Best practice e-com: нельзя верить клиенту по ценам/наличию. Source: research §2.3                                                                                                                      |
| **Cart merge стратегия**: MergeWithExistingCustomerCart (commercetools) — суммировать quantity для одинаковых SKU             | Дружелюбный UX. Source: research §2.3                                                                                                                                                                   |
| **OrderItem snapshot** (productName, price, lengthMeters)                                                                     | Изменение продукта не должно менять старый заказ. Source: docs/user-profile.md                                                                                                                          |
| **Image** — отдельная модель + `apps/aboi/uploads/` (bind mount) + `/api/files/[...path]`                                     | Загруженное в `public/` ломается после билда. Source: docs/images.md                                                                                                                                    |
| **GiftCertificate — balance модель** (currentBalance + лог транзакций), Crockford Base32 16+ символов, PIN отдельно от номера | Защита от brute-force; UX-валюта вместо single-use. Source: research §2.5                                                                                                                               |
| **Referral — бонусный баланс**, без cash-out на MVP                                                                           | Денежные выплаты физлицам = ИП налоговый агент → 13% НДФЛ + 30% страховых. Бонусы юридически чище. Source: research §2.4                                                                                |
| **Чекаут MVP — без онлайн-оплаты**, статус ORDER_PLACED → менеджер связывается                                                | Tinkoff Эквайринг требует подключения терминала + 54-ФЗ модуль. Не блокируем витрину этим.                                                                                                              |
| **proxy.ts** (Next.js 16, Node.js runtime), не middleware.ts                                                                  | Полный доступ к БД из защиты роутов. Source: docs/auth.md                                                                                                                                               |
| **next-intl** заложен в архитектуру с E1, на запуске только `ru`                                                              | Виталий: «заложить i18n, потом EN+CN». Дешевле сделать сразу, чем мигрировать.                                                                                                                          |
| **trailingSlash: true**                                                                                                       | Стандарт монорепо. Source: docs/architecture.md                                                                                                                                                         |
| **Сервера в РФ** (s2 letar.best, 185.28.85.195)                                                                               | Требование 152-ФЗ ст. 18 ч. 5. Source: research §2.9                                                                                                                                                    |
| **BASE_URL через `NEXT_PUBLIC_BASE_URL`** — не хардкодить                                                                     | Домен `neyroaboi.ru` активен. Смена env выполнена — код не менялся. SEO meta + canonical + JSON-LD через env.                                                                                           |

### 1.3 Юридические рамки (запреты)

- **Запрещены формулировки** на сайте, в письмах, в meta: «лечит», «терапия», «реабилитация», «одобрено врачами», «клинически доказано». Только «декор», «настроение», «осмысленный интерьер». ФЗ «О рекламе» ст. 24.
- **Дисклеймер** «декоративный продукт, не медицинское изделие» — обязателен в футере + оферте.
- **Регистрация в РКН** как оператора ПДн — блокер публичного запуска (ФЗ-152).

---

## 2. Архитектурные решения

### 2.1 Структура проекта (целевая, после E1-E10)

```
apps/aboi/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # роут-группа без layout магазина
│   │   │   ├── signin/page.tsx
│   │   │   └── signout/page.tsx
│   │   ├── (shop)/                    # витрина: header + footer
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # главная (есть)
│   │   │   ├── catalog/
│   │   │   │   ├── page.tsx          # список дизайнов
│   │   │   │   └── [slug]/page.tsx   # карточка
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── checkout/success/[orderNumber]/page.tsx
│   │   │   ├── gift/page.tsx         # покупка сертификата
│   │   │   ├── offer/page.tsx        # оферта
│   │   │   ├── privacy/page.tsx      # политика ПДн
│   │   │   ├── delivery/page.tsx
│   │   │   └── payment/page.tsx
│   │   ├── profile/                   # ЛК
│   │   │   ├── layout.tsx            # требует auth
│   │   │   ├── page.tsx              # обзор
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [orderNumber]/page.tsx
│   │   │   ├── addresses/page.tsx
│   │   │   ├── favorites/page.tsx
│   │   │   ├── referrals/page.tsx    # реферальная программа
│   │   │   └── settings/page.tsx
│   │   ├── admin/                     # админ-панель
│   │   │   ├── layout.tsx            # requireAdmin
│   │   │   ├── page.tsx              # дашборд
│   │   │   ├── products/             # CRUD товаров
│   │   │   ├── orders/               # обработка заказов
│   │   │   ├── promos/               # промокоды
│   │   │   ├── gift-certificates/    # сертификаты
│   │   │   ├── referrals/            # партнёры
│   │   │   ├── users/                # пользователи (RO + блок)
│   │   │   └── content/              # тексты главной
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts        # Better Auth handler
│   │   │   ├── files/[...path]/route.ts      # uploads сервинг
│   │   │   ├── upload/route.ts               # POST загрузка
│   │   │   ├── webhooks/
│   │   │   │   ├── tinkoff/route.ts          # (W1) платёж callback
│   │   │   │   └── cdek/route.ts             # (W2) трекинг
│   │   │   └── consent/route.ts              # cookie consent log
│   │   ├── _actions/                  # глобальные server actions
│   │   ├── _components/
│   │   │   ├── providers.tsx         # есть
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── cookie-consent/
│   │   └── layout.tsx                # есть
│   ├── lib/
│   │   ├── db.ts                     # getEnhancedPrisma
│   │   ├── auth.ts                   # Better Auth config (OIDC + anonymous)
│   │   ├── auth-client.ts            # client SDK
│   │   ├── prisma.ts                 # base prisma client
│   │   ├── cart.ts                   # serverActions: addToCart, mergeAnonymous, ...
│   │   ├── pricing.ts                # calcLineTotal, calcOrderTotal
│   │   ├── promo.ts                  # validatePromo, applyPromo
│   │   ├── gift-certificate.ts       # generateCode, redeem, getBalance
│   │   ├── referral.ts               # attribution, calc earning
│   │   ├── images/
│   │   │   ├── upload.ts             # createImageRecord (sharp)
│   │   │   └── serve.ts              # GET /api/files/...
│   │   ├── order-emails.ts           # @letar/email обёртки
│   │   ├── seo.ts                    # JSON-LD helpers
│   │   ├── slugify.ts
│   │   └── validations/              # Zod схемы (с .strip())
│   ├── generated/                    # ZenStack/Prisma — НЕ редактировать
│   ├── theme/                        # есть
│   ├── i18n/
│   │   ├── routing.ts                # next-intl
│   │   ├── messages/ru.json          # старт — только ru
│   │   ├── messages/en.json          # заглушка
│   │   └── messages/cn.json          # заглушка
│   └── middleware.ts → proxy.ts      # Next.js 16
├── prisma/
│   ├── migrations/                   # auto
│   ├── seed.ts                       # admin user + тестовый промокод
│   └── seed-test.ts                  # для CI
├── uploads/                          # bind mount, в .gitignore
│   └── products/
├── schema.zmodel                     # ZenStack — единственный источник правды
├── prisma.config.ts
├── next.config.mjs                   # есть, расширить trailingSlash
├── proxy.ts                          # Next.js 16 защита роутов
├── project.json                      # есть, расширить ZenStack targets
└── package.json                      # есть
```

### 2.2 Схема данных (целевая, MVP)

> Подробности в `schema.zmodel` (создаётся в E1). Это эскиз для согласования.

```
User (Better Auth)
  id, email, emailVerified, name, image, isAnonymous, roles[ADMIN|MANAGER|CUSTOMER],
  phone?, createdAt, updatedAt

UserProfile               OneToOne User
  userId, firstName?, lastName?, gender?, birthDate?,
  preferredAffirmations[]  // массив строк-меток

Address
  id, userId, fullName, phone, country, region, city, street,
  building, apartment?, postalCode, isDefault, createdAt

Image
  id, filename, path, mimeType, size, width, height, category, uploadedById

Product                            // дизайн обоев
  id, slug @unique, name, description, basePrice (Int, копейки),
  pricePerMeter (Int, копейки),
  affirmations[],          // встроенные слова — для SEO/фильтров (если будут)
  thumbnailId, gallery[ProductImage],
  published, createdAt, updatedAt
  deletedAt?               // soft delete
ProductImage                       // m2m через JoinTable (sortOrder)
  productId, imageId, sortOrder

Cart
  id, userId? (nullable для guest), guestSessionId? @unique,
  status (ACTIVE|CONVERTED|ABANDONED), expiresAt, createdAt, updatedAt
CartItem
  cartId, productId, lengthMeters Decimal, unitPrice (snapshot, копейки),
  customNote?, createdAt

Order
  id, orderNumber unique (ORD-YYYYMMDD-XXXXX),
  userId? (для гостевых заказов — null + customerEmail),
  status (PLACED|CONFIRMED|PAID|PRINTING|SHIPPED|DELIVERED|CANCELLED|REFUNDED),
  customerEmail, customerPhone, customerName,
  shippingAddressSnapshot Json,
  shippingMethod (CDEK_POINT|CDEK_DOOR|MANAGER_CALL),
  shippingCost (Int),
  itemsTotal, discountTotal, certificateApplied, totalToPay,
  promoCodeUsed?, giftCertificateId?,
  notes?, internalNotes?,
  paidAt?, shippedAt?, deliveredAt?, cancelledAt?,
  trackingNumber?, paymentMethod (PENDING|TINKOFF|MANAGER),
  paymentExternalId?,
  createdAt, updatedAt
OrderItem
  orderId, productId? (может удалиться), productNameSnapshot,
  productImageSnapshot,
  lengthMeters Decimal, unitPrice, total

Promo                              // промокоды
  id, code unique, type (PERCENT|FIXED), value Int,
  minOrderAmount?, maxUses?, usedCount, validFrom, validUntil,
  isActive, createdAt
PromoUsage
  promoId, orderId @unique, userId?, usedAt

GiftCertificate
  id, code unique (Crockford Base32 16 chars), pin (4 digits, hashed),
  initialAmount Int, currentBalance Int,
  issuedToEmail?, issuedByOrderId?,
  expiresAt, isActive, createdAt
GiftCertificateTransaction
  certificateId, orderId?, amount (delta), reason (PURCHASE|REDEEM|ADJUST),
  performedAt
GiftCertificateLookup              // для rate limit / fraud detection
  ipAddress, attemptedCode, success, attemptedAt

Referral
  id, ownerUserId @unique, code unique (8-10 chars, Crockford Base32),
  status (ACTIVE|DISABLED), createdAt
ReferralAttribution                // факт перехода по ссылке
  id, referralId, refereeUserId? (nullable до регистрации),
  visitorAnonymousId? (cookie до регистрации),
  ipHash, attributedAt
ReferralEarning
  id, referralId, refereeUserId, orderId @unique,
  amount Int (бонусная сумма),
  status (PENDING|APPROVED|PAID|REVERSED),
  pendingUntil DateTime, approvedAt?, paidAt?,
  reasonReversed?

UserBalance                        // бонусный счёт партнёра
  userId @unique, balance Int, lifetimeEarned Int, updatedAt
BalanceTransaction
  userId, amount Int, type (REFERRAL_PAYOUT|ORDER_USE|ADJUST),
  orderId?, performedAt

Wishlist                           // избранное
  userId, productId @@unique([userId, productId]), addedAt

ConsentLog                         // 152-ФЗ
  id, anonymousId/userId, ipHash, userAgent,
  acceptedAnalytics, acceptedMarketing, acceptedFunctional,
  consentedAt, consentVersion (string)

ContentBlock                       // главная — динамика без передеплоя
  id, slug unique, locale, title, body Json, updatedById, updatedAt
```

**Соглашения:**

- Все суммы в БД — копейки (Int), форматирование на клиенте.
- `Decimal` для `lengthMeters` — точность до 0.01 (1 см).
- Soft delete только для Product (через `deletedAt`); Order никогда не удаляются.
- Уникальность `orderNumber` через cuid + checksum, не autoincrement (защита от перебора).

### 2.3 ZenStack policies — общая схема

```zmodel
// Чтение каталога — все
model Product {
  @@allow('read', published == true && deletedAt == null)
  @@allow('all', has(auth().roles, ADMIN))
}

// Cart — только владелец-пользователь, guest cart обрабатывается через server actions
model Cart {
  @@allow('read,update', auth() != null && userId == auth().id)
  @@allow('all', has(auth().roles, ADMIN))
  // guest cart: cookies → server action с raw prisma
}

// Order — owner + admin
model Order {
  @@allow('read', auth() != null && (userId == auth().id || has(auth().roles, ADMIN)))
  @@allow('create', true)            // и гость, и юзер
  @@allow('update', has(auth().roles, ADMIN))
  @@deny('delete', true)             // никогда не удаляем заказы
}

// Wishlist, Address, UserBalance — owner-only
model Wishlist {
  @@allow('all', auth() != null && userId == auth().id)
}

// Гостевые поля — скрыть от чтения
model Cart {
  guestSessionId String? @deny('read', auth() == null)
}
```

### 2.4 Auth-flow (E1)

```
1. Гость заходит → server action на любой endpoint, требующий identity
2. lib/cart.ts создаёт anonymous user через better-auth.api.signInAnonymous()
3. Set-Cookie: aboi.session=... (HttpOnly, Secure, 30 дней)
4. Гость кладёт в cart, создаёт order — всё привязано к anonymous.id

При регистрации/логине email+password:
5. /signup → форма (email, password, name) → authClient.signUp.email()
6. Better Auth создаёт User+Account, отправляет verification email через @letar/email
7. databaseHook user.create.before: если есть cookie aboi.anon_id → mergeAnonymousAccount
   - переносит Cart, CartItem, Wishlist, Address с anon.id на user.id
   - удаляет anonymous user
8. /signin → форма (email, password) → authClient.signIn.email()
9. Аналогичный merge, если был anonymous

OAuth провайдеры (W-волна, не MVP):
- Google, Yandex, VK — добавляются по тому же паттерну, что в driving-school
```

---

## 3. MVP — план по этапам

> Каждый этап — самостоятельная коммитуемая единица. После каждого `nx typecheck:tsgo aboi`,
> `nx lint aboi`, `nx test aboi` зелёные. Acceptance — проверяется в браузере через preview.

### E0. ✅ Голый каркас (готово)

- v0.1.0, коммит `8319dbf9`. Главная-заглушка работает на :3018.

### E1. БД + Better Auth + базовые модели

**Цель:** работающая регистрация/логин email+password, гостевая anonymous-сессия, базовые модели User/Address. Подключён каркас i18n (`app/[locale]/...` + next-intl).

**Зависимости:** PostgreSQL поднят в Docker (`neyroaboi-postgres`).

**Задачи:**

- [ ] Поднять локальный Postgres через `apps/aboi/docker-compose.dev.yml` (порт 5443, БД `neyroaboi_dev`).
- [ ] Подключить @letar/-зависимости через `tsconfig.json paths` + `package.json implicitDependencies`: `@letar/email`, `@letar/auth`, плюс прямые: `@zenstackhq/orm`, `@zenstackhq/plugin-policy`, `@zenstackhq/plugin-prisma`, `@zenstackhq/plugin-form-schema`, `@prisma/client`, `@prisma/adapter-pg`, `better-auth`, `pg`, `bcryptjs`, `sharp`, `next-intl`.
- [ ] Создать `apps/aboi/schema.zmodel` с моделями: `User` (с roles=ADMIN/MANAGER/CUSTOMER, isAnonymous, phone), `Account`, `Session`, `Verification` (для Better Auth), `UserProfile`, `Address`, `ConsentLog`. Подключить `plugin prisma`, `plugin policy`, `plugin form-schema`.
- [ ] Создать `prisma.config.ts`, `apps/aboi/prisma/seed.ts` (создать админ пользователя `vitaliy@aboi.local`).
- [ ] Добавить targets в `project.json`: `zenstack:generate`, `db:push`, `db:migrate`, `db:studio`, `db:seed`.
- [ ] `lib/prisma.ts` — base client. `lib/db.ts` — getEnhancedPrisma.
- [ ] `lib/auth.ts` — Better Auth конфиг: `prismaAdapter`, `emailAndPassword` (с bcrypt + emailVerification.requireEmailVerification=true), `anonymous()` плагин, `nextCookies()`. Кастомный `additionalFields.roles: string[]`. databaseHook `user.create.before` для merge anonymous.
- [ ] `lib/auth-client.ts` — клиент SDK (через `createAuthClient` из @letar/auth/client).
- [ ] `lib/auth-utils.ts` — `getCurrentUser`, `requireAuth`, `requireAdmin` через `createAuthGuards` из @letar/auth/server.
- [ ] API `app/[locale]/api/auth/[...all]/route.ts` — Better Auth handler (`toNextJsHandler`).
- [ ] i18n структура: `src/i18n/routing.ts` (locales=['ru','en','cn'], default='ru', `localePrefix:'as-needed'`), `src/i18n/request.ts`, `src/i18n/messages/{ru,en,cn}.json` (на старте только ru заполнен), `proxy.ts` через `createMiddleware(routing)`.
- [ ] Перенести `app/page.tsx` и `app/_components/` под `app/[locale]/`.
- [ ] Странички `(auth)/signin/page.tsx` (форма email+password), `(auth)/signup/page.tsx`, `(auth)/signout/page.tsx`, `(auth)/verify-email/page.tsx`, `profile/page.tsx` (заглушка с именем юзера).
- [ ] `proxy.ts` в корне `apps/aboi/` — компонует i18n middleware + защита `/profile/*` и `/admin/*` (редирект на /signin).
- [ ] Server action `mergeAnonymousAccount(prevAnonUserId)` — вызывается из databaseHook при регистрации/входе.
- [ ] Применить миграции `nx db:migrate aboi -- --name init`.
- [ ] `.env.local` (НЕ коммитить): `DATABASE_URL`, `BETTER_AUTH_SECRET` (32 байта), `BETTER_AUTH_URL=http://localhost:3018`, `NEXT_PUBLIC_BASE_URL=http://localhost:3018`, `SMTP_HOST=localhost`, `SMTP_PORT=1025` (Mailhog для dev) или прямая отправка через @letar/email.
- [ ] `.env.docker` дополнить теми же переменными (без значений секретов).

**Acceptance:**

- `docker compose -f apps/aboi/docker-compose.dev.yml up -d` поднимает Postgres.
- `nx dev aboi` поднимается, главная на `/` доступна (без локаль-префикса).
- `/signup` — форма регистрации; после submit — User в БД, отправляется письмо с подтверждением.
- `/signin` — после успешного входа редирект на `/profile`, отображается имя.
- Cookie `aboi.session` установлено `HttpOnly, Secure (in prod), SameSite=Lax, Max-Age=7d`.
- `/admin/*` доступен только при `roles.includes('ADMIN')`.
- Гость без логина может вызвать server action — создаётся anonymous user; после регистрации anonymous-данные мерджатся.

**Тесты:**

- Юнит: `lib/auth.ts` конфиг (smoke), schema валидация для Address, `mergeAnonymousAccount`.
- E2E: «гость → /signup → подтверждение email → /signin → /profile показывает имя».

**Риски:**

- Account linking баг с разным регистром email — добавить нормализацию email в hook `before:user.create`.
- Anonymous плагин и `databaseHooks.user.create` могут конфликтовать — тестировать сценарий «положил в корзину гостем → зарегистрировался → корзина сохранилась».
- В dev отправка email требует Mailhog — добавить контейнер в `docker-compose.dev.yml`.

---

### E2. Каталог: модели Product/Image, админка товаров, витрина

**Цель:** Виталий может загружать дизайны через админку, гость видит каталог и карточку.

**Зависимости:** E1.

**Задачи:**

- [ ] Расширить `schema.zmodel`: `Image`, `Product`, `ProductImage`. Добавить policies (read=published, full=admin).
- [ ] `nx db:migrate aboi -- --name product_image`.
- [ ] `lib/images/upload.ts` — `createImageRecord(file)` через sharp (определяет width/height), сохраняет в `apps/aboi/uploads/products/<cuid>.{ext}`, создаёт запись Image.
- [ ] API `app/api/upload/route.ts` — `POST` (multipart, multer-style через `formidable` или ручной парсинг), проверка MIME (image/jpeg, image/png, image/webp), max 10 MB.
- [ ] API `app/api/files/[...path]/route.ts` — `GET` сервит файлы из `uploads/` с `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Админ-страницы `app/admin/products/` :
  - `page.tsx` — список с фильтром (published/draft/deleted)
  - `new/page.tsx` — форма создания (`@letar/forms`, ZenStack form-schema)
  - `[id]/page.tsx` — редактирование (drag-drop галереи, smart slugify, превью)
  - server actions: createProduct, updateProduct, softDeleteProduct, restoreProduct, addProductImage, reorderProductImages, removeProductImage
- [ ] Витрина `app/(shop)/catalog/page.tsx` — сетка карточек (3 колонки на десктопе, 2 на планшете, 1 на мобильном). Pagination/infinite scroll — пока 24 на страницу.
- [ ] `app/(shop)/catalog/[slug]/page.tsx` — галерея + цена + поле «длина в метрах» (number input, min 1, step 0.5) + кнопка «В корзину».
- [ ] `lib/seo.ts` — `productJsonLd(product)`, `breadcrumbJsonLd(...)`.
- [ ] `app/sitemap.ts` — динамический.
- [ ] `app/robots.ts` — `Disallow: /admin/, /cart, /checkout, /profile/, /api/`.

**Acceptance:**

- Админ заходит, загружает 3 дизайна с превью, помечает один как «опубликован».
- Гость на `/catalog` видит ровно 1 опубликованный, переход на `/catalog/<slug>` показывает галерею + цену.
- View-source страницы: `<script type="application/ld+json">` с `Product`, `Offer`, `BreadcrumbList`.
- `/sitemap.xml` содержит главную + каталог + каждый товар.

**Тесты:**

- Юнит: pricing.ts (calcLineTotal округление), slugify, ZenStack policies (negative test: гость не может создать Product).
- Component: ProductCard рендерит цену корректно.
- E2E: админ создаёт товар, гость видит на витрине.

**Риски:**

- Sharp с Turbopack — могут быть проблемы native modules. Fallback: `sharp` через Node API в server action, не в edge.

---

### E3. Корзина: гостевая + пользовательская + слияние

**Цель:** гость и юзер кладут в корзину, при логине они мерджатся. Состояние корзины — server-side.

**Зависимости:** E2.

**Задачи:**

- [ ] Расширить `schema.zmodel`: `Cart`, `CartItem`. Policies — owner-only через user.id, для guest — server actions с raw prisma + cookie проверка.
- [ ] `nx db:migrate aboi -- --name cart`.
- [ ] `lib/cart.ts`:
  - `getOrCreateCart()` — server action: если есть session → находит/создаёт user-cart; если нет — создаёт guest cart с UUID в HttpOnly cookie `aboi.cart_id`.
  - `addToCart(productId, lengthMeters)` — добавляет, или увеличивает length у существующего item.
  - `updateCartItem(itemId, lengthMeters)` — изменение длины, валидация ≥ 1.
  - `removeFromCart(itemId)`.
  - `clearCart()`.
  - `mergeCarts(guestCartId, userCartId)` — стратегия MergeWithExistingCustomerCart: для одинаковых productId суммировать lengthMeters; вызывается из `mergeAnonymousAccount` (E1).
- [ ] `app/(shop)/cart/page.tsx` — список item-ов, изменение длины, удаление, итог.
- [ ] Header: счётчик «корзина (N)» через `useQuery` с TanStack.
- [ ] Cookie expiry: 30 дней, продление при каждом действии с корзиной.

**Acceptance:**

- Гость добавляет 2 товара по 3 м, в корзине 2 строки.
- Логинится → корзина та же. Если в user-cart уже было что-то — суммируется.
- Refresh страницы корзина не теряется.

**Тесты:**

- Юнит: `mergeCarts` — пустая user + 2 в guest = 2 в user; user уже имеет product A 2м + guest имеет A 3м → user A 5м.
- E2E: «гость → положил → залогинился → видит свою корзину».

**Риски:**

- Race condition при логине: 2 параллельных запроса к `mergeAnonymousAccount`. Решение: idempotent через `Cart.guestSessionId` unique + try/catch P2002.

---

### E4. Чекаут (без онлайн-оплаты)

**Цель:** гость/юзер оформляет заказ. На MVP — без Tinkoff: Order создаётся со статусом `PLACED`, шлёт email админу + клиенту.

**Зависимости:** E3, `@letar/email` доступен.

**Задачи:**

- [ ] Расширить `schema.zmodel`: `Order`, `OrderItem`, `OrderStatus` enum.
- [ ] `nx db:migrate aboi -- --name order`.
- [ ] `lib/pricing.ts`: `calcOrderTotal(cart, promo?, certificate?)` — пока без discount-логики (E6).
- [ ] `app/(shop)/checkout/page.tsx` — форма (`@letar/forms`):
  - Контактные данные (name, email, phone) — для гостя required, для юзера preset.
  - Адрес (страна dropdown RU/BY/KZ; регион; город; улица; дом; квартира; индекс).
  - Способ доставки — пока 2 опции: «СДЭК до пункта выдачи» (стоимость указывается менеджером после звонка) и «Менеджер свяжется». Реальный СДЭК API — в W2.
  - Поле «Комментарий».
  - Чекбокс «Согласен с офертой и политикой ПДн» (required).
- [ ] Server action `placeOrder(formData)`:
  - Валидация Zod с .strip().
  - Транзакционно (последовательно — `$transaction` в ZenStack v3 нет): создать Order + OrderItems из Cart, поставить статус `PLACED`, помечать Cart `CONVERTED`.
  - Создать `OrderItem` со снэпшотом (productNameSnapshot, productImageSnapshot, unitPrice).
  - Сгенерировать `orderNumber = ORD-YYYYMMDD-XXXXX` через counter table (или sequence на cuid).
  - Отправить email клиенту: «Заказ #N принят, менеджер свяжется».
  - Отправить email админу.
- [ ] `app/(shop)/checkout/success/[orderNumber]/page.tsx` — страница спасибо.
- [ ] Админ-страницы `app/admin/orders/`:
  - `page.tsx` — список с фильтром по статусу, поиск по `orderNumber`/email/phone.
  - `[id]/page.tsx` — детали + кнопки смены статуса (`PLACED → CONFIRMED → PAID → PRINTING → SHIPPED → DELIVERED`).
  - Отдельные actions: `cancelOrder`, `addInternalNote`, `setTrackingNumber`.
  - При смене статуса — отправка соответствующего email клиенту.

**Acceptance:**

- Гость оформляет заказ → переход на success-страницу с номером, в почте письмо.
- Админ видит заказ в списке, меняет статус → клиент получает письмо «оплачен».
- Cart очищается после успешного оформления.
- На noindex `/checkout` через metadata.

**Тесты:**

- Юнит: `placeOrder` — заказ-снэпшот не зависит от изменений Product после.
- E2E: «гость → корзина → чекаут → оформил → стиль success → email в Mailhog».

**Риски:**

- Длинная цепочка: Cart → Order. Если transaction нет — частичный заказ. Решение: при ошибке середины — компенсация (удалить созданный Order, восстановить Cart). Хорошо логировать.
- Уникальность `orderNumber` — не использовать `Date.now()`, использовать счётчик в БД с `update + returning`.

---

### E5. ЛК

**Цель:** пользователь видит свои заказы, адреса, избранное.

**Зависимости:** E1, E4.

**Задачи:**

- [ ] Расширить `schema.zmodel`: `Wishlist`.
- [ ] `app/profile/page.tsx` — обзор: имя/email + индикатор заполненности профиля + ссылки на разделы.
- [ ] `app/profile/orders/page.tsx` — список заказов user.id.
- [ ] `app/profile/orders/[orderNumber]/page.tsx` — детали + tracking-номер если есть.
- [ ] `app/profile/addresses/page.tsx` — CRUD адресов, isDefault toggle.
- [ ] `app/profile/favorites/page.tsx` — список Wishlist + кнопка «убрать», ссылки на товары.
- [ ] На `app/(shop)/catalog/[slug]/page.tsx` — кнопка «В избранное» (для авторизованных).
- [ ] `app/profile/settings/page.tsx` — изменение имени/телефона + удаление аккаунта (152-ФЗ право на удаление).

**Acceptance:**

- ЛК загружается за < 500мс на dev.
- Удаление аккаунта каскадом: User + Wishlist + Address + Cart. Order не удаляется (хранится с обезличенным userId=null + customerEmail snapshot для отчётности).

**Тесты:**

- E2E: «логин → /profile → /profile/orders → клик по заказу → детали».

---

### E6. Промокоды + Подарочные сертификаты

**Цель:** Виталий создаёт промокоды и сертификаты, клиенты их применяют в чекауте.

**Зависимости:** E4.

**Задачи:**

- [ ] Расширить `schema.zmodel`: `Promo`, `PromoUsage`, `GiftCertificate`, `GiftCertificateTransaction`, `GiftCertificateLookup`.
- [ ] `lib/promo.ts`: `validatePromo(code, cart, userId?)` → возвращает скидку или ошибку.
- [ ] `lib/gift-certificate.ts`:
  - `generateCode()` — 16 символов Crockford Base32.
  - `generatePin()` — 4 цифры.
  - `redeem(code, pin, amount)` — атомарно списывает `amount` из `currentBalance`, создаёт транзакцию.
  - `getBalance(code, pin)` — для UX, с rate limit (10/час/IP, лог в `GiftCertificateLookup`).
- [ ] Расширить `placeOrder`: применение промокода и сертификата (порядок: промокод → суббота → сертификат → доплата).
- [ ] Чекаут — поля «Промокод» и «Подарочный сертификат» (код + PIN).
- [ ] Админ:
  - `app/admin/promos/` — CRUD промокодов (тип PERCENT/FIXED, value, лимит использований, срок).
  - `app/admin/gift-certificates/` — список + создание (выдать клиенту вручную) + просмотр транзакций.
- [ ] Покупка сертификата: `app/(shop)/gift/page.tsx` — форма (номинал, имя получателя, email получателя), создаёт Order типа `gift` и при оплате (или статусе `CONFIRMED`) генерирует сертификат + отправляет код + PIN на email.

**Acceptance:**

- Гость в чекауте применяет промокод → итог пересчитывается.
- Клиент покупает сертификат на 5000, получает на email; оплачивает им следующий заказ на 4500 → балансе остаётся 500.
- Brute-force защита: 11-я попытка неверного PIN с одного IP — блок на час.
- Истекший сертификат не сжигает баланс — UI показывает «срок истёк, обратитесь в поддержку для возврата средств».

**Тесты:**

- Юнит: `redeem` — нельзя списать больше остатка, нельзя списать с неактивного.
- Юнит: rate limit — 11-й request возвращает 429.
- E2E: full flow покупки сертификата + применения.

**Риски:**

- Юр. риск истечения сертификата: в оферте указать «срок 12 мес, после истечения — возврат остатка по заявлению на email магазина в течение 10 рабочих дней». `currentBalance` всегда recoverable, не сжигать.
- Cron-напоминания клиенту за **30 / 14 / 7 / 1** день до истечения через email.

---

### E7. Реферальная программа (бонусный баланс)

**Цель:** клиент A получает уникальную ссылку, B регистрируется через неё и покупает, A получает % бонусом на UserBalance.

**Зависимости:** E1, E4.

**Задачи:**

- [ ] Расширить `schema.zmodel`: `Referral`, `ReferralAttribution`, `ReferralEarning`, `UserBalance`, `BalanceTransaction`.
- [ ] `lib/referral.ts`:
  - `getOrCreateMyReferral(userId)` — code, ссылка `${NEXT_PUBLIC_BASE_URL}/?ref=<code>` (staging: `aboi.letar.best`, prod: `neyroaboi.ru`).
  - `attributeVisit(refCode, anonymousId)` — server action из middleware/proxy: при `?ref=` → cookie `aboi.ref` (HttpOnly, **60 дней** — last-click TTL из `Settings`) + запись `ReferralAttribution`.
  - `linkReferralToUser(userId)` — при регистрации, если есть cookie `aboi.ref` → обновить `ReferralAttribution.refereeUserId`.
  - `calcEarning(orderId)` — после оплаты заказа: если есть атрибуция → создать ReferralEarning (% берём из `Settings.referralPercent`, по умолчанию **12%**, от `Order.itemsTotal`), статус PENDING до 14 дней (срок возврата). По cron — APPROVED → начисление в UserBalance.
- [ ] Модель `Settings` (key/value) — для настраиваемых параметров: `referralPercent` (Int, дефолт **12**), `referralCookieTtlDays` (Int, дефолт **60**), `referralPendingDays` (Int, дефолт 14), `giftCertificateExpiryMonths` (Int, дефолт **12**). Расширяется по мере появления настроек.
- [ ] Админ-страница `app/admin/settings/page.tsx` — редактирование `referralPercent` (0-100) и других параметров. Изменение `referralPercent` НЕ применяется задним числом к уже созданным `ReferralEarning`.
- [ ] `app/profile/referrals/page.tsx`: моя ссылка (с кнопкой копирования), статистика (приведённых, оплаченных), мой баланс, история.
- [ ] Применение бонусов в чекауте: чекбокс «Списать N бонусов» (max = balance). Списание создаёт `BalanceTransaction.type = ORDER_USE`.
- [ ] Cron: ежедневно проверять `ReferralEarning.status = PENDING` && `pendingUntil < now()` → APPROVED + начисление в UserBalance.
- [ ] Админ `app/admin/referrals/` — статистика, список Earning, ручная корректировка.

**Acceptance:**

- A заходит в `/profile/referrals`, копирует ссылку.
- B открывает ссылку, регистрируется, делает заказ на 10 000 ₽.
- Через 14 дней ReferralEarning → APPROVED, у A баланс +1 200 ₽ (12% при дефолтных Settings).
- Если админ перед этим поменял `referralPercent` на 8% — earning, созданный до изменения, остаётся 12%; новый заказ начисляется уже по 8%.
- A применяет 1 200 бонусов в следующем заказе — итог уменьшается.

**Тесты:**

- Юнит: `attributeVisit` — last-click переписывает; cookie TTL 90 дней.
- E2E: full flow реферальной атрибуции.

**Риски:**

- Self-referral: A регистрируется с двух устройств, ставит свой `ref`. Защита: при `linkReferralToUser`, если `referral.ownerUserId == userId` → отвергаем.
- Налоговый риск: если в будущем cash-out — необходим статус самозанятого у партнёра. На MVP только бонусы — ОК.

---

### E8. i18n каркас (next-intl, ru-only активен)

**Цель:** заложена архитектура для EN/CN. На запуске активен только ru.

**Зависимости:** E2 (чтобы не переписывать каталог под locale).

**Задачи:**

- [ ] Установить `next-intl`. Конфиг в `src/i18n/routing.ts`: locales `['ru', 'en', 'cn']`, default `ru`, `localePrefix: 'as-needed'` (главная без `/ru/`).
- [ ] Перенести `app/` под `app/[locale]/...` или использовать middleware-based routing — выбрать тот, что в premium-rosstil.
- [ ] Все статические тексты вынести в `messages/ru.json` (главная, header, footer, формы, страницы).
- [ ] `app/sitemap.ts` — мультиязычный `alternates`.
- [ ] Метаданные: `metadata.alternates.languages`.
- [ ] `<LanguageSwitcher>` компонент (на старте только ru — disabled, но есть в UI).

**Acceptance:**

- `nx dev aboi` работает на `/` (ru).
- В meta-тегах `<link rel="alternate" hreflang="ru">`, заглушки для en/cn (404 пока).
- `messages/en.json`, `messages/cn.json` существуют, но пусты — добавятся в W5.

**Тесты:**

- Smoke: каждая страница рендерится со строками из `ru.json`.

**Риск:** перенос из плоского `app/` в `app/[locale]/` ломает все ссылки. Сделать **до** массового заполнения страниц или вообще раньше (между E1 и E2). Лучше — сразу в E1 закладывать `app/[locale]/`.

> **РЕВИЗИЯ:** перенести этот этап ВПЕРЁД, между E1 и E2 — структуру i18n заложить в E1, заполнение `messages/ru.json` идёт по мере появления экранов.

---

### E9. Юр. + SEO + аналитика + cookie consent + регистрация РКН

**Цель:** соответствие 152-ФЗ, ФЗ «О рекламе», полноценное SEO, готовность к индексации.

**Зависимости:** E1-E8.

**Задачи:**

- [ ] Юр. страницы: `/offer`, `/privacy`, `/delivery`, `/payment`, `/terms`. Контент — на основе шаблонов premium-rosstil + правка под нейрообои (адаптировать запреты на «лечение/реабилитацию», ссылки на ИП Гаева В.В., ИНН, реквизиты счёта).
- [ ] `<CookieConsentBanner>` — три кнопки «Принять все / Только необходимые / Настроить»; opt-in для analytics+marketing; opt-out → блокировать загрузку Я.Метрики и Umami скриптов.
- [ ] API `app/api/consent/route.ts` — POST лог в `ConsentLog` (IP-хэш, timestamp, что согласовали).
- [ ] Я.Метрика — добавить через `@letar/yandex-metrika` (или прямой скрипт), счётчик создать в Я.Вебмастере; счётчик подключается ТОЛЬКО при cookie acceptance.
- [ ] JSON-LD: Organization (главная), Product+Offer+BreadcrumbList (карточки).
- [ ] Open Graph картинки: `/api/og?slug=...` через `@vercel/og` (на основе паттерна premium-rosstil).
- [ ] **Подача в РКН** — отдельная задача владельца (Виталий), но Ками готовит проект уведомления (текст, перечень ПДн, цели).
- [ ] Аудит SEO через `/audit:seo-audit aboi` — фикс всего что найдёт.
- [ ] Lighthouse: цель Perf ≥ 90, A11y ≥ 95, SEO 100.

**Acceptance:**

- `/privacy` и `/offer` опубликованы и линкуются из футера + чекаута.
- Cookie banner появляется на первом визите, выбор сохраняется.
- Lighthouse цели достигнуты.

**Тесты:**

- Manual: проверка всех юр. страниц.
- E2E: cookie banner — клик «Только необходимые» → Я.Метрика не загружается (проверка `window._ym`).

---

### E10. Деплой — двухфазный

**Цель:** сначала https://aboi.letar.best (staging для разработки и демонстраций Виталию), потом swap на https://neyroaboi.ru после регистрации домена и подачи в РКН.

**Зависимости:** E1-E9.

#### E10.a — Staging-деплой на `aboi.letar.best` ✅

- [x] Production БД на s2 — `neyroaboi_prod`, пользователь создан.
- [x] `.env.docker` заполнен через `/sync-env`. (2026-05-11)
- [x] `Dockerfile.production` + `docker-compose.production.yml`. (v0.12.0)
- [x] DNS — A-запись `neyroaboi.ru → 185.28.85.195` (s2). (2026-05-11)
- [x] NPM на mail.letar.best — proxy host `neyroaboi.ru → s2:3018` + SSL. (2026-05-11)
- [x] Через Deploy Agent (BlackCove) — деплой выполнен. (2026-05-11)
- [x] Smoke-тесты пройдены.

**Acceptance E10.a:** ✅ https://neyroaboi.ru работает, Виталий в админке.

#### E10.b — Production-swap на `neyroaboi.ru`

> **Блокеры до E10.b:** ~~домен `neyroaboi.ru` зарегистрирован Виталием~~ ✅; ИП подал уведомление в РКН; ~~SPF/DKIM/DMARC для `neyroaboi.ru` распространены~~ ✅.

- [x] DNS `neyroaboi.ru → 185.28.85.195` (A-запись). (2026-05-11)
- [x] DNS для почты: SPF, DKIM (RSA 2048, Maddy), DMARC, MX → mail.letar.best. (2026-05-13)
- [x] `.env.docker` обновить: `BETTER_AUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `DOMAIN` → `neyroaboi.ru`; `SMTP_FROM_EMAIL=noreply@neyroaboi.ru`. (2026-05-13)
- [ ] NPM — добавить второй proxy host `neyroaboi.ru → s1:3018` (Let's Encrypt). `aboi.letar.best` оставить как permanent redirect 301 на `neyroaboi.ru`.
- [ ] `robots.txt` — снять глобальный Disallow, открыть индексацию.
- [ ] Создать счётчик в Я.Вебмастере и Я.Метрике для `neyroaboi.ru`, обновить `NEXT_PUBLIC_YM_COUNTER_ID`.
- [ ] Подача sitemap в Я.Вебмастер и Google Search Console.
- [ ] **Через Deploy Agent (BlackCove)** — повторный деплой с новыми env.
- [ ] Smoke на проде, мониторинг 24 часа.

**Acceptance E10.b:** `https://neyroaboi.ru` отдаёт главную, SSL A-рейтинг, логин, заказ, email. Я.Вебмастер видит sitemap. РКН подтвердил приём уведомления.

**Риски:**

- DKIM на новом домене — DNS-распространение до 24 часов.
- При swap домена — устаревшие cookies в браузерах редких пользователей (если кто-то логинился на staging раньше). Решается тем, что staging закрыт Basic Auth.
- Tinkoff Эквайринг отключён в MVP — это допустимо, но в оферте чётко прописать «оплата при доставке / по реквизитам / по согласованию с менеджером», иначе вводим клиентов в заблуждение.

---

## 4. Вторая волна (после публичного релиза)

> Каждый пункт — отдельная фича, последовательность определит Виталий по приоритету продаж.

### W1. Tinkoff Эквайринг + СБП + 54-ФЗ

- [ ] Регистрация терминала Tinkoff, получение `TerminalKey` + `Password` (Виталий — блокер деплоя).
- [ ] **Подключить «Tinkoff Касса» (54-ФЗ модуль) пакетом с эквайрингом** — чеки в ОФД Tinkoff бесплатно при наличии эквайринга.
- [x] `lib/payments/tinkoff.ts` — `Init` запрос, HMAC-токен, формирование Receipt с Items + Taxation `usn_income`. (v0.14.0)
- [x] API webhook `/api/webhooks/tinkoff/route.ts` — валидация HMAC, перевод Order в `PAID`. (v0.14.0)
- [x] Чекаут: переход на PaymentURL после `placeOrder`. (v0.14.0)
- [x] `TBANK_TERMINAL_KEY`, `TBANK_PASSWORD`, `TBANK_NOTIFICATION_URL` настроены в `.env.docker` (DEMO терминал). (2026-05-11)
- [x] Тест через тестовый терминал T-Bank (демо-режим). (2026-05-11)
- [ ] Заменить на боевой терминал Tinkoff — ждём Виталия (договор ❌).
- [ ] Админ: страница «Платежи» — синхронизация со статусами Tinkoff.

### W2. СДЭК API ✅ v0.15.0

- [x] Схема БД: `cdekOrderUuid`, `pvzCode` в модели Order.
- [x] `lib/shipping/cdek-types.ts` — TypeScript интерфейсы CDEK API v2.
- [x] `lib/shipping/package-estimator.ts` — расчёт габаритов рулона по метражу (формула спирали).
- [x] `lib/shipping/cdek.ts` — OAuth клиент с кешом, `calculateShippingCosts`, `getDeliveryPoints`, `createCdekOrder`, трекинг.
- [x] `lib/shipping/cdek-order.ts` — хелпер создания СДЭК заказа после оплаты (идемпотентный).
- [x] `app/_actions/shipping.action.ts` — server actions расчёта тарифов и загрузки ПВЗ.
- [x] `_components/pvz-picker.tsx` — выбор пункта выдачи СДЭК.
- [x] Чекаут: динамические цены по тарифам 136/137, дебаунс 500 мс, fallback → MANAGER_CALL.
- [x] Чекаут: серверная перепроверка стоимости ±5% (защита от подмены).
- [x] `totalToPay` включает стоимость доставки.
- [x] T-Bank receipt: строка «Доставка СДЭК» (PaymentObject: service, 54-ФЗ).
- [x] T-Bank webhook → автосоздание заказа СДЭК после PAID.
- [x] СДЭК tracking webhook `api/webhooks/cdek/route.ts` (HMAC-SHA256, статусы SHIPPED/DELIVERED, email клиенту).
- [x] Админка: СДЭК UUID, код ПВЗ, трек-ссылка, стоимость доставки в заказе.
- [x] ENV: `CDEK_CLIENT_ID/SECRET/TEST_MODE/FROM_POSTAL_CODE/FROM_CITY` в `.env.docker.example`, `.env.local`, `.env.docker`.
- [ ] Регистрация в ЛК СДЭК, получение боевых `client_id`/`client_secret` — ждём Виталия.
- [ ] Регистрация СДЭК tracking webhook в ЛК (URL: `/api/webhooks/cdek`, тип: ORDER_STATUS).

### W3. Кастомные дизайны от клиента

- Поле «Своя надпись» на карточке + загрузка картинки → флаг `OrderItem.customDesign = true`, +30% к цене.
- Админ: модерация загруженных файлов.

### W4. Блог

- Модель `Article`, MDX контент, разделы «Идеи интерьеров», «Психология восприятия» (без медицинских заявлений!).

### W5. EN локализация

- `messages/en.json` заполнить.
- Профессиональный перевод текстов (не машинный) — **бюджет на переводчика**.

### W6. Самовывоз

- Модель `PickupPoint` — координаты, адрес, режим работы.
- В чекауте — выбор «Самовывоз из X».

### W7. Промоутерский режим (минимальный)

- Страница `/promoter/[code]` — личный промоутерский лендинг с QR-кодом, ссылающимся на `/?ref=<code>`.
- Кнопка «скачать флаер PDF» (готовый шаблон A6 с QR + слоган + дисклеймер).
- Учёт офлайн-промоутеров через тот же реферальный движок (E7), без отдельного приложения / задач / выплатной автоматики.

### W8. Реферальный cash-out для самозанятых

- Поле «ИНН» в профиле + проверка статуса через API ФНС.
- Заявка на вывод: скан чека из «Мой налог» → бухгалтер магазина переводит на карту.

### W9. CN локализация и поставки в Китай

- Модель данных под CN-юрисдикцию (платёжки WeChat Pay/Alipay вместо Tinkoff).
- **Это уже не одна фича, а отдельный проект под капотом.**

---

## 5. Юридические и регуляторные блокеры

| Блокер                                                               | Кто решает | Срок                             | Статус                                                |
| -------------------------------------------------------------------- | ---------- | -------------------------------- | ----------------------------------------------------- |
| Регистрация ИП Гаев В.В. как оператора ПДн в РКН (форма уведомления) | Виталий    | До публичного запуска            | ❌ Не подано (по чату)                                |
| Договор с Tinkoff на эквайринг и 54-ФЗ модуль                        | Виталий    | До W1                            | ⚠️ DEMO терминал активен, боевой — ждём Виталия        |
| Договор с СДЭК — получение боевых client_id/secret                   | Виталий    | До W2                            | ⚠️ Тестовые credentials активны, боевые — ждём Виталия |
| Регистрация товарного знака «НейроАбоИ» в Роспатенте                 | Виталий    | Желательно до публичного запуска | ❌ Заявка не подана                                   |
| DNS записи для отправки писем (SPF, DKIM, DMARC) на `neyroaboi.ru`   | Ками       | До E10.b                         | ✅ Готово (2026-05-13)                                |
| Регистрация домена `neyroaboi.ru`                                    | Виталий    | До E10 (но желательно сейчас)    | ✅ Куплен (2026-05-11)                                |

---

## 6. Открытые вопросы

На 2026-05-05 все продуктовые вопросы закрыты — см. таблицу решений в §1.1. Если возникнут новые в процессе разработки — фиксировать здесь и решать с Виталием.

---

## 7. Метрики успеха MVP (через 30 дней после E10)

- ✅ Сайт доступен 99.5%+ uptime (мониторинг через `dashboard-agent`).
- ✅ ≥ 5 паттернов в каталоге.
- ✅ ≥ 3 оформленных заказа от реальных клиентов.
- ✅ Lighthouse Performance ≥ 90, SEO 100, A11y ≥ 95.
- ✅ Я.Метрика установлена, цели настроены: добавление в корзину, переход в чекаут, оформление заказа, просмотр карточки.
- ✅ Sitemap submitted в Я.Вебмастер, основные страницы в индексе.
- ✅ 0 нарушений в логах: попыток XSS, SQL injection, перебора сертификатов.

---

## 8. Текущее состояние чек-листа (после E0)

### Сделано

- [x] Каркас Next.js 16 + React 19 + Chakra UI v3 + Umami
- [x] Тема (терракот + фиолетово-синий + dark mode)
- [x] Главная-заглушка с концепцией продукта и юр. дисклеймером
- [x] Регистрация в инфраструктуре монорепо (deploy-affected.sh, sync-env, dashboard seed)
- [x] Документация: README, PLAN_TESTING, CHANGELOG, артефакты концепции
- [x] **E1.B1 — Postgres+Mailhog в Docker, schema.zmodel (User/Account/Session/Verification/UserProfile/Address/ConsentLog), ZenStack generate, миграция init, lib/prisma.ts + lib/db.ts**
- [x] **E1.B2 — Better Auth (email/password + anonymous + emailVerification), i18n каркас (next-intl, app/[locale]/...), страницы /sign-{in,up,out,verify-email} + /profile, proxy.ts. Verified: signup→Mailhog→verify→/profile.**
- [x] **E2.B1 — schema Image/Product/ProductImage, миграция product_image, lib/images/upload (sharp), /api/upload (admin-only), /api/files/[...path] (long-cache), slugify.**
- [x] **E2.B2 — админка товаров: prisma/seed.ts (admin user), server actions (CRUD + publish + soft-delete + image manage), layout /admin (requireAdmin), дашборд, список с фильтрами, форма create/edit, ProductImageManager. Verified.**
- [x] **E2.B3 — витрина (/catalog + /catalog/[slug]), JSON-LD (Product + BreadcrumbList), generateMetadata с canonical/OG, sitemap.xml (динамический), robots.txt (привязан к BASE_URL). Verified.**
- [x] **E2.B4 — unit-тесты slugify (8) + seo (8) = 16/16 зелёных, dprint format 20 файлов, typecheck зелёный.**
- [x] **E3 — Корзина: schema Cart/CartItem, lib/cart.ts (addToCart/updateCartItem/remove/clear/view с anonymous-fallback), расширение mergeAnonymousAccount (объединение корзин), /cart страница, AddToCart компонент в карточке товара. Verified.**
- [x] **E4 — Чекаут + админка заказов: schema Order/OrderItem, placeOrderAction (transaction), /checkout (createForm + DaData) + /checkout/success, /admin/orders (список + деталь + переходы статусов с email уведомлениями). Verified.**

- [x] **E5 — ЛК: schema Wishlist + миграция, /profile/{orders,addresses,favorites,settings} + server actions, deleteAccount по 152-ФЗ. Verified.**
- [x] **E6 — Промокоды + Подарочные сертификаты: lib/promo + lib/gift-certificate (Crockford Base32, bcrypt PIN), расширение placeOrder (применение в транзакции), /admin/promos и /admin/gift-certificates с CRUD.**
- [x] **E7 — Реферальная программа: schema Referral+Attribution+Earning+UserBalance+Transaction, cookie-атрибуция в proxy.ts (last-click 60 дней), spendBalance + ReferralEarning в чекауте, /profile/referrals и /admin/referrals с админским approve.**
- [x] **E9 — Юр. страницы (/offer /privacy /delivery /payment) + cookie consent banner (opt-in v1) + footer + /api/consent (152-ФЗ лог).**
- [x] **E10.a — Docker файлы: Dockerfile.production (standalone), docker-compose.production.yml (aboi-postgres :5444 + aboi-app :3018), .env.docker.example, output:'standalone' в next.config.**
- [x] **Email v0.16.0 — Maddy: neyroaboi.ru добавлен в local_domains, DKIM RSA 2048 сгенерирован, vitaliy@neyroaboi.ru создан. DNS: SPF/DKIM/DMARC/MX настроены. fix: sendResetPassword добавлен в auth.ts. EMAIL_HEADER_COLOR=#C25E3A / EMAIL_BUTTON_COLOR=#5B4FB8.**

### В работе

- _нет_

### Дальше

- [ ] E10.b (остаток): NPM proxy host `neyroaboi.ru → s2:3018`; robots.txt открыть индексацию; Я.Метрика счётчик; sitemap в Я.Вебмастер + Google Search Console. **Блокер: РКН уведомление от Виталия.**
- [ ] Тех. долг: /api/upload → /api/images; email-шаблоны → i18n messages; cron auto-approve реферальных earnings; rate-limit на сертификаты; страница покупки сертификата /gift; Settings модель для конфига вместо env

---

**Обновлено:** 2026-05-13.
**Версия плана:** 1.2 (email neyroaboi.ru настроен, DNS готов).
