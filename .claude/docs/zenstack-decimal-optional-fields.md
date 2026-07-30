# ZenStack: `number` не проходит в опциональное `Decimal`-поле

## Симптом

В `schema.zmodel` есть поле типа `Decimal?` (опциональное/nullable). В коде формы это поле —
обычный `number` (Zod-схема формы валидирует его как число). При вызове `db.<model>.create()`/
`update()` с этим значением TypeScript падает с ошибкой вида:

```
Type 'number' is not assignable to type 'Decimal'.
```

При этом **обязательное** (non-nullable) `Decimal`-поле той же модели принимает `number` без
единой жалобы компилятора — асимметрия сбивает с толку, потому что в схеме БД оба поля выглядят
одинаково типизированными.

Пример из `apps/driving-school/schema.zmodel:1731,4206` — два похожих поля `pricePerLesson` в
разных моделях, одно required, другое optional:

```zmodel
pricePerLesson   Decimal                          // required — number проходит
pricePerLesson   Decimal?            @db.Decimal(10, 2)  // optional — number НЕ проходит
```

## Причина

Не баг в данных и не баг ZenStack — особенность сгенерированных типов Prisma-based input payload.
Для **обязательного** поля generated input type — union `Decimal | DecimalJsLike | number | string`
(Prisma допускает несколько форм ввода для required-скаляра). Для **опционального** поля
generated тип уже — `Decimal | DecimalJsLike | string | null` (Prisma здесь сужает допустимые формы
ввода, `number` в union не входит). ZenStack наследует эту сгенерированную типизацию как есть, не
расширяя её обратно.

## Решение

`decimal.js` даёт собственный тип `Decimal`, который в рантайме прозрачно принимает `number`
(prisma сериализует его сам). Обойти сужение типа — импортировать этот тип отдельно и привести
значение через `as unknown as Decimal`:

```typescript
import type { Decimal } from 'decimal.js'

export async function updateHouse(id: string, data: Partial<HouseFormData>) {
  const house = await db.house.update({
    where: { id },
    data: {
      ...data,
      totalAreaM2: data.totalAreaM2 as unknown as Decimal,
      footprintLengthM: data.footprintLengthM as unknown as Decimal,
      footprintWidthM: data.footprintWidthM as unknown as Decimal,
    },
  })
  return house
}
```

`as unknown as Decimal`, а не прямой `as Decimal` — потому что `number` и `Decimal` не пересекаются
структурно, TypeScript отказывается кастовать напрямую (`Conversion of type 'number' to type
'Decimal' may be a mistake`). Двойной каст через `unknown` — стандартный способ сказать
компилятору «доверься рантайму», не открывая `as any` на весь объект `data`.

## Известные случаи в монорепо

- **`driving-school`** — `instructor-onboarding/_actions/onboarding.action.ts:203,211,232,240`,
  поле `pricePerLesson` (опциональное в модели цен инструктора).
- **`domwellbes`** — `(admin)/admin/_actions/house.action.ts` (`createHouse`/`updateHouse`),
  поля `totalAreaM2`/`footprintLengthM`/`footprintWidthM`.

Оба места — один и тот же паттерн: форма отдаёт `number`, модель хранит опциональный `Decimal`.
