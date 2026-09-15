# tsgo `TS2321: Excessive stack depth comparing types` на глубоко вложенных ZenStack-типах

## Симптом

`nx typecheck:tsgo <app>` падает с `TS2321: Excessive stack depth comparing types
'MapType<Schema, ...>' and '...'` (или похожим сообщением про структурное сравнение двух
глубоко вложенных generic-типов). Ошибка возникает у `tsgo` (`@typescript/native-preview`,
native preview компилятора) при попытке структурно сравнить два типа, выведенных из полного
ZenStack-делегата (`MapType<Schema, 'ModelName'>` и аналогичные обёртки типов результата
ZenStack-запроса) — сам тип синтаксически корректен, компаратор просто не укладывается в лимит
глубины рекурсивного сравнения.

Найдено и закрыто в сессии 2026-09-13/14 (`domwellbes`, submodule `letar-private-domwellbes`,
коммиты `71bfb65` и `46a947d`) — деблокировало продакшен-деплой. 12 файлов, три независимых
подпаттерна.

Повторно всплыло 2026-09-15 (тот же `domwellbes`) — 5 файлов, 4 из них были в исходном отчёте
об ошибке, пятый (`src/app/houses/[slug]/configure/page.tsx`) обнаружился только по ходу починки
остальных (не воспроизводился в изначальном списке из 4 ошибок — либо был скрыт порядком
компиляции, либо стал видимым после `nx zenstack:generate --skip-nx-cache`, точная причина не
выяснена). В 3 из 5 файлов лёгкий вариант подпаттерна 1 (`(typeof items)[number]`) не спасал —
пришлось сразу эскалировать до ручного `interface`, как и предсказывает предупреждение внутри
подпаттерна 1 ниже. Один файл дал новый вариант — см. 1a.

## Три подпаттерна

### 1. `.map()`/`.filter()`-callback без явной аннотации параметра над результатом ZenStack-запроса

```typescript
// ❌ tsgo пытается структурно сравнить полный вывод типа результата запроса
// с типом параметра callback — глубина сравнения взрывается на вложенных include/select
const items = await db.order.findMany({ include: { items: true, customer: true } })
const mapped = items.map((item) => ({ id: item.id, total: item.items.length }))
```

```typescript
// ✅ явная аннотация параметра callback обрывает попытку структурного сравнения —
// tsgo проверяет совместимость поэлементно, не сравнивая типы целиком
const items = await db.order.findMany({ include: { items: true, customer: true } })
const mapped = items.map((item: (typeof items)[number]) => ({ id: item.id, total: item.items.length }))
```

Симптом узнаётся по месту ошибки: она указывает на строку с `.map()`/`.filter()`, а не на сам
запрос — вложенность типа-результата запроса (`include`/`select` в несколько уровней) сама по
себе не падает, падает только последующее structural comparison с телом callback.

⚠️ **`(typeof items)[number]` иногда не спасает — тогда нужен явный минимальный тип.** На
svoichuzhie (2026-09-14, `src/app/admin/orders/[id]/page.tsx` +
`src/app/merch/orders/[token]/page.tsx`, `order.items.map(...)` внутри JSX) `typeof`-алиас
по-прежнему падал с той же ошибкой — резолв самого алиаса уже требует структурной экспансии
глубокого типа. Сработал более сильный вариант: отдельный локальный `type OrderItemRow = { ... }`
только с реально используемыми в теле callback полями + явная аннотация переменной перед `.map()`
(`const orderItems: OrderItemRow[] = order.items`), а не аннотация самого параметра callback:

```typescript
// ❌ (typeof items)[number] тоже падает в некоторых случаях — сам typeof уже требует
// структурной экспансии MapType<Schema, ?>
const mapped = order.items.map((item: (typeof order.items)[number]) => ...)

// ✅ узкий вручную написанный тип с нужными полями + аннотация переменной, не параметра
type OrderItemRow = { id: string; productName: string; quantity: number; price: number }
const orderItems: OrderItemRow[] = order.items
const mapped = orderItems.map((item) => ...)
```

Пробуй `(typeof items)[number]` первым (дешевле, не требует ручного списка полей) — если не
помогло, переходи к явному узкому типу.

#### 1a. Тип-алиас через `NonNullable<Awaited<ReturnType<typeof fn>>>` падает уже на объявлении, не на использовании

Найдено 2026-09-15 (`domwellbes`, `src/lib/configuration/public-configuration-dal.ts`) — тот же
класс ошибки, но точка падения не `.map()`, а сама строка объявления типа:

```typescript
// ❌ падает прямо здесь, ещё до любого использования — вывод типа через ReturnType
// разворачивает полный тип результата ZenStack-запроса функции целиком
async function loadHouseVersionForConfiguration(id: string) {
  return db.houseVersion.findFirst({ include: { items: { include: { work: true, material: true } } } })
}
type LoadedHouseVersion = NonNullable<Awaited<ReturnType<typeof loadHouseVersionForConfiguration>>>
```

```typescript
// ✅ ручной interface вместо вывода из сигнатуры функции + явный Promise<...>-возврат у самой
// функции — вывод типа нигде не пересобирается заново из глубокого ZenStack-результата
interface LoadedHouseVersion {
  id: string
  items: { id: string; work: LoadedWork | null; material: LoadedMaterial | null }[]
}

async function loadHouseVersionForConfiguration(id: string): Promise<LoadedHouseVersion | null> {
  const houseVersion: LoadedHouseVersion | null = await db.houseVersion.findFirst({
    include: { items: { include: { work: true, material: true } } },
  })
  return houseVersion
}
```

Отличие от 1: здесь аннотировать нечего — нет ни `.map()`, ни callback-параметра, сам алиас
`NonNullable<Awaited<ReturnType<typeof ...>>>` уже требует структурной экспансии на моменте
своего объявления. Лечится тем же приёмом (ручной `interface` вместо вывода), но применённым к
объявлению типа, а не к точке использования — если встретишь ошибку прямо на `type X = ...`, а
не внутри функции ниже, сразу ищи здесь, не трать время на подпаттерн 1.

### 2. Деструктуризация `Promise.all([...])` из разных ZenStack-запросов

```typescript
// ❌ tsgo сравнивает типы элементов кортежа Promise.all — при разных вложенных ZenStack-типах
// в разных позициях массива сравнение кортежа снова упирается в глубину
const [orders, customers] = await Promise.all([
  db.order.findMany({ include: { items: true } }),
  db.customer.findMany({ include: { orders: true } }),
])
```

```typescript
// ✅ раздельные await вместо единого Promise.all — каждый тип выводится и присваивается
// независимо, кортеж для сравнения не строится вовсе
const orders = await db.order.findMany({ include: { items: true } })
const customers = await db.customer.findMany({ include: { orders: true } })
```

⚠️ Раздельные `await` теряют параллельность выполнения запросов (последовательное ожидание
вместо одновременного). Применять только там, где эта потеря приемлема — не как автоматическую
замену везде, где встретился `Promise.all` с ZenStack-запросами внутри.

### 3. Фабрика с generic-параметром, выводимым из полного ZenStack-делегата

```typescript
// ❌ getContext() возвращает результат ZenStack-запроса, T выводится как этот полный тип —
// каждый вызов createImageGalleryActions<T> заново гоняет структурное сравнение с T
export function createImageGalleryActions<T>(getContext: () => Promise<T>) {
  /* ... */
}
```

```typescript
// ✅ явная аннотация возврата getContext вместо inference — тип фиксирован один раз,
// вместо того чтобы выводиться заново на каждом сайте вызова
export function createImageGalleryActions<T>(getContext: () => Promise<GalleryContext<T>>) {
  /* ... */
}
```

Готовый пример этого приёма уже есть в `libs/admin-ui/src/server/image-gallery-actions.ts`.

### Крайний случай — `as any[]`, только когда `$transaction` обязателен сохранить

Если типы результата двух ZenStack-запросов нужно передать именно в один `$transaction` (а не
раздельными `await`, как в подпаттерне 2 — например транзакционность реально требуется), а
`tsgo` всё равно падает на структурном сравнении внутри самой транзакции — единственный обход
без потери транзакционности:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tsgo TS2321: excessive stack
// depth сравнивает вложенные ZenStack-типы внутри $transaction; сохранить транзакционность
// важнее точности типа на этой строке, см. tsgo-excessive-stack-depth-zenstack.md
const [orders, customers] = (await db.$transaction([
  db.order.findMany({ include: { items: true } }),
  db.customer.findMany({ include: { orders: true } }),
])) as any[]
```

Точечный `eslint-disable` на самой строке, не на файле — это последний приём в списке
намеренно, применять только когда варианты 1–3 не подходят по причине реальной необходимости
единой транзакции.

## ⚠️ Платформенная нестабильность (Windows vs Linux) — НЕ ПОДТВЕРЖДЕНО, гипотеза

4 из 12 ошибок в сессии 2026-09-13/14 воспроизводились **только на сервере s2 (Linux)** и не
воспроизводились локально на Windows тем же `nx typecheck:tsgo domwellbes --skip-nx-cache` на
том же коммите `71bfb65`. Единственное наблюдение зафиксировано в agent-mail thread
`deploy-domwellbes-zod-drift` (project `c-web-letar`, сообщения от 2026-09-13T19:22 и
2026-09-14): локальный прогон был зелёным, тот же коммит на s2 упал этими четырьмя `TS2321`.

Правдоподобная гипотеза — порог глубины структурного сравнения типов у `tsgo` зависит от
доступного стека вызовов/порядка компиляции файлов, которые могут отличаться между ОС (как и у
похожей нестабильности из [tsgo-stray-declarations.md](/.claude/docs/tsgo-stray-declarations.md)).
**Это не доказано экспериментально** — второй независимой попытки воспроизвести на чистом
дереве на обеих платформах не делалось. Если встретишь снова случай «зелёный typecheck
локально, красный на сервере с тем же кодом» — не списывай сразу на дрейф зависимостей, сначала
проверь именно эту гипотезу (тот же коммит, `--skip-nx-cache` на обеих платформах) и дополни
этот раздел результатом, положительным или отрицательным.

## Известная риск-поверхность — не чинить превентивно

`grep -rE '\$transaction\(|Promise\.all\(' apps/domwellbes/src` (замер 2026-09-14) даёт 202
файла — потенциально тот же класс ошибки уязвим в любом из них при следующем изменении
вложенности `include`/`select` в соседнем запросе. Ручная превентивная чистка всех 202 файлов
признана нерентабельной — фиксить по мере фактического появления `TS2321`, не заранее.

## Если встретишь снова

1. Определи подпаттерн по месту ошибки: `.map()`/`.filter()` → аннотация параметра callback;
   деструктуризация `Promise.all` → раздельные `await`, если транзакционность не нужна;
   generic-фабрика → явная аннотация возврата вместо inference.
2. Если ни один вариант не подходит (транзакционность обязательна) — точечный `as any[]` с
   `eslint-disable-next-line` на самой строке.
3. Если ошибка не воспроизводится локально, но падает в CI/на сервере на том же коммите — не
   спеши искать причину в дрейфе зависимостей, сверься с разделом про платформенную
   нестабильность выше.
