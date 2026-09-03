# Better Auth: общий cookie-jar `localhost` — чужой `session_data` роняет `get-session` в 500

**Дата:** 2026-09-03 · **Версия:** better-auth 1.7.2 (поведение то же начиная с 1.6.0) ·
**Затронуто:** dev-окружение любого приложения монорепо, кроме `dashboard`

## Симптом

`GET /api/auth/get-session` отдаёт 500, в логе dev-сервера:

```
[Better Auth]: INTERNAL_SERVER_ERROR Error: Invalid Base64 character: .
GET /api/auth/get-session 500 in 1650ms
```

Тело ответа — `{"message":"Failed to get session","code":"FAILED_TO_GET_SESSION"}`. Дальше
страницы за auth-гейтом редиректят на `/sign-in`, а следующие вызовы `get-session` могут
отдавать 200 — из-за чего это дважды приняли за «протухший cookie в конкретном профиле
браузера» и «гонку при старте dev-сервера». Ни то, ни другое.

## Причина

**Cookie в браузере не различаются по порту.** Порт не входит в идентификатор cookie
(RFC 6265: `(domain, path, name)`), поэтому все dev-серверы монорепо на `http://localhost:<port>`
делят один cookie-jar. Имена cookie у Better Auth по умолчанию одинаковые во всех приложениях —
`better-auth.session_token`, `better-auth.session_data`.

`apps/dashboard/src/lib/auth.ts` — **единственное** приложение с
`session.cookieCache.strategy: 'jwt'` (`maxAge: 7 дней`). В этом режиме `better-auth.session_data`
содержит JWT, то есть значение с точками. Все остальные приложения используют дефолтную
compact-схему: base64url от JSON, точек нет.

Дальше — асимметрия внутри самого better-auth:

| ветка     | код                                                               | поведение на «чужом» значении |
| --------- | ----------------------------------------------------------------- | ----------------------------- |
| `jwt`     | `crypto/jwt.mjs:9-13` — `try { jwtVerify } catch { return null }` | тихо игнорирует               |
| `compact` | `cookies/index.mjs:155` — `base64Url.decode(value)` без try/catch | **бросает**                   |

`base64Url.decode` кидает `Invalid Base64 character: .` на первой же точке
(`@better-auth/utils/dist/base64.mjs:34`), исключение вылетает из хендлера `get-session` и
превращается в 500. То есть dashboard, читая чужой compact-cookie, просто его не принимает,
а любое другое приложение на чужом JWT падает.

## Условие срабатывания — важно для диагностики

Нужны **оба** cookie одновременно. `api/routes/session.mjs:39` делает
`if (!sessionCookieToken) return null` **до** разбора `session_data`:

| cookie                                              | ответ                      |
| --------------------------------------------------- | -------------------------- |
| нет cookie вообще                                   | `200 null`                 |
| валидные `session_token` + `session_data`           | `200`                      |
| валидный `session_token` + `session_data` с точкой  | **`500`**                  |
| `session_data` с точкой, но **без** `session_token` | `200 null`                 |
| `session_data` = мусор base64 **без точки**         | `200` (мягкий фолбэк в БД) |

⚠️ Отсюда следует, что **«упало в чистом контексте Playwright без единого cookie» невозможно**.
Если такое наблюдается — запрос пришёл не из чистого контекста: лог dev-сервера не различает
клиентов, и параллельно открытая вкладка встроенного браузера/другой профиль пишет в тот же лог.
Не тратить время на версию «баг воспроизводится без cookie», её отсекает первая же строка
хендлера.

## Ложный след, который уже проверяли дважды

«Better Auth 1.7 сменила формат `cookieCache`, в браузере лежит cookie старого формата» — **нет**.
Сверено с исходниками 1.6.0 / 1.6.5 / 1.6.11 / 1.6.16 / 1.6.23 / 1.6.29 / 1.7.2 (`setCookieCache`
в `dist/cookies/index.mjs`): compact-формат `base64Url.encode(JSON.stringify({session, expiresAt,
signature}))` идентичен начиная с 1.6.0, `session_data` никогда не подписывался через
`setSignedCookie` (то есть формата `значение.подпись` у него не было). Плюс `maxAge` этого cookie
по умолчанию 300 секунд — «протухнуть с прошлой версии» ему физически негде.

## Прод не затронут

Cookie у Better Auth host-only: атрибут `Domain` не выставляется, пока не включён
`advanced.crossSubDomainCookies` — в монорепо он не включён нигде (`grep` по `apps/` и `libs/`
на 2026-09-03 — ноль совпадений). Приложения на проде живут на разных хостах
(`studio.letar.best`, `dash.letar.best`, …), поэтому cookie между ними не ходят.

⚠️ **Отсутствие ошибки в GlitchTip само по себе ничего не доказывает**: better-auth ловит
исключение внутри себя и отдаёт JSON-500, до Sentry-хендлера Next.js оно не доходит.
Доказательство — раздельные домены, а не пустой список issues.

**Что вернёт риск на прод:** включение `advanced.crossSubDomainCookies` с доменом `letar.best`
(SSO-сценарии) — тогда все приложения снова окажутся в одном cookie-jar, уже на проде.
Прежде чем это включать, у всех приложений должны быть либо разные `cookiePrefix`, либо
одинаковая `cookieCache.strategy`.

## Фикс

Приложению — собственный `advanced.cookiePrefix`. Образец —
`apps/studio/src/lib/auth-cookies.ts` (`AUTH_COOKIE_PREFIX = 'studio'`), константа
переиспользуется в трёх местах, иначе они молча разъезжаются:

1. `betterAuth({ advanced: { cookiePrefix } })` — сами cookie приложения;
2. `createDevSessionRoute({ cookieName })` — фабрика подписывает cookie вручную и по умолчанию
   берёт `better-auth.session_token`; расхождение молчаливое (cookie ставится, `getSession()`
   её не находит, страницы редиректят на `/sign-in`);
3. `SESSION_COOKIE_SUFFIX` в `global-setup.ts` соответствующего `*-e2e` проекта.

Сторож от расхождения — `apps/studio/src/lib/auth-cookies.spec.ts`: сверяет константу с тем,
что реально вычисляет `getCookies()` из `better-auth/cookies`, и проверяет грепом по исходникам,
что `auth.ts` и dev-session роут берут имя из константы, а не хардкодят.

⚠️ Смена префикса **разлогинивает всех** — меняется имя `session_token`. Разово, но на проде
это заметно, планировать вместе с деплоем.

**Решение (2026-09-03, `dashboard` 1.26.4):** остальные ~14 приложений закрыты не раскаткой
своего `cookiePrefix` каждому, а удалением источника точек — `strategy: 'jwt'` убран из
`apps/dashboard/src/lib/auth.ts` (единственное место, где он был). Обоснование: риск чисто
dev-окружения (прод не затронут), а `cookiePrefix` на 14 приложений разово разлогинивает
пользователей на проде при каждой выкатке — несоразмерная цена ради dev-only бага. Ловушка
остаётся латентной: следующий, кто добавит `jwt`/`jwe`-стратегию в любом приложении, вернёт её —
против этого в `apps/dashboard/src/lib/auth.ts` оставлен явный комментарий со ссылкой на этот
файл. Перетирание общего `session_token` между приложениями (два разных пользователя одного
имени cookie на разных портах) само по себе не 500-т и не в скоуре этого фикса — тот же общий
cookie-jar, но другое следствие (не крэш, а путаница «какая сессия активна»), уже описанное
поведением RFC 6265 для localhost, а не специфичным для `dashboard`.

Комментарий — не единственная страховка: `scripts/check-cookie-cache-strategy.mjs` (gate в
`bun scripts/check-all.mjs`) грепает все `apps/*/src/lib/auth.ts` на `strategy: 'jwt'/'jwe'` и
падает, если у такого приложения нет своего `advanced.cookiePrefix`.

## Смежное

- [better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md)
- [better-auth-oauth-provider-schema-drift](/.claude/docs/better-auth-oauth-provider-schema-drift.md)
- [runtime-invariant-missing-from-select](/.claude/docs/runtime-invariant-missing-from-select.md)
- [verification-pitfalls](/.claude/docs/verification-pitfalls.md) — почему «второй вызов вернул
  200» здесь не признак починки
