# Better Auth 1.7: `oidc-provider`/`genericOAuthClient` вынесены в отдельные пакеты

## Симптом

Обычный `bun install`/`bun update`, не трогающий `^1.6.x` диапазон в `package.json` (caret на
1.x.x допускает апгрейд вплоть до следующего мажора), молча поднимает `better-auth` до `1.7.x`
через `bun.lock`. Dev-сервер любого приложения, использующего `@letar/auth/server` в
`hub-provider`-режиме (сейчас — только `auth-hub`/Ключница), падает на старте:

```
Module not found: Can't resolve 'better-auth/plugins/oidc-provider'
  import { oidcProvider as oidcProviderPlugin } from 'better-auth/plugins/oidc-provider'
```

Падает не только сам auth-hub — любое приложение, чей `libs/auth`-импорт транзитивно тянет
`create-auth/index.ts` (весь `[locale]/layout.tsx` через `header.tsx` → `cart.ts` → `auth.ts`),
то есть фактически все standalone- и hub-client-приложения тоже перестают собираться, хотя сами
`oidcProvider` не используют — модуль падает на самом импорте, не на вызове.

После фикса первого импорта та же категория ошибки всплывает второй раз при `typecheck`:

```
Module '"better-auth/client/plugins"' has no exported member 'genericOAuthClient'.
```

## Причина

Better Auth 1.7.0 (2026-08-18) убрала из ядра пакета `better-auth` две вещи разом:

1. **Серверный `oidcProvider()`** (акт auth-hub'а как OIDC/OAuth-провайдера) — вынесен в
   отдельный пакет **`@better-auth/oauth-provider`**, функция переименована в
   **`oauthProvider()`**. Это не косметическое переименование: новый плагин реализует полноценный
   **OAuth 2.1 provider** (обязательный PKCE без опции отключить — `requirePKCE` из старого API
   исчез как более ненужный опцией) и **требует смонтированный `jwt()`-плагин** — токены теперь
   JWT, JWKS отдаётся через эндпоинт `jwt()`, а не через сам `oauthProvider()`.
2. **Клиентский `genericOAuthClient()`** (`better-auth/client/plugins`) — убран без замены.
   Провайдеры, зарегистрированные через серверный `genericOAuth()` (Yandex, Ключница/`letar-auth`,
   Shikimori и т.п.), теперь входят через тот же `signIn.social({ provider })`, что и встроенные
   соцпровайдеры — отдельного клиентского плагина под них больше нет.

Официальная страница `/docs/plugins/oidc-provider` отдаёт 404 — не «страница переехала»,
а подтверждение, что концепт под старым именем не существует.

⚠️ Не путать `@better-auth/oauth-provider` (наш случай — auth-hub **сам** IdP/OIDC-провайдер) с
`@better-auth/sso` (плагин для приложения-**потребителя** SSO, логинящегося через внешний
IdP/SAML) — оба появились в этом же релизе, легко перепутать по названию, но решают
противоположные роли.

## Решение

Сделано в `libs/auth` (единая точка для всех приложений на этом API):

**Сервер** (`libs/auth/src/server/create-auth/index.ts`):

```typescript
import { oauthProvider as oauthProviderPlugin } from '@better-auth/oauth-provider'
import { genericOAuth, jwt } from 'better-auth/plugins'

// в hub-provider режиме:
plugins: [
  jwt(), // обязателен — JWKS/подпись id_token
  oauthProviderPlugin({
    loginPage: oidcConfig?.loginPage ?? '/sign-in',
    consentPage: oidcConfig?.consentPage ?? '/oauth/consent',
    allowDynamicClientRegistration: oidcConfig?.allowDynamicClientRegistration ?? false,
    accessTokenExpiresIn: oidcConfig?.accessTokenExpiresIn ?? 3600,
    refreshTokenExpiresIn: oidcConfig?.refreshTokenExpiresIn ?? 604800,
    scopes: oidcConfig?.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
  }),
  ...
]
```

`OidcProviderConfig.requirePKCE` удалён из публичного типа фабрики — поле перестало на что-либо
влиять (PKCE всегда обязателен в OAuth 2.1).

**Клиент** (`libs/auth/src/client/create-auth-client.ts`) — вместо
`plugins: [genericOAuthClient()]` клиент оборачивается тонким совместимым алиасом
`signIn.oauth2({ providerId, ... }) → signIn.social({ provider: providerId, ... })`, чтобы не
переписывать все вызовы `authClient.signIn.oauth2(...)` в приложениях (`createSignInWithLetarAuth`
и прямые вызовы вроде `animatrona-tracker/profile-client.tsx`):

```typescript
const client = createBetterAuthClient({ baseURL, plugins })
return {
  ...client,
  signIn: {
    ...client.signIn,
    oauth2: ({ providerId, ...rest }) => client.signIn.social({ provider: providerId, ...rest }),
  },
}
```

**Зависимость:** добавлена `"@better-auth/oauth-provider": "^1.7.1"` в корневой `package.json`
(рядом с уже существующим `better-auth`).

## Живая проверка (2026-08-25) — два реальных бага найдены и исправлены

Discovery-документ auth-hub (`/api/auth/.well-known/openid-configuration`) подтверждён живьём:
корректные OAuth 2.1 endpoints, JWT/EdDSA id_token — связка `oauthProvider()`+`jwt()` реально
поднимается и работает. Но попытка прогнать полный клик-через (login → consent → редирект с
кодом обратно в hub-client) вскрыла два самостоятельных бага, ни один не специфичен именно
переходу на 1.7 — оба существовали и раньше, просто их некому было живьём прогнать:

1. **`createAuthClientWithOAuth` терял почти весь клиент.** `libs/auth/src/client/create-auth-client.ts`
   собирал обёртку через `{...client, signIn: {...client.signIn, oauth2: ...}}`. Better Auth
   строит клиент через `Proxy` над пустой `function(){}` без `ownKeys`-трапа — spread-оператор
   копирует собственные enumerable-ключи цели, а у голого `Proxy` без `ownKeys` их ноль. Итог:
   возвращаемый объект реально содержал только явно прописанный `signIn.oauth2` — `useSession`,
   `signOut`, `signIn.social`, всё остальное было `undefined`. Ломало любой hub-client,
   вызывающий `useSession()` (все, кто рендерит статус входа в toolbar/header) —
   `TypeError: useSession is not a function` при первом же рендере. Фикс: обернуть в настоящий
   `Proxy` с `get(target, prop) { return Reflect.get(target, prop) }`, подмешивая `oauth2` только
   на уровне вложенного `signIn`-прокси.
2. **Все 9 клиентов в `apps/auth-hub/prisma/seed.ts` были заведены с несуществующим
   `redirectUrls`.** Путь `/api/auth/oauth2/callback/<providerId>` никогда не существовал —
   реальный колбэк generic-oauth-плагина (сторона hub-client, куда Ключница редиректит после
   логина) — `/api/auth/callback/<providerId>`, без сегмента `oauth2` (см.
   `getOAuthCallbackPath` в `node_modules/better-auth/dist/oauth2/utils.mjs`: `/callback/${id}`
   без `oauth2/`; сегмент `oauth2/` есть только в **провайдерских** эндпоинтах auth-hub —
   `/api/auth/oauth2/authorize`, `/api/auth/oauth2/token` и т.д., это другая сторона протокола).
   С неверным `redirectUrls` `oauthProvider()` отклонил бы `redirect_uri` каждого hub-client
   в проде (`invalid_redirect_uri`) — миграция была бы незаметно сломана до первого реального
   входа пользователя. Исправлено для всех 9 клиентов.

**Не подтверждено живьём:** полный клик-через до экрана consent и обратно — заблокировано
перегрузкой машины (параллельные сессии подняли счётчик node-процессов до 250+, dev-серверы
падали через секунды после старта). Нужно повторить на менее нагруженной машине, когда получится
удержать оба dev-сервера (auth-hub + один hub-client) живыми достаточно долго для клика.
