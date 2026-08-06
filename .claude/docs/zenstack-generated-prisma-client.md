# ZenStack v3 — зачем в сгенерённом `schema.prisma` есть `generator client` без `output`

Приложения на ZenStack v3 (`@zenstackhq/orm`) в рантайме используют **`ZenStackClient`**
(`@zenstackhq/orm` + `kysely` + `pg.Pool`), а не классический `@prisma/client`. Тем не менее
в автосгенерённом `src/generated/schema.prisma` присутствует блок вида:

```prisma
generator client {
    provider = "prisma-client-js"
}
```

без `output`. На первый взгляд это похоже на баг — будто классический Prisma Client устарел
относительно схемы или вообще не нужен. Это **не баг**.

## Откуда берётся этот блок

`schema.zmodel` описывает два независимых ZenStack-плагина:

```zmodel
plugin prisma {
  provider = '@core/prisma'
  output = './src/generated/schema.prisma'   // пишет производный schema.prisma
}

plugin typescript {
  provider = '@core/typescript'
  output = './src/generated'                 // пишет реальный рантайм-клиент
}
```

- **`@core/typescript`** — тот плагин, который реально генерирует код, импортируемый
  приложением: `src/generated/schema.ts` (используется как `schema` в `new ZenStackClient(schema, …)`),
  `src/generated/models.ts`, `src/generated/input.ts`, а также Prisma-Client-совместимый набор файлов
  в `src/generated/prisma/` (`client.ts`, `browser.ts`, `models/*`, `internal/*`) — это те самые
  файлы, которые коммитятся в git и на которые ссылаются алиасы вроде `@/generated/prisma`.
- **`@core/prisma`** — просто конвертирует `schema.zmodel` в обычный `schema.prisma`, чтобы им
  мог пользоваться сам Prisma CLI (`prisma migrate dev`, `prisma migrate diff`, `prisma studio`).
  Poскольку Prisma CLI требует хотя бы один валидный `generator`-блок в схеме, чтобы вообще
  считать её рабочей, плагин вставляет минимальный `generator client { provider = "prisma-client-js" }`
  — не потому что кто-то собирается использовать этот клиент, а просто чтобы схема прошла
  валидацию Prisma CLI.

## Куда уходит classic Prisma Client и почему это неважно

Composite Nx-таргет `zenstack:generate` в `apps/*/project.json` выполняет последовательно:

```
zenstack generate   →  пишет src/generated/{schema.ts,models.ts,input.ts,prisma/*} (реальный рантайм-код)
prisma generate      →  генерирует classic Prisma Client по производному generator-блоку
```

Куда именно попадает classic-клиент — зависит от `output` в `generator client`:

- **Без `output`** (провайдер `prisma-client-js`, как в `studio`) — уходит в
  `node_modules/.bun/@prisma+client@…/node_modules/@prisma/client/` (видно в логе `nx zenstack:generate`:
  `✔ Generated Prisma Client (v7.9.1) to .\..\..\node_modules\...`). Ни один файл приложения на
  него не ссылается — весь рантайм-код импортирует `@/generated/*`, а не `@prisma/client`.
- **С явным `output`, указывающим в ту же директорию, куда пишет `@core/typescript`** (провайдер
  `prisma-client`, output `./prisma` — относительно `schema.prisma`, т.е. `src/generated/prisma/`,
  как в `grandslamcup`, `archetest`, `kami`) — `prisma generate` фактически перегенерирует те же
  файлы (`client.ts`, `browser.ts`, `models/*`), что уже создал `@core/typescript`. Источник схемы
  один и тот же (производный `schema.prisma`), поэтому результат идентичен — это избыточный, но
  безвредный повторный проход, а не расхождение.

В обоих случаях после `prisma generate` содержимое `src/generated/` не расходится со схемой:
перегенерация даёт пустой `git diff`. Проверено на `studio` (2026-08-06).

## Общий паттерн, не специфика одного приложения

Блок `generator client` без явного/с явным-но-совпадающим `output` встречается во всех проверенных
приложениях на ZenStack v3 (`studio`, `driving-school`, `grandslamcup`, `archetest`, `kami`) — это
стандартный побочный продукт плагина `@core/prisma`, а не что-то, что нужно чинить руками.

⚠️ Не путать с предупреждением в [database.md](/.claude/docs/database.md) («`generator client`
устарел в ZenStack v3, если видишь его в `schema.zmodel` — удали») — то предупреждение про
**ручное** объявление `generator client` в исходном `schema.zmodel` (легаси-паттерн до перехода
на `plugin prisma`/`plugin typescript`). Автоматически вставленный блок в производном
`src/generated/schema.prisma` — это генерируемый файл, его вообще нельзя редактировать напрямую
(см. то же правило в database.md), и трогать его не нужно.

## Открытый вопрос — не решено, оставлено как наблюдение

Раз результат `prisma generate` в общем случае не используется рантайм-кодом приложения, не до
конца ясно, обязателен ли этот шаг в составном таргете `zenstack:generate` (`apps/studio/project.json`)
именно как источник кода — или он нужен по другой причине: Prisma CLI требует наличия
сгенерированного клиента для части своих операций (`migrate dev`, `migrate diff` со
`shadowDatabaseUrl` из `prisma.config.ts`), даже если этот клиент никем не импортируется. Убирать
шаг самостоятельно не стоит — сначала нужно подтвердить, не сломает ли это `db:migrate`/`db:generate`.
