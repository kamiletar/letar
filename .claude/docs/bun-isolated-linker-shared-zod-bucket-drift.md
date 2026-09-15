# bun isolated linker: обычный `bun update` развёл zod на два экземпляра

**Дата:** 2026-09-16. **Контекст:** штатный `/infra:deps-update` (patch/minor-бампы в
рамках существующих caret-диапазонов, без снятия пина `zod@4.4.3` —
[root-pin-peer-drift.md](root-pin-peer-drift.md)).

## Симптом

После `bun update` typecheck упал в проектах, где раньше был зелёным:

- `synth` — 19 ошибок `TS2322: Type 'ZodString' is not assignable to type 'AnySchema'`
  в `src/mcp/server.ts` (MCP-инструменты, `z.object`/`z.enum` в `inputSchema`).
- `domwellbes` — те же 36 ошибок в своём `src/mcp/server.ts` (ассист-MCP).
- `grandslamcup` — 4 НОВЫХ `TS2321: Excessive stack depth comparing types
  'MapType<Schema, ?>'` сверх уже существовавшего техдолга (класс описан в
  [tsgo-excessive-stack-depth-zenstack.md](tsgo-excessive-stack-depth-zenstack.md)).

## Причина

`grep -n '"@modelcontextprotocol/sdk/zod"' bun.lock` и
`grep -n '"@zenstackhq/cli/zod"' bun.lock` — оба непусты после апдейта, хотя до него
были пусты. Bun isolated linker завёл этим двум пакетам **приватные** копии
`zod@4.6.5` вместо переиспользования корневого запиненного `zod@4.4.3`.

Ключевой факт: диапазоны обоих пакетов (`@modelcontextprotocol/sdk`:
`"zod": "^3.25 || ^4.0"`, `@zenstackhq/cli`: `"zod": "^4.0.0"`) **полностью
совместимы** с 4.4.3. Дело не в конфликте версий на бумаге — bun's isolated
linker группирует пакеты по bucket'ам исходя из позиции в дереве резолва, и при
полном пересчёте резолва (после ЛЮБОГО `bun update`/`bun install --force`)
может опционально утащить пакеты с совместимым, но не идентичным диапазоном в
уже существующий «повышенный» bucket (в этом случае — bucket, который держат
`better-auth`/`@better-auth/core`/`@better-auth/oauth-provider`, потому что их
СОБСТВЕННЫЙ диапазон `^4.5.4` уже не совпадает с 4.4.3 и был приватным bucket'ом
ещё ДО этого апдейта, только на версии `4.6.2`).

**Бисекция показала:**

- На чистом `HEAD` (до апдейта) `bun install --force` даёт только
  `better-auth`/`@better-auth/core`/`@better-auth/oauth-provider` в приватном
  bucket'е (`zod@4.6.2`) — это старое, безвредное для типов состояние.
- Откат ТОЛЬКО `fumadocs-mdx` (15.4.1→15.4.0, у него тоже всплыл приватный
  bucket) НЕ убрал приватные bucket'ы у `@modelcontextprotocol/sdk` и
  `@zenstackhq/cli` — значит, конкретный пакет-триггер вообще не установлен,
  и однозначного «просто откати X» рецепта нет.
- `fumadocs-mdx/zod` bucket остаётся приватным (`4.6.5`) независимо от версии
  самого `fumadocs-mdx` (проверено и на 15.4.0, и на 15.4.1) и **не** вызывает
  ни одной ошибки typecheck ни в одном из ~90 прогнанных проектов — оставлен
  как есть, чинить не нужно.

## Фикс

Scoped `overrides` в корневом `package.json` — **сработал** на bun 1.4.2
(в отличие от вывода [root-pin-peer-drift.md](root-pin-peer-drift.md) про bun
1.3.14, где ни одна форма scoped override не работала):

```json
"overrides": {
  "@modelcontextprotocol/sdk": { "zod": "4.4.3" },
  "@zenstackhq/cli": { "zod": "4.4.3" }
}
```

После `bun install --force` оба приватных bucket'а исчезают из `bun.lock`,
typecheck возвращается к прежнему (уже существовавшему) набору ошибок без
единой новой.

Зарегистрировано в `scripts/intentional-pins.json` под `overridePins` — этот
раздел **не проверяется** `check-intentional-pins.mjs` (скрипт знает только
про `pins`/`lockstepGroups`/`unexplained`), это чисто документационная запись
для человека. Снимать override — только после проверки условия `unpinWhen` в
самой записи реестра.

## Что проверять при следующем deps-update

Обычный `bun scripts/check-all.mjs --group=deps` **не ловит** этот класс —
`patched-deps`/`intentional-pins`/`pin-drift` не заглядывают внутрь
`bun.lock` на предмет новых scoped-ключей вида `"<pkg>/zod"`. Единственный
надёжный способ — обязательный `nx run-many -t typecheck:tsgo` после
апдейта (уже требуется этим же runbook'ом), плюс при малейшем подозрении —
`grep -n '"[^"]*/zod":' bun.lock | grep -v '3.25.76\|4.4.3'` до и после
апдейта, сравнить списки построчно.
