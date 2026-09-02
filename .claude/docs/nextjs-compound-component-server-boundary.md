# Compound-экспорт клиентского компонента не резолвится через границу Server→Client

## Симптом

Серверный компонент (`page.tsx` или любой другой без `'use client'`) обращается к
суб-компоненту compound-паттерна через property-access:

```tsx
import { Widget } from './widget'

export default function Page() {
  return <Widget.Action /> // 500
}
```

Приложение падает с `500` и ошибкой:

```
Element type is invalid: expected a string (for built-in components) or a
class/function (for composite components) but got: undefined.
```

Ошибка непрозрачная — не указывает прямо на `Object.assign` или на границу
Server/Client. В самом клиентском модуле всё выглядит корректно: `Widget.Action`
существует, компилируется, типы проходят.

## Причина

Compound-паттерн (собрать суб-компоненты в один объект через `Object.assign`) —
стандартный способ экспортировать связанные части одного UI-элемента:

```tsx
'use client'

function WidgetBase(props: WidgetProps) { ... }
function Action(props: ActionProps) { ... }

export const Widget = Object.assign(WidgetBase, { Action })
```

Так устроены `Card.Root`/`Card.Body`, `Table.Root`/`Table.Body` из Chakra UI —
паттерн сам по себе не ошибка.

Ломается он на границе `'use client'`. Next.js резолвит клиентский модуль для
серверного рендера не как обычный JS-объект, а через **client reference** —
bundler-сгенерированную запись-маркер, которая указывает React Flight, какой
именованный экспорт клиентского чанка подставить на стороне клиента. Резолв
идёт **по имени экспорта** (`Widget`), а не по фактическому значению модуля.

Property-access поверх этой прокси (`Widget.Action`) не ведёт себя как
property-access поверх реального объекта, собранного `Object.assign` — Next
не знает, что `.Action` было частью того же значения на этапе сборки клиентского
чанка, потому что видит только client reference с именем `Widget`, а не
исходный JS. Результат — `undefined`, и React получает невалидный тип элемента.

Внутри уже клиентского дерева проблемы нет: если родительский компонент,
который пишет `<Widget.Action />`, сам помечен `'use client'` (или вложен
глубже в клиентское поддерево), JSX строится в реальном клиентском рантайме —
там `Widget` это обычный объект, `Object.assign` работает как обычно.

## Неправильно

```tsx
// widget.tsx
'use client'
function WidgetBase() { ... }
function Action() { ... }
export const Widget = Object.assign(WidgetBase, { Action })
```

```tsx
// page.tsx — Server Component, БЕЗ 'use client'
import { Widget } from './widget'

export default function Page() {
  return <Widget.Action /> // undefined на границе Server→Client
}
```

## Правильно

Суб-компонент, к которому обращается серверный код, экспортируется отдельным
именованным экспортом — без сборки в объект:

```tsx
// widget.tsx
'use client'
function WidgetBase() { ... }
export function WidgetAction() { ... }
export const Widget = Object.assign(WidgetBase, { Action: WidgetAction })
```

```tsx
// page.tsx — Server Component
import { WidgetAction } from './widget'

export default function Page() {
  return <WidgetAction />
}
```

Compound-объект (`Widget.Action`) можно оставить для использования внутри
клиентского дерева — это по-прежнему работает. Проблема только в
серверном коде, который обращается к свойству напрямую в JSX.

## Общее правило

Компаунд-экспорт (`Object.assign`) для `'use client'`-компонента безопасен,
только если **весь** путь использования, включая property-access вида `X.Y`,
находится внутри клиентского дерева — то есть сам вызывающий компонент тоже
`'use client'`, либо JSX строится глубже, уже внутри клиентского поддерева.

Как только Server Component обращается к свойству клиентского экспорта
напрямую в JSX (`<Widget.Action />`, `<Widget.Root />` и т.п.) — нужен
отдельный именованный экспорт для каждого суб-компонента, к которому
обращается серверный код, а не только собранный объект.

Библиотечные compound-компоненты (Chakra `Card`, `Table` и подобные) эту
ловушку не задевают на практике, потому что типичное использование — целиком
внутри клиентского дерева (страница/секция уже `'use client'`, либо compound
используется глубоко во вложенном клиентском компоненте). Ловушка проявляется
в собственных compound-компонентах приложения, когда серверный `page.tsx`
обращается к суб-компоненту напрямую, не оборачивая всё дерево в клиентский
компонент.

## Тот же класс, но без компонентов: обычная константа из `'use client'`-модуля

Найдено в `aboi` 2026-09-02 (`PLAN.md` §11.15). Файл `src/lib/analytics.ts` —
обычный утилитарный модуль (обёртка над `window.umami.track` плюс объекты с
именами событий), но был помечен `'use client'`. Серверный компонент импортировал
оттуда **константу**, а не компонент:

```tsx
// src/app/[locale]/_components/home/hero.tsx — без 'use client'
import { FunnelEvent } from '@/lib/analytics'

<TrackedNavLink href="/catalog" event={FunnelEvent.HeroCatalogClick} />
```

Директива делает модуль клиентской границей, поэтому серверный код получает не
сам объект, а client-reference. Property-access по нему даёт `undefined` — молча,
без исключения: событие ушло в аналитику с пустым именем, и обнаружилось это
только живым прогоном с подставленным `window.umami`. Ни `typecheck:tsgo`, ни
`lint` этого не видят: тип-то у `FunnelEvent.HeroCatalogClick` правильный,
подменяется значение в рантайме.

**Правило:** `'use client'` нужен модулю, который экспортирует компоненты или
хуки, — то есть тому, что действительно должно стать границей. Утилите, которую
импортируют и сервер, и клиент, директива не нужна и вредна; безопасность на
сервере обеспечивается обычной проверкой:

```ts
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return
  }
  // ...
}
```

Если директива всё же нужна (модуль экспортирует и хук, и константы) — константы
выносятся в отдельный файл без директивы, и серверный код импортирует их оттуда.
Реэкспорт из `'use client'`-модуля не помогает: граница определяется модулем, из
которого идёт импорт.
