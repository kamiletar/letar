# Паттерн: код из письма + уведомление других вкладок (Better Auth `emailOTP`)

Общий серверный слой — `@letar/auth/server` (`libs/auth/src/server/verification-stream/`,
`libs/auth/src/server/email-code.ts`), клиентский — `@letar/pin-auth/client`
(`use-email-code-verification.ts`, `email-code-panel.tsx`). Заведён при планировании общего
письма «ссылка + код» для auth-hub и приватного приложения-пилота (2026-09-14), полный план и
принятые решения R1–R6 — `apps/auth-hub/PLAN_EMAIL_CODE.md`.

## Почему не встроенный `sendVerificationOnSignUp` плагина `emailOTP`

Флаг `overrideDefaultEmailVerification` плагина **не работает**, если приложение уже задаёт свой
`emailVerification.sendVerificationEmail` (как в фабрике `createAuth` этого монорепо):
`runPluginInit` в better-auth склеивает опции как `defu(options, опции_плагина)`
(`better-auth/dist/context/helpers.mjs`) — опции **приложения** побеждают опции плагина, а не
наоборот. Поэтому код создаётся не через встроенный механизм плагина, а вручную —
`createEmailVerificationCode(auth.api, email)` внутри `sendVerificationEmail` приложения, письмо
с одной ссылкой и одним кодом собирается там же.

## Ключевые решения

- Код хранит и проверяет плагин Better Auth `emailOTP` — не своё хранилище попыток
  (`storeOTP: 'hashed'`, встроенный счётчик `allowedAttempts`, выдача сессии сама после
  `verifyEmail`/`resetPassword`).
- Другие вкладки/устройства узнают о подтверждении через SSE с опросом `User.emailVerified`
  раз в несколько секунд (`createVerificationStreamRoute`) — не через шину событий; масштаб
  не требовал Redis pub/sub на момент внедрения.
- Ключ SSE-подписки — подписанная httpOnly-cookie (`verificationStreamCookie()`), не email/токен
  в URL. HMAC-ключ производный от `secret` приложения, не сам `secret` — утечка токена потока
  не даёт прямого ключа для подделки других значений, подписанных тем же секретом.
- SSE-роут отвечает `401` без валидной cookie, но **не `404` для неизвестного email** — иначе
  роут превращается в оракул «есть ли такой аккаунт» (перебор адресов).
- Клиентский хук закрывает поток **до** вызова собственной проверки кода — иначе успешная
  проверка в этой же вкладке прилетает как «подтверждено в другой», потому что стрим и прямой
  вызов проверяют одну и ту же запись `User`.

## Куда встраивать в приложении

1. `plugins: [emailOTP(createEmailCodeOptions({ sendVerificationEmail, sendPasswordResetEmail })), verificationStreamCookie(), ...]`
   — оба плагина **до** `nextCookies()` (иначе Set-Cookie не доедет из server action).
2. `emailVerification.sendVerificationEmail` приложения создаёт код через
   `createEmailVerificationCode(auth.api, email)` и передаёт `pin` в шаблон письма — само письмо
   не меняет форму: ссылка и код всегда идут вместе.
3. Отдельный Route Handler на `/api/auth/verification-stream`, приложение само ставит
   `export const dynamic = 'force-dynamic'` (фабрика этого не делает).
4. UI — `useEmailCodeVerification` + `EmailCodePanel` из `@letar/pin-auth/client`; поле кода
   рендерит приложение своим инстансом `createForm` через `renderCodeForm` — либа не знает про
   формы конкретного приложения.

## Ловушка при переносе на новое приложение

`disabledPaths` плагина (`EMAIL_CODE_DISABLED_PATHS`) закрывает вход по коду и смену email по
коду 404-ом — если приложению всё же нужен один из этих путей, `createEmailCodeOptions`
придётся не переиспользовать как есть, а собрать опции самостоятельно по образцу.
