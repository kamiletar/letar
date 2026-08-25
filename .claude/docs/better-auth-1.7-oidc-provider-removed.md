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

## Что не проверялось живьём

Миграция закрывает **сборку/типы/юнит-тесты** (`nx typecheck`/`lint`/`test auth` — зелёные) и
живой рендер приложений-потребителей (aboi проверен: dev-сервер поднимается, страницы рендерятся
без ошибок в консоли). Реальный OIDC-флоу через `oauthProvider()` end-to-end (login → consent →
токен → discovery на клиенте) на auth-hub/Ключнице **не был прогнан живьём** в рамках этой сессии
— новая механика JWT-токенов и `jwt()`-плагина теоретически совместима с существующими
hub-client-приложениями (они читают discovery-документ и токен как обычный OIDC-клиент,
`genericOAuth()` не завязан на внутренний формат токена провайдера), но это стоит подтвердить
живым входом через Ключницу на auth-hub или одном hub-client-приложении (например `time`/
`archetest`) до следующего продакшен-деплоя auth-hub.
