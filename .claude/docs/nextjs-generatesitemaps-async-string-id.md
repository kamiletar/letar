# `generateSitemaps` в Next 16.0.0+: `id` приходит асинхронно и строкой

## Проблема

Конвенция `sitemap.ts` с `generateSitemaps()` возвращает `{ id: number }[]`, и почти весь
существующий пример-код (включая туториалы под Next 13–15) пишет сигнатуру обработчика как

```ts
export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  switch (id) { ... }
}
```

С Next 16.0.0 это молча ломается. `id` передаётся не синхронным числом, а **промисом**,
резолвящимся в **строку** — синхронная деструктуризация `{ id }` подставляет в `id` сам объект
промиса, а не его значение:

```ts
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = await props.id // строка "0", "1", …
}
```

`switch (id) { case 0: ... }` (число) против объекта-промиса не совпадает ни с одним `case` —
`default: return []` срабатывает всегда. Ошибки нет ни на этапе сборки, ни в логах рантайма:
маршрут `/sitemap/{id}.xml` продолжает отвечать `200 OK`, просто с пустым `<urlset/>`.

Источник истины — сам Next.js: `node_modules/next/dist/docs/.../generate-sitemaps.md`, раздел
«Version History»:

> `v16.0.0` — The `id` values returned from `generateSitemaps` are now passed as a promise that
> resolves to a `string` to the sitemap function.

## Диагностика

1. `/sitemap.xml` (без `generateSitemaps`) отдаёт `404` — это норма при **нескольких** секциях:
   URL меняется на `/sitemap/{id}.xml` (`0`, `1`, …), не `/sitemap.xml`.
2. `/sitemap/0.xml` отвечает `200`, но `<urlset>` пуст, хотя источник данных (БД/массив) точно
   не пуст.
3. Временный `console.log(typeof id, JSON.stringify(id))` в начале обработчика печатает
   `object {}` — это и есть непровалидированный промис, сериализованный в пустой объект.

## Фикс

```ts
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id)
  switch (id) {
    case 0:
      return staticEntries()
      // ...
  }
}
```

`Number(...)` — если секции проиндексированы числами (как в большинстве кодовых баз); если `id`
осмысленно строковый (не индекс, а, например, слаг категории), сравнивай строку напрямую и не
приводи к числу.

## Область действия

Проверено на Next 16.3.6. Затрагивает любое приложение, использующее `generateSitemaps()` для
более чем одной секции sitemap — при одной секции (`generateSitemaps` не определён вовсе)
проблема не проявляется, потому что `id` в обработчик не передаётся.

Найдено и исправлено: `apps/flora` (T3.10, `.claude/docs/INDEX.md`).
