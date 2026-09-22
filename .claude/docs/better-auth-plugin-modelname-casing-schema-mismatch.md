# Better Auth: `modelName` в конфиге плагина сверяется буквально, без нормализации регистра

## Симптом

`SCHEMA_MISMATCH` при старте называет отсутствующей таблицу, которая физически есть в БД:

```
[BetterAuthError]: Prisma schema mismatch
  Missing tables: OrganizationInvitation
  code: 'SCHEMA_MISMATCH'
```

`prisma.organizationInvitation` существует, миграция применена, `@@map` на месте — а плагин всё
равно считает таблицу отсутствующей.

## Причина

Когда конфиг плагина переопределяет имя модели под коллизию (`organization({ schema: {
invitation: { modelName: '...' } } })` — типовой случай для этого приложения: `Invitation`
занята под другую сущность, инструктор↔ученик), значение `modelName` — это **client-property
casing** Prisma Client (как модель экспонируется как свойство: `prisma.organizationInvitation`,
первая буква строчная), а не имя самой Prisma-модели и не `@@map`-значение.

`@better-auth/core/src/db/schema-diff.ts` берёт `modelName` из конфига буквально
(`getExpectedSchema`) и сравнивает с именем, которое `introspectPrismaDataModel()` в
`@better-auth/prisma-adapter` получает через `clientProperty()` — **без какой-либо нормализации
регистра** ни на одной из сторон. `@@map` в этом конкретном механизме не участвует вовсе — он
влияет только на реальное имя таблицы в SQL, а не на сравнение.

PascalCase (`OrganizationInvitation`) в `modelName` всегда даёт ложный `SCHEMA_MISMATCH`, даже
когда таблица на месте, потому что `clientProperty()` для сравнения всегда возвращает camelCase.

## Решение

```ts
organization({
  schema: {
    invitation: { modelName: 'organizationInvitation' }, // camelCase, не 'OrganizationInvitation'
  },
})
```

## Диагностика — читать исходник, не гадать по `@@map`

`@@map` — первая гипотеза, которая приходит в голову при виде «Missing table» с похожим именем,
но в этом случае она неверна. Проверять на источнике: `@better-auth/core/src/db/schema-diff.ts`
(`getExpectedSchema`) и `@better-auth/prisma-adapter` (`introspectPrismaDataModel`,
`clientProperty`) — то же место, что и для
[[better-auth-organization-teams-schema-fields]]. Если у плагина сверх этого нет живого
рантайм-использования (см. ниже) — баг может быть только в самопроверке схемы при старте, без
последствий для реальных операций.

## Как понять, что рантайм-эффекта нет

Прежде чем чинить как критичный баг — проверить, ходит ли приложение вообще через плагин для
этой модели. Если бизнес-логика работает с моделью напрямую через ORM-клиент (в обход
`authClient.organization.*`), у бага есть только один эффект — ложный отказ при старте, и это
меняет приоритет фикса (можно фиксить рутинно, не как P0).
