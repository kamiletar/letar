# `createLazyComponent` — ленивое поле навсегда зависает в нераскрытом SSR Suspense-boundary

**Затронуто:** `libs/forms/src/lib/declarative/lazy-component.tsx` — общая инфраструктура ленивой
загрузки. Используется `Form.Field.TableEditor`, `Form.Field.DataGrid`, `Form.Field.RichText` и
любые `extraSelects`/`extraComboboxes`/`extraListboxes`, переданные в `createForm` через
`lazySelects`/`lazyComboboxes`/`lazyListboxes`. Не специфично одному полю — бага любого потребителя
этой обёртки. Исправлено 2026-08-20 в v2.7.1.

## Симптом

Поле, использующее `createLazyComponent`, рендерится в DOM, но визуально не появляется:

- реальная разметка лежит в осиротевшем `<div hidden id="S:N">` в конце `<body>`;
- на месте поля в форме — нераскрытый `<template id="B:N">`;
- элементы внутри имеют `getBoundingClientRect() = 0×0×0×0` и `offsetParent: null`;
- вычисленные CSS-стили корректны, в консоли браузера нет ни одной ошибки (ни hydration
  mismatch, ни JS exception) — выглядит как «должно работать, но не работает».

Воспроизводилось детерминированно на `Form.Field.TableEditor` и `Form.Field.DataGrid`, причина 5
падающих e2e-тестов `table-editor.spec.ts` (`apps/form-example`, §18.7 M2, паттерн Б).

## Причина

`createLazyComponent` монтировал `<Suspense fallback={<Skeleton/>}>` вокруг `React.lazy()`-
компонента безусловно, в том числе на сервере при первом SSR-рендере страницы (компонент был
`'use client'`, но Next.js всё равно server-рендерит клиентские компоненты на первом заходе).

Когда серверный Suspense suspend'ится (динамический `import()` внутри `lazy()` всегда асинхронный,
даже если модуль уже в памяти), React стримит HTML в два куска:

1. на месте boundary — плейсхолдер `<template id="B:N">` (что было в `fallback`, здесь —
   `Skeleton`, он рендерится сразу как видимый узел рядом с `template`);
2. в конце `<body>` — скрытый `<div hidden id="S:N">` с реальным содержимым, которое досчиталось
   позже.

Раскрытие (перенос содержимого из `S:N` на место `B:N`) делает встроенный inline-скрипт React —
`$RC`/`$RB`/`$RV` (`completeBoundary`, часть `react-dom/server` рантайма). Его код **батчит swap
через `requestAnimationFrame`**: `$RB.push(a,b); 2===$RB.length && requestAnimationFrame(...)`. Это
срабатывает даже для одного-единственного boundary — `push` кладёт сразу два элемента (id
плейсхолдера и id скрытого узла), так что условие `length===2` истинно уже после первого вызова.

Если `requestAnimationFrame` не тикает — а это штатное поведение браузера для скрытой/свёрнутой/
фоновой вкладки (rAF полностью останавливается, в отличие от таймеров, которые лишь троттлятся) —
reveal-скрипт никогда не выполняется, и boundary виснет в состоянии «плейсхолдер + осиротевший
скрытый узел» навсегда. Ничего не падает и не логируется — с точки зрения React всё идёт по плану,
просто следующий кадр анимации не наступает.

Headless-браузер в e2e (или любой инструмент автоматизации, где вкладка формально существует, но
не считается активной/видимой по Page Visibility API) — типичное окружение, где это проявляется
стабильно, не флейково.

## Как подтвердить эмпирически

```js
document.visibilityState // 'hidden' в проблемном окружении
document.hidden // true

// requestAnimationFrame не срабатывает вовсе:
new Promise((resolve) => {
  let fired = false
  requestAnimationFrame(() => {
    fired = true
    resolve(fired)
  })
  setTimeout(() => resolve(fired), 2000) // всегда false, если вкладка скрыта
})
```

Сырой HTML ответа сервера (`fetch(url).then(r => r.text())`) содержит и сам `$RC`/`$RB`/`$RV`
код, и вызов `$RC("B:N","S:N")` — сервер честно отправляет всё нужное, проблема чисто клиентская
и рантаймовая, не в разметке.

## Фикс

`LazyWrapper` монтирует `<Suspense>` только после клиентского маунта (гейт через `useState` +
`useEffect`):

```tsx
function LazyWrapper(props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <Skeleton height={fallbackHeight} borderRadius="md" />
  }

  return (
    <Suspense fallback={<Skeleton height={fallbackHeight} borderRadius="md" />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}
```

На сервере рендерится только `Skeleton` — никакого Suspense-boundary, никакого стрима, нечему
зависать. После маунта ленивый импорт запускается **на клиенте**: Suspend здесь разрешается
обычным React-коммитом (реконсиляция), а не HTML-патчингом SSR-стрима — зависимости от
`requestAnimationFrame`/`$RC` нет вообще, это два разных, не связанных друг с другом механизма
раскрытия Suspense.

**Почему не `next/dynamic`:** `@letar/forms` не имеет `next` в зависимостях (framework-agnostic,
публикуется на npm для широкого охвата — см. память `project_forms_distribution`), поэтому фикс
обязан оставаться на стандартных React API, без хардкода под конкретный фреймворк.

**Побочный эффект фикса:** SSR больше не отдаёт реальную разметку поля вообще (только Skeleton) —
для полей за `createLazyComponent` это не регрессия: они и раньше показывали тот же `Skeleton` как
`fallback` на весь период резолва импорта, разница только в том, что теперь этот период всегда
захватывает первый клиентский тик, а не пытается «выиграть» SSR-стриминг.

## Регресс-тест

`libs/forms/src/lib/declarative/lazy-component.spec.tsx`:

- SSR (`renderToString`) с `createLazyComponent`-обёрткой не содержит содержимого ленивого
  компонента и не создаёт Suspense-placeholder — только `Skeleton`.
- Клиентский рендер (`@testing-library/react`) после маунта раскрывает реальное содержимое.

## Связанное

Тот же класс проблемы («видимость вкладки останавливает таймер кадра, инструмент диагностики
показывает 0%/не работает») уже встречался в другом контексте —
[raf-vs-timers-background-tab.md](/.claude/docs/raf-vs-timers-background-tab.md) и памяти
`reference_browser_pane_hidden_raf.md`: rAF в фоновой/скрытой вкладке замирает полностью, тогда
как `setTimeout`/`setInterval` там лишь троттлятся, а не останавливаются — асимметрия, которую
легко забыть при выборе примитива для чего-то, что обязано сработать независимо от фокуса вкладки.
