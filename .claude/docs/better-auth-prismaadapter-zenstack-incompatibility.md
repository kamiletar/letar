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

**Уже было ОК** (отдельный `prismaAuth`-клиент с самого начала): `aboi`, `archetest`,
`grandslamcup`, `kami`, `dashboard` (образец).

**⚠️ Требует срочной проверки:** `auth-hub` — `src/lib/prisma.ts` там существует, но это **не**
отдельный нативный `PrismaClient`: файл просто ре-экспортирует `prisma`/`rawOrm` из `db.ts`, а
там `prisma: OrmType = encryptionKey ? wrapWithEncryption(orm, encryptionKey) : orm`, где `orm`
— `ZenStackClient`. Комментарий в коде прямо говорит «Передаётся в prismaAdapter Better Auth».
Это выглядит как тот же баг, только замаскированный существованием файла с правильным именем
`prisma.ts` — но auth-hub (Ключница) это центральный SSO для ~8+ приложений, и до
подтверждения живым тестом делать вывод («сломан»/«почему-то работает») преждевременно. Не
чинить с наскока в конце сессии — см. отдельную задачу.

**Новое приложение с Better Auth + ZenStack:** заводи `lib/prisma.ts` сразу по этому образцу,
не жди, пока баг всплывёт на проде — симптом (пустой 500 без логов) диагностируется медленно.
