# better-auth `prismaAdapter()` несовместим с ZenStack ORM-клиентом

## Симптом

`POST /api/auth/sign-up/email`/`sign-in/email` (и любой другой запрос к `/api/auth/*`) стабильно
падает 500 с пустым телом — **без единой записи** в GlitchTip или логах контейнера. Падение
происходит внутри самого better-auth, до его обычной обработки ошибок, поэтому не отличимо в
логах от легитимного отказа ([runtime-invariant-missing-from-select](/.claude/docs/runtime-invariant-missing-from-select.md)
— тот же класс «зависимость сравнивает то, чего не ожидает»).

## Причина

`better-auth/adapters/prisma` требует нативный `PrismaClient`. ZenStack v3 `ZenStackClient`
использует Kysely под капотом — по интерфейсу он выглядит совместимо (`db.ts` многих приложений
кастует его к общему типу `DB` через `as unknown as DB`/`as never`), но рантайм-несовместим с
тем, что `prismaAdapter()` реально дёргает у клиента.

```typescript
// ❌ Так делать нельзя — orm это ZenStackClient, не PrismaClient
import { prisma } from './db' // prisma: DB = orm as unknown as DB

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
})
```

## Фикс

Отдельный, полностью независимый от ZenStack, нативный `PrismaClient` только для better-auth.
Образец — `apps/dashboard/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Ленивая инициализация через Proxy — Turbopack выполняет top-level код при сборке,
// что приводит к ошибке "Cannot read properties of undefined" без неё.
let _prismaAuth: PrismaClient | null = null

export function getPrismaAuth(): PrismaClient {
  if (!_prismaAuth) {
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
    _prismaAuth = new PrismaClient({ adapter })
  }
  return _prismaAuth
}

export const prismaAuth = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaAuth() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
```

`auth.ts`:

```typescript
import { prismaAuth } from './prisma' // НЕ из './db'

export const auth = betterAuth({
  database: prismaAdapter(prismaAuth, { provider: 'postgresql' }),
})
```

`@prisma/adapter-pg` уже в корневом `package.json` (hoisted) — в приложениях добавлять не нужно
([root-only dependency versions](/.claude/rules/git.md), см. также CLAUDE.md про версии только в
корне). Prisma 7 требует driver adapter — `url` в `schema.prisma` больше не поддерживается.

**Не трогай каст `as unknown as DB`/`as never` в `db.ts`**, если `prisma`/`orm` оттуда
используется где-то ещё в приложении (обычная ситуация — биллинг, вебхуки, cron-джобы). Каст там
чаще всего нужен по причинам, не связанным с `prismaAdapter`, и его удаление ломает остальные
вызовы.

## Проверка живьём

`sign-up`/`sign-in` до фикса падают 500; после фикса — штатный `400`/`403`/`401` с телом ошибки
(`EMAIL_PASSWORD_SIGN_UP_DISABLED`, `EMAIL_NOT_VERIFIED`, `INVALID_EMAIL_OR_PASSWORD` — конкретный
код зависит от конфига приложения). Сам факт структурированного JSON-ответа вместо краша
подтверждает, что Prisma-адаптер инициализируется и выполняется корректно — 200 не обязателен,
если у приложения email/password вход выключен в пользу OIDC.

## Где уже проверено (аудит 2026-08-28…31)

**Был баг, починено:** `mandala`, `domwellbes`, `svoichuzhie`, `dsperevod`, `studio` — во всех
`auth.ts` передавал в `prismaAdapter()` ZenStack-клиент из `db.ts` вместо отдельного
`prismaAuth`.

**Уже было ОК** (отдельный `prismaAuth`-клиент с самого начала): `aboi` (2026-08-31 —
дублировавшую самописную обвязку globalThis-singleton+Proxy заменили на общую фабрику
`createLazyPrismaAuthClient`, поведенчески без изменений), `dashboard` (образец).

### `archetest`, `grandslamcup`, `kami` — перепроверены живьём (2026-08-31), три разных исхода

Запись «уже было ОК» была неточной для всех трёх: их `auth.ts` передавал в `prismaAdapter()`
`prisma` из `./prisma`, который в каждом приложении был просто `export { prisma } from './db'`, а
`db.ts` — `export const prisma = orm`, голый `ZenStackClient`. Тот же паттерн, что вызывал баг в
пяти починенных приложениях выше. Живой прогон (`nx dev <app>` + `fetch` на `/api/auth/*`) дал
три разных результата:

- **`archetest` — баг подтверждён и починен.** `POST /api/auth/sign-up/email` и `sign-in/email`
  стабильно давали пустой `500` без единой строки в логах — точное совпадение с сигнатурой бага.
  Фикс по образцу выше (`createLazyPrismaAuthClient`), коммит `ff5af4a1`. ⚠️ `archetest` физически
  **не submodule** — обычная директория основного репозитория `letar`, коммит сделан прямо туда
  (pathspec ограничен тремя изменёнными файлами), а не как для остальных приложений в этом списке.
  После фикса — `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`/`EMAIL_PASSWORD_DISABLED` (email/password
  выключен в конфиге штатно); с временно включённым `emailAndPassword.enabled` (только для
  верификации, не закоммичено) — `200`, реальный `User` создан, вход прошёл. Заодно почищен
  побочный дефектный ре-экспорт в `src/app/api/consent/route.ts` (брал тот же сломанный `prisma`
  из `lib/prisma.ts` — переведён на `getEnhancedPrisma`).

- **`grandslamcup` — баг НЕ подтверждён, код НЕ трогали.** Email/password выключен
  (`EMAIL_PASSWORD_SIGN_UP_DISABLED`/`EMAIL_PASSWORD_DISABLED`), OIDC не сконфигурирован
  локально — прямой sign-up/sign-in непроверяем. Вместо этого проверили сам путь через
  `prismaAdapter(ZenStackClient)` напрямую: сессия создана в обход через `/api/auth/dev-session`
  (тот эндпоинт читает БД напрямую, не через adapter), затем `GET /api/auth/get-session` → `200`
  с корректными данными (сверено с БД через `postgres-grandslamcup` MCP — не заглушка), и
  `POST /api/auth/sign-out` → `200 {"success":true}`. Оба реально идут через `prismaAdapter`, ни
  разу пустой 500. Причина расхождения с остальными пятью не выяснена — не в скоупе проверки.

- **`kami` — баг НЕ подтверждён, но проверка неполная.** Шесть проверенных эндпоинтов
  (`sign-up/email` → 400, `sign-in/social` с неизвестным провайдером → 404, `get-session` с
  поддельным токеном → `200 null`, `sign-out` → 415, `list-accounts` без сессии → 401) — везде
  структурированный JSON, ни одного пустого 500. Но `kami` использует `mode: 'hub-client'`
  (`buildHubClientAuth()` в `libs/auth/src/server/create-auth/index.ts`), где `emailAndPassword`
  вообще не конфигурируется, а OIDC локально не настроен (`.env.local` без
  `OIDC_CLIENT_ID`/`SECRET`) — путь **создания нового аккаунта** (sign-up email или OAuth-
  коллбэк с записью user+account), где баг типично проявлялся у остальных пяти, физически
  недостижим локальным тестом. Код не трогали — нет положительного репро, чинить вслепую
  рискованно. Если понадобится закрыть вопрос окончательно: настроить
  `OIDC_CLIENT_ID`/`SECRET` в `.env.local` и прогнать полный OAuth sign-in с живой Ключницей,
  либо превентивно применить тот же фикс, что в `archetest`.

**✅ Проверено живьём (2026-08-31), баг НЕ подтвердился:** `auth-hub` — `src/lib/prisma.ts` там
действительно не отдельный нативный `PrismaClient`, а ре-экспорт `prisma`/`rawOrm` из `db.ts`, где
`prisma: OrmType = encryptionKey ? wrapWithEncryption(orm, encryptionKey) : orm` — `orm` это
`ZenStackClient`, ровно то же, что валило 500-кой пять других приложений. По виду кода это должно
было быть тем же багом.

Живой прогон против dev-Postgres (`nx dev auth-hub`, `DATABASE_URL` из `.env.local`) этого не
подтвердил:

- `POST /api/auth/sign-up/email` → `200`, пользователь и `account`-запись (credential-провайдер,
  через `createEncryptedAccountClient`) созданы корректно;
- `POST /api/auth/sign-in/email` тем же email/паролем сразу следом → `200`, токен сессии выдан;
- сессия рабочая: обращение к `/` в том же браузерном контексте после sign-in отдало
  `Профиль`-страницу (проверка `getSession()`/`auth.api.getSession()` в `proxy.ts` прошла).

Все три сценария — то же самое, чем воспроизводили баг в остальных пяти приложениях
(`nx dev` + `fetch` на `/api/auth/sign-up|sign-in/email`). Ни разу не получен пустой 500.

**Почему тут иначе — не установлено окончательно, но есть значимое отличие от остальных пяти:**
`prisma`, который auth-hub передаёт в `prismaAdapter()`, — не голый `orm`/`orm as never`, а
результат `wrapWithEncryption(orm, key)`: `Proxy` над `ZenStackClient`, у которого get-ловушка
для большинства свойств делает `Reflect.get(target, prop, receiver)` и биндит функции к `target`
(см. `db.ts` выше). Не исключено, что это именно то, что предотвращает краш у остальных пяти
(если исходная причина — потеря `this`-контекста при том, как `prismaAdapter` обращается к
методам клиента) — но это гипотеза, не подтверждённый механизм: версии `better-auth`/
`@zenstackhq/orm`/`kysely` у auth-hub и, например, у dsperevod идентичны (общий корневой
`package.json`, версии не варьируются по приложениям), так что дело не в версиях.

Дополнительная находка при разборе истории: коммит фикса в `mandala` (`49de3021`) чинил ZenStack/
prismaAdapter и **одновременно** независимый баг `genericOAuth` для Yandex (`discoveryUrl` без
`issuer` ронял весь плагин на инициализации, что тоже валит **каждый** `/api/auth/*`-запрос).
Это не отменяет фикс в `dsperevod`/`domwellbes`/`svoichuzhie`/`studio` (там коммиты «чистые», без
второго confound, и там 500 подтверждён именно на этом изменении) — но показывает, что симптом
«пустой 500 на каждом auth-запросе» имеет более одной возможной причины, и в `mandala` могло
хватить одного из двух фиксов.

**Вывод:** правку в auth-hub сейчас не вносить — `prismaAdapter(prisma, ...)` в текущем виде
рабочий, подтверждено живым тестом. **Не удалять/не упрощать `wrapWithEncryption`-обёртку без
повторного живого прогона sign-up/sign-in** — если гипотеза выше верна, снятие Proxy может
вернуть баг.

### ⛔ Замена на `createLazyPrismaAuthClient` для auth-hub — миграция НЕ безопасна, попытка отменена (2026-08-31)

В отличие от остальных пяти приложений (`mandala`, `domwellbes`, `svoichuzhie`, `dsperevod`,
`studio`), у auth-hub `db.ts` — не голый `ZenStackClient`/`as never`, а результат
`wrapWithEncryption(orm, key)`: `Proxy`, который для трёх моделей (`account`, `oauthAccessToken`,
`oauthApplication`) подменяет CRUD-методы на шифрующие обёртки из `crypto-orm.ts`
(`createEncryptedAccountClient` и т.д.), а для остальных моделей прозрачно проксирует к `orm`.
Именно этот объект сейчас передаётся в `prismaAdapter()`.

`createLazyPrismaAuthClient` (`libs/auth/src/server/factories/create-lazy-prisma-auth-client.ts`)
возвращает **голый нативный** `PrismaClient` без единого слоя перехвата. Подмена
`prismaAdapter(prisma, ...)` → `prismaAdapter(prismaAuth, ...)` по образцу остальных пяти
приложений для auth-hub означает, что better-auth начинает писать `account`-записи (OAuth-
привязка через VK/Google/GitHub/Yandex, `account.accessToken`/`refreshToken`) и
`oauthAccessToken`-записи (OIDC-выдача токенов восьми клиентским приложениям монорепо) **мимо**
шифрующего прокси — секреты лягут в БД в открытом виде. Это не гипотеза «может сломаться», а
прямое следствие того, что `createLazyPrismaAuthClient` создан для приложений без собственного
слоя шифрования поверх adapter-клиента — единственного такого приложения в монорепо. В отличие от
пустого 500 (самообнаруживающийся баг), потеря шифрования при этом ничем не сигнализирует —
запросы продолжат возвращать 200.

**Если миграция когда-нибудь понадобится по другому поводу** (не ради единообразия сама по себе):
единственный безопасный путь — перенести логику `crypto-orm.ts` на уровень, который увидит и
`prismaAuth`, например через Prisma Client Extensions (`prismaAuth.$extends({ query: {...} })`,
работает и с driver-adapter клиентами Prisma 7) для тех же трёх моделей, а не просто сменить
клиент. Такая правка требует полного повторного набора живых тестов: email/password sign-up
(уже покрыт), хотя бы один реальный OAuth-вход с привязкой аккаунта (не только credential-
провайдер, для которого `accessToken`/`refreshToken` обычно пустые), и выдача OIDC-токена
реальному клиентскому приложению — до этого набора менять `prisma.ts`/`auth.ts` auth-hub не
следует. Задача в `PLAN.md` §«Аудит prismaAdapter/ZenStack» закрыта решением не мигрировать.

**Новое приложение с Better Auth + ZenStack:** заводи `lib/prisma.ts` сразу по этому образцу,
не жди, пока баг всплывёт на проде — симптом (пустой 500 без логов) диагностируется медленно.
