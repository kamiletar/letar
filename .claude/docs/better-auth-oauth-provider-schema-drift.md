# `@better-auth/oauth-provider` (1.7+): миграция плагина ≠ миграция схемы БД

## Симптом (по слоям, каждый вскрывался только после фикса предыдущего)

Прод-инцидент 2026-08-26, auth-hub (Ключница) — SSO сломан для **всех** приложений сразу
(тред agent-mail `655`, 7 раундов деплоя за один день):

1. `Model oauthClient does not exist` на каждом `/oauth2/authorize`.
2. `client registered for client_secret_basic cannot use client_secret_post` на обмене code→token.
3. `invalid client_secret` — секреты в БД хранились plaintext, плагин сравнивает хеш.
4. `Model jwks does not exist` → 500 на **любом** запросе, включая `/api/auth/get-session`
   (не только OIDC-путь — сессии всех приложений).
5. `"session no longer exists"` на обмене code→token — не баг кода, а последствие тестирования
   во время самого инцидента: браузерная сессия была создана ДО фикса
   `session.storeSessionInDatabase: true`, а обмен код→токен ищет сессию в Postgres напрямую.
6. `"missing oauth query"` при клике «Продолжить как» на consent-экране.
7. `POST /api/auth/oauth2/consent` → **500 с пустым телом ответа** — сохранялось даже после
   фикса №6.

Слои 1–4 и 6 — уже известные точечные находки (см. соседние доки
[[better-auth-1.7-oidc-provider-removed]], [[better-auth-1.7-account-issuer-field]]). Этот файл —
про корневую причину слоёв 6–7, которая на самом деле объясняет и общий паттерн для 1–4: миграция
`a8efcc72` (старый ядровой `oidcProvider()` → отдельный пакет `@better-auth/oauth-provider`)
обновила **код**, но не привела схему БД к полям, которые плагин реально использует. Каждый фикс
чинил один симптом и открывал следующий, потому что схему правили реактивно, по одному полю за
раз, вместо сверки целиком с `schema.ts` самого плагина.

## Ключевое отличие от привычной модели ZenStack-схем

Обычно наш `schema.zmodel` — источник истины, а библиотека (Better Auth core) адаптируется под
модель через `modelName`. `@better-auth/oauth-provider` работает иначе: у него **своя** полная
схема (`node_modules/@better-auth/oauth-provider/dist/authorize-*.mjs`, раздел
`//#region src/schema.ts`, константа `schema`), и только один маппинг настраивается через опцию
плагина:

```typescript
oauthProviderPlugin({
  schema: {
    oauthClient: { modelName: 'oauthApplication' }, // единственный сконфигурированный маппинг
  },
})
```

`oauthConsent` и `oauthAccessToken` плагин ищет **по буквальному имени модели**, без всякого
маппинга — значит их поля в `schema.zmodel` обязаны совпадать с тем, что плагин реально
читает/пишет, один в один. У нас совпадения не было — обе модели остались от старого
`oidcProvider()` (плоский `scopes: String?`, единая запись `accessToken`+`refreshToken` в одной
таблице, обязательный `consentGiven`, которого плагин никогда не заполняет).

## Как узнать реальные поля плагина

Не гадать и не патчить по одному полю за раз (это и дало 7 раундов) — прочитать схему плагина
целиком:

```bash
grep -n "const schema = {" -A 400 node_modules/@better-auth/oauth-provider/dist/authorize-*.mjs
```

Раздел `//#region src/schema.ts` содержит полные field-map для `oauthClient`, `oauthResource`,
`oauthClientResource`, `oauthRefreshToken`, `oauthAccessToken`, `oauthConsent`. У каждого поля —
`type` (`string`/`string[]`/`date`/`json`/`boolean`), `required`, и опционально `references`
(модель+поле FK) — этого достаточно, чтобы написать `schema.zmodel`-модель без догадок.

Также полезно читать сам endpoint-код (`consentEndpoint`, `tokenEndpoint` и т.п. в том же
файле) — он показывает, из какого места приходят данные. Например `consentEndpoint`
(`src/consent.ts`) читает подписанную query **не из URL самого POST-запроса**, а из
серверного `oAuthState`, которое заполняется `before`-хуком плагина, матчащимся на
`ctx.body?.oauth_query` — то есть клиент обязан явно передать это поле в теле запроса.
Старый API (`consent_code` в body) не существует в 1.7.1 вовсе.

## Конкретные расхождения, найденные и исправленные 2026-08-26

| Модель              | Было (старый `oidcProvider`)                                                | Нужно (`oauth-provider` 1.7.1)                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OauthConsent`      | `scopes String?`, обязательный `consentGiven Boolean` (плагин его не пишет) | `scopes String[]` (required), `referenceId`/`resources`/`requestedUserInfoClaims` (опц.), без `consentGiven`                                                                               |
| `OauthAccessToken`  | `accessToken`/`refreshToken` в одной таблице, `accessTokenExpiresAt`        | `token`/`expiresAt`, плюс `sessionId`/`referenceId`/`authorizationCodeId`/`resources`/`requestedUserInfoClaims`/`refreshId`/`revoked`/`confirmation`; refresh-токен — **отдельная модель** |
| `OauthRefreshToken` | отсутствовала вовсе                                                         | нужна, если сконфигурирован `offline_access` scope (дефолт в `oauthProviderPlugin`)                                                                                                        |

`consent-экран` (клиентский компонент) отдельно нужно было чинить на несовпадение API:
POST-тело — `{accept, scope?, claims?, oauth_query}` (не `{consent_code, client_id, scope}`),
ответ — `{redirect: true, url}` (не `{redirectURI}`).

## Практический вывод

При любом мажорном апгрейде `@better-auth/*`-плагина, который меняет модель хранения
(а не только API) — **сверять схему целиком** по исходникам плагина ДО первого прод-деплоя,
а не патчить по одному 500-му за раз. Один такой прогон занял бы час вместо семи раундов
деплоя за день. Если у плагина есть собственный `schema.ts`/аналог — он и есть источник истины
для `schema.zmodel`, а не старая схема, оставшаяся от предыдущей библиотеки.

## Живая проверка (2026-08-26)

Полная цепочка `authorize → consent → token → userinfo` проверена дважды:
локально (dev-сервер auth-hub, throwaway OIDC-клиент, `access_token`/`refresh_token`/`id_token`
выпущены корректно) и на проде (owner вошёл в `studio-stage.s3.letar.best` через Ключницу
впервые с момента миграции `a8efcc72`).
