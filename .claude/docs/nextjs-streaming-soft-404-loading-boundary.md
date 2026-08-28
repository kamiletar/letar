# ⚠️ `notFound()` отдаёт 200, а не 404, если выше по дереву есть `loading.tsx`

**Класс:** SEO / коды ответа. **Не баг Next.js** — документированное поведение, но выглядит
ровно как поломка и не ловится ни typecheck, ни lint, ни глазами (страница «не найдено»
рисуется правильно).

## Симптом

```
GET /houses/no-such-house              → 200   (рисуется not-found UI)
GET /cabinet/projects/no-such-id       → 200   (рисуется not-found UI)
GET /nope-nope-nope  (нет маршрута)    → 404
```

Встроенный 404 (несуществующий маршрут) работает, а `notFound()`, вызванный из кода страницы, —
нет. Отсюда соблазн искать причину в самой странице (`export const dynamic = 'force-dynamic'`,
кривой `not-found.tsx`, proxy/middleware). Причина не там.

## Причина

`notFound()` бросает `NEXT_HTTP_ERROR_FALLBACK;404`. Статус ответа Next выставляет **только**
в ветке `errorRecovery` (`node_modules/next/dist/server/app-render/app-render.js`, `catch` вокруг
рендера):

```js
if (isHTTPAccessFallbackError(err)) {
  res.statusCode = getAccessFallbackHTTPStatus(err)  // 404
  ...
}
// комментарий там же:
// "If a bailout made it to this point, it means it wasn't wrapped inside a suspense boundary."
```

Если бросок произошёл **внутри Suspense-границы**, React гасит его этой границей, до `catch` он
не доходит — а заголовки ответа к этому моменту уже ушли (шелл готов, стриминг начался).
Поменять статус после начала стрима нельзя.

`loading.tsx` — это и есть Suspense-граница.

Документация Next это фиксирует прямо (`next/dist/docs`, версия из `node_modules`, т.е.
всегда актуальная для проекта):

- `03-file-conventions/not-found.md`: «Next.js will return a `200` HTTP status code for streamed
  responses, and `404` for non-streamed responses».
- `03-file-conventions/loading.md` § Status Codes: «The response body starts streaming when a
  Suspense fallback renders (for example, a `loading.tsx`) … Place `notFound()` before those
  boundaries and before any `await` that may suspend».

## Главная ловушка: корневой `app/loading.tsx` ломает **весь** сайт

`loading.tsx` сегмента оборачивает не только `page.tsx` этого сегмента, но и **все вложенные
маршруты**. Поэтому один файл `app/loading.tsx` делает soft-404 из каждого `notFound()` в
приложении — независимо от того, есть ли `loading.tsx` у самого маршрута.

Замер (2026-08-28, приложение с ~30 файлами `loading.tsx`, прод-сборка `next build` + `next start`):

| Что убрано                                                            | `/houses/no-such-house` |
| --------------------------------------------------------------------- | ----------------------- |
| ничего (как есть)                                                     | **200**                 |
| `houses/loading.tsx` + `houses/[slug]/loading.tsx`, корневой на месте | **200**                 |
| корневой `app/loading.tsx` + оба сегментных                           | **404**                 |

Отсюда: точечная правка «убрать `loading.tsx` у проблемного маршрута» не работает. Либо убирать
корневой (и потерять стриминговый скелетон на всех страницах, включая LCP-критичную главную),
либо решать иначе (см. ниже).

## ⚠️ Проверять только на прод-сборке — но здесь dev не соврал

Первая гипотеза обычно «артефакт `next dev`». Проверено: поведение **идентично** на
`nx build <app>` + `next start`. Стриминг в dev и prod здесь работает одинаково, экономить на
прод-проверке всё равно нельзя (класс «dev врёт» реален для других вещей —
[verification-pitfalls](/.claude/docs/verification-pitfalls.md)), но конкретно этот симптом
воспроизводится в обоих режимах.

## Насколько это на самом деле больно (не так сильно, как кажется)

В стримингом soft-404 Next **сам** вставляет в HTML `<meta name="robots" content="noindex"/>`.
Проверено на прод-сборке — тег присутствует в ответе, и это не метаданные приложения:
`generateMetadata` проблемной страницы для несуществующего слага возвращала `{}`.

Значит поисковик страницу не проиндексирует. Остаются вторичные эффекты: «мягкие 404» в
Search Console/Вебмастере, лишний краул-бюджет, шум в аналитике и в логах.

⛔ Из этого **не** следует «можно игнорировать всегда»: если статус нужен для интеграции,
мониторинга или требований площадки — `noindex` тут не помощник.

## Что делать, если 404 действительно нужен

Официальная рекомендация Next (`loading.md` § Status Codes) — проверять существование ресурса
**до** начала стрима, то есть в `proxy.ts`:

- в Next 16 `proxy` по умолчанию на Node.js-рантайме (`runtime` в нём задавать нельзя — ошибка),
  так что обращение к БД технически возможно;
- но проверка выполняется на **каждом** запросе, включая запросы к существующим страницам —
  нужен кэш набора слагов, иначе это лишний поход в БД на каждый просмотр;
- документация прямо предупреждает: «Keep proxy checks fast, and avoid fetching full content there».

Альтернатива — отказаться от `loading.tsx` на всём дереве выше SEO-значимых маршрутов. Дёшево
в коде, дорого по UX: пропадает стриминговый скелетон.

Третий вариант — сознательно принять soft-404, опираясь на автоматический `noindex`. Для сайта,
который ещё не открыт для индексации (`SITE_LAUNCHED = false` и подобные флаги), это ничего не
стоит прямо сейчас, но решение стоит записать явно, а не «забыть».

## Как быстро проверить у себя

`curl` в этом репозитории перехватывает хук context-mode, поэтому проще скриптом:

```js
// probe.mjs — node probe.mjs 3000 /some/missing-slug
import { request } from 'node:http'
const [, , port, ...paths] = process.argv
for (const p of paths) {
  const r = await new Promise((res) => {
    request({ host: '127.0.0.1', port: Number(port), path: p }, (r) => {
      let b = ''
      r.on('data', (c) => {
        b += c
      })
      r.on('end', () => res({ status: r.statusCode, html: b }))
    }).end()
  })
  console.log(r.status, p, (r.html.match(/<meta name="robots"[^>]*>/g) ?? []).join(' | '))
}
```

В Git Bash запускать с `MSYS_NO_PATHCONV=1`, иначе аргументы вида `/houses/...` превращаются в
пути Windows.
