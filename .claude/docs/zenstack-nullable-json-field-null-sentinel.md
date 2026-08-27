# ZenStack: nullable `Json`-поле не принимает `null` — нужен `JsonNull`

## Симптом

В `schema.zmodel` есть nullable `Json`-поле (например `lastErrorsJson Json?`). В коде для
«очистить»/«разбивки нет» передаётся обычный JS `null`:

```typescript
await prisma.classifiedListing.update({
  where: { id: listing.id },
  data: { lastErrorsJson: null },
})
```

Рантайм падает с длинной Zod-ошибкой вида `invalid_union`/`unrecognized_keys`. Ошибка обманчива:
сообщение обычно перечисляет ветки union-схемы всего входного объекта `data`/`where` целиком, и
по тексту может выглядеть так, будто проблема в **другом** поле того же вызова — например в
`where`-условии или в несуществующих ключах `project`/`createdById` — хотя реальная причина
всегда в JS `null`, положенном в `Json`-поле где-то в том же вызове.

## Причина

Prisma/ZenStack различает три состояния `Json`-поля: значение, **отсутствие ключа** (не трогать
поле) и **SQL NULL** (явно обнулить). Обычный JS `null` в объекте `data` в схеме валидации
Prisma/ZenStack — это не то же самое, что «поле не передано»: он не совпадает ни с одной веткой
union-типа `Json`-значения (`string | number | boolean | JsonObject | JsonArray`), поэтому Zod
валидатор ORM-слоя не может сопоставить объект `data` целиком ни с одним вариантом и падает с
`invalid_union` — а не с понятной ошибкой «нельзя присвоить `null` в `Json`-поле».

## Решение

Импортировать `JsonNull` из `@zenstackhq/orm` и передавать его вместо `null` — это специальный
sentinel-объект, который ORM распознаёт как «явно SQL NULL»:

```typescript
import { JsonNull } from '@zenstackhq/orm'

await prisma.classifiedListing.update({
  where: { id: listing.id },
  data: { lastErrorsJson: JsonNull },
})
```

Найдено трижды в domwellbes:

- [feed-run.ts:82](/apps/domwellbes/src/lib/classifieds/feed-run.ts) — `lastErrorsJson: JsonNull`
  при успешной публикации (сброс предыдущей ошибки).
- [rfq.ts:254](/apps/domwellbes/src/lib/logistics/rfq.ts) — комментарий на месте, объясняет то же
  самое; там же показан пограничный случай: пустой массив (`breakdown: []`) — это не `null` и в
  `JsonNull` не нуждается, семантически «разбивки нет» ближе к пустому значению, чем к отсутствию.
- [project-schedule.ts:125-147](/apps/domwellbes/src/lib/projects/schedule/project-schedule.ts) —
  сразу три поля (`errorsJson`, `warningsJson`, `conflictKeysJson`) в одном `create()`, разные
  ветки условия одинаково используют `JsonNull` вместо `null`.

## Как отличить от соседней ловушки

Не путать с [zenstack-typed-interface-json-snapshot](/.claude/docs/zenstack-typed-interface-json-snapshot.md)
— там объект **есть**, но TypeScript не проходит по структуре (index signature). Здесь наоборот:
типы компилируются нормально, падает **рантайм**-валидатор Zod, и только когда значение — именно
`null`, а не объект/массив/примитив.
