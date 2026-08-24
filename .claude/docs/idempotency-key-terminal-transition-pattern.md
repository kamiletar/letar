# Идемпотентный слот терминального перехода — паттерн монорепо

## Проблема

Append-only событийная модель (`ProposalEvent`, `ContractEvent` и аналогичные) хранит переходы
состояния как отдельные строки, а не как поле статуса на родительской сущности. У такой модели нет
единого места, куда можно положить `updateMany({ where: { status: X } })` — TOCTOU-safe захват
через условие на статусное поле (приём `acceptRfqBid`/`cancelRfq` в
[`rfq.ts`](/apps/domwellbes/src/lib/logistics/rfq.ts)) здесь неприменим. Две параллельные попытки
записать терминальное событие (`ACCEPTED`/`REJECTED` одновременно, `ISSUED` дважды) должны
привести ровно к одной успешной записи, а не к двум конфликтующим строкам в истории.

## Когда применять

- Модель append-only: история переходов — отдельные события/строки, не одно статусное поле на
  родителе.
- У сущности есть хотя бы один переход, который обязан произойти **не более одного раза за всё
  время жизни сущности** (терминальный: `ACCEPTED`/`REJECTED`/`CANCELLED`, `ISSUED`, `SIGNED`).
- Переход инициируется конкурентно — из UI менеджера, из входящего письма, из повторного вызова
  API — и гонка реалистична, а не гипотетична.

Не путать с [payment-webhook-idempotency-pattern](/.claude/docs/payment-webhook-idempotency-pattern.md):
там дедуп **входящих внешних событий** (вебхук может прийти дважды с одним и тем же
provider-generated ID) через отдельную таблицу событий и `findUnique` → `create`. Здесь —
защита **одного конкретного перехода той же сущности** от повторной успешной записи, ключ
конструируется самим кодом, а не берётся из внешнего источника, и обнаружение конфликта идёт через
перехват ошибки уникальности, а не предварительный `findUnique`.

## Форма решения

1. **Уникальная колонка** `idempotencyKey` (`@unique` в `schema.zmodel`) на самой таблице события.
2. **Детерминированный ключ**, собранный из вида перехода + id сущности, к которой он относится —
   никакой случайности (`crypto.randomUUID()` тут не годится, каждый ретрай сгенерировал бы новый
   ключ и обошёл бы защиту):
   - `proposal-terminal:<proposalId>` — один слот на **все** терминальные исходы proposal сразу
     (`ACCEPTED`/`REJECTED`/`CANCELLED` конкурируют за один и тот же ключ, потому что terminal-ность
     здесь взаимоисключающая для трёх kind'ов).
   - `contract-issued:<revisionId>`, `contract-signed:<revisionId>`, `contract-cancelled:<revisionId>` —
     отдельный слот на каждый вид перехода той же ревизии, потому что тут это разные точки в одной
     последовательной state machine (ISSUED → SIGNED **или** CANCELLED), а не один терминальный
     набор — коллизия внутри одного kind не должна блокировать следующий kind.
3. **`try { create } catch`** — не `select-then-create`. В отличие от вебхуков (где источник
   события внешний и `findUnique` до записи — это законная проверка "видели ли мы этот
   provider-event-id"), здесь запись — единственный источник истины сама по себе: если конкурентная
   транзакция уже заняла слот, `create` бросит ошибку нарушения уникального ограничения, и это
   штатный, а не аварийный путь. Перехват переводит её в доменный код ошибки:

```typescript
try {
  await prisma.contractEvent.create({
    data: {
      contractId: revision.contractId,
      revisionId: revision.id,
      kind: 'ISSUED',
      actorId: input.actorId,
      idempotencyKey: `contract-issued:${revision.id}`,
    },
  })
  return { ok: true }
} catch (error) {
  if (error instanceof Error && error.message.includes('Unique constraint')) {
    return { ok: false, error: 'ALREADY_ISSUED_OR_TERMINAL' }
  }
  throw error
}
```

4. **Предварительная проверка по `events` — оптимизация, не защита.** Все три реализации ниже
   сначала читают уже записанные события и возвращают доменную ошибку без похода в БД, если
   терминальный kind уже виден. Это ускоряет обычный (не гоночный) случай и не является источником
   правильности — правильность даёт только `@unique` на `idempotencyKey`. Убрать эту проверку можно
   без потери корректности, оставить её — единственный способ не тратить транзакцию на заведомо
   отклонённый запрос.

## Известные реализации в domwellbes

Все три — часть `ROADMAP_M7.md` (детерминированные state machines M7A), скопированы друг с друга
осознанно (см. header-комментарии файлов), не унифицированы в общий хелпер по тем же причинам, что
и платёжный паттерн (см. ниже) — слот `idempotencyKey` это три строки, всё вокруг него (какие kind
делят один слот, что считать терминальным для данной сущности) специфично для каждой state
machine.

### `ProposalEvent.idempotencyKey` — `acceptProposal`

[`src/lib/sales/proposal-lifecycle.ts`](/apps/domwellbes/src/lib/sales/proposal-lifecycle.ts) —
один слот `proposal-terminal:<proposalId>` на все терминальные kind'ы (`ACCEPTED`/`REJECTED`/
`CANCELLED`) сразу, поскольку схема не хранит отдельного статусного поля — terminal-ность
проверяется по наличию события нужного kind в `events`.

### `ContractEvent.idempotencyKey` — `issueContractRevision`/`attachExternallySignedContract`/`cancelContractRevision`

[`src/lib/sales/contract.tsx`](/apps/domwellbes/src/lib/sales/contract.tsx) — три отдельных слота
на одну ревизию (`contract-issued:`, `contract-signed:`, `contract-cancelled:`), потому что
`Contract` — последовательная state machine (`DRAFT_CREATED` → `ISSUED` → `SIGNED` либо
`CANCELLED`), а не набор взаимоисключающих исходов одного момента, как у proposal. Каждая функция
дополнительно проверяет `events` на уже занятый терминальный kind до записи (см. п.4 выше).

`DRAFT_CREATED` (`createContractRevision`) тоже использует `idempotencyKey`
(`contract-draft-created:<revisionId>`), хотя это не терминальный, а начальный переход — защищает
от двойного создания ревизии при повторном вызове, тот же механизм применён шире, чем только
к терминальным событиям.

## Происхождение приёма

Впервые применён как `updateMany`-вариант (статусное поле, не append-only) в
`acceptRfqBid`/`cancelRfq`
([`src/lib/logistics/rfq.ts`](/apps/domwellbes/src/lib/logistics/rfq.ts)) — TOCTOU-safe захват
через условие `where: { status: { in: [...] } }`. Форма с `idempotencyKey` — адаптация того же
намерения («ровно один переход когда-либо пройдёт») под append-only схему, где статусного поля для
`updateMany` просто нет.

## Куда смотреть при добавлении новой state machine с терминальным переходом

1. Есть ли у события `idempotencyKey` с `@unique` в `schema.zmodel` — если схема append-only и
   переход обязан быть единственным, поле нужно завести сразу, не после первого инцидента гонки.
2. Ключ детерминирован и привязан к переходу + сущности (`<kind-slug>:<entityId>`), не к случайному
   значению.
3. Один слот на несколько kind'ов, если они взаимоисключающи в один момент (как proposal), или
   отдельный слот на каждый kind, если это разные точки последовательной state machine (как
   contract).
4. `try { create } catch` с переводом ошибки уникальности в доменный код — не `select-then-create`
   (этот приём для дедупа внешних событий, см.
   [payment-webhook-idempotency-pattern](/.claude/docs/payment-webhook-idempotency-pattern.md)).
