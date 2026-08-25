# Next.js: `metadata` на странице, которая обязана быть `'use client'`

## Проблема

`export const metadata` работает только в Server Component. Страница, которой нужен `useState`/
`useSearchParams`/другой client-only hook уже на верхнем уровне (не в дочернем компоненте), не
может одновременно экспортировать и `'use client'`, и `metadata` — попытка привести к падению
сборки или тихому игнорированию `metadata` (зависит от версии Next, не полагайся на конкретное
поведение как на документированное).

Найдено на practice: 5 страниц `(auth)/*` в `domwellbes` (`sign-in`, `sign-up`,
`forgot-password`, `reset-password`, `verify-email`) — все клиентские формы с локальным
состоянием, все показывали дефолтный `<title>` сайта вместо «Вход — DomWellbes» и т.п.

## Решение — разбить на server-обёртку и client-компонент

```
app/(auth)/sign-in/
├── page.tsx           # server component — экспортирует metadata, рендерит клиентский компонент
└── page.client.tsx     # 'use client' — вся прежняя логика страницы, без изменений
```

`page.client.tsx` — переименовать `export default function X()` в `export function XClient()`,
остальное содержимое (state, hooks, JSX) не трогать:

```tsx
'use client'
// ...
export function SignInPageClient() {
  return (/* ... */)
}
```

`page.tsx` — новый, тонкий, server component:

```tsx
import type { Metadata } from 'next'

import { SignInPageClient } from './page.client'

export const metadata: Metadata = {
  title: 'Вход',
}

export default function SignInPage() {
  return <SignInPageClient />
}
```

Если в корневом `app/layout.tsx` задан `title: { template: '%s — SiteName' }`, короткого
`title: 'Вход'` достаточно — итоговый `<title>` соберётся как «Вход — SiteName».

## Когда не нужно

Если client-логика инкапсулирована в дочернем компоненте, а сам `page.tsx` — server component
(частый случай: `<Suspense><ClientForm /></Suspense>` уже в существующем `page.tsx` без
`'use client'` на самом файле) — `metadata` экспортируется прямо оттуда, разбивать не нужно.
Проверяй директиву `'use client'` на верхней строке самого `page.tsx`, а не соседних файлов.

## Где применено

`apps/domwellbes/src/app/(auth)/{sign-in,sign-up,forgot-password,reset-password,verify-email}/`
— 2026-08-25, разбор в `apps/domwellbes/PLAN_PUBLIC_MOBILE.md` §12.6 (P3).
