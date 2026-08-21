# ZenStack v3 ORM — коды ошибок БД не Prisma-коды

⚠️ Приложения на ZenStack v3 (`@zenstackhq/orm`, генерируемый клиент в `src/generated/prisma`)
используют собственный ORM-слой поверх Kysely, **не** classic `@prisma/client`. Ошибки драйвера
оборачиваются в `ORMError` (`@zenstackhq/orm/dist/index.mjs`, `createDBQueryError`/
`getDbErrorCode`) с полем `error.dbErrorCode` = **сырой код драйвера БД** (для Postgres — код
`SQLSTATE`, например `23505` для unique_violation), а не Prisma-код (`P2002`).

`instanceof PrismaClientKnownRequestError` тоже не годится: у сгенерированного ZenStack v3
клиента (`browser`-вариант, реэкспортируемый как `@/generated/prisma`) `Prisma` namespace типов
есть (`type * from`), но сам класс ошибки как **значение** из browser-бандла не экспортируется —
`instanceof` упадёт с TS2551 на этапе typecheck.

## Как правильно ловить unique-violation в ZenStack v3 приложении

```typescript
try {
  await db.model.create({ data: { ... } })
} catch (e) {
  if ((e as { dbErrorCode?: string }).dbErrorCode !== '23505') {
    throw e
  }
  // дубль по уникальному ограничению — трактуем как штатный случай
}
```

Частые коды Postgres `SQLSTATE` при мутациях: `23505` unique_violation, `23503`
foreign_key_violation, `23502` not_null_violation, `23514` check_violation.

## Не путать с classic Prisma Client кодами

Приложения на **classic** `@prisma/client` (не ZenStack v3 ORM) в этом же монорепо (пример —
`apps/svoichuzhie/src/app/_actions/admin-product.action.ts`, `apps/driving-school/src/lib/errors.ts`)
действительно ловят `error.code === 'P2002'` — тот паттерн для них верен, это два разных клиента
с разным форматом ошибок. Определить, какой клиент использует приложение — по факту импорта
`getEnhancedPrisma`/`@zenstackhq/orm` (v3 ORM) против `PrismaClient` из `@prisma/client`
напрямую.

Разбор найден на `apps/domwellbes` при фиксе гонки дедупа
(`restock-subscription.action.ts`, `PLAN_COMPLETED.md` запись 2026-08-21) — код `catch`,
скопированный по аналогии с `svoichuzhie` (`.code === 'P2002'`), в domwellbes никогда не
срабатывал: `dbErrorCode` там `23505`, а `.code` на обёрнутом `ORMError` не установлен.
