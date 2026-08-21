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

## Определить, какой клиент использует приложение

По факту импорта в `lib/db.ts`: `getEnhancedPrisma`/`ZenStackClient` из `@zenstackhq/orm` (v3
ORM, коды — `dbErrorCode`/`reason`) против `PrismaClient` из `@prisma/client` напрямую
(classic, коды — `P2002` и т.п.). Импорт формы `import { prisma } from '@/lib/db'` сам по себе
ничего не говорит — решает реализация внутри `db.ts`.

Ошибка ORM также несёт поле `error.reason` (`ORMErrorReason`): `'not-found'` — запись не найдена
(аналог Prisma `P2025`, без SQLSTATE), `'rejected-by-policy'` — отказ политикой доступа (аналог
`P2004`), `'db-query-error'` — ошибка драйвера, тогда смотреть `dbErrorCode`.

## Аудит 2026-08-21 — все проверенные приложения оказались на ZenStack v3 ORM

Разбор найден на `apps/domwellbes` при фиксе гонки дедупа
(`restock-subscription.action.ts`, `PLAN_COMPLETED.md` запись 2026-08-21) — код `catch`,
скопированный по аналогии с `svoichuzhie` (`.code === 'P2002'`), в domwellbes никогда не
срабатывал: `dbErrorCode` там `23505`, а `.code` на обёрнутом `ORMError` не установлен.

Последующий аудит того же дня (grep по `code === 'P2002'`) нашёл ещё 4 места с тем же
паттерном — `apps/svoichuzhie/src/app/_actions/admin-product.action.ts`,
`apps/mandala/src/lib/actions/error-helpers.ts`,
`apps/animatrona-tracker/src/app/api/anime/route.ts`, `apps/driving-school/src/lib/errors.ts`.
**Все четыре, вопреки первоначальному предположению по аналогии со svoichuzhie/driving-school
как «classic Prisma» (см. версию этой заметки до 2026-08-21), оказались на ZenStack v3 ORM** —
проверено по `lib/db.ts` каждого приложения (`ZenStackClient`/`@zenstackhq/orm` присутствует
везде). Все четыре исправлены на `dbErrorCode`/`reason`. Не доверять прошлому выводу «этот
паттерн верен для X» без повторной проверки `lib/db.ts` — вывод мог устареть или быть ошибочным
изначально.
