# `Form.UrlSync` без `router` — молча не триггерит RSC-рефетч

`Form.UrlSync` (`@letar/forms`, v2.10.0) по умолчанию пишет URL через `window.history.replaceState`/
`pushState` напрямую — **мимо** Next.js App Router. Если страница-потребитель — Server Component,
читающий `searchParams` (обычный паттерн для server-side фильтров), такое изменение URL не
триггерит повторный рендер сервера: адресная строка обновляется, но данные под фильтром остаются
от первого захода на страницу.

## Симптом

Выбор нового значения в `Field.Select`/`Combobox` внутри `<Form>` с `Form.UrlSync`:

- URL меняется (`window.location.href` показывает новый query-параметр) — выглядит как «сработало»;
- визуально ничего не обновляется, потому что и не должно — сервер не перечитывал `searchParams`;
- в `read_network_requests` **нет** ни одного запроса с `?...&_rsc=...` после изменения.

Ловушка усиливается тем, что если новое и старое значение фильтра дают одинаковый (пустой/базовый)
результат на экране, регрессия визуально незаметна — нужно either проверять сеть, либо выбирать
значение, для которого заведомо есть отличающиеся данные.

## Фикс

Передать Next.js router явно — `Form.UrlSync` принимает опциональный проп `router`:

```tsx
'use client'
import { useRouter } from 'next/navigation'

const router = useRouter()

<Form schema={FiltersSchema} initialValue={initialValue} onSubmit={async () => {}}>
  <Form.UrlSync
    fields={['projectId', 'warehouseId']}
    defaults={{ projectId, warehouseId }}
    router={router}
    replace={false} // или true — см. ниже
  />
  {/* ... */}
</Form>
```

С `router` передан — `Form.UrlSync` вызывает `router.replace()`/`router.push()`, что запускает
обычную Next.js навигацию (включая RSC-рефетч для Server Component).

## `replace` — дефолт компонента (`true`) может отличаться от того, что было раньше

Дефолт `Form.UrlSync.replace` — `true` (история не растёт на каждое изменение фильтра). Если
мигрируешь с `@letar/url-query-state` (`useUrlQueryState`, `historyMode` там по умолчанию
`'push'`) — поведение по умолчанию разное. Сверяйся с тем, что было раньше, а не полагайся на
дефолт нового компонента автоматически совпасть.

## Как проверять после миграции

Не полагаться на визуальную проверку «URL поменялся». Явный тест:

1. Открыть страницу, выбрать значение фильтра, для которого заведомо другой набор данных на экране
   (не «пусто → пусто»).
2. `read_network_requests` с `urlPattern`, совпадающим с путём страницы — должен появиться запрос
   `GET .../<path>?...&_rsc=<hash>` с кодом 200 **после** изменения (не только первичный `GET`
   страницы без `_rsc`).
3. Только тогда считать URL-sync рабочим — совпадение содержимого экрана само по себе не
   доказательство (см. `verification-pitfalls.md`).

Найдено 2026-09-13 в domwellbes при миграции `supply-control-room-filters.tsx` с
`@letar/url-query-state` на `Form.UrlSync` — обнаружено именно проверкой сети, не глазами на
скриншоте.
