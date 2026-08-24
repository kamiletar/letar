# Append-only лог событий: терминальность через общий unique idempotencyKey

## Когда применим

- Модель хранит историю как **append-only лог событий** (`XxxEvent`), а не отдельное статусное
  поле на родителе (`status` enum с `updateMany`-переходами).
- У сущности несколько **взаимоисключающих терминальных исходов** (ACCEPTED vs REJECTED,
  ISSUED vs CANCELLED, SIGNED vs CANCELLED) — после любого из них дальнейшие терминальные
  переходы должны быть невозможны, независимо от того, какой именно исход наступил первым.
- Конкурентные попытки завершить сущность (два запроса на приём/отклонение одного и того же
  предложения) должны разрешаться атомарно на уровне БД, без блокировки чтения (`SELECT ... FOR
  UPDATE`) и без отдельной транзакционной сериализации.

Если у сущности **есть** отдельное статусное поле на родителе — используй вместо этого
`updateMany` с условием на текущий статус (см. `acceptRfqBid` в
[rfq.ts](/apps/domwellbes/src/lib/logistics/rfq.ts) — TOCTOU-safe захват через `updateMany({
where: { status: { in: [...] } } })`, `claimed.count === 0` означает проигранную гонку). Приём
ниже — для случая, когда такого поля намеренно нет (append-only схема).

## Приём

Все конкурирующие терминальные переходы создают запись в логе событий с **одним и тем же**
значением уникального поля `idempotencyKey`, специфичным для родителя, но не для исхода:

```
idempotencyKey: `proposal-terminal:${proposalId}`   // и ACCEPTED, и REJECTED пишут этот же ключ
idempotencyKey: `contract-issued:${revisionId}`      // один терминальный слот на конкретный переход
```

Unique-constraint на `idempotencyKey` гарантирует ровно одну успешную вставку. Все остальные
попытки ловят ошибку constraint'а и превращают её в бизнес-исход:

```typescript
try {
  const event = await prisma.proposalEvent.create({
    data: {
      proposalId,
      kind: 'REJECTED', // или 'ACCEPTED' — оба пишут ОДИН и тот же idempotencyKey
      idempotencyKey: `proposal-terminal:${proposalId}`,
    },
  })
  return { ok: true, eventId: event.id }
} catch (error) {
  if (error instanceof Error && error.message.includes('Unique constraint')) {
    return { ok: false, error: 'PROPOSAL_TERMINAL_CONFLICT' }
  }
  throw error
}
```

Гонка решается на `INSERT`, а не на предварительном `SELECT` — это и есть TOCTOU-safe: между
проверкой «терминального события ещё нет» и записью нового события не остаётся окна, в которое
может проскочить конкурент, потому что сама проверка — это попытка записи, а не чтение.

### Четыре подтверждённых применения (обновлено 2026-08-25)

| Родитель                                                                                | Слот                             | Взаимоисключающие исходы                                                                                                                                  |
| --------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeliveryRfq` (через отдельное поле `status`, не этот приём — см. предостережение выше) | —                                | —                                                                                                                                                         |
| `CommercialProposal`                                                                    | `proposal-terminal:<proposalId>` | ACCEPTED / REJECTED (и зарезервировано под CANCELLED) — [proposal-lifecycle.ts](/apps/domwellbes/src/lib/sales/proposal-lifecycle.ts)                     |
| `ContractRevision` (переход в ISSUED)                                                   | `contract-issued:<revisionId>`   | только один ISSUED — [contract.tsx:234](/apps/domwellbes/src/lib/sales/contract.tsx)                                                                      |
| `ContractRevision` (переход из ISSUED)                                                  | `contract-terminal:<revisionId>` | SIGNED vs CANCELLED — общий слот, `attachExternallySignedContract`/`cancelContractRevision` в [contract.tsx](/apps/domwellbes/src/lib/sales/contract.tsx) |

`attachExternallySignedContract`/`cancelContractRevision` унифицированы на общий ключ
`contract-terminal:<revisionId>` 2026-08-25 (изначально, на 2026-08-24, у каждого был свой ключ —
`contract-signed:<revisionId>`/`contract-cancelled:<revisionId>` — и защита от гонки держалась
только на предварительной проверке `events.some(kind === 'SIGNED' || kind === 'CANCELLED')`, что
оставляло TOCTOU-окно между `SELECT` и `INSERT`). Предварительная проверка осталась как быстрый
путь к business-исходу (`NOT_ISSUED`/`ALREADY_TERMINAL` без похода до constraint'а), но саму
гонку теперь закрывает unique-constraint на `idempotencyKey` — см. тест «гонка SIGNED vs
CANCELLED» в [contract.spec.ts](/apps/domwellbes/src/lib/sales/contract.spec.ts).

## Ловушка: это НЕ защита для нетерминальных событий в том же логе

Общий unique-слот занимает только **терминальные** kind'ы. Нетерминальные события того же лога
(`SENT`, `VIEWED` у `ProposalEvent`) используют свой **уникальный на каждое событие** ключ
(обычно с `randomUUID()` в составе) — они не участвуют в терминальном слоте и могут создаваться
сколько угодно раз:

```
idempotencyKey: `proposal-sent:${proposalId}:${randomUUID()}`   // SENT — повтор разрешён
idempotencyKey: `proposal-viewed:${proposalId}:${randomUUID()}` // VIEWED — повтор разрешён
```

Если нужен инвариант **«нельзя создать новое нетерминальное событие после того, как сущность уже
терминальна»** (например: нельзя отправить письмо `SENT`, если КП уже `ACCEPTED`) — это отдельная
проверка, не покрытая уникальным индексом. Она реализована как обычный check-then-act:
предварительный `SELECT` списка `events`, ручная проверка `hasTerminalEvent(...)`, и только потом
`INSERT`. Пример — `assertProposalNotTerminal` в
[proposal-lifecycle.ts:51-61](/apps/domwellbes/src/lib/sales/proposal-lifecycle.ts):

```typescript
async function assertProposalNotTerminal(proposalId: string) {
  const proposal = await prisma.commercialProposal.findUnique({
    where: { id: proposalId },
    select: { events: { select: { kind: true } } },
  })
  if (!proposal) { return { ok: false, error: 'PROPOSAL_NOT_FOUND' } }
  if (hasTerminalEvent(proposal.events)) { return { ok: false, error: 'PROPOSAL_TERMINAL_CONFLICT' } }
  return { ok: true }
}
```

Эта проверка **имеет** TOCTOU-окно: между `SELECT` и `INSERT` конкурентный запрос может успеть
занять терминальный слот, и `sendProposal`/`recordProposalViewed` в этом случае всё равно создаст
`SENT`/`VIEWED` уже после факта терминальности — просто с небольшой задержкой обнаружения на
следующий вызов. Это осознанный компромисс: `SENT`/`VIEWED` не влияют на бизнес-результат
(повторное уведомление или лишний просмотр после решения клиента не ломает данные), поэтому
строгая БД-гарантия здесь не нужна — в отличие от терминальных переходов, где гонка ACCEPTED vs
REJECTED должна быть исключена абсолютно.

## Референс

- [rfq.ts:213-270](/apps/domwellbes/src/lib/logistics/rfq.ts) — `acceptRfqBid`, первоисточник
  приёма (вариант с отдельным статусным полем, `updateMany`, а не общий `idempotencyKey`)
- [proposal-lifecycle.ts](/apps/domwellbes/src/lib/sales/proposal-lifecycle.ts) — `acceptProposal`/
  `rejectProposal` (общий слот `proposal-terminal:<proposalId>`), `sendProposal`/
  `recordProposalViewed` (нетерминальные события, `assertProposalNotTerminal`)
- [contract.tsx:212-357](/apps/domwellbes/src/lib/sales/contract.tsx) — `issueContractRevision`/
  `attachExternallySignedContract`/`cancelContractRevision`
