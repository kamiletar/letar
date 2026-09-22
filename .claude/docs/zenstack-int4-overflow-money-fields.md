# ZenStack: `Int`-поле для денег в копейках переполняет INT4

## Симптом

Поле в `schema.zmodel` объявлено как `Int` и хранит сумму в минорных единицах (копейках).
При сохранении реалистичной суммы Postgres падает с:

```
value "3000000000" is out of range for type integer
```

Пример — `apps/domwellbes/schema/house-config.zmodel`, модель `FinancingProgram`:
дефолтное значение поля «Макс. сумма» в форме создания программы — 30 000 000 ₽, то есть
3 000 000 000 копеек.

## Причина

Postgres `Int` в ZenStack/Prisma — это INT4, максимум `2 147 483 647`. В копейках это
≈ 21,47 млн ₽. Любая денежная сумма дороже квартиры в middle-размерном городе уже превышает
лимит. `Decimal` в схемах этого монорепо — конвенция для физических величин
([zenstack-decimal-optional-fields](/.claude/docs/zenstack-decimal-optional-fields.md)), не для
копеек; денежные поля исторически объявлялись `Int`, и падение проявляется только на
конкретных больших значениях, а не на каждой записи — поэтому баг легко просуществует до первого
реального прогона с реалистичными цифрами.

## Решение

Менять тип поля на `BigInt` (INT8), не на `Decimal` — сумма в копейках всегда целая, `BigInt`
точнее отражает домен и не тянет за собой раундинг `decimal.js`.

```zmodel
minAmountKopecks  BigInt
maxAmountKopecks  BigInt
```

Дальше три места, где рантайм `bigint` конфликтует с остальным кодом приложения, который
продолжает работать с `number`:

1. **RSC-граница.** Server Component не может передать `bigint` в Client Component — сериализация
   рвётся без явной ошибки в консоли браузера, только в логе сервера. Конвертировать `Number(...)`
   сразу при чтении, до передачи в `<ClientComponent initialValue={...}>`.
2. **`JSON.stringify`.** Бросает `TypeError: Do not know how to serialize a BigInt` на любом
   объекте, где `bigint` лежит хотя бы в одном поле — типичное место, где это всплывает, это
   snapshot-паттерн `JSON.parse(JSON.stringify({...}))` в server actions. Конвертировать перед
   сборкой снимка.
3. **Zod-схема формы и остальная бизнес-логика.** Оставлять как `z.number()` — UI, аннуитетные
   расчёты (`decimal.js` принимает `number`/`bigint` в конструкторе, но остальной код ожидает
   `number`) и форматирование (`formatKopecks(kopecks: number)`) не переписывать на bigint.
   Конвертировать `BigInt(...)` только в двух точках записи (`create`/`update`), `Number(...)` —
   во всех точках чтения.

Ловушка на `update` при частичном патче: наивно перезаписывать поле после спреда всего объекта —

```typescript
// ❌ tsgo сводит тип поля к `number | bigint`, потому что видит два источника: `...data` (number)
// и перезапись (bigint) — Prisma input не принимает union
data: { ...data, minAmountKopecks: BigInt(data.minAmountKopecks) }
```

— вместо этого вынести поле из спреда деструктуризацией, оставив в `...rest` всё, что не меняет
тип:

```typescript
const { minAmountKopecks, maxAmountKopecks, ...rest } = data
data: {
  ...rest,
  ...(minAmountKopecks !== undefined ? { minAmountKopecks: BigInt(minAmountKopecks) } : {}),
  ...(maxAmountKopecks !== undefined ? { maxAmountKopecks: BigInt(maxAmountKopecks) } : {}),
}
```

Прямой `number → bigint` каст Prisma/ZenStack input-типы не принимают вовсе (в отличие от
`Decimal`, который принимает `number` для обязательных полей) — только явный `BigInt(...)`.

## Известные случаи в монорепо

- **`domwellbes`** — `FinancingProgram.minAmountKopecks`/`maxAmountKopecks`/
  `previewMatCapitalKopecks` (исправлено 2026-09-22, `apps/domwellbes/CHANGELOG.md` 0.304.0);
  `House.basePriceKopecks` (исправлено 2026-09-22, `apps/domwellbes/CHANGELOG.md` 0.305.0) —
  поле без верхней границы валидации, вводится вручную, текущий максимум демо-данных (9,8 млн ₽)
  был уже на 45% от INT4_MAX.
- **Не исправлено, перепроверено 2026-09-22 — риск по-прежнему низкий**: в том же
  `house-config.zmodel` — `HouseOption.priceDeltaKopecks` (дельта цены опции, максимум в
  демо-данных ~450 тыс. ₽) и `HouseExtra.priceKopecks` (допрасходы вроде скважины/септика,
  максимум ~250 тыс. ₽) — оба на два порядка меньше цены дома по смыслу поля, а не только по
  текущим демо-значениям.
- Паттерн `*Kopecks Int` встречается в схемах и других приложений монорепо — при добавлении
  нового денежного поля или увеличении верхней границы существующего сверяться с INT4_MAX сразу,
  не откладывать до прод-инцидента.
