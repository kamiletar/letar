# VK ID миграция и ловушки `linkSocial()` в Better Auth

Разбор цепочки из четырёх наслоённых багов при подключении привязки VK-аккаунта в auth-hub
(2026-08-27/28, [[better-auth-1.7-account-issuer-field]], [[better-auth-1.7-oidc-provider-removed]]).
Каждый следующий баг проявлялся только после починки предыдущего — типичная картина, когда
диагностируешь один и тот же клик несколько раз подряд и каждый раз получаешь новую ошибку.

## Симптом (исходный)

Клик «ВКонтакте» на странице привязанных аккаунтов (`/profile/connected-accounts`) даёт 404.

## Причина 1 — неверный роут привязки (не VK-специфично)

`ConnectedAccountsList` (`libs/auth/src/client/connected-accounts/`) строил несуществующий в
Better Auth роут `/api/auth/signin/{provider}` — это конвенция NextAuth, не Better Auth.

**Фикс:** `authClient.linkSocial({ provider, callbackURL })`. Компонент получил новый обязательный
проп `linkSocial`.

## Причина 2 — VK принудительно мигрировал на VK ID (OAuth 2.1)

После фикса роута VK возвращал `"Code challenge method is unsupported"`, затем (после временного
`pkce: false`) — `"Security Error"` независимо от настроек PKCE.

⚠️ **VK принудительно перевёл Standalone-приложения на сервис VK ID** (`id.vk.ru`/`id.vk.com` —
проверено эмпирически: идентичный ответ на тестовый запрос, один и тот же бэкенд). Старый
Standalone OAuth (`oauth.vk.com`/`oauth.vk.ru`, VK API 5.131) для уже мигрировавших приложений
безусловно отвечает `Security Error`, сколько ни крути PKCE/`device_id` вручную.

**Фикс:** переезд на нативный `socialProviders.vk` Better Auth 1.7 (полностью убрать VK из
`genericOAuth`). Обязательный PKCE + `device_id` Better Auth уже прокидывает насквозь сам
(`callback.mjs` → `validateAuthorizationCode`) — дополнительный код не нужен.

⚠️ Не путать с более ранней находкой ([[better-auth-1.7-oidc-provider-removed]]-соседний
инцидент): better-auth 1.7 зарезервировал ключ `vk` в `socialProviders` под собственный
OAuth 2.1/PKCE тип (`VkOption`/`VkProfile`), несовместимый со старым кастомным VK-провайдером
(clientSecret + ручной `users.get`). До этой сессии VK держали в `genericOAuth` именно поэтому —
правильный путь был обратный: не уходить от `socialProviders.vk`, а перейти на него, потому что
он уже реализует новый VK ID флоу.

## Причина 3 — `linkSocial()` молча не срабатывает при несовпадении email

⚠️ **Самая незаметная часть цепочки.** После фикса 2 VK OAuth проходил успешно (редирект, код,
токен — всё штатно), но кнопка на `/profile/connected-accounts` оставалась «Подключить». Ни одной
ошибки в консоли, ни одного 4xx/5xx в сети.

**Причина:** `better-auth/dist/api/routes/callback.mjs` — explicit-линковка через `linkSocial()`
(в отличие от обычного `signIn.social()`) требует совпадения email провайдера с email текущей
сессии, если не включён `account.accountLinking.allowDifferentEmails`. VK либо не выдаёт email
вовсе, либо выдаёт email самого VK-профиля — почти никогда не совпадает с email аккаунта
приложения.

**Фикс:** `allowDifferentEmails: true` в конфиге `account.accountLinking`.

```ts
account: {
  accountLinking: {
    enabled: true,
    allowDifferentEmails: true, // без этого linkSocial() тихо не привязывает VK/провайдеров без email
  },
}
```

⚠️ **Общая фабрика `libs/auth`'s `createAuth()` в режиме `standalone` до этой сессии вообще не
прокидывала `account.accountLinking` наружу** — приложение не могло включить
`allowDifferentEmails`, даже зная про баг. Добавлен общий тип `AccountLinkingConfig` с полем
`allowDifferentEmails`, проброшен в `StandaloneAuthProfile` (используется driving-school и
другими standalone-приложениями). Если где-то ещё всплывёт «привязка провайдера без email молча
не срабатывает» — сначала проверить, что `allowDifferentEmails` прокинут через конфиг конкретного
приложения, а не только добавлен в библиотеку.

## Причина 4 (не баг кода — данные) — `account_already_linked_to_different_user`

После всех трёх фиксов проявился пятый эффект: `linkSocial()` корректно отверг привязку с ошибкой
`account_already_linked_to_different_user`, потому что реальный VK-аккаунт уже был привязан к
другому (дублирующему) `User` в БД — созданному при более раннем тестировании легаси VK OAuth
(до фикса причины 2).

**Это не баг — это правильное поведение Better Auth**, защищающее от угона чужого OAuth-аккаунта.
Диагностика и решение:

1. Найти конфликтующую строку `Account` по `providerId='vk'` + `accountId` через прямой SQL.
2. Проверить, что это действительно orphan-дубль (одна `Account`-запись, устаревшая `Session`,
   без другого значимого профиля) — не живой аккаунт другого реального пользователя.
3. Если дубль подтверждён: перевесить `Account.userId` на настоящего пользователя, удалить
   дубль-`User` и его сессию.

⚠️ Если у другого пользователя всплывёт та же ошибка — это тот же класс проблемы (старый
тестовый/дубль-аккаунт с тем же VK ID от периода до миграции на `socialProviders.vk`), а не новый
баг. Решение то же — найти и разрешить конфликтующую строку `Account`, с пользователем, если
неясно, какой из двух аккаунтов сохранить.

## Вывод для будущих сессий

`linkSocial()`, в отличие от `signIn.social()`, — тихий: неудачная привязка (email mismatch,
already-linked-to-different-user) не обязательно выглядит как ошибка на клиенте, если UI не
явно проверяет результат. Если кнопка «Подключить» не переключается в «Подключено» после
успешного OAuth-редиректа без видимой ошибки — сначала проверить именно эти два случая
(`allowDifferentEmails`, дубль-аккаунт в БД), а не искать баг в самом OAuth-флоу заново.
