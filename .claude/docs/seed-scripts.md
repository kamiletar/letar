# Seed-скрипты ZenStack v3 — конвенция

Паттерн независимо написан минимум трижды (archetest, grandslamcup, domwellbes) — здесь
зафиксирована общая конвенция, чтобы четвёртое приложение не изобретало его заново.

## 1. Подключение ORM-клиента напрямую

`prisma/seed.ts` — **отдельный Node-процесс**, не Next.js. Импортировать `getEnhancedPrisma()` из
`@/lib/db` нельзя — это server-only модуль, завязанный на сессию/запрос Next.js. В seed-скрипте
подключай `ZenStackClient` напрямую, с тем же сгенерированным `schema`:

```typescript
import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../src/generated/schema'

const db = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }) as never,
})
```

Без ORM-политик доступа — seed выполняется от имени сервиса, не от имени пользователя, `@@allow`
здесь не участвуют.

> Если скрипту нужен именно голый `PrismaClient` (класс, не ZenStack-обёртка) — это отдельный
> случай, см. [database.md § `PrismaClient` в server-only скриптах](database.md#критично---prismaclient-в-server-only-скриптах-seed-миграции)
> про `browser`-экспорт и Prisma 7 driver adapter (`grandslamcup` использует именно этот путь).

## 2. Идемпотентность — правило выбора стратегии

Seed обязан быть безопасен для повторного запуска (dev-БД пересоздаётся, деплой может сидить
повторно). Стратегия зависит от того, есть ли у модели естественный ключ в схеме:

- **Есть уникальное поле** (slug, sku, email и т.п.) → `upsert` по этому полю:

  ```typescript
  await db.material.upsert({
    where: { sku: def.sku },
    update: { name: def.name /* ... */ },
    create: { sku: def.sku, name: def.name /* ... */ },
  })
  ```

- **Нет уникального поля в schema.zmodel** (например `Work`, `Machine` в domwellbes — только
  `id`) → `findFirst` по содержательному условию, `create` только если не найдено:

  ```typescript
  const existing = await db.work.findFirst({ where: { name: def.name, categoryId } })
  const work = existing ?? (await db.work.create({ data: { name: def.name, categoryId /* ... */ } }))
  ```

Не добавляй уникальный констрейнт в схему только ради seed-скрипта, если модели он не нужен по
бизнес-логике — `findFirst`+`create` для этого и существует.

## 3. Nx target `db:seed`

```json
"db:seed": {
  "executor": "nx:run-commands",
  "options": {
    "command": "tsx --env-file=.env.local prisma/seed.ts",
    "cwd": "apps/<app>"
  },
  "dependsOn": ["db:generate"]
}
```

Запуск: `nx db:seed <app>`. `dependsOn: ["db:generate"]` гарантирует, что
`src/generated/schema.ts` (и остальные генерируемые файлы, от которых зависит импорт `ZenStackClient`)
свежие перед запуском скрипта.

⚠️ На Windows/Nx Cloud добавляй `"cache": false` к `db:seed` — см.
[database.md § Ошибка "Параметр задан неверно" на Windows с Nx Cloud](database.md#ошибка-параметр-задан-неверно-os-error-87-на-windows-с-nx-cloud).

## 4. Продвинутый вариант — append vs `--fresh` для больших датасетов

Для датасетов, где полная пересборка на живом проде опасна (внешние FK на строки, которые
пересоздание уничтожит), добавляй флаг `--fresh` рядом с безопасным режимом по умолчанию:

- **append (по умолчанию)** — вставляет только записи, которых ещё нет в БД **по id** (не по
  бизнес-ключу, если дамп уже несёт стабильные id). Существующие строки не трогаются — связи из
  других таблиц (ответы, метки, история) не рвутся.
- **`--fresh`** — удаляет всё и заливает дамп целиком. Безопасен только для пустой или заведомо
  пересобираемой базы; обязательно задокументируй в шапке файла, какие FK-связи он обнулит/сломает.

```typescript
async function main() {
  const fresh = process.argv.includes('--fresh')

  if (fresh) {
    // ⚠️ Только пустая/пересобираемая база — см. предупреждение в шапке файла
    await db.quizQuestion.deleteMany()
    await insertBatched(questions)
    return
  }

  const existing = await db.quizQuestion.findMany({ select: { id: true } })
  const existingIds = new Set(existing.map((q) => q.id))
  const toInsert = questions.filter((q) => !existingIds.has(q.id))
  await insertBatched(toInsert)
}
```

Для больших дампов вставляй батчами (~100 записей за `createMany`) вместо одного запроса на всю
коллекцию.

**Эталон:** `apps/archetest/prisma/seed-questions.ts`.

## 5. ⚠️ `.finally(() => process.exit(0))` маскирует ошибку сида

**Симптом:** деплой-лог показывает «Seed completed» / код выхода 0, хотя сид упал с исключением
и ничего не записал в БД.

**Причина:** типичный `main().catch().finally()` из документации Prisma —

```typescript
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
```

Пока открыт `pg.Pool`/ORM-клиент, event loop жив. `.finally()` выполняется **после** `.catch()`
отдельным тиком промис-цепочки, и безусловный `process.exit(0)` в нём перебивает
`process.exit(1)`, выставленный в `.catch()`. Код выхода всегда 0, ошибка видна только в
`console.error`, который никто не читает построчно в деплой-логе.

Найден и исправлен независимо в трёх приложениях одной сессией (kami, domwellbes, studio,
2026-08-21) — совпадение не случайно, паттерн копируется из скрипта в скрипт вместе с остальной
конвенцией этого файла.

**Фикс:** `process.exitCode = 1` вместо `process.exit(1)` — помечает код выхода, не завершает
процесс принудительно; Node выходит с этим кодом сам, после `disconnect()` в `.finally()`.

**Общий helper — `@letar/seed-utils`.** Паттерн вынесен в `runSeed(main, disconnect)`
([libs/seed-utils](/libs/seed-utils/README.md)), чтобы не копировать вручную:

```typescript
import { runSeed } from '@letar/seed-utils'

async function main() {
  // ...сидирование
}

void runSeed(main, () => db.$disconnect())
```

Мигрированы на helper: kami, studio. `domwellbes` остаётся на ручном эквивалентном
`process.exitCode`-паттерне (не тронут из-за активной файловой резервации на момент миграции,
не блокер). `aboi`, `animatrona`, `dsperevod`, `grandslamcup`, `auth-hub` вызывают
`process.exit(1)` прямо внутри `.catch()` без безусловного `exit(0)` в `.finally()` — этого
конкретного бага там нет (`process.exit()` завершает процесс синхронно, до маскировки в
`.finally()` дело не доходит), миграция на `runSeed` не проактивна, но желательна при следующей
правке этих файлов ради единообразия и гарантированного `disconnect()`.

## 6. ⚠️ Дочерние `create()` внутри creator-замыкания `upsertIdByNaturalKey` не самовосстанавливаются

**Симптом:** родительская запись существует и выглядит корректно (`findFirst` по natural key её
находит), но связанные дочерние строки (позиции заказа, контакты клиента, этапы кейса и т.п.)
пусты или частично утеряны — и остаются такими после любого числа повторных `nx db:seed`.

**Причина:** типичный вызов `upsertIdByNaturalKey(finder, creator)` кладёт создание дочерних
записей внутрь `creator`-замыкания:

```typescript
const id = await upsertIdByNaturalKey(
  () => db.salesOrder.findFirst({ where: { note: def.key /* ... */ }, select: { id: true } }),
  async () => {
    const order = await db.salesOrder.create({ data: {/* ... */} })
    for (const line of def.lines) {
      await db.salesOrderItem.create({ data: { orderId: order.id /* ... */ } }) // ⚠️
    }
    return order
  },
)
```

Если `finder` находит существующую запись, `creator` не вызывается вообще — а вместе с ним
пропускается и цикл создания дочерних строк. Любая частичная порча (ручное вмешательство, баг в
чужом cleanup-скрипте, ошибка миграции) переживает сколько угодно повторных прогонов сида: раз
родитель уже существует, дочерние записи никогда не будут досозданы.

**Найдено:** `domwellbes`, `prisma/seed/sales-orders.ts` — все 4 демо-заказа стояли с 0
`SalesOrderItem` (сама причина утраты не установлена), пока сид не был исправлен (2026-08-26).

**Фикс:** создание дочерних записей — отдельным шагом **после** `upsertIdByNaturalKey`
родителя, с собственной проверкой идемпотентности по количеству (а не по существованию
родителя):

```typescript
const id = await upsertIdByNaturalKey(finder, creator) // creator больше не трогает items

const existingItemCount = await db.salesOrderItem.count({ where: { orderId: id } })
if (existingItemCount === 0) {
  for (const line of def.lines) {
    await db.salesOrderItem.create({ data: { orderId: id /* ... */ } })
  }
}
```

Работает и для нового родителя (только что созданного, `existingItemCount === 0`), и для
существовавшего-но-осиротевшего — не создаёт дублей там, где дочерние записи уже есть.

**Аудит остальных seed-файлов domwellbes завершён (2026-08-26).** Тот же вложенный паттерн
проверен в `clients.ts`, `construction-cases.ts`, `counterparties.ts`, `logistics.ts`, `works.ts`:

- **Были уязвимы и исправлены** тем же паттерном (дочерний count()===0 отдельным шагом) —
  `clients.ts` (`ClientContact`), `construction-cases.ts` (`ConstructionCaseStage`),
  `logistics.ts` (`CarrierTariff`/`TariffComponent`/`TariffZoneRate`, оба перевозчика).
  На момент аудита данные в БД были целы (без осиротевших родителей) — фикс превентивный.
- **Уже безопасны без изменений** — `counterparties.ts` (`CounterpartyLocation`) и
  `works.ts` (`WorkMaterialNorm`/`WorkMachineNorm`): в обоих файлах дочерняя запись создаётся
  отдельным top-level вызовом `upsertIdByNaturalKey`, не вложенным в creator-замыкание
  родителя — родитель может существовать сколько угодно раз, дочерний вызов всё равно
  отрабатывает на каждом прогоне.

## Примеры в репозитории

| Приложение     | Файл                                      | Стратегия                                                                                   |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `archetest`    | `apps/archetest/prisma/seed-questions.ts` | append по id + `--fresh`, батчами по 100                                                    |
| `grandslamcup` | `apps/grandslamcup/prisma/seed.ts`        | `upsert` по slug, голый `PrismaClient` + adapter                                            |
| `domwellbes`   | `apps/domwellbes/prisma/seed.ts`          | `upsert` по slug/sku; `findFirst`+`create` для моделей без уникального поля (Work, Machine) |
