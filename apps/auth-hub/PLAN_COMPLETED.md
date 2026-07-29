# Выполненные задачи

Детальное описание всех реализованных фич auth-hub.

## Версия 0.7.1 — 2026-07-29 (seed: localhost-redirect studio 3020 → 3024)

В `redirectUrls` OIDC-клиента `studio-prod` localhost-адреса указывали на 3020 — порт, который
студия давно освободила (его занял `form-docs`). Локальный вход в неё по OIDC падал с
`redirect_uri` mismatch. Исправлено на 3024, рядом положен комментарий, объясняющий, почему это
не косметика: локальные приложения ходят в **прод**-Ключницу, поэтому `localhost`-адрес обязан
лежать в боевой БД.

Дрейф нашёл новый guard-тест `libs/infra-config/src/app-ports.guard.spec.ts` (`nx test infra-config`),
сверяющий порт по трём источникам — `.env` приложения, `.claude/commands/<app>.md` и этот seed.
Он же поймал второе расхождение: командный файл самой Ключницы объявлял 3010 при реальном 3014.
Подробности — `PLAN-INFRA.md` §34.2.

⏳ **Требует re-seed прода** (`deploy_app` с `seed: true`) — правка `seed.ts` не меняет строки в
боевой БД сама по себе. Запрошено у BlackCove, тред `deploy-auth-hub-studio-redirect-3024`.

⚠️ **Побочная находка, ждёт проверки.** При подготовке деплоя выяснилось, что на s2 в окружении
Ключницы не было `OIDC_APREL8008_SECRET` (7 секретов из 8), хотя в закоммиченном
`.env.docker.enc` он есть с момента регистрации клиента. Скорее всего checkout на сервере
отставал, но если seed с этим секретом там **никогда** не отрабатывал, строки клиента
`aprel8008-prod` в боевой `oauthApplication` может не быть вовсе — то есть вход в админку
aprel8008 через SSO сломан. Проверить после прогона (запрошено у BlackCove тем же тредом).

## Версия 0.7.0 — 2026-07-28 (152-ФЗ: страница /privacy)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Общий
компонент `CookieBanner` (`@letar/ui`) уже был подключён в layout с дефолтным `privacyUrl="/privacy"`,
но самой страницы не было — клик «Подробнее в политике ПДн» вёл на 404. Добавлена минимальная страница
`/privacy` (кто оператор, какие данные, сроки, права субъекта, cookie/аналитика). Полная сводка по
всем затронутым приложениям — в root `PLAN.md` §7 Этап 0.8.

## Версия 0.6.5 — 2026-07-16 (аудит логин-форм монорепо)

Кросс-приложенческий фикс находки v0.6.4 (см. ниже, «Бэклог» PLAN.md): логин-формы без
`method="post"` до гидрации React сабмитятся нативным GET — пароль попадает в URL/history/
Referer/access-логи. Пофикшено `sign-in`/`sign-up`/`change-password` (3 файла). Аудит расширил
скоуп за пределы auth-hub — та же проблема оказалась и в самой библиотеке `@letar/forms` (оба
корневых `<form>`-компонента, `FormSimple`/`FormWithApi`), а не только в raw-формах точечных
приложений — фикс библиотеки закрывает риск для всех текущих и будущих потребителей (включая
driving-school). Всего исправлено 15 мест по монорепо: libs/forms ×2, auth-hub ×3, aboi ×3,
dsperevod ×3, svoichuzhie ×4. Typecheck/lint зелёные, никаких breaking changes (чисто аддитивный
HTML-атрибут).

## Версия 0.6.4 — 2026-07-16 (Этап 8.5: вход по любому linked-email)

### Ключевое архитектурное решение: без перехвата core-резолва Better Auth

Задача изначально была сформулирована как «перехват резолва sign-in в Better Auth» с риском
для core auth-flow ~10 downstream-приложений. Spike показал, что перехват не нужен:
email+password и magic-link входы в Ключнице идут ТОЛЬКО через её собственные server actions
(`loginUser`, `sendMagicLinkAction`) — downstream-приложения попадают на них через
OIDC-редирект на hub UI, прямых вызовов `/api/auth/sign-in/email` мимо UI нет. Резолв
сделан на уровне actions, core Better Auth не тронут.

### `resolveLoginEmail()` — `src/lib/resolve-login-email.ts`

- Вход: любой email (нормализуется lowercase+trim). Выход: `{ email, resolved }`.
- Если email — чей-то **основной** `User.email` → возвращается как есть (`resolved: false`).
  Primary-совпадение всегда приоритетнее linked-записи: иначе устаревшая `UserEmail`-запись
  могла бы «затенить» вход в другой аккаунт.
- Если email — **подтверждённый** `UserEmail` → возвращается основной адрес владельца
  (`resolved: true`). Неподтверждённые привязки игнорируются: иначе злоумышленник мог бы
  привязать чужой адрес без подтверждения и перехватывать попытки входа по нему.
- Использует raw `prisma` (не enhanced) — `UserEmail` под `@@deny('all', true)`.

### Закрытые попутно баги (оба существовали с v0.6.2)

1. **Дубль-аккаунт при входе по linked-email:** уникальность `UserEmail.email` не пересекается
   с `User.email` → ввод linked-адреса + пароля давал «user not found», `loginUser` уходил в
   auto-sign-up и молча создавал ВТОРОЙ аккаунт с linked-адресом как основным. Magic link с
   `disableSignUp: false` — та же дыра. Фикс: резолв до Better Auth + guard в `loginUser`
   (`resolved=true` при invalid credentials → «Неверный пароль», без trySignUp).
2. **Гонка в `verifyAddedEmail`:** токен подтверждения живёт 24ч; за это время адрес мог стать
   чьим-то основным через обычную регистрацию — подтверждение привязки создало бы конфликт с
   резолвом входа. Фикс: перепроверка `User.email` на момент подтверждения; при конфликте
   привязка удаляется с ошибкой «уже используется».

### Известные ограничения (задокументированы в коде)

- Magic-link письмо при вводе linked-адреса уходит на ОСНОВНОЙ адрес владельца (callback
  плагина получает уже отрезолвленный email; оба адреса принадлежат одному пользователю).
- Passkey/OAuth-входы не затронуты — identity там не по введённому email.

### Проверка

- Живой E2E через UI: ввод linked-адреса + пароля → сессия primary-аккаунта (подтверждено
  `get-session` и серверным логом вызова `loginUser`).
- Скрипт-матрица резолва на dev-БД: verified/unverified/primary/unknown/UPPERCASE — все кейсы
  корректны; дубль-аккаунт не создаётся.
- Побочная находка при проверке (НЕ фиксилось, кандидат в отдельную задачу): до hydration
  React-формы `/sign-in` сабмитятся нативным GET — email+пароль попадают в URL (логи,
  history). На медленных клиентах это реальная утечка; лечится `method="post"` fallback'ом
  или `action`-атрибутом на формах логина.

### Деплой

- Прод s2: BlackCove, msg #488, коммит `b7b8635`, zero-downtime, rollback-тег
  `auth-hub:b7b863568`. Попутно применилась миграция `add_user_email_multi_email` — v0.6.2 до
  этого на проде не была, весь Этап 8.5 уехал одной пачкой.
- Staging s3 передеплоен на `6935f11` (msg #490), e2e через `run_e2e` — 10/10 зелёных,
  `lastStatus` warn-gate'а обновлён на актуальный коммит.

## Версия 0.6.3 — 2026-07-16 (Этап 8.5: merge двух аккаунтов)

### Скрипт: `infra/migrations/auth-hub-merge-accounts.ts`

Продолжение §8.5 — self-service флоу нескольких email (v0.6.2) не покрывает случай, когда
человек уже завёл два разных `User` (например, один раз через email/password, другой раз через
Google OAuth с другим email). Реализован параметризованный ручной скрипт-инструмент (не UI, не
server action) по прецеденту `infra/migrations/kami-owner-migration.ts`, но общего назначения:

- **Параметры (env):** `CANONICAL_EMAIL` (остаётся), `DUPLICATE_EMAIL` (будет удалён),
  `DRY_RUN` — **инверсия дефолта** относительно owner-миграций: без явного `DRY_RUN=0` ничего
  не применяется. Merge необратим и затрагивает потенциально живые сессии, цена ошибки выше,
  чем у owner-скриптов с предсказуемыми пустыми дублями.
- **Клиент БД:** собственный `ZenStackClient` внутри скрипта (импорт схемы через относительный
  путь), НЕ `apps/auth-hub/src/lib/db.ts` — `getEnhancedPrisma` заблокировал бы почти все
  операции (`@@deny('all', true)` на нужных моделях), а `rawOrm`/`prisma` используют алиас
  `@/generated/schema`, ненадёжно резолвящийся при запуске `bun run` вне tsconfig приложения.
- **Перенос relations** (внутри одной `$transaction`): `Account` — по одной записи из-за
  составного `@@unique([providerId, accountId])` (совпадение только `providerId` — не
  конфликт, разные внешние аккаунты одного провайдера сосуществуют; полное совпадение
  `providerId+accountId` физически невозможно на уровне БД, обработано как defensive dead-code);
  `Passkey`/`OauthApplication`/`OauthAccessToken`/`TelegramToken`/`ConsentLog` — простой перенос
  `userId`; `OauthConsent` — при смысловом дубле (оба давали consent одному клиенту) запись
  duplicate удаляется; `ProjectProfile` (`@@unique([userId, projectSlug])`) — при конфликте
  roles объединяются (union), metadata canonical имеет приоритет (потеря metadata duplicate —
  warning в лог); `UserEmail` — простой перенос, email глобально уникален.
- **Email самого duplicate** сохраняется как доп. подтверждённый `UserEmail` у canonical, по
  прецеденту `setPrimaryEmail` в `emails.action.ts`.
- **Roles** — union `canonical.roles` и `duplicate.roles`.
- **Session НЕ переносятся** — `deleteMany` на обеих сторонах (canonical + duplicate),
  принудительный re-login. Причина та же, что у `setPrimaryEmail`: `cookieCache` Better Auth
  (5 мин TTL) может отдать устаревший email/userId в OIDC `id_token` ~10 downstream-приложениям.
- **Аудит:** своей `AuditLog`-модели в auth-hub нет (в отличие от dsperevod/aboi) — заводить её
  ради разового ручного скрипта признано непропорциональным. Вместо этого — structured
  консоль-лог (`✅/⚠️/❌`) с инструкцией в докстринге перенаправлять stdout в файл (`tee`) при
  реальном запуске.
- **Бэкап** не встроен в скрипт (`pg_dump` — ответственность оператора) — явный текстовый
  warning в консоли перед транзакцией плюс требование в докстринге.

**Проверено вживую на локальной БД** (тестовые `User`/`Account`/`ProjectProfile`/`OauthConsent`
и т.д. созданы напрямую SQL, вычищены после): dry-run корректно показал сводку без изменений;
реальный merge прогнан с тремя edge-case сценариями — (1) `Account` с одинаковым `providerId`,
разным `accountId` → оба сохранены без конфликта; (2) `ProjectProfile` с одинаковым
`projectSlug` у обеих сторон → roles объединены `[reader, writer]`, metadata canonical
сохранена; (3) `OauthConsent` дубль по одному клиенту → лишняя запись удалена; повторный запуск
скрипта после успешного merge — идемпотентен (`Duplicate не найден`, exit 0, без изменений).

**Прод-запуск не выполнялся** — нет конкретной пары существующих аккаунтов для склейки, скрипт
ждёт первого реального кейса.

**Коммиты:** `a0eb74a` (скрипт + PLAN.md), `47c5b2d` (docs, глобальный PLAN.md).

---

## Версия 0.6.2 — 2026-07-16 (Этап 8.5: self-service несколько email на аккаунт)

### Фича: `/profile/emails/`

Реализация §8.5 корневого `PLAN.md` — управление своими email в профиле (как GitHub):
добавление дополнительного адреса с подтверждением по ссылке (свой токен, 24ч TTL, не
пересекается с core Better Auth `Verification`), удаление, назначение подтверждённого адреса
основным. Новая модель `UserEmail`.

**Не покрыто:** вход по любому linked-email (требует перехвата резолва sign-in в Better Auth —
риск для core auth-flow ~10 downstream-приложений, отдельная задача) и merge двух уже
существующих РАЗНЫХ аккаунтов (остаётся ручным скриптом владельца, необратимо).

### Два бага, найденные и пофикшенные при живой проверке

1. **`revalidatePath` во время рендера страницы подтверждения** (`/profile/emails/verify`) —
   вызывается не через форму/transition, Next.js это запрещает. Страница падала 500 **после**
   уже успешно применённого обновления БД (сам apply был идемпотентным side-effect, крашился
   только код после него). Убран лишний вызов — страница и так рендерится без кэша.
2. **Смена основного email напрямую в БД не инвалидировала `cookieCache` Better Auth** (до 5
   минут в hub-provider профиле) — активная сессия и OIDC `id_token` для downstream-приложений
   Ключницы временно отдавали бы устаревший email. Исправлено принудительным `auth.api.signOut`
   сразу после смены — пользователь перелогинивается с новым основным адресом.

Проверено вживую end-to-end: create user → add email → SMTP-фейл в dev корректно обработан →
verify по токену → set-primary → forced signOut → re-login по новому primary email → 200.
Тестовые данные вычищены из dev-БД.

Форма формы через новый `createForm()`-инстанс `@/auth-hub-form` (раньше в auth-hub не было ни
одного — существующие формы профиля используют raw `<form>`, что нарушает правило
`.claude/rules/forms.md`; новый код не должен был повторять эту практику).

**Коммиты:** `1ffee51`.

---

## Версия 0.6.1 — деплой 2026-07-03 (Фикс OIDC invalid_grant)

### Проблема: invalid_grant при входе через Ключницу

После логина через любого провайдера (Яндекс, email, etc.) и consent-экрана, dashboard получал `invalid_grant: invalid code` при token exchange.

**Корневая причина — баг в better-auth при использовании Redis `secondaryStorage`:**

1. Consent endpoint вызывает `updateVerificationByIdentifier(consentCode, {identifier: authCode})`
2. `updateVerificationByIdentifier` обновляет JSON под старым Redis-ключом `verification:consentCode` — меняет `identifier` внутри, но **НЕ переименовывает Redis-ключ**
3. При token exchange `consumeVerificationValue(authCode)` ищет `verification:authCode` → не находит (ключ по-прежнему `verification:consentCode`) → `invalid_grant`

**Диагностика:**

- nginx логи dash.letar.best (proxy-host-7): `code=uUwOvv7MzXZ9mEMAaRQCyG1wPsE7ggKO` в callback
- Redis: ключ `verification:6XQfqAjkD56...` (consent_code), внутри `identifier: "uUwOvv7..."` (authCode)
- Redis: ключ `verification:uUwOvv7...` — отсутствует
- PostgreSQL `Verification` — OIDC records отсутствуют (всё хранилось в Redis)

**Решение:** добавлен `verification: { storeInDatabase: true }` в `buildHubProviderAuth` (`libs/auth/src/server/create-auth/index.ts`). OIDC authorization codes теперь хранятся в PostgreSQL, где `updateVerificationByIdentifier` корректно обновляет запись по identifier. Redis остаётся только для rate-limit.

**Коммиты:**

- `ecf9cde` — fix(auth-hub): правильное извлечение сообщения из APIError (`error.body.message`)
- `80fdfe0` — fix(auth-hub): storeInDatabase для OIDC verification (обход бага Redis)

**Попутно исправлено:**

- "Ошибка входа:" с пустым текстом при email/password — Better Auth бросает `APIError`, реальное сообщение в `error.body.message`, а не `error.message`

---

## Версия 0.6.0 — деплой 2026-06-18 (Этап 9: деплой + верификация)

### Деплой Этапа 8

- `AUTH_ENCRYPTION_KEY` добавлен в `.env.docker.enc` (commit `2ed6f12`) и сохранён в KeePassXC
- BlackCove выполнил деплой auth-hub, `/sync-env`, перезапуск контейнера
- После деплоя auth.letar.best был недоступен (500) — причина: `AUTH_ENCRYPTION_KEY` не попал в контейнер без `/sync-env`. Исправлено срочным запросом BlackCove
- Backfill `encrypt-client-secrets.ts --execute` выполнен BlackCove (подтверждено msg #918)
- `kami@letar.best` повышен до ADMIN роли через SQL UPDATE (BlackCove msg #919)
- Admin UI `/admin/clients` верифицирован вручную: 7 клиентов активны, все кнопки работают

### Проблема с agent-mail fetch_inbox

`fetch_inbox` возвращает только метаданные без тела сообщений — ответы BlackCove были незаметны, что привело к 4 повторным пингам про backfill. Нужно использовать `search_messages` с последующим чтением или попросить BlackCove дублировать ответы в теме письма.

---

## Версия 0.6.0 — 2026-06-15 (Этап 8: Admin UI + at-rest шифрование)

### Admin UI OAuth-клиентов (`/admin/clients`)

Полный CRUD для управления OIDC-приложениями Ключницы:

- **Список** (`/admin/clients`) — таблица с бейджами статуса, кнопками toggle/edit
- **Создание** (`/admin/clients/new`) — двухэтапный флоу:
  1. `RisksConsent` — экран с 4 рисками hub-client режима (бренд, OAuth-аккаунт, user.id, 152-ФЗ)
  2. `ClientForm` — имя, clientId, redirect URLs, тип (web/spa/native), skipConsent
  - После создания: redirect на `/admin/clients/<id>?secret=<plaintext>` → `SecretBanner`
- **Детали** (`/admin/clients/[id]`) — карточка с атрибутами + `RotateSecretButton` + `DeleteClientButton`
- **Редактирование** (`/admin/clients/[id]/edit`) — форма с locked clientId

**`SecretBanner`** — plaintext секрет отображается ОДИН РАЗ через `?secret=` в URL. Исчезает через 5 минут или при перезагрузке. Кнопка «Скопировать».

**Server actions** (`_actions/client.action.ts`): `createClientAction`, `updateClientAction`, `rotateSecretAction`, `deleteClientAction`. Валидация через Zod с `.strip()`.

### At-rest шифрование (`libs/auth/server/crypto.ts`)

**AES-256-GCM** — для долгосрочных секретов (`clientSecret`):

- Каждый вызов → уникальный random IV → не-детерминированный
- Формат: `gcm:<iv-hex>:<cipher-hex>:<tag-hex>`
- Обратная совместимость: plaintext без `gcm:` префикса → возвращается без изменений

**AES-256-CBC детерминированный** — для токенов, где нужен WHERE lookup:

- IV = первые 16 байт HMAC-SHA256(key, salt) → уникален per-field, детерминирован
- Формат: `cbc:<cipher-hex>`
- Применяется для `oauthAccessToken.accessToken/refreshToken`

**10 unit-тестов** в `crypto.spec.ts`: round-trip, random IV, детерминированность, обратная совместимость, error cases.

### Encryption ORM proxy (`src/lib/crypto-orm.ts` + `src/lib/db.ts`)

Прозрачное шифрование через Proxy без изменений кода потребителей:

| Модель             | Поле                          | Метод                         |
| ------------------ | ----------------------------- | ----------------------------- |
| `oauthApplication` | `clientSecret`                | GCM (non-deterministic)       |
| `oauthAccessToken` | `accessToken`, `refreshToken` | CBC (deterministic для WHERE) |
| `account`          | `accessToken`, `refreshToken` | GCM                           |

**Dev-режим**: если `AUTH_ENCRYPTION_KEY` не задан → предупреждение в консоль, шифрование пропускается. В production → `throw`.

### Social provider loader (`libs/auth/server/social-loader.ts`)

```typescript
export const auth = await createAuthAsync({
  mode: 'standalone',
  social: { source: 'db', load: createSocialProviderLoader(prisma, decryptSecret, key) },
  // ...
})
```

Читает таблицу `socialProvider` из БД, расшифровывает `clientSecret`, передаёт в Better Auth.

### Backfill скрипт (`scripts/encrypt-client-secrets.ts`)

```bash
# Dry-run (показывает что будет зашифровано):
bun run scripts/encrypt-client-secrets.ts

# Реальное шифрование:
bun run scripts/encrypt-client-secrets.ts --execute
```

Идемпотентен: уже зашифрованные записи (`gcm:` prefix) пропускает.

### Исправления инфраструктуры

- `libs/auth/tsconfig.lib.json` — добавлено исключение `src/**/*.spec.ts` из lib-сборки (tsc падал на spec-файлах при генерации `.d.ts`)
- `libs/auth/src/server/create-auth/index.ts` — cast через `unknown` для `buildHubProviderAuth` чтобы избежать непортабельной ссылки на Zod в `.d.ts`

### Файлы

- `libs/auth/src/server/crypto.ts` — AES-256-GCM/CBC функции
- `libs/auth/src/server/crypto.spec.ts` — 10 unit-тестов
- `libs/auth/src/server/social-loader.ts` — DB loader для провайдеров
- `libs/auth/src/server/index.ts` — экспорт (обновлён)
- `libs/auth/src/server/create-auth/types.ts` — `StandaloneSocialSource` тип
- `libs/auth/src/server/create-auth/index.ts` — `createAuthAsync()` + `resolveSocialProviders()`
- `apps/auth-hub/src/lib/crypto-orm.ts` — encryption proxy для 3 моделей
- `apps/auth-hub/src/lib/db.ts` — ORM с encryption proxy
- `apps/auth-hub/src/lib/prisma.ts` — re-export шим
- `apps/auth-hub/src/app/admin/clients/**` — 10 файлов Admin UI
- `apps/auth-hub/scripts/encrypt-client-secrets.ts` — backfill скрипт

**Коммит:** `4e70c76`

---

## Версия 0.2.1 — 2026-04-10

### Fix: продолжение OIDC flow после OAuth на /sign-in

**Проблема:** Пользователь, попадая из клиентского приложения на `auth.letar.best/sign-in?client_id=...&redirect_uri=...&response_type=code&state=...` (OIDC authorization_code flow), после успешного логина через Google/Яндекс/VK/GitHub оказывался на главной ключницы вместо возврата в клиентское приложение. Better Auth OIDC Provider сохранял query в cookie `oidc_login_prompt` и редиректил на `loginPage` со всеми параметрами, но на странице `/sign-in` ни OAuth кнопки, ни email-форма не использовали этот query для восстановления OIDC flow — передавали дефолтный `callbackURL = '/'` в Better Auth.

**Решение:**

- Создан хук `src/app/(auth)/_hooks/use-post-sign-in-callback.ts`, который проверяет наличие OIDC параметров (`client_id` + `redirect_uri` + `response_type`) в query и возвращает `/api/auth/oauth2/authorize?<исходная query>`, если это OIDC flow. После успеха Better Auth редиректит на этот внутренний URL, authorize endpoint находит свежую сессию и продолжает выдачу кода клиентскому приложению.
- `AuthOAuthButtons`, `LoginForm`, `MagicLinkForm` на `/sign-in` используют этот хук и передают результат как `callbackURL` в `signIn.social` / `signIn.oauth2` / `auth.api.signInEmail` / `auth.api.signInMagicLink`.
- `libs/auth/src/client/oauth-buttons.tsx` уже поддерживал проп `callbackUrl` — правок не потребовалось.

## Версия 0.1.0

### Реализовано

- Базовая структура приложения (Next.js 16 + Chakra UI v3)
- Роуты авторизации (login, signup)
- OAuth интеграция
- Панель администратора (каркас)
- Профиль пользователя (каркас)

---

**Последнее обновление:** 2026-04-10
