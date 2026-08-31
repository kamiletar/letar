# fumadocs-core: `StaticSource<Config>` не восстанавливается через `infer`

⚠️ `page.data.body`/`page.data.toc` (и любое другое специфичное поле фронтматтера) молча
типизируются как несуществующие на `PageData` — базовом, дефолтном интерфейсе — хотя `source.ts`
написан по документации fumadocs дословно и рантайм работает корректно.

## Симптом

```
error TS2339: Property 'body' does not exist on type 'PageData'.
  const Mdx = page.data.body
```

при полностью стандартном коде:

```ts
import { docs } from '@/.source/server'
import { loader } from 'fumadocs-core/source'

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
})
```

## Root cause

`StaticSource<Config>` (`fumadocs-core/source`) объявлен так:

```ts
interface StaticSource<Config extends SourceConfig = SourceConfig> extends GenericSourceOptions {
  files: VirtualFile<Config>[]
}
type VirtualFile<Config> = VirtualPage<Config['pageData']> | VirtualMeta<Config['metaData']>
```

`Config` нигде не встречается «голым» — только через индексный доступ (`Config['pageData']`,
`Config['metaData']`) внутри объединения типов вложенного массива. `fumadocs-core`'s собственный
`GeneratePage<I>`/`GenerateMeta<I>` (используются `loader()` для вычисления типа `page`/`meta`
результата) написаны как:

```ts
type GeneratePage<T> = T extends SourceUnion<infer D> ? Page<undefined, D['pageData']> : never
```

TypeScript не умеet «развернуть» индексный доступ обратно и восстановить исходный `Config` —
это общее ограничение вывода типов (инференс из `T[K]`-позиции), не баг конкретной версии.
Результат: `infer D` не находит совпадения по специфичному `Config` и откатывается к
дефолтному параметру `Config extends SourceConfig = SourceConfig`, то есть к голым
`PageData`/`MetaData`.

Подтверждено пошаговыми пробниками (`type X = S extends SourceUnion<infer D> ? D : 'NO'` —
даёт `D = SourceConfig`, а не реальный `{pageData: DocCollectionEntry<...>, ...}`):

- Не зависит от способа вызова `loader()` — двухаргументная и одноаргументная (`{source, ...}`)
  формы дают одинаковый результат.
- Не зависит от явного указания типового параметра (`loader<S>(s, opts)`, где `S` — точный тип
  `docs.toFumadocsSource()`) — ошибка воспроизводится даже когда `I` не нужно выводить вовсе,
  потому что сам `GeneratePage<I>` не может развернуть `D` из уже известного `I`.
- Не зависит от `tsc` vs `tsgo` — идентичная ошибка на обоих.
- Не зависит от версии `fumadocs-core`/`fumadocs-mdx` в диапазоне 16.15.1…16.15.4 /
  15.3.1…15.4.0 — откат к точным пре-бамп версиям с чистой пересборкой `.source/` дал ту же
  ошибку.
- Не дубликат установки пакета: `require.resolve('fumadocs-core/package.json', {paths: [...]})`
  из `node_modules/fumadocs-mdx` и из `node_modules/fumadocs-ui` резолвится в один и тот же
  физический путь под bun isolated-installs — не тот класс проблемы, что
  [bun-install-stale-isolated-cache](/.claude/docs/bun-install-stale-isolated-cache.md).

При этом `docs` (экспорт из сгенерированного `.source/server.ts`) и
`docs.toFumadocsSource()` типизированы **корректно** — со специфичным `DocCollectionEntry<...>`,
включающим `body`/`toc`. Разрушение происходит именно внутри `loader()`'s вычисления
результирующего `LoaderOutput`, не раньше.

## Фикс

Раз специфичный тип элемента уже верно виден напрямую как `docs.docs[number]`/`docs.meta[number]`
(без прохода через `infer`-конструкцию `StaticSource`), обходим сломанный вывод явным приведением
результата `loader()`:

```ts
// apps/form-docs/src/lib/source.ts
import { docs } from '@/.source/server'
import { loader, type LoaderOutput, type Meta, type Page } from 'fumadocs-core/source'
import { i18n } from './i18n'

type DocPageData = (typeof docs.docs)[number]
type DocMetaData = (typeof docs.meta)[number]

export const source = loader({
  i18n,
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
}) as unknown as LoaderOutput<{
  page: Page<undefined, DocPageData>
  meta: Meta<undefined, DocMetaData>
  i18n: typeof i18n
}>
```

`as unknown as` обязателен — приведение напрямую (`as LoaderOutput<...>`) TS отклоняет как
«insufficient overlap», потому что фактический вычисленный тип `loader()` содержит базовый
`PageData`/`MetaData`, а не наш конкретный тип.

⚠️ Приложение или коллекция, использующая `Record<string, SourceUnion>`-форму (несколько
коллекций сразу в одном `loader()`) потребует того же обхода с `Page<Name, ...>`/`Meta<Name, ...>`
вместо `Page<undefined, ...>` — сама проблема (Config недостижим через infer) та же.

## Как проверить, что фикс актуален

Если апстрим когда-нибудь переработает `StaticSource`/`GeneratePage` так, чтобы `Config` был
достижим для вывода (например, через дублирующее прямое поле, не только индексный доступ),
`as unknown as` продолжит работать (просто станет избыточным), а `tsc`/`tsgo` без каста начнёт
проходить и без него — можно будет убрать обход и вернуться к прямому `export const source =
loader({...})`.
