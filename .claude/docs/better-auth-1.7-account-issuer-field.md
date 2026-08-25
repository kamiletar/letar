# Better Auth 1.7: модель `Account` требует поле `issuer`

## Симптом

`POST /api/auth/sign-up/email` и `POST /api/auth/reset-password` падают 500 с ZodError
`"Unrecognized key: issuer"` при валидации ZenStack v3 ORM (`@zenstackhq/orm`) запроса к модели
`Account`. Обычный sign-in (проверка пароля существующего пользователя) работает нормально — баг
только в путях, которые СОЗДАЮТ или ОБНОВЛЯЮТ запись `Account` (регистрация через email/password,
завершение сброса пароля, вероятно и OAuth account linking).

## Причина

`node_modules/better-auth/dist/db/internal-adapter.mjs` (`findAccountOwnerByKey`,
`findAccountByKey`, создание аккаунта) и `node_modules/better-auth/dist/oauth2/account-key.mjs` —
better-auth 1.7.1 безусловно использует поле `issuer` в модели `Account` (часть их
security-хардненинга против provider impersonation, тот же релиз, что убрал
`oidcProvider`/`genericOAuthClient`, см. [[better-auth-1.7-oidc-provider-removed]]). Общий
ZenStack-фрагмент `type AccountFields` в `libs/zenstack-fragments/src/better-auth.zmodel` это
поле не объявлял вовсе — минорный апгрейд `better-auth` (`^1.6.x`→1.7 через caret) тихо расширил
обязательный набор полей модели, ни typecheck, ни lint это не ловят.

Затронуты все приложения, подключающие `type AccountFields` из общего фрагмента: `aprel8008`,
`archetest`, `dashboard`, `domwellbes` (на 2026-08-25).

## Решение

Добавлено поле в `libs/zenstack-fragments/src/better-auth.zmodel`:

```zmodel
type AccountFields {
  ...
  /// Better Auth 1.7+ — провайдер, выдавший accountId (защита от provider impersonation)
  issuer                String?
  ...
}
```

Дальше в каждом приложении: `nx zenstack:generate <app>` → `nx db:push <app>` (dev) /
`nx db:migrate <app>` (там, где ведутся миграции).

## Живая проверка (2026-08-25)

`POST /api/auth/sign-up/email` на domwellbes — было 500 `Unrecognized key: issuer`, стало 200 с
созданным пользователем. `POST /api/auth/request-password-reset` — 200 (создаёт `Verification`,
не трогает `Account`; сам код пути реюзается с sign-up, поэтому создание `Account`-записи уже
покрыто тестом sign-up).

**Не подтверждено живьём:** aprel8008 (локальная dev-БД на порту 5447 не поднята в этом
окружении — schema/generated client обновлены, `db:push` нужно прогнать при следующей работе с
приложением), archetest, dashboard (типы прошли, `db:push` выполнен успешно, но live-запрос
sign-up не прогонялся — dev-серверы не были подняты в этой сессии).
