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
приложениях (аудит 2026-09-15). **Удалено во всех семи** (второй проход того же дня):

- `apps/aboi/src/lib/auth.ts` — **удалено**
- `apps/archetest/src/lib/auth.ts` — **удалено**
- `apps/dashboard/src/lib/auth.ts` — **удалено**
- `apps/domwellbes/src/lib/auth.ts` — **удалено**
- `apps/grandslamcup/src/lib/auth.ts` — **удалено**
- `apps/mandala/src/lib/auth.ts` — **удалено**
- `apps/studio/src/lib/auth.ts` — **удалено**

`apps/dsperevod` (второй standalone-конфиг, упомянутый как образец в задаче аудита) блока
`pages` не содержит — дублирования там нет.

Приложения на `createAuth()`-фабрике (`aprel8008`, `auth-hub`, `driving-school`, `kami`,
`svoichuzhie`, `time`) сам блок не писали — они передавали `pages` как опцию профиля в
`createAuth({ pages: {...} })`, и это тоже ничего не делало по той же причине. **Закрыто
2026-09-16** — грепом по всем шести приложениям подтверждено, что ни один кастомный код не
читает `auth.options.pages` напрямую (только `data?.pages`/`result.pages` от TanStack Query
`useInfiniteQuery` в несвязанных местах — другое поле, другая семантика). Решение — убрать
опцию из типа профиля целиком, не оставлять декоративной:

- `libs/auth/src/server/create-auth/types.ts` — `pages?: AuthPages` и сам интерфейс `AuthPages`
  удалены из `AuthProfileBase`.
- `libs/auth/src/server/create-auth/index.ts` — три спреда `pages: profile.pages` (в
  `buildStandaloneAuth`, `buildHubClientAuth`, `buildHubProviderAuth`) удалены.
- `libs/auth/docs/api-reference.md` — строка `pages` убрана из таблицы опций профиля.
- Вызовы `pages: {...}` убраны из `createAuth({...})` во всех шести приложениях: `apps/time`,
  `apps/aprel8008`, `apps/kami`, `apps/auth-hub` (public), `apps/driving-school`,
  `apps/svoichuzhie` (private submodule).

`typecheck:tsgo` + `lint` зелёные на `@letar/auth`-потребителях после удаления (обе части
находки — standalone-приложения и `createAuth()`-фабрика — теперь закрыты).

## Справочно: почему опция изначально не работала

Редиректы `/sign-in`, `/sign-up` и т.п. в better-auth в принципе не настраиваются через опции
конфига — better-auth не рендерит собственные страницы (headless), редиректы — обязанность
кода самого Next.js-приложения (`requireAuth()`, `middleware`/`proxy.ts`, серверные экшены).
