# План: код из письма + уведомление других вкладок (auth-hub и общий слой)

> Составлено 2026-09-14 (auth-hub-dev, Opus 5) по чтению кода и исходников `better-auth@1.7.4`.
> Исполнитель — другой агент (Sonnet 5). План самодостаточный: исходный разбор паттерна
> driving-school лежал в `.claude/artifacts/auth-cross-tab-and-pin-otp-pattern.md` (gitignored,
> может исчезнуть) — всё нужное из него перенесено сюда.
>
> Второй потребитель — приватное приложение; его план лежит в его собственном submodule
> (`PLAN_EMAIL_CODE.md` рядом с его `PLAN.md`). **Фаза 0 общая — делается один раз, до обоих
> приложений.** Рекомендуемый порядок: Фаза 0 → приватное приложение (пилот, меньше рисков) →
> Фаза A (auth-hub). Ключница — SSO для всех клиентских приложений, её ломать последней.

## Что получит пользователь

1. После регистрации приходит **одно письмо**: ссылка **и** 6-значный код.
2. Вкладка регистрации сразу показывает поле кода. Код отправляется сам на шестой цифре → вход.
3. Если человек нажал ссылку в другой вкладке или на телефоне — вкладка с полем кода **сама**
   переключается на «Email подтверждён».
4. «Отправить код повторно» — через 60 секунд, с обратным отсчётом.
5. Забыли пароль → код на почту → ввод кода и нового пароля на одном экране.

## Принятые решения (не пересматривать без владельца)

| #  | Решение                                                                                            | Почему                                                                                                                                                                                                                                                   |
| -- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 | Код хранит и проверяет **плагин Better Auth `emailOTP`**, а не `@letar/pin-auth/server`            | Встроенный счётчик попыток, сравнение, выдача сессии самим Better Auth — в приложении не нужно своё хранилище попыток и своя сборка cookie сессии, как в driving-school                                                                                  |
| R2 | Код создаётся **внутри нашего** `sendVerificationEmail` через `auth.api.createVerificationOTP`     | ⚠️ Флаг `overrideDefaultEmailVerification` **не сработает**: `runPluginInit` склеивает опции как `defu(options, опции_плагина)` (`better-auth/dist/context/helpers.mjs`), опции приложения важнее. Оба приложения уже задают свой `sendVerificationEmail` |
| R3 | Сброс пароля — **только код**, без ссылки                                                          | Ссылка сброса и код живут в разных механизмах; склеить их в одно письмо можно только повторив внутренности Better Auth. Без ссылки не нужно и «открыто в другой вкладке» для сброса                                                                      |
| R4 | Другие вкладки узнают о подтверждении через **SSE с опросом `User.emailVerified` раз в 2 с**       | Работает и между устройствами. Шина событий (Redis pub/sub, `LISTEN/NOTIFY`) — только если понадобится масштаб; клиент тогда не меняется                                                                                                                 |
| R5 | Ключ SSE — **подписанная httpOnly-cookie**, в URL ничего нет, в событии только `{"verified":true}` | Email в URL позволял подписаться на чужой адрес (исходная версия driving-school; там уже переведено на `streamToken`). Cookie не требует хранить токен потока в БД                                                                                       |
| R6 | Хук и экраны — в `@letar/pin-auth/client`; серверные куски SSE — в `@letar/auth/server`            | Shared-first. Серверные куски зависят от better-auth, клиентские — нет                                                                                                                                                                                   |

### Параметры `emailOTP` (одинаковые в обоих приложениях)

```ts
emailOTP({
  otpLength: 6,
  expiresIn: 600, // 10 минут (дефолт плагина — 300)
  allowedAttempts: 5, // дефолт 3
  storeOTP: 'hashed', // код в БД не хранится открытым текстом
  disableSignUp: true, // вход по коду не создаёт пользователей
  sendVerificationOnSignUp: false, // письмо при регистрации шлёт emailVerification (R2)
  // overrideDefaultEmailVerification НЕ ставить — см. R2
  sendVerificationOTP: async ({ email, otp, type }) => {/* см. Фаза 0.4 */},
})
```

Плюс на верхнем уровне конфига:

```ts
disabledPaths: ['/sign-in/email-otp', '/email-otp/request-email-change', '/email-otp/change-email'],
emailAndPassword: { ..., revokeSessionsOnPasswordReset: true },
```

`disabledPaths` отдаёт 404 до обработчика (`better-auth/dist/api/index.mjs:166`). Вход по коду
не нужен ни одному из приложений: в auth-hub его заменяет magic link, во втором приложении это
был бы новый, никем не заказанный способ входа.

### Факты из исходников, на которые опирается план

- Идентификатор записи — `${type}-otp-${email}` (`email-otp/utils.mjs`), попытки — суффикс
  `:N` в `value`, не отдельная колонка. Новых моделей и миграций **не нужно**.
- `createVerificationOTP` — server-only эндпоинт, **не удаляет** старый код, просто создаёт
  запись. Это нормально: `findVerificationValue` берёт **самую свежую** запись
  (`sortBy createdAt desc, limit 1`, `db/internal-adapter.mjs`), так что после повторной отправки
  старый код перестаёт работать.
- `POST /email-otp/verify-email` при `emailVerification.autoSignInAfterVerification: true`
  **сам создаёт сессию и ставит cookie** (`email-otp/routes.mjs` ~285–352). Своя сборка cookie
  не нужна.
- `POST /email-otp/reset-password`: если у пользователя нет credential-аккаунта (вошёл только
  через OAuth), плагин **создаёт** его с новым паролем (`routes.mjs` ~589–601). Для неизвестного
  email `request-password-reset` отвечает `success: true` и ничего не шлёт — перебор email не
  выдаёт.
- Коды ошибок плагина: `OTP_EXPIRED`, `INVALID_OTP`, `TOO_MANY_ATTEMPTS`
  (`email-otp/error-codes.mjs`).
- В auth-hub `verification: { storeInDatabase: true }` задан фабрикой
  (`libs/auth/src/server/create-auth/index.ts` ~267) — записи кода лежат и в Redis, и в Postgres.
  Для SSE это неважно: опрашивается `User`, а не `Verification`.
- Встроенный rate limit плагина — `window: 60, max: 3` на пути `/email-otp/*`. Под перебор:
  5 попыток на код × не больше 3 отправок в минуту. Отдельный Redis-лимитер не нужен.

---

## Фаза 0 — общий слой (libs)

Перед правками `libs/*` — file reservation через Agent Mail (`libs/email/**`, `libs/auth/**`,
`libs/pin-auth/**`). `libs/auth` и `libs/email` используют ~десяток приложений: изменения только
**добавляющие**, существующие сигнатуры не ломать.

### 0.1. `@letar/email` — срок кода в письме и код без ссылки в письме сброса

✅ **Закрыто целиком 2026-09-14** — двумя сессиями подряд: сначала параметризация срока кода
(см. `libs/pin-auth/CHANGELOG.md` 0.4.0 и `libs/email/CHANGELOG.md` 0.6.0), затем
`resetUrl`-необязательность и `throw`-инвариант (`libs/email/CHANGELOG.md` 0.7.0).

- [x] `libs/email/src/types.ts`: в `VerificationEmailParams` добавлено `pinExpiresInMinutes?: number`;
      в `PasswordResetEmailParams` добавлено `expiresInMinutes?: number` (имя как в шаблоне, не
      `pinExpiresInMinutes` — используется и для ссылки, и для PIN одновременно, как и раньше) и
      `pinExpiresInMinutes?: number`; `resetUrl` сделан опциональным.
- [x] `libs/email/src/templates/verification.ts`: `createPinBlock(pin, 10, ...)` был зашит
      литералом — теперь `pinExpiresInMinutes = 10` (тот же дефолт).
- [x] `libs/email/src/templates/password-reset.ts`: кнопка/ссылка рендерятся только при наличии
      `resetUrl`; без него — код + предупреждение «Никому не передавайте этот код» вместо
      предупреждения про ссылку. `pinExpiresInMinutes` независим от `expiresInMinutes` ссылки.
- [x] `libs/email/src/service.ts`: `sendVerificationEmail`/`sendPasswordResetEmail` бросают
      `Error`, если нет ни `verificationUrl`/`resetUrl`, ни `pin`.
- [x] Тесты — `libs/email/src/templates/pin-expiry.spec.ts` (не рядом с шаблонами по одному, один
      файл на оба): срок кода попадает и в HTML, и в text для обоих писем, дефолт и кастомное
      значение; code-only режим `password-reset` (без `resetUrl`) и обычный (без `pin`) покрыты.
      `libs/email/src/service.spec.ts` (новый): оба throw-инварианта.
- [x] `nx test email` · `nx lint email` · `nx typecheck:tsgo email` — зелёные. Потребители
      (`driving-school`, `auth-hub`) typecheck проходят; `mandala`/`aboi` падают на
      предсуществующих несвязанных багах (`tsgo-excessive-stack-depth-zenstack`, устаревший
      typegen Chakra `Badge`/`Button` `variant`) — подтверждено грепом по выводу typecheck на
      отсутствие упоминаний `auth.ts`/`resetUrl`/`sendPasswordResetEmail`/`sendVerificationEmail`.

### 0.2. `@letar/auth/server` — подписанный ключ потока ✅ (2026-09-15)

Новый каталог `libs/auth/src/server/verification-stream/`.

- [x] `stream-token.ts` — `createVerificationStreamToken`/`readVerificationStreamToken`, формат и
      HMAC-производный ключ как в спеке; `timingSafeEqual`, любая ошибка разбора → `null`.
- [x] `stream-token.spec.ts` — круговой тест, истёкший/граничный токен, подменённый email,
      другой секрет, мусорные строки, lowercase email. 10/10 зелёных.

### 0.3. `@letar/auth/server` — плагин, ставящий cookie, и фабрика SSE-роута ✅ (2026-09-15)

- [x] `plugin.ts` — `verificationStreamCookie(options?: { cookieName?: string; ttlSec?: number })`,
      Better Auth плагин с `id: 'letar-verification-stream'` и одним `hooks.after`:
      - `matcher`: `ctx.path === '/sign-up/email' || ctx.path === '/send-verification-email'`;
      - email: для `/sign-up/email` — `user.email` из ответа эндпоинта (`getEndpointResponse`, как
      в самом `emailOTP`), для `/send-verification-email` — `ctx.body.email`, при отсутствии —
      email текущей сессии;
      - `ctx.setCookie(cookieName, createVerificationStreamToken({ email, secret: ctx.context.secret, ttlSec }), { httpOnly: true, sameSite: 'lax', path: '/api/auth/verification-stream', maxAge: ttlSec, secure: ctx.context.baseURL.startsWith('https') })`.
      - Имя cookie по умолчанию — `letar.verification_stream`. Экспортировать константу
      `VERIFICATION_STREAM_COOKIE`.
      - ⚠️ Плагин должен стоять в `plugins` **до** `nextCookies()`, иначе cookie не доедет из
      server action (`nextCookies` форвардит Set-Cookie только плагинов выше себя).
      ⚠️ Реализация: `getEndpointResponse` из better-auth не публичный (нет в `exports` пакета)
      — заменён локальной мини-репликой (`resolveVerificationStreamEmail`/
      `getSignUpEmailResponse` в `plugin.ts`) через публичные `isAPIError`/`createAuthMiddleware`
      из `better-auth/api`.
- [x] `route.ts` — фабрика обработчика Next.js:
      `ts
      export function createVerificationStreamRoute(options: {
        secret: string | (() => string)
        isEmailVerified: (email: string) => Promise<boolean>
        cookieName?: string
        pollMs?: number       // 2000
        heartbeatMs?: number  // 15000
        timeoutMs?: number    // 300000
      }): { GET: (request: Request) => Promise<Response> }`
      Поведение:
      - cookie читать из заголовка `cookie` запроса (без `next/headers` — чтобы тестировалось
      без request scope); нет/невалидна → `401` без тела;
      - `isEmailVerified` уже `true` → один `data: {"verified":true}\n\n` и закрыть;
      - иначе `ReadableStream`: сразу `: connected\n\n`; heartbeat `: heartbeat\n\n`; опрос; при
      `true` — событие и `close()`; таймаут — `event: timeout\ndata: {}\n\n` и `close()`;
      - **нет пользователя с таким email → НЕ 404**, поток просто ждёт таймаута (иначе роут —
      оракул «есть ли аккаунт»);
      - одна `cleanup()` с флагом, вызывается из `cancel()`, из `request.signal` `abort`, после
      события и таймаута; `enqueue` после `close` не вызывать (флаг);
      - ошибка `isEmailVerified` — залогировать `console.error` и продолжить опрос (не рвать поток);
      - заголовки как в уже работающем SSE монорепо: `Content-Type: text/event-stream; charset=utf-8`,
      `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
      - `export const dynamic = 'force-dynamic'` ставит **приложение** в своём `route.ts` (фабрика
      этого сделать не может).
- [x] `route.spec.ts` (vitest, `node`, fake timers): 401 без cookie; невалидный токен → 401;
      сразу verified; verified на третьем опросе → событие и закрытие; heartbeat уходит; таймаут;
      `abort` останавливает опрос (счётчик вызовов `isEmailVerified` не растёт); неизвестный email
      не даёт 404. 8/8 зелёных.
- [x] `plugin.spec.ts`: образца `memoryAdapter`/`getTestInstance` в `libs/auth` не нашлось —
      применён запасной вариант из плана: `matcher` и `resolveVerificationStreamEmail`
      (email-экстракция) вынесены в отдельные экспортируемые функции и протестированы напрямую,
      без поднятия `betterAuth()`. 9/9 зелёных.
- [x] Экспорт из `libs/auth/src/server/index.ts`: `createVerificationStreamToken`,
      `readVerificationStreamToken`, `verificationStreamCookie`, `createVerificationStreamRoute`,
      `VERIFICATION_STREAM_COOKIE`.

### 0.4. `@letar/auth/server` — сборка опций `emailOTP` и отправка письма ✅ (2026-09-15)

Чтобы два приложения не разошлись в параметрах R1 и логике писем.

- [x] `libs/auth/src/server/email-code.ts`:
      ```ts
      export const EMAIL_CODE_DEFAULTS = { otpLength: 6, expiresInSec: 600, allowedAttempts: 5 } as const
      export const EMAIL_CODE_DISABLED_PATHS = ['/sign-in/email-otp', '/email-otp/request-email-change', '/email-otp/change-email'] as const

      /** Готовые опции emailOTP. sendVerificationOTP шлёт письмо сам через переданные функции. */
      export function createEmailCodeOptions(deps: {
        sendVerificationEmail: (p: { to: string; pin: string; pinExpiresInMinutes: number }) => Promise<unknown>
        sendPasswordResetEmail: (p: { to: string; pin: string; pinExpiresInMinutes: number }) => Promise<unknown>
      }): EmailOTPOptions
      ```
      `sendVerificationOTP({ email, otp, type })`: `email-verification` → письмо верификации только
      с кодом (сюда попадёт только прямой вызов `/email-otp/send-verification-otp`, UI его не
      использует); `forget-password` → письмо сброса с кодом; остальные типы → `throw` (их пути
      закрыты `disabledPaths`, сюда попасть не должны).
- [x] Хелпер для R2 — вызывается из `emailVerification.sendVerificationEmail` приложения:
      `ts
      export async function createEmailVerificationCode(
        api: { createVerificationOTP: (a: { body: { email: string; type: 'email-verification' } }) => Promise<string> },
        email: string,
      ): Promise<string>`
      Структурный тип `api`, а не `typeof auth` — иначе циклическая зависимость типов в `lib/auth.ts`.
- [x] `email-code.spec.ts`: маршрутизация по `type`, срок в минутах = `expiresInSec / 60`, throw
      на неожиданном `type` (sign-in/change-email должны быть закрыты `disabledPaths`). 4/4 зелёных.

### 0.5. `@letar/pin-auth/client` — хук и экраны ✅ (2026-09-15)

Сейчас `usePinVerification`/`useVerificationStream` не импортирует ни одно приложение (проверено
грепом 2026-09-14: `@letar/pin-auth/client` использует только `libs/auth` ради
`useResendCountdown`). API можно менять, **`useResendCountdown` не трогать**.

- [x] `use-verification-stream.ts`: режим cookie — если не переданы ни `streamToken`, ни
      `email`, URL = `streamUrl` без хвоста. Добавить `enabled?: boolean`. Возвращать
      `{ verifiedInOtherTab, close }`. Событие `timeout` — не ошибка (просто перестать слушать).
      `reconnect: 'none'` оставить: код можно ввести и без потока.
- [x] Новый хук `use-email-code-verification.ts` (старый `usePinVerification` оставить, пометить
      `@deprecated` в JSDoc — удалить отдельной задачей):
      `ts
      useEmailCodeVerification(config: {
        codeLength?: number             // 6
        resendCooldownSeconds?: number  // 60
        streamUrl?: string              // '/api/auth/verification-stream'
        streamEnabled?: boolean         // true
        verify: (code: string) => Promise<{ ok: true } | { ok: false; code?: string; message?: string }>
        resend: () => Promise<{ ok: true } | { ok: false; code?: string; message?: string }>
        onVerified: () => void | Promise<void>
        onVerifiedInOtherTab?: () => void
      })
      // → { status: 'idle'|'verifying'|'verified'|'verifiedElsewhere', error, isVerifying, isResending,
      //     canResend, resendSecondsLeft, formKey, submitCode, resendCode, clearError }`
      Правила:
      - **перед** вызовом `verify` закрыть поток (`close()`), иначе своя же успешная проверка
      прилетит как «в другой вкладке»; при ошибке проверки поток **не** переоткрывается (не
      критично — остаётся ручной ввод и ссылка);
      - `NEXT_REDIRECT` (по `message` и по `digest`) пробрасывать, не глотать;
      - повторный вызов `submitCode`, пока идёт проверка, игнорировать (автосабмит + кнопка);
      - после успешного `resend` — сбросить отсчёт и `formKey + 1`;
      - перевод ошибок: `INVALID_OTP` → «Неверный код», `OTP_EXPIRED` → «Код истёк — отправьте
      новый», `TOO_MANY_ATTEMPTS` → «Слишком много попыток — отправьте новый код»,
      `429`/`TOO_MANY_REQUESTS` → «Слишком часто. Подождите минуту»; остальное →
      «Не удалось проверить код. Попробуйте ещё раз».
- [x] `email-code-panel.tsx` (Chakra — peer уже есть в `package.json` либы):
      `ts
      EmailCodePanel(props: {
        email: string
        state: ReturnType<typeof useEmailCodeVerification>
        renderCodeForm: (p: { formKey: number; disabled: boolean; onComplete: (code: string) => void }) => ReactNode
        elsewhere: ReactNode        // что показать при verifiedElsewhere — приложение решает (см. ниже)
        texts?: Partial<{ title: string; hint: string; resend: string; resendIn: (s: number) => string; verified: string }>
      })`
      Поле кода рендерит **приложение** своим инстансом `createForm` (`renderCodeForm`) — либа не
      знает про инстансы форм приложений. Экраны по приоритету: `verifiedElsewhere` → `elsewhere`;
      `verified` → «Подтверждено» + спиннер; иначе форма + ошибка (`role="alert"`) + «Отправить
      повторно» / «Отправить повторно через N с» + подпись «Или перейдите по ссылке в письме».
      Никакого полноэкранного оверлея `zIndex 9999`, как в driving-school, — обычная замена
      содержимого карточки.
- [x] Схема поля: `createPinSchema` из `@letar/pin-auth/schemas` уже умеет `fieldType: 'pinInput'`,
      `fieldProps: { count: 6, otp: true }` — переиспользовать, не заводить новую (переиспользуется
      приложениями через `renderCodeForm`, сама `EmailCodePanel` схему не задаёт).
- [x] Тесты (`jsdom`, `@testing-library/react`, мок `EventSource` глобально): закрытие потока до
      `verify`; `verifiedElsewhere` по событию; ошибка → перевод; `resend` сбрасывает отсчёт и
      увеличивает `formKey`; двойной `submitCode` не зовёт `verify` дважды; `NEXT_REDIRECT`
      пробрасывается. 6/6 зелёных.
- [x] Экспорт из `libs/pin-auth/src/client/index.ts`.

### 0.6. Проверка фазы 0 ✅ (2026-09-15)

- [x] `nx run-many -t format --projects=auth,pin-auth` (0.1/`email` форматировался отдельно раньше)
- [x] `nx run-many -t lint,typecheck --projects=auth,pin-auth` — зелёные (у `libs/auth`/`libs/pin-auth`
      нет отдельного таргета `typecheck:tsgo`, только `typecheck` через `tsc --build`).
- [x] Потребители не сломаны: `nx run-many -t typecheck:tsgo --projects=driving-school,mandala,auth-hub` —
      `driving-school`/`auth-hub` зелёные; `mandala` падает на предсуществующем несвязанном баге
      (`tsgo-excessive-stack-depth-zenstack`, TS2321 на `db.order.findMany`/`db.product.findMany`,
      не касается этого изменения). Приватное приложение-пилот — по решению его собственной сессии.
- [x] Новый публичный экспорт `libs/auth` → broadcast в Agent Mail отправлен (`api-change:
      @letar/auth/server — код из письма + SSE-поток`, thread `email-code-phase0`).
- [x] Коммиты по одному на либу, только своими файлами.
- [x] Док [email-code-verification-pattern.md](/.claude/docs/email-code-verification-pattern.md)
      + строка в индексе корневого `CLAUDE.md`.

---

## Фаза A — auth-hub

⚠️ Ключница — вход во все клиентские приложения. Каждое изменение проверять не только на самой
Ключнице (см. A.7).

Текущее состояние (2026-09-14):

- `src/lib/auth.ts` — `createAuth({ mode: 'hub-provider', ... })`; `emailAndPassword` и
  `emailVerification` собирает **фабрика** в `libs/auth/src/server/create-auth/index.ts`
  (~193–223) из колбэков `email: { sendVerificationEmail, reportEmailFailure }`.
  `requireEmailVerification` включён только при `NODE_ENV === 'production'`.
- `sendPasswordResetEmail` в `email` **не передан** → сброса пароля в auth-hub нет вообще; страниц
  `forgot-password`/`reset-password` тоже нет.
- `(auth)/sign-up/_components/register-form.tsx` — нативный `<form>` + `FormData` + ручной
  `safeParse`, в обход `@letar/forms` (нарушение `.claude/rules/forms.md`). После успеха —
  «Проверьте почту». Экшн `_actions/register.action.ts` вызывает `auth.api.signUpEmail`, ошибки
  разбирает по тексту сообщения.
- Инстанс форм `AuthHubForm` (`src/auth-hub-form/`) есть, `login-form.tsx` уже на нём — образец.
- OIDC-продолжение после входа — `(auth)/_hooks/use-post-sign-in-callback.ts`. Со страницы
  `/sign-in` ссылки на `/sign-up` с OIDC-параметрами нет.

### A.1. Серверная конфигурация ✅ (2026-09-15)

- [x] `createAuth` (hub-provider) не пропускал верхнеуровневые `disabledPaths` и
      `emailAndPassword.revokeSessionsOnPasswordReset` — добавлены как необязательные поля
      `HubProviderAuthProfile` (`libs/auth/src/server/create-auth/{types,index}.ts`), тесты в
      `create-auth.spec.ts` (4 новых кейса), либа `@letar/auth` 0.15.1 → 0.15.2.
- [x] `email.sendPasswordResetEmail` в фабрику НЕ прокинут (R3: сброс только кодом, через
      `emailOTP`, не через `emailAndPassword.sendResetPassword`).
- [x] `src/lib/auth.ts`: `plugins` дополнен `emailOTP(createEmailCodeOptions({...}))` и
      `verificationStreamCookie()` — оба выше `nextCookies()` (её ставит фабрика последней).
      `disabledPaths: [...EMAIL_CODE_DISABLED_PATHS]`, `revokeSessionsOnPasswordReset: true`.
      Колбэк `email.sendVerificationEmail` вынесен в `src/lib/auth-email.ts`
      (`sendVerificationEmailWithCode`) с `const { auth } = await import('./auth')` — сразу
      после выноса всплыла НЕ TS7022 (как ожидал план), а другая причина той же циклической
      природы: `createAuth({ mode: 'hub-provider' })` возвращает тип, приведённый кастом к
      standalone-сигнатуре (`as unknown as ReturnType<typeof buildStandaloneAuth<TProfile>>` —
      `oauthProvider` непортабелен для `.d.ts`, см. комментарий в фабрике), и внутри
      `buildStandaloneAuth` поле `plugins` типизировано как generic-массив
      (`NonNullable<BetterAuthOptions['plugins']>`), не сохраняющий литеральные типы
      конкретных плагинов — `auth.api.createVerificationOTP` (добавлен нашим `emailOTP`)
      структурно не виден в выведенном типе `auth.api`, хотя в рантайме метод есть. Фикс —
      структурное приведение в точке вызова (`auth.api as unknown as
      Parameters<typeof createEmailVerificationCode>[0]`), не правка фабрики: это ограничение
      типизации `plugins` во всей фабрике, а не баг конкретно этого плагина, чинить его —
      отдельная задача вне Фазы A. Ошибка создания кода не роняет письмо со ссылкой —
      `try/catch` → `reportEmailFailure` → письмо без `pin`.
- [x] `src/app/api/auth/verification-stream/route.ts` — фабрика `createVerificationStreamRoute`,
      сырой `prisma` из `@/lib/db`, секрет — `process.env.BETTER_AUTH_SECRET` (совпадает с тем,
      что использует `createAuth` в `auth.ts`). Статический сегмент `api/auth/verification-stream`
      стандартно приоритетнее catch-all `api/auth/[...all]` в Next.js App Router — общее свойство
      роутинга, отдельно не перепроверялось curl'ом.
- [x] `src/lib/auth-client.ts`: добавлен `emailOTPClient()` рядом с `magicLinkClient()`.
- [x] `nx typecheck:tsgo auth-hub` / `nx lint auth-hub` — зелёные.

### A.2. Регистрация → код

- [ ] `register-form.tsx` перевести на `AuthHubForm` (поля name/email/password/acceptPrivacy по
      существующей `RegisterSchema`; галочку согласия с политикой **сохранить** — это 152-ФЗ).
      `data-field-name` у полей появится сам — e2e-локаторы `input[name="email"]` на `/sign-up`
      сломаются, чинить в A.6.
- [ ] `register.action.ts`: разбирать ошибку по `body.code` (`USER_ALREADY_EXISTS`,
      `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`), как уже
      сделано в `login.action.ts`, а не по `message.includes`. ⚠️ Проверить, доезжает ли cookie
      потока из server action: вызов `auth.api.signUpEmail({ headers })` в server action + плагин
      `nextCookies` — Set-Cookie должен появиться в ответе. Проверять по `read_network_requests`,
      не на глаз.
- [ ] Вместо «Проверьте почту» — новый клиентский компонент
      `(auth)/sign-up/_components/verify-email-code.tsx`:
      - `useEmailCodeVerification({ verify: (code) => authClient.emailOtp.verifyEmail({ email, otp: code }) → {ok}/{ok:false, code: error.code}, resend: () => authClient.sendVerificationEmail({ email, callbackURL }) , onVerified })`;
      - повторная отправка идёт через **`/send-verification-email`**, а не
      `/email-otp/send-verification-otp`: только так приходит письмо со ссылкой и кодом (R2) и
      обновляется cookie потока;
      - `onVerified`: `window.location.href = callback`, где `callback` — результат
      `usePostSignInCallback()` (OIDC-продолжение, если форма открыта из OIDC-флоу, иначе `/`).
      Полная навигация, не `router.push`: сессия только что поставлена cookie;
      - `renderCodeForm`: `AuthHubForm` со схемой `createPinSchema({ length: 6 })`,
      `AuthHubForm.Field.Auto name="pin" onComplete={onComplete}`, `key={formKey}`;
      - `elsewhere` — компонент из A.3.
- [ ] Ссылка «Зарегистрироваться» на `/sign-in` (и обратно на `/sign-up`) должна **сохранять
      query-строку**, иначе регистрация из OIDC-флоу теряет возврат в клиентское приложение.
      Сейчас ссылки со `/sign-in` на `/sign-up` нет — найти, откуда пользователь попадает на
      регистрацию, и прокинуть `searchParams`.

### A.3. «Подтверждено в другой вкладке» — честный текст

- [ ] Компонент `verified-elsewhere.tsx`: при монтировании `authClient.getSession({ query: { disableCookieCache: true } })`.
      - Сессия есть и `user.emailVerified` → «Email подтверждён» + кнопка «Продолжить»
      (`window.location.href = callback`). Так бывает, если ссылку открыли в этом же браузере.
      - Сессии нет → «Email подтверждён. Войдите с паролем» + кнопка на `/sign-in?<те же query>`
      с подставленным email. Так бывает, если ссылку открыли на телефоне: cookie на этом
      компьютере нет, «вы вошли» было бы неправдой.

### A.4. Сброс пароля кодом (новая функция)

- [ ] Страница `(auth)/forgot-password/page.tsx` (server, `metadata`) + `_components/forgot-password-flow.tsx`:
      шаг 1 — email (`AuthHubForm`) → `authClient.emailOtp.requestPasswordReset({ email })`; всегда
      переходить на шаг 2 с текстом «Если такой адрес зарегистрирован, мы отправили код» (не
      выдавать наличие аккаунта); шаг 2 — код + новый пароль + повтор пароля
      (`strongPasswordSchema` из `register.schema.ts`) → `authClient.emailOtp.resetPassword({ email, otp, password })`
      → экран «Пароль изменён» + кнопка «Войти» (`/sign-in` с исходной query).
      Отдельный шаг проверки кода (`checkVerificationOtp`) не делать: он тратит попытку, а
      `resetPassword` всё равно проверяет код заново.
      «Отправить код повторно» с отсчётом 60 с — `useResendCountdown`.
- [ ] Ссылка «Забыли пароль?» в `login-form.tsx` (с сохранением query).
- [ ] ⚠️ **Вход по привязанному email (Этап 8.5).** Better Auth ищет пользователя строго по
      `User.email`. Если человек вводит привязанный (не основной) адрес, плагин молча ответит
      `success` и ничего не пошлёт. Решение: шаг 1 делать через server action, который сначала
      резолвит адрес существующим `resolveLoginEmail` (есть тест `resolve-login-email.spec.ts`)
      и вызывает `auth.api.requestPasswordResetEmailOTP` / `auth.api.forgetPasswordEmailOTP`
      (проверить точное имя в `auth.api`) с **основным** email; на шаге 2 использовать тот же
      основной email, но показывать пользователю введённый. Основной email клиенту не отдавать —
      держать в подписанном значении или повторно резолвить на сервере в экшне шага 2.
- [ ] OAuth-пользователь без пароля после сброса получит credential-аккаунт (поведение плагина,
      см. факты выше) — это желаемо, но проверить руками, что после этого вход и через OAuth, и
      паролем работают, а привязанные аккаунты на `/profile/connected-accounts` не пропали.

### A.5. Rate limit фабрики

- [ ] В `customRules` фабрики (`libs/auth/src/server/create-auth/index.ts` ~236–260) уже есть
      `/send-verification-email`. Убедиться, что правила плагина `emailOTP` для `/email-otp/*`
      не перекрываются общим дефолтом и что `/api/auth/verification-stream` **не** проходит через
      лимитер Better Auth (это Next route, не эндпоинт Better Auth — должен не проходить).

### A.6. Тесты

- [ ] vitest: `register.action` — разбор `body.code`; server action сброса — резолв привязанного
      email (мок `resolveLoginEmail` и `auth.api`).
- [ ] e2e `apps/auth-hub-e2e`:
      - починить локаторы `/sign-up` на `[data-field-name="..."]` (как в 2026-09-03, §18.7.1);
      - новый spec `05-sign-up-code.spec.ts` (только локальный dev, `test.skip(!isLocalDev)` как в
      `04-*`): регистрация через UI → видно поле кода → ввести `000000` → «Неверный код» →
      отметить `emailVerified = true` через `helpers/db.helpers.ts` → вкладка сама
      показывает «Email подтверждён». Успешный ввод настоящего кода e2e не покрывает (код
      хранится хешем — прочитать нельзя, и так и должно быть); он в ручной проверке A.7.
      - `/forgot-password`: шаг 1 → шаг 2 виден для несуществующего email (без утечки).

### A.7. Ручная проверка (Browser pane + реальная почта dev/staging)

⚠️ Перед проверкой стриминговых страниц — один `computer{screenshot}`, иначе скрытая вкладка
не раскрывает `<Suspense>` (см. PLAN.md, v0.7.13).

- [ ] Код в той же вкладке → вход → редирект.
- [ ] Регистрация из OIDC-флоу клиентского приложения → код → возврат в клиентское приложение.
- [ ] Ссылка из письма в **другой вкладке** того же браузера → первая вкладка: «Email подтверждён»
      + «Продолжить».
- [ ] Ссылка в **другом браузере** (эмуляция телефона) → первая вкладка: «Войдите с паролем».
- [ ] «Отправить повторно» доступно через 60 с; старый код после повтора — «Неверный код».
- [ ] 5 неверных кодов → «Слишком много попыток».
- [ ] Истёкший код (временно `expiresIn: 60` локально, **не коммитить**) → «Код истёк».
- [ ] Сброс пароля: основной email, привязанный email, OAuth-only аккаунт, несуществующий email.
- [ ] `read_network_requests`: у `/api/auth/verification-stream` в URL нет email, в событиях нет
      токенов; без cookie — 401.
- [ ] Вход через Ключницу в **двух** клиентских приложениях после изменений (регресс SSO).
- [ ] Magic link и passkey работают как раньше.

### A.8. Завершение

- [ ] `PLAN.md` (ссылка на этот файл + отметки), `CHANGELOG.md`, версия в `package.json` (minor).
- [ ] `nx run-many -t format --projects=auth-hub,auth-hub-e2e` → `nx lint auth-hub` →
      `nx typecheck:tsgo auth-hub` → `nx test auth-hub` → `nx build auth-hub` (новые импорты из
      `libs/*` — build обязателен, см. `.claude/rules/deploy-coordination.md` п.4).
- [ ] Коммит своими файлами. **Push — только с одобрения владельца.** Деплой — только
      deploy-request в `deploy-agent-dev`; сначала staging + e2e, затем прод.

## Открытые вопросы к владельцу (не блокируют Фазу 0)

- **driving-school в этот план не входит.** Дыры из исходного разбора там уже закрыты
  (2026-09-14, сверено по рабочему дереву submodule): поток по `streamToken` вместо email, в
  событии только `verified`, рабочий счётчик попыток (`_adapters/pin-attempts.ts`), сброс через
  `createPinValidator`, имя cookie сессии с учётом `__Secure-`. ⚠️ На момент сверки эти правки
  **не закоммичены** — это чужая работа, не трогать. Перевод driving-school на общие куски Фазы 0
  (`emailOTP` вместо своего хранилища кодов, общий SSE-роут) — отдельная задача и только по
  решению владельца: у driving-school рабочий механизм, выгода — меньше своего кода, а не
  безопасность.
