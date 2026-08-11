# RSC-граница ломает `Children.only` внутри `AspectRatio` — визуально не видно

## Симптом

Роут (`next dev`) отдаёт `500` с `React.Children.only expected to receive a single React element
child`, но **страница в браузере рендерится нормально** — DOM корректный, скриншот выглядит
живым. Терминал dev-сервера прячет стек за `at ignore-listed frames`, конкретный компонент не
виден.

⚠️ Это частный случай ловушки из [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md)
— проверка «страница выглядит нормально» отвечает не на тот вопрос: реальный код ответа сети
проверяется через `read_network_requests`/HTTP-статус, а не через DOM/скриншот. На этом баге
визуальная проверка ошибалась стабильно на обеих страницах, где он воспроизводился.

## Причина

Три вещи сходятся вместе:

1. **`AspectRatio` из `@chakra-ui/react` (Chakra UI v3) зовёт `Children.only(children)` без
   толерантности к массивам.** Это отличает его от `asChild`-логики в `factory.js`, которая
   сначала проверяет `isValidElement` и только тогда зовёт `Children.only`.
2. **`AspectRatio`, `Image`, `Flex` — все помечены `'use client'` внутри самого пакета
   `@chakra-ui/react`.** Родительский компонент, который их использует, может при этом остаться
   Server Component — импорт клиентского компонента сам по себе не требует `'use client'` у
   вызывающего кода.
3. **Server Component рендерит `<AspectRatio>{cond ? <Image/> : <Flex>...</Flex>}</AspectRatio>`
   напрямую**, без промежуточного `'use client'`-компонента. Когда Server Component передаёт
   `children` клиентскому компоненту, React Flight сериализует эту границу и заворачивает
   `children` в массив длиной 1 — **даже для одного элемента**. `Children.only` требует именно
   голый элемент (`isValidElement`), а не массив любой длины, и падает независимо от содержимого
   тернарника (Fragment внутри не нужен, обычный `cond ? A : B` уже достаточен).

Ветка условия (какой из двух элементов реально рендерится) не имеет значения — ломается сама
конструкция «Server Component → клиентский компонент с `Children.only`-семантикой → JSX-children,
написанный прямо в теле Server Component».

## Как диагностировать без полного стектрейса

Терминал (и Turbopack, и webpack) прячет стек за `ignore-listed frames`. Сырой HTML-ответ
дев-сервера на упавший роут содержит `<template data-next-error-stack="...">` с **полным**
стектрейсом, включая точное имя компонента, где брошено исключение — достать его прямым HTTP GET
(`Invoke-WebRequest`/`curl`-эквивалент), **не через сам браузер**:

```powershell
(Invoke-WebRequest -Uri "http://localhost:<port>/<route>" -UseBasicParsing).Content
```

В ответе искать `data-next-error-stack` — там будет `at AspectRatio (...aspect-ratio.js:NN:MM)` и
цепочка вызовов до конкретного файла проекта.

Дополнительный способ подтвердить механизм (не обязателен для фикса, но снимает сомнения):
временный `console.error` перед вызовом `Children.only` внутри
`node_modules/@chakra-ui/react/dist/esm/components/aspect-ratio/aspect-ratio.js` покажет, что
`children` на сервере приходит как `Children.toArray(...)`-массив с одним элементом, чей `type` —
lazy-ссылка на клиентский чанк (`{_payload: {status: "resolved_module", ...}}`), а не голый
React-элемент.

## Общее правило

Любой Chakra-компонент с `Children.only`-семантикой (`AspectRatio` — не единственный, паттерн
общий для любого `asChild`-подобного API без проверки `isValidElement`) внутри JSX-дерева,
которое начинается в Server Component, должен соблюдать одно из двух:

- весь блок (компонент + его условный children) вынесен в отдельный `'use client'`-компонент,
  Server Component передаёт туда уже вычисленные примитивы (`imageUrl`, `alt` и т.п.), а не JSX;
- либо родительский компонент целиком помечен `'use client'`, если он и так не использует ничего
  server-only.

Не спасает: синтаксическая «безобидность» JSX (обычный тернарник, отсутствие Fragment) — граница
сериализации RSC не зависит от того, как выглядит выражение, она зависит от того, где физически
объявлен JSX-узел (Server или Client Component).

## Полный разбор с кодом фикса

Исходное расследование, диагностика через сырой HTTP-ответ и итоговый diff —
`apps/domwellbes/PLAN_COMPLETED.md`, раздел «React.Children.only на /materials и
/materials/item/[sku] — 2026-08-11» (submodule, приватная часть монорепо).
