# `pages` в конфиге betterAuth() — не опция ядра, ничего не делает

## Находка

Ключ `pages: { signIn, signUp, error, resetPassword }`, передаваемый прямо в объект
`betterAuth({...})`, — **не существующая опция better-auth**. Проверено по всем версиям пакетов
в локальном `node_modules/.bun` (`better-auth@1.6.x…1.7.4`, `@better-auth/core@1.7.1…1.7.4`,
включая плагины `anonymous`/`emailOTP`): ни одного упоминания строки `pages` во всём `dist/`
любой из версий. Ни ядро, ни `@letar/auth`, ни `libs/pin-auth` в рантайме `auth.options.pages`
нигде не читают.

## Почему это молча проходит typecheck

```typescript
declare const betterAuth: <Options extends BetterAuthOptions>(options: Options & {}) => Auth<Options>
```

(`node_modules/.bun/better-auth@*/node_modules/better-auth/dist/auth/full.d.mts`). Сигнатура —
классический generic-приём `Options & {}`, специально отключающий excess-property-check
TypeScript: лишний ключ в объектном литерале, переданном в дженерик-параметр, не считается
ошибкой (в отличие от присвоения тому же литералу конкретно типизированной переменной). Поэтому
`pages` компилируется без единой ошибки, при этом реально нигде не используется —
типичный ложноуспокаивающий сигнал ([verification-pitfalls](/.claude/docs/verification-pitfalls.md)):
«typecheck зелёный» здесь не значит «опция существует».

## Откуда взялось

`AuthPages` — это тип **самого `@letar/auth`** (`libs/auth/src/server/create-auth/types.ts`),
поле `pages?: AuthPages` в `AuthProfileBase`. `createAuth()`
(`libs/auth/src/server/create-auth/index.ts`) действительно спредит `pages: profile.pages` в
итоговый вызов `betterAuth({...})` для standalone- и hub-client-режимов — но это тот же самый
мёртвый ключ, просто дальше по цепочке. То есть `pages` — это конвенция самого `@letar/auth`
(задумывалась как редиректы better-auth, которых на деле у библиотеки нет), а не опция
better-auth.

## Где встречается

Приложения, собирающие `betterAuth()` напрямую (не через `createAuth()`), скопировали этот
`pages`-блок по образцу друг друга — дублирующийся мёртвый код, найден одновременно в 7
приложениях (аудит 2026-09-15):

- `apps/aboi/src/lib/auth.ts`
- `apps/archetest/src/lib/auth.ts`
- `apps/dashboard/src/lib/auth.ts`
- `apps/domwellbes/src/lib/auth.ts` — **удалено** в этом же аудите
- `apps/grandslamcup/src/lib/auth.ts`
- `apps/mandala/src/lib/auth.ts`
- `apps/studio/src/lib/auth.ts`

`apps/dsperevod` (второй standalone-конфиг, упомянутый как образец в задаче аудита) блока
`pages` не содержит — дублирования там нет.

Приложения на `createAuth()`-фабрике (`aprel8008`, `auth-hub`, `driving-school`, `kami`,
`svoichuzhie`, `time`) сам блок не пишут — они передают `pages` как опцию профиля в
`createAuth({ pages: {...} })`, и это тоже ничего не делает по той же причине, но исправление
там требует править саму библиотеку `@letar/auth` (шире затронутый код, другой блаcт-радиус) —
не входит в рамки этой находки.

## Что делать при следующей встрече

- В **standalone**-приложении (прямой `betterAuth()`) — блок `pages` можно удалять как мёртвый
  код, без риска регрессии (проверено — нигде не читается).
- В `libs/auth` (`createAuth()`/`createAuthAsync()`) — трогать отдельно и осторожно: это общая
  фабрика для ~6 приложений, `pages?: AuthPages` в публичном типе профиля тоже стоит либо
  убрать, либо задокументировать в JSDoc типа как декоративный (по факту он не влияет на
  редиректы better-auth — те делает сам код приложения через `requireAuth`/`redirect()`).
- Редиректы `/sign-in`, `/sign-up` и т.п. в better-auth в принципе не настраиваются через опции
  конфига — better-auth не рендерит собственные страницы (headless), редиректы — обязанность
  кода самого Next.js-приложения (`requireAuth()`, `middleware`/`proxy.ts`, серверные экшены).
