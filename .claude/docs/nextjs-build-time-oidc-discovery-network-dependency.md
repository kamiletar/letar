# `next build` тянет сеть на OIDC discovery — eager `init()` у better-auth, не баг `@letar/auth`

Найдено 2026-09-02 при верификации фикса §33 `PLAN-INFRA-2.md` (индексация staging через
`robots.ts`) — попутно `nx build kami --skip-nx-cache` падал с потоком повторяющихся ошибок:

```
[Better Auth]: Discovery fetch failed for "letar-auth": TypeError: fetch failed
Error: Provider "letar-auth": discovery returned no valid data. Provider initialization stopped to keep its account issuer stable.
    at Object.init (...\.next\server\chunks\4043.js:...)
```

Проверено на полностью откаченных правках сессии — падает и без них, к §33 отношения не имеет.

## Root cause: это не баг, а архитектура better-auth

`buildHubClientAuth()` в [create-auth/index.ts](/libs/auth/src/server/create-auth/index.ts)
подключает `genericOAuth({ config: [{ providerId: 'letar-auth', discoveryUrl, ... }] })`.
У этого плагина (`better-auth/dist/plugins/generic-oauth/index.mjs`) есть `init: async (ctx) => {...}`
— лайфцикл-хук, который **все** плагины better-auth проходят при инициализации:

```
runPluginInit(context)              // context/helpers.mjs
  → for (const plugin of plugins) → plugin.init(context)
      → genericOAuth.init: await fetchDiscovery(c.discoveryUrl, ...)
```

Ключевое место — `auth/base.mjs`:

```js
const createBetterAuth = (options, initFn) => {
  const authContext = initFn(options)   // ← НЕ await, но вызывается сразу
  ...
  const handler = async (request) => {
    const ctx = await authContext        // await происходит только здесь
    ...
  }
}
```

`initFn(options)` (`context/init.mjs` → `createAuthContext` → `runPluginInit`) вызывается
**синхронно в момент `betterAuth({...})`** — то есть в момент импорта/вычисления модуля
`lib/auth.ts` (у нас — top-level `export const auth = createAuth({...})`). Внутри этой асинхронной
функции `fetchDiscovery()` стартует сразу же, до первого реального HTTP-запроса к приложению.

**Это не лениво.** Плагин не ждёт первого `signIn.social`/`callback/:id` — он бьёт в сеть, как
только где-либо загружается модуль с `betterAuth()`. Next.js во время `next build` импортирует
`lib/auth.ts` при сборе данных страниц (`collect page data`) для любого роута/layout, который
хоть где-то вызывает `auth()`/`getSession()` — и делает это **параллельно в нескольких воркерах**,
поэтому одна и та же ошибка печатается по многу раз подряд (не «повторный баг», а один и тот же
эффект в N параллельных процессах).

Если `discoveryUrl` недоступен и у провайдера не задан `accountIssuer`, плагин **бросает**
`Error: Provider "...": discovery returned no valid data...` — это делает промис `authContext`
отклонённым. Не только шумные логи: любая страница/экшн, которая реально дойдёт до
`await authContext` (то есть в рантайме вызовет `auth()`), тоже упадёт с этой ошибкой, пока процесс
не перезапустят. Это симметрично тому же классу, что описан в
[runtime-invariant-missing-from-select.md](/.claude/docs/runtime-invariant-missing-from-select.md)
только источник инварианта не БД, а сеть на старте процесса.

## В этом конкретном прогоне ошибка НЕ была фатальной сама по себе

`genericOAuth.init` оборачивает `fetchDiscovery` в `.catch(err => { logger.error(...); return null })`
— то есть сетевой сбой сам по себе не бросает исключение синхронно в момент печати первой строки;
исключение (`Provider "...": discovery returned no valid data...`) бросается только после `catch`,
внутри того же `init`, и туда попадает так же тихо (никакого `process.exit`).

**Фактический fatal-краш этого прогона был от другого источника** — Keystatic (`apps/kami/src/lib/keystatic.ts`,
`createGitHubReader`) на странице `/[locale]/blog/[slug]` не смог дотянуться до `api.github.com`:

```
TypeError: fetch failed
  [cause]: Error: Client network socket disconnected before secure TLS connection was established
    code: 'ECONNRESET', host: 'api.github.com', port: 443
> Build error occurred
Error: Failed to collect page data for /[locale]/blog/[slug]
```

Оба сбоя (auth.letar.best и api.github.com) — симптомы одного и того же: `next build` на этой
машине делает исходящие HTTPS-запросы к внешним хостам во время сбора данных страниц, и оба хоста
в этом прогоне не ответили. Это не два независимых бага, а одна причина — не проверялось,
воспроизводится ли детерминированно (см. `.claude/docs/alpine-cdn-unreachable-s3.md` и
`.claude/docs/electron-net-fetch-tun-vpn.md` — на этой машине сетевая нестабильность класса «TLS
handshake рвётся под VPN/файрволом» уже документирована для других инструментов).

## Что это значит на практике

1. **`nx build kami` (и любое другое hub-client приложение) требует сетевой доступности
   `auth.letar.best`** в момент сборки — так же, как некоторые приложения требуют доступности
   других внешних сервисов при билде (см. паттерн в `PLAN-INFRA-2.md`). Это ограничение самой
   библиотеки better-auth, не специфика `@letar/auth`/kami — исправить в нашем коде без форка
   better-auth нельзя.
2. **Затронуты все hub-client профили**, не только kami — найдено через
   `grep -rl "hub-client" apps/*/src/lib/auth.ts`:
   - `apps/kami/src/lib/auth.ts`
   - `apps/time/src/lib/auth.ts`
   - `apps/aprel8008/src/lib/auth.ts`
   - `apps/domwellbes/src/lib/auth.ts`
3. **Не чинить как «баг сборки»** — ретраить билд обычно достаточно, если сеть до
   `auth.letar.best`/`api.github.com` была временно недоступна. Если оба хоста стабильно
   недоступны с конкретной машины (например, из-за корпоративного firewall/VPN) — это
   ограничение окружения, а не повод патчить `@letar/auth`.
4. **Не пытаться «починить» отключением дискавери на билде** — `accountIssuer` можно было бы
   задать явно, чтобы плагин не падал при недоступном discovery (см. код: `!c.accountIssuer` —
   единственная ветка, которая throw'ит), но это меняет поведение и в проде (где discovery должен
   резолвиться нормально) — не делать без отдельного решения владельца.

## Диагностика: как отличить «это OIDC» от «это что-то ещё»

- Строки `[Better Auth]: Discovery fetch failed for "<providerId>"` — это именно этот класс,
  указывают конкретный `providerId` (у нас всегда `letar-auth`).
- Ищи **следующую после серии этих строк** финальную `Build error occurred` — она называет
  реальный упавший роут/причину. Если это `TypeError: fetch failed` на другом хосте (как
  `api.github.com` в этом случае) — Better Auth тут ни при чём, это отдельная сетевая проблема.
- Если сам `Build error occurred` называет причиной именно `Provider "letar-auth": discovery
  returned no valid data` — тогда это действительно auth-модуль уронил сборку (страница,
  вызывающая `auth()`/`getSession()`, попала в `collect page data`).
