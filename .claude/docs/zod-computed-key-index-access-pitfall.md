# z.object + Object.fromEntries: динамический ключ ловится typecheck'ом не всегда

## Симптом

```ts
const schema = z.object({
  originAddress: z.string().nullish(),
  ...Object.fromEntries(SURCHARGE_KINDS.map((kind) => [`surcharge_${kind}`, z.number().nullish()])),
}).strip()

type Data = z.infer<typeof schema>
declare const data: Data

for (const kind of SURCHARGE_KINDS) {
  const qty = data[`surcharge_${kind}`] // TS7053: Element implicitly has an 'any' type…
}
```

`nx typecheck:tsgo` падает с TS7053, хотя рантайм-схема содержит ключ `surcharge_MANIPULATOR` и
т. п. на самом деле — `SURCHARGE_KIND_LABELS` полностью покрывает `SurchargeKind`, ключ точно
есть. Сообщение об ошибке выдаёт настоящую причину: выведенный тип `Data` — это буквально
`{ originAddress?: string | null }`, **без единого поля из спреда**. `Object.fromEntries(...)`
возвращает тип с индексной сигнатурой (`{ [k: string]: T }`), а спред объекта с ТОЛЬКО индексной
сигнатурой (без явных именованных свойств) внутри литерала `{...}` не добавляет к результату
вообще ничего — ни явных свойств, ни самой индексной сигнатуры. Это ограничение вывода типов при
спреде в TS, а не баг Zod или конкретного файла.

## Когда ловится, когда нет

Ловится не всегда — воспроизведено на трёх изолированных вариантах (`nx typecheck:tsgo domwellbes`
поверх `apps/domwellbes/src/lib/logistics/tariff-labels.ts`, тип массива ключей
`(keyof typeof LABELS)[]` во всех случаях один и тот же):

| Callback внутри `Object.fromEntries(ARRAY.____(kind => ...))`                    | Результат                                           |
| -------------------------------------------------------------------------------- | --------------------------------------------------- |
| `.map(kind => [key, zodType])` — один `[k, v]` за итерацию                       | ❌ TS7053, ключи пропадают                          |
| `.flatMap(kind => [[key, zodType]])` — один `[k, v]`, обёрнутый в массив         | ❌ TS7053, тот же эффект                            |
| `.flatMap(kind => [[k1,v1], [k2,v2], [k3,v3]])` — ≥2 разных `[k, v]` за итерацию | ✅ ключи сохраняются, индексация работает без каста |

Проверено также: число спредов в объекте схемы (один/два/три) на результат не влияет — решает
только форма callback'а конкретного спреда. `.map` с одним ключом и `.flatMap` с одним ключом
(обёрнутым в массив) ведут себя одинаково плохо; `.flatMap`, возвращающий несколько
**структурно разных** пар `[literal, type]` за один вызов, — единственный из проверенных
вариантов, где typecheck правильно выводит буквенные (`string literal`) ключи и не роняет их.
Механизм на уровне компилятора не выяснен до конца (похоже на разницу в выводе литерал-типа
вложенного массива при контекстной типизации `flatMap`/`Object.fromEntries`, когда элементы
результата структурно различны — но это наблюдение, не доказанный алгоритм TS).

**Практический вывод: не полагаться на «повезло с `.flatMap`».** Такое поведение легко сломать
безобидным рефакторингом (например, если из тройного flatMap убрать одно из трёх полей — паттерн
`create-carrier-tariff-form.tsx` перестанет отличаться от `.map`-варианта и получит ту же ошибку).
Прецедент нашёлся именно так: два новых файла с `.map`-спредом (`logistics.action.ts`,
`delivery-quote-calculator-form.tsx`) ловили TS7053, третий с `.flatMap`-спредом на три поля
(`create-carrier-tariff-form.tsx`) — нет, хотя оба паттерна используют один и тот же
`SURCHARGE_KINDS = Object.keys(SURCHARGE_KIND_LABELS) as (keyof typeof SURCHARGE_KIND_LABELS)[]`.

## Надёжный обходной путь

Каст объекта к `Record<string, T>` **перед** индексацией динамическим ключом — работает
независимо от того, поймал ли typecheck ошибку в конкретной форме спреда:

```ts
const surchargeInput = data as Record<string, number | null | undefined>
for (const kind of SURCHARGE_KINDS) {
  const qty = surchargeInput[`surcharge_${kind}`] // ok, каст явно объявляет форму для рантайм-доступа
}
```

Каст ставится один раз, сразу после `parsed.data`/значений формы — не на каждую строку
индексации. Так уже сделано в `apps/domwellbes/src/app/(admin)/admin/_actions/logistics.action.ts`
(`surchargeInput`) и
`apps/domwellbes/src/app/(admin)/admin/logistics/calculator/_components/delivery-quote-calculator-form.tsx`
(`rawValues`).

Альтернатива — не полагаться на `Object.fromEntries` внутри `z.object({...})` вовсе, а собирать
форму через `.catchall(z.number().nullish())` или явно типизированный intermediate-объект с
`Record<SurchargeKind, ZodType>`, если нужна и рантайм-валидация, и статическая проверка ключей
без каста. Для этого приложения каст оказался достаточным и не потребовал переписывать схему —
если паттерн повторится в другом приложении и явные литеральные ключи важны для автокомплита в
IDE (не только для прохождения typecheck), стоит рассмотреть эту альтернативу отдельно.

## Где искать похожее

Любой `z.object({ ...явные поля, ...Object.fromEntries(массив.map/flatMap(...)) })` в монорепо,
где после `z.infer` идёт индексация вычисляемым ключом (`data[\`prefix_${kind}\`]`) — грепать по`Object.fromEntries(`рядом с`z.object(`.
