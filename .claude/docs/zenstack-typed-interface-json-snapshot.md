# ZenStack: типизированный интерфейс без index signature не проходит в `Json`-поле

## Симптом

В `schema.zmodel` есть поле `Json` (снапшот входов расчёта, аудит-лог и т.п.). В коде собирается
объект из именованных `interface`-типов (не `Record<string, unknown>`) и передаётся в `create()`/
`update()` напрямую. TypeScript падает:

```
Type 'PlotFitPlotInput' is not assignable to type 'JsonValue | null | undefined'.
  Type 'PlotFitPlotInput' is not assignable to type 'JsonObject'.
    Index signature for type 'string' is missing in type 'PlotFitPlotInput'.
```

## Причина

Сгенерированный ZenStack/Prisma тип `JsonObject` требует index signature (`{ [key: string]:
JsonValue }`). Именованный `interface` с явно перечисленными полями (даже если все поля —
`string | number | null`, то есть JSON-совместимы по значению) структурно не совпадает — у него
нет index signature, и TypeScript это не выводит автоматически из списка полей.

Пример — `apps/domwellbes/src/app/(admin)/admin/_actions/plot-fit-assessment.action.ts`:
входы `assessPlotFit()` типизированы интерфейсами `PlotFitPlotInput`/`PlotFitHouseInput`
(`src/lib/plot/assess-plot-fit.ts`), их пробовали положить прямо в `inputsSnapshotJson`.

## Решение

Прогнать объект через `JSON.parse(JSON.stringify(...))` перед присвоением в `Json`-поле — это
стирает именованный тип до структурного `any`/`JsonValue`-совместимого объекта, компилятор больше
не видит исходный интерфейс:

```typescript
await db.plotHouseFitAssessment.create({
  data: {
    // ...
    inputsSnapshotJson: JSON.parse(JSON.stringify({ plot: plotInput, house: houseInput })),
  },
})
```

Не подходит `as Prisma.InputJsonValue`/`as unknown as Prisma.JsonObject` вслепую — это глушит и
настоящие несовместимости (например `undefined` в поле, который `JSON.stringify` молча
выбрасывает, а Prisma на `undefined` в `Json` может повести себя иначе, чем на отсутствующий
ключ). `JSON.parse(JSON.stringify(...))` даёт то же самое поведение, что фактически произойдёт
при сериализации в БД, поэтому расхождение типа и рантайма исключено — это не хак вокруг
компилятора, а копия его же поведения.

## Когда НЕ нужно

Если объект уже строится как результат `async function`, возвращающий литерал без явной
`interface`-аннотации (пример — `snapshotPlotFields()` в
`plot-verification.action.ts`), TypeScript выводит анонимный object type, который проходит в
`Json` без ошибки — граблю ловит только явная типизация именованным `interface`/`type`, не любой
объект с фиксированным набором полей.
