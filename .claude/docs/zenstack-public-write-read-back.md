# ZenStack: публичный `create` не даёt прочитать созданную запись назад

## Симптом

Модель разрешает создание всем (`@@allow('create', true)`) — типичная публичная форма
(заявка с сайта, заказ без обязательной регистрации), но чтение разрешено только узкой роли
(`@@allow('read', auth().isAdmin)` и т.п.). Код через `getEnhancedPrisma()` без сессии
(анонимный актор) падает при обычном `db.model.create({ data })`:

```
Error: result is not allowed to be read back
```

Ошибка возникает даже когда `create`-политика полностью открыта — проблема не в праве на запись,
а в праве прочитать то, что только что записали.

## Причина

`create()` у Prisma/ZenStack по умолчанию возвращает созданную запись. ZenStack проверяет
read-политику для этого возврата так же, как для любого другого чтения. Если у текущего актора
(здесь — анонимного, без `auth()`) нет прав на `read` этой модели, ZenStack не даёт прочитать
только что вставленную строку — несмотря на то что сама вставка была разрешена.

## Решение

Для этого конкретного действия — публичной точки записи без пользовательской сессии — писать
через **сырой** Prisma-клиент (`prisma`/`prismaAuth`, без `PolicyPlugin`), а не через
`getEnhancedPrisma()`. Вход в это действие уже защищён на своём уровне (Zod-валидация формы,
единственная точка входа — публичная форма), поэтому обход read-политики здесь безопасен.

```typescript
'use server'

import { prisma } from '@/lib/db'

// Сырой prisma, не getEnhancedPrisma(): Lead читает только админ-роль, а ZenStack
// запрещает читать назад только что созданную запись, которую текущий (анонимный) актор не
// вправе читать — даже когда create-политика открыта всем. Пишем без user-контекста осознанно:
// единственный вход в это действие — публичная форма, вход уже провалидирован Zod-схемой выше.
export async function createPublicLeadAction(input: unknown) {
  const parsed = LeadRequestSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const lead = await prisma.$transaction(async (tx) => {
    const consentLog = await tx.consentLog.create({ data: {/* ... */} })
    return tx.lead.create({ data: { /* ...*/ consentLogId: consentLog.id } })
  })

  return { data: lead }
}
```

Если запись затрагивает несколько моделей (журнал согласия + сама заявка, заказ + позиции заказа),
оборачивай их в `prisma.$transaction(...)` тем же сырым клиентом — атомарность не связана с
enhanced-клиентом и работает одинаково в обоих случаях.

## Известные случаи в монорепо

- **`studio`** — [`src/lib/consent.ts`](/apps/studio/src/lib/consent.ts) (запись `ConsentLog` через
  `@letar/consent`) и [`src/app/_actions/lead.action.ts`](/apps/studio/src/app/_actions/lead.action.ts)
  (`Lead`, `@@allow('create', true)` + `@@allow('read,update,delete', auth().isOwner)`).
- **`domwellbes`** — [`src/app/_actions/lead-request.action.ts`](/apps/domwellbes/src/app/_actions/lead-request.action.ts),
  `ConsentLog` + `Lead` одной транзакцией сырым `prisma.$transaction`, с комментарием прямо в коде.
- **`aboi`** — [`gift/_actions/place-gift-order.action.ts`](/apps/aboi/src/app/[locale]/(shop)/gift/_actions/place-gift-order.action.ts),
  `Order` + `OrderItem` через `prismaAuth.$transaction` (в этом приложении `prismaAuth` — имя
  переменной под сырой `PrismaClient`, не enhanced-клиент несмотря на название).

## Это НЕ отменяет общее правило

Общее правило монорепо — использовать `getEnhancedPrisma()`, а не сырой Prisma-клиент, чтобы
access control policies применялись автоматически (см. [database.md](/.claude/docs/database.md),
раздел «Устранение неполадок» → «Ошибки отказа в доступе»). Это правило остаётся действующим по
умолчанию для всей остальной логики приложения — авторизованных чтений, обновлений, удалений.

Исключение из этого раздела узкое: **только** для операции `create` на модели, где write открыт
шире, чем read, и вызывающий код анонимный (нет `auth()`). Если у актора есть сессия и его
`auth()` удовлетворяет read-политике модели (например, `auth().id == userId`) — enhanced-клиент
отработает `create()` с чтением назад без ошибки, обходить его не нужно.
