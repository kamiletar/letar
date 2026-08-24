# ZenStack: relation-traversal в `@@allow`/`@@deny` проверяет текущее состояние связи, а не то, куда её переставляют

## Симптом

Child-модель ссылается FK-полем на versioned/immutable parent (версия документа, RFQ,
шаблон производственного графика). Immutability parent'а в терминальном состоянии
(`PUBLISHED`, `ACCEPTED`, `CANCELLED`) обеспечена policy child-модели через
relation-traversal:

```zmodel
model StageTemplateItem {
  versionId String
  version   StageTemplateVersion @relation(fields: [versionId], references: [id])

  @@allow('create,update,delete', auth().isAdmin && version.status == DRAFT)
}
```

Выглядит безопасно: пока `version.status != DRAFT`, `update`/`delete` запрещены. На практике
обход есть — `update`, меняющий саму FK-связь (`versionId`) на запись, у которой `version.status
== DRAFT`, проходит policy-проверку и одним вызовом переносит item на другую версию, попутно
меняя остальные поля в том же `data`. Опубликованная версия, для которой сама policy написана,
никогда не защищала от того, что её содержимое подменяется этим путём.

## Причина

Relation-traversal условие (`version.status == DRAFT`) в `@@allow`/`@@deny` вычисляется по
состоянию связанной записи **до** применения update — то есть по значению `versionId`, которое
было в строке ДО вызова, не после. Если `data` того же `update()` меняет `versionId`, policy
не видит новое целевое состояние вообще: она однократно проверяет текущую (пока ещё старую)
связь, разрешает операцию, а сам update внутри неё как раз и переставляет FK. Ограничение
работает как ворота на входе, а не как инвариант на каждое поле записи.

## Решение

Immutability самой связи — отдельное правило, независимое от условия на состояние parent'а.
Field-level `@deny('update', true)` на FK-поле запрещает менять его вообще, каким бы ни было
состояние parent'а — обходной путь исчезает, потому что нет способа передать новый `versionId`
ни при каком состоянии текущей связи:

```zmodel
model StageTemplateItem {
  /// Immutable после создания: без этого update item DRAFT-версии мог бы переподвесить
  /// его на versionId уже PUBLISHED-версии — модельный @@deny у StageTemplateVersion
  /// проверяет состояние version, но не то, что update item меняет саму связь
  versionId String @deny('update', true)
  version   StageTemplateVersion @relation(fields: [versionId], references: [id])

  @@allow('create,update,delete', auth().isAdmin && version.status == DRAFT)
}
```

`@deny` на конкретном поле побеждает `@@allow` на уровне модели независимо от порядка объявления
(ZenStack: deny всегда приоритетнее allow) — остальные поля модели по-прежнему редактируются
через тот же `update()`, меняться не может только сама связь.

## Как искать этот паттерн

Признак — child-модель с FK на модель, у которой есть поле состояния/статуса, и write-policy
(`@@allow`/`@@deny` на `create`/`update`/`delete`) содержит **relation-traversal** до этого поля
(`parent.status == X`, `parent.isCurrent`, `parent.isPublished` и т.п.), но само FK-поле не несёт
`@deny('update', true)`. Пустой список условий на write-policy (без проверки состояния parent'а
вообще) под этот паттерн не подпадает — там нечего обходить, потому что immutability policy'ей
не заявлена в принципе (staff может свободно редактировать/удалять запись независимо от состояния
parent'а — это осознанный выбор модели, не баг). Опасен только случай, когда policy **пытается**
enforced immutability через relation-traversal и не защищает саму связь отдельно.

## Известные случаи в монорепо

- **`domwellbes`** — `StageTemplateItem.versionId` / `StageTemplateDependency.versionId`
  (`apps/domwellbes/schema.zmodel`), найдено `auth-policy-validator` в сессии M8A.1
  (2026-08-24). Оба уже несли `@deny('update', true)`, это canonical-образец фикса.
- **`domwellbes`** — `DeliveryRfqBid.rfqId`. Ставка перевозчика неизменяема после того, как
  `DeliveryRfq` перешёл в `ACCEPTED`/`CANCELLED`
  (`@@deny('update', rfq.status == ACCEPTED || rfq.status == CANCELLED)`), но без field-level
  deny `update()`, одновременно меняющий `rfqId` (перевешивающий ставку с открытого RFQ на
  чужой) и `priceKopecks` в одном вызове, проходил policy — текущий (ещё не ACCEPTED) `rfq`
  на момент проверки удовлетворял условию. Закрыто тем же приёмом при аудите-продолжении
  2026-08-24.
- Модели с FK на `HouseVersion`/`FinancingProgram`/`OwnershipCostProfile`
  (`apps/domwellbes/schema.zmodel`) проверены и **не подпадают** — их write-policy вообще не
  проверяет состояние parent'а (`isCurrent`/`isPublished` участвует только в read-policy),
  значит обходить нечего: staff-редактирование этих моделей не заявлено как immutable.
- **`domwellbes`** — `EstimateLimitedCost.estimateId` / `EstimateSection.estimateId` /
  `EstimateItem.estimateId` (`@@deny('create,update,delete', estimate.status != DRAFT)` без
  field-level деня на `estimateId`), закрыто тем же приёмом при сквозном аудите монорепо
  2026-08-24.

## Аудит по всем приложениям монорепо (2026-08-24)

Проверены все приложения с `schema.zmodel` (aboi, animatrona, animatrona-tracker, aprel8008,
archetest, auth-hub, dashboard, domwellbes, driving-school, dsperevod, form-develop-app,
form-example, grandslamcup, kami, label-printer-desktop, mandala, studio, svoichuzhie, time) —
грепом write-policy (`@@allow`/`@@deny` на `create`/`update`/`delete`) на relation-traversal до
поля состояния (`.status`, `.isCurrent`, `.isPublished`, `.isDone`, `.isActive` и аналоги).
Паттерн найден только в `domwellbes` (три находки выше, все закрыты). Во всех остальных
приложениях такие условия либо отсутствуют вовсе, либо встречаются только в `@@allow('read', ...)`
— паттерн специфичен для write-policy, read не даёт способа переставить FK.

## Как проверять при ревью новой versioned-модели

1. Найти write-policy (`@@allow`/`@@deny` на `create`/`update`/`delete`), которая упоминает
   поле состояния связанной модели через точку (`relation.field`).
2. Если такое условие есть — проверить, что FK-поле этой relation несёт
   `@deny('update', true)`. Если условия нет вообще — это не тот паттерн, пропускать.
3. После правки — `nx zenstack:generate <app>` и `nx typecheck:tsgo <app>`/`nx lint <app>`;
   DB-схема не меняется (`@deny` — чисто policy-уровень), миграция не нужна.
