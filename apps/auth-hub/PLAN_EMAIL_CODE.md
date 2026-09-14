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

### A.2. Регистрация → код ✅ (2026-09-15)

- [x] `register-form.tsx` переведён на `AuthHubForm` (поля name/email/password/acceptPrivacy по
      существующей `RegisterSchema`; галочка согласия с политикой сохранена — 152-ФЗ).
      `data-field-name` у полей появился сам — починка e2e-локаторов `/sign-up` — задача A.6.
- [x] `register.action.ts`: ошибка разбирается по `body.code` (`USER_ALREADY_EXISTS`,
      `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, `PASSWORD_TOO_SHORT`/`PASSWORD_TOO_LONG`), как в
      `login.action.ts`, не по `message.includes`. Доставка cookie потока из server action —
      проверка `read_network_requests` перенесена в ручную проверку A.7 (нужен живой dev-сервер).
- [x] Вместо «Проверьте почту» — клиентский компонент
      `(auth)/sign-up/_components/verify-email-code.tsx`: `useEmailCodeVerification` с
      `verify`/`resend` через `authClient.emailOtp.verifyEmail`/`authClient.sendVerificationEmail`
      (повторная отправка — через `/send-verification-email`, не `/email-otp/send-verification-otp`,
      см. план); `onVerified` → `window.location.href = callbackUrl` (полная навигация, не
      `router.push`); `renderCodeForm` — `AuthHubForm` со схемой `createPinSchema({ length: 6 })` +
      `AuthHubForm.Field.Auto name="pin" onComplete={onComplete}`; `elsewhere` — компонент A.3.
- [x] Ссылки `/sign-in` ↔ `/sign-up` сохраняют query-строку (`sign-in/page.tsx`,
      `sign-up/page.tsx` — обе стали `async` с `searchParams`, вычисляют `signUpHref`/`signInHref`).

### A.3. «Подтверждено в другой вкладке» — честный текст ✅ (2026-09-15)

- [x] Компонент `verified-elsewhere.tsx`: при монтировании
      `authClient.getSession({ query: { disableCookieCache: true } })`.
      - Сессия есть и `emailVerified` → «Продолжить» (`window.location.href = callbackUrl`).
      - Сессии нет → «Войти» на `/sign-in?email=...&callbackUrl=...` (ссылка открыта на другом
      устройстве — cookie здесь нет, «вы вошли» было бы неправдой).

### A.4. Сброс пароля кодом ✅ (2026-09-15)

- [x] Страница `(auth)/forgot-password/page.tsx` (server, `metadata`) + `_components/forgot-password-flow.tsx`:
      шаг 1 — email (`AuthHubForm`) → `authClient.emailOtp.requestPasswordReset({ email })`; всегда
      переходить на шаг 2 с текстом «Если такой адрес зарегистрирован, мы отправили код» (не
      выдавать наличие аккаунта); шаг 2 — код + новый пароль + повтор пароля
      (`strongPasswordSchema` из `register.schema.ts`) → `authClient.emailOtp.resetPassword({ email, otp, password })`
      → экран «Пароль изменён» + кнопка «Войти» (`/sign-in` с исходной query).
      Отдельный шаг проверки кода (`checkVerificationOtp`) не делать: он тратит попытку, а
      `resetPassword` всё равно проверяет код заново.
      «Отправить код повторно» с отсчётом 60 с — `useResendCountdown`.
- [x] Ссылка «Забыли пароль?» в `login-form.tsx` (с сохранением query).
- [x] ⚠️ **Вход по привязанному email (Этап 8.5).** Реализовано через server actions
      `forgot-password.action.ts` (`requestPasswordReset`/`resetPasswordWithCode`) — оба шага
      резолвят адрес через `resolveLoginEmail` ДО вызова Better Auth (`auth.api.requestPasswordResetEmailOTP`/
      `auth.api.resetPasswordEmailOTP`, структурный каст `EmailOTPServerApi` — тот же
      type-erasure factory-баг, что и в A.1/`auth-email.ts`, не факт отсутствия метода).
      Основной email клиенту не передаётся — резолв происходит на сервере на обоих шагах.
- [ ] OAuth-пользователь без пароля после сброса получит credential-аккаунт (поведение плагина,
      см. факты выше) — это желаемо, но проверить руками, что после этого вход и через OAuth, и
      паролем работают, а привязанные аккаунты на `/profile/connected-accounts` не пропали.
      **Не проверено вручную в этой сессии** — перенесено в A.7.

### A.5. Rate limit фабрики ✅ (2026-09-15)

- [x] `customRules` фабрики (`libs/auth/src/server/create-auth/index.ts` ~111–115) содержит
      только `/send-verification-email` (+ overrides конкретного приложения) — `/email-otp/*`
      там не упомянут вообще, поэтому получает **дефолтный** лимит самого плагина `emailOTP`
      (`window: 60, max: 3`, задокументирован в §«Факты из исходников» этого плана) без
      перекрытия общими правилами фабрики. Конфликта нет — это два разных namespace путей.
- [x] `/api/auth/verification-stream/route.ts` — обычный Next.js Route Handler (`export const
      GET`), не зарегистрирован под catch-all `/api/auth/[...all]` Better Auth — по построению
      не проходит через `rateLimit`-middleware Better Auth (тот навешан только на её собственный
      handler). Отдельного лимитера ему тоже не нужно: эндпоинт не мутирует состояние и не
      раскрывает существование аккаунта (см. A.1 — `isEmailVerified` не даёт 404 неизвестному
      email).

### A.6. Тесты ✅ (2026-09-15)

- [x] vitest: `register.action.spec.ts` (успех/фолбэк имени/все коды ошибок) и
      `forgot-password.action.spec.ts` (резолв привязанного email на обоих шагах, всегда
      `{success:true}` на шаге 1 даже при throw, все коды ошибок шага 2 через `it.each`,
      фолбэк на неизвестный код) — 21/21 тестов зелёные (`nx test auth-hub`).
- [x] e2e `apps/auth-hub-e2e` (`nx e2e auth-hub-e2e -- --project=chromium`):
      - починены локаторы `/sign-up` на `[data-field-name="..."]` (`01-public.spec.ts`);
      - `05-sign-up-code.spec.ts` — **два независимых сценария на разных аккаунтах**, не один
      флоу: (1) регистрация → код → неверный `000000` → «Неверный код»; (2) регистрация → код →
      прямая пометка `emailVerified=true` в БД (симуляция перехода по ссылке в другой вкладке,
      БЕЗ попытки ввода кода в этой) → SSE (`/api/auth/verification-stream`) сам показывает
      «Email подтверждён». Разделение на два теста обязательно — баг найден при написании:
      `useEmailCodeVerification.submitCode` закрывает SSE-стрим перед КАЖДЫМ submit (успешным
      или нет) и осознанно не переоткрывает при ошибке — попытка неверного кода в одном флоу с
      проверкой SSE навсегда глушит стрим для этой вкладки (см. комментарий в шапке спека и в
      `libs/pin-auth/src/client/use-email-code-verification.ts`). Успешный ввод настоящего кода
      e2e не покрывает (код хранится хешем — прочитать нельзя, и так и должно быть); он в ручной
      проверке A.7.
      - `06-forgot-password.spec.ts` — шаг 1 → шаг 2 виден и для несуществующего email (без
      утечки наличия аккаунта, нейтральный текст); ссылка «Забыли пароль?» на `/sign-in` ведёт
      на `/forgot-password`.
      - ⚠️ Оба новых спека нуждались в `page.waitForLoadState('load')` сразу после первого
      `goto` на свою страницу в процессе Playwright: dev-сервер компилирует роут "на лету"
      (`Compiling...`), гидратация не успевала до клика по сабмиту — клик уходил нативным
      `POST /sign-up`/`/forgot-password` вместо React-обработчика, и страница перезагружалась
      пустой (полностью воспроизведено через `--trace=on`: в HAR виден дублирующийся
      `main-app.js`/`webpack.js` с разными `?v=` и голый `POST` без `next-action`-заголовка).
      `networkidle` здесь не годится — запрещён ESLint-правилом `playwright/no-networkidle`.
      - `input[data-field-name="acceptPrivacy"]` (чекбокс регистрации) не матчился: у
      `Checkbox` (`libs/forms/.../base/uikit-chakra.tsx`) `data-field-name` висит на
      `Checkbox.Root` (это `<label>`), не на скрытом нативном `Checkbox.HiddenInput` — локатор
      без `input` + `.click()` вместо `.check()`.

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

- [x] `CHANGELOG.md`, версия в `package.json` (0.7.21 → 0.7.22 patch — новая функция + фиксы,
      без breaking changes). `PLAN.md` не трогался отдельно — весь трекинг A.2-A.8 в этом файле.
- [x] `nx run-many -t format --projects=auth-hub,auth-hub-e2e` → `nx lint auth-hub` (+
      `auth-hub-e2e`, после фикса `playwright/no-networkidle`) → `nx typecheck:tsgo auth-hub` (+
      `nx typecheck auth-hub-e2e`) → `nx test auth-hub` (21/21) → `nx build auth-hub` — все
      зелёные.
- [x] Коммит своими файлами (`GIT_ALLOW_MULTI_SCOPE_COMMIT=1` — `apps/auth-hub` + `apps/auth-hub-e2e`,
      один логический батч A.4/A.6). **Push НЕ выполнен — ждёт явного одобрения владельца**
      (сессия шла автономно по инструкции «делай всё до конца», но push/деплой это правило не
      снимает, см. `.claude/rules/git.md`). Деплой — только deploy-request в `deploy-agent-dev`
      после push; сначала staging + e2e, затем прод.
- [ ] A.7 (ручная проверка) — выполнена частично в предыдущих итерациях сессии (регистрация,
      экран кода, SSE-безлик, неверный код, автосабмит после фикса `Field.PinInput`). Не
      выполнено: успешный ввод настоящего кода из реального письма, OIDC-флоу регистрации,
      сброс пароля с реальным кодом (основной/привязанный/OAuth-only email), 5 неверных попыток →
      lockout, истёкший код, SSO-регресс на двух клиентских приложениях, magic-link/passkey
      регресс. Требует реальной почты dev/staging — не покрывается автономно без владельца.

## Открытые вопросы к владельцу (не блокируют Фазу 0)

- **driving-school в этот план не входит.** Дыры из исходного разбора там уже закрыты
  (2026-09-14, сверено по рабочему дереву submodule): поток по `streamToken` вместо email, в
  событии только `verified`, рабочий счётчик попыток (`_adapters/pin-attempts.ts`), сброс через
  `createPinValidator`, имя cookie сессии с учётом `__Secure-`. ⚠️ На момент сверки эти правки
  **не закоммичены** — это чужая работа, не трогать. Перевод driving-school на общие куски Фазы 0
  (`emailOTP` вместо своего хранилища кодов, общий SSE-роут) — отдельная задача и только по
  решению владельца: у driving-school рабочий механизм, выгода — меньше своего кода, а не
  безопасность.
