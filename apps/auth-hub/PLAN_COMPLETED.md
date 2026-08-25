# Выполненные задачи

Детальное описание всех реализованных фич auth-hub.

## §18.7 M4: первый живой staging e2e — закрыт (2026-08-25)

Первый деплой auth-hub на staging и первый живой прогон e2e-сьюта (`01-public`, `02-admin`,
`03-oidc-authorize`, `04-linked-email-login`) через `deploy-agent-dev`.

Деплой прошёл штатно (коммит `82ebb75e`). E2E дал 2 неожиданных фейла — не по причине, о которой
предупреждали заранее (`requireEmailVerification`), а раньше: `04-linked-email-login.spec.ts`
бил `fetch()` из Node-процесса Playwright прямо в `/api/auth/sign-up/email` без браузерного
контекста → нет заголовка `Origin` → better-auth отвечает `403 MISSING_OR_NULL_ORIGIN`.

Корень глубже одного теста: докстринг файла с v0.6.4 заявлял «не запускается в staging-раннере»,
но проверки не было — `playwright.config.ts` держит единственный project (`chromium`) без
dev/staging split, в отличие от `driving-school-e2e`. Фикс — `test.skip(!isLocalDev, ...)` в
начале describe-блока (коммит `7a8afe62`). Повторный прогон — полностью зелёный:
`expected: 10, skipped: 2, unexpected: 0`. `auth-hub` добавлен в `E2E_GATED_APPS`
(`libs/infra-config/src/index.ts`). Детали — `PLAN-INFRA-1.md` §18.7.

## 0.7.11: формы sign-in переведены на @letar/forms (2026-08-25)

`login-form.tsx` и `magic-link-form.tsx` были написаны на нативном `<form>` + ручном
`FormData`/`useState` — прямое нарушение `.claude/rules/forms.md` («NEVER используй нативный
`<form>` + `useActionState`/ручной state вместо `@letar/forms` — даже для «простых» форм»).

Инстанс `AuthHubForm` (`src/auth-hub-form/`) уже существовал и уже использовался в
`app/profile/emails/_components/add-email-form.tsx` — этот файл послужил готовым образцом
API (`schema`/`initialValue`/`onSubmit` на корневом компоненте, `Form.Field.*`,
`Form.Button.Submit`). Проверка `form-mcp` → `list_fields` подтвердила, что `String` и
`Password` уже есть в библиотеке — делегация через `forms-coordinator-dev` не потребовалась.

**login-form.tsx:**

- `AuthHubForm.Field.String name="email"` (`autoComplete="username webauthn"` для passkey-
  дропдауна, `usePasskeyConditionalAuth` не тронут) + `AuthHubForm.Field.Password` — встроенный
  toggle видимости пароля заменил ручной `IconButton`/`showPassword`/`Group`/`InputAddon`.
- Валидация теперь целиком на существующей `LoginSchema` — ручной `FormData`+`safeParse` в
  `onSubmit` убран, форма валидирует и типизирует данные сама.
- Состояния `error`/`info`/`pendingEmail` и вызов `loginUser` — без изменений поведения.
  `ResendVerificationButton` остался как был.
- Ручной `loading`-стейт убран: `AuthHubForm.Button.Submit` сам показывает спиннер по
  `isSubmitting` формы.

**magic-link-form.tsx:**

- Новая локальная схема `MagicLinkSchema` (`z.object({ email: z.email(...) }).strip()`) —
  у формы раньше вообще не было валидации, кроме `required` на native input.
- `sendMagicLinkAction(email, callbackUrl)` вызывается из `onSubmit` формы, как раньше.
- Состояния `idle`/`sent`/`error` сохранены; `loading` убран по той же причине, что и в
  login-form (спиннер кнопки автоматический).

**Проверка:** `nx typecheck:tsgo auth-hub`/`nx lint auth-hub` — зелёные (2 typecheck-ошибки —
предсуществующие, в `src/lib/auth.ts`/`libs/auth`, VK OAuth-провайдер, не в scope правки).

Первая попытка визуальной проверки упёрлась в SSR-краш `genericOAuthClient is not a function`
(предсуществующий баг несовместимости версии `better-auth` в
`libs/auth/src/client/create-auth-client.ts`) — на тот момент там лежали чужие незакоммиченные
правки другого агента, не в scope этой сессии. Тот баг оказался закрыт (аккуратно
переписанный `signIn.oauth2` как тонкий алиас над `signIn.social()`, без `genericOAuthClient()`).

**После фикса вскрылась вторая, более глубокая проблема, не связанная ни с формами, ни с
`better-auth`:** `/sign-in` рендерится на сервере без ошибок, но весь контент страницы
(`AuthOAuthButtons`/`LoginForm`/`MagicLinkForm`) остаётся в DOM внутри `<div hidden id="S:0/1/2">`
— React 19 Suspense-плейсхолдеры для стриминга никогда не раскрываются
(`offsetParent` всех `<input>` — `null`, HMR подключён, ошибок в консоли нет). Видны только шапка
и cookie-consent баннер. **Проверено A/B-тестом:** временный откат `login-form.tsx`/
`magic-link-form.tsx` на дореформенную версию (коммит `29aaabdf`, сырой `<form>`) дал тот же
результат — баг не связан с миграцией форм на `@letar/forms` из этой сессии. `/sign-up` (тоже
под `<Suspense>`, но с одной границей вместо трёх) рендерится нормально. Root cause не найден
до конца, занесён как открытый вопрос в `PLAN.md` — вероятный подозреваемый: три параллельных
`<Suspense>` без fallback вокруг независимых client-компонентов в `sign-in/page.tsx`.

## 0.7.10: hydration mismatch убивал кнопку magic-link (2026-08-25)

Пользователь сообщил, что кнопка «Отправить ссылку для входа» на проде (`auth.letar.best/sign-in`)
не реагирует на клик. Репродукция через Browser pane на свежей вкладке подтвердила: при загрузке
страницы в консоли `Minified React error #418` (`args[]=HTML`) — hydration mismatch на корне
дерева. После этого клик по кнопке не порождал вообще никакого сетевого запроса (проверено
`read_network_requests` — пусто и до, и после клика), т.е. кнопка не «глючила визуально», а была
полностью мертва до перезагрузки страницы.

**Root cause:** `apps/auth-hub/project.json` не имел явных таргетов `build`/`dev` — Nx-инференс
`@nx/next` выбирал бандлер по умолчанию (Turbopack в Next.js 16). Уже задокументированная в
репозитории комбинация Turbopack + Emotion `Global` (Chakra UI v3) + `next-themes`-скрипт в
`ColorModeProvider` даёт настоящий hydration mismatch —
[nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md).
Аудит 2026-08-04 закрыл этот баг в `mandala`/`animatrona-tracker`/`dashboard`/`driving-school`, но
`auth-hub` в тот аудит не попал (приложение появилось позже).

GlitchTip (`glitchtip-mcp`) подтвердил: тот же мисматч бил и по `/oauth/consent` у реального
пользователя на обычном Chrome — баг не ограничивался одной страницей входа.

**Фикс:** частичный override `build`/`dev` → `next build/dev --webpack` в `project.json`, по
образцу уже исправленных приложений (только `options.command`, `cache`/`inputs`/`outputs`
остаются от инференса — проверено `nx show project auth-hub --json`).

**Побочная находка (не потребовала код-фикса):** при разборе смежной GlitchTip-issue («Failed to
find Server Action») обнаружен payload, похожий на массовое сканирование известного класса
уязвимостей десериализации Next.js Server Actions — recon-скрипт пытается прочитать
`.env`/SSH-ключи/облачные credentials через `eval()`. Next.js отбраковал запрос на этапе поиска
экшна по невалидному `$ACTION_REF_0`, до десериализации payload'а — эксплуатация не подтверждена.

**Дополнено:** обновлён общий doc-файл ([коммит 966a001c](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md))
— добавлен `auth-hub` в таблицу аудита + зафиксирован открытый вопрос: `mandala`/`studio` уже на
`--webpack`, но продолжают изредка получать тот же `args[]=HTML` в проде — возможно, отдельный,
пока не выделенный источник (браузерные расширения/боты, мутирующие `<html>` до гидратации).

`nx lint auth-hub` — зелёный. `nx typecheck:tsgo auth-hub` — 3 предсуществующие ошибки в
`src/lib/auth.ts`/`libs/auth`, не связаны с этим изменением.

Деплой не выполнен — пользователь попросил не пушить в этой сессии; deploy-request отправлен
`deploy-agent-dev` с пометкой, что коммиты локальные.

## 0.7.9: FormI18nProvider отсутствовал — подсказки валидации на английском (2026-08-25)

Тот же класс бага, что нашли и починили в `domwellbes`: `@letar/forms` переводит constraint
hints (`z.string().min/max`) на русский только внутри `FormI18nProvider` — без обёртки локаль по
умолчанию `'en'`. `src/app/layout.tsx` — корневой Server Component, `FormI18nProvider
locale="ru"` добавлен прямо туда вокруг `{children}` (auth-hub не под next-intl). Разбор класса
бага —
[.claude/docs/letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).
`nx typecheck:tsgo auth-hub` и `nx lint auth-hub` зелёные.

## 0.7.5 → 0.7.6: прод-инцидент — ложная «Неизвестная ошибка» при re-auth под другим аккаунтом (2026-08-20)

Пользователь сообщил о реальной ошибке входа на auth.letar.best для клиента studio-prod
(«Ошибка входа: Неизвестная ошибка»). Разбор по логам контейнера + Redis прод-БД:

- **Root cause:** плагин `oidc-provider` в better-auth вешает глобальный `after`-хук
  (`matcher: () => true`), срабатывающий после ЛЮБОГО эндпоинта. При `prompt=login`
  (принудительный повторный вход — сценарий «Войти под другим аккаунтом» из account chooser,
  v0.3.0) хук находит cookie `oidc_login_prompt` + только что установленную сессионную cookie
  и сам пытается довершить OIDC-flow, вызывая внутренний `authorize(ctx)`. Тот требует
  `ctx.request` (сырой `Request`), которого нет при вызове `auth.api.signInEmail()` как обычной
  функции из Server Action (`login.action.ts`) — `authorize()` бросает OAuth2-форму ошибки
  (`{error: 'invalid_request', error_description: 'request not found'}`, а не привычную
  `{code, message}`) уже ПОСЛЕ того как сессия успешно создана.
  `login.action.ts` не распознавал эту форму → падал в дефолт «Неизвестная ошибка», хотя
  пользователь фактически вошёл.
- **Подтверждение:** прочитан прод-контейнер `auth-hub-app-16` (`docker logs`) — точная сигнатура
  ошибки с меткой времени `12:00:32.370Z`. Сверено с Redis (`letar-redis`, БД secondaryStorage
  сессий better-auth): сессия `aKFpkKOMHcJrS8NDPDgpAV81lfoNgMTu` для `kami@letar.best` имеет
  `createdAt: 2026-08-20T12:00:32.175Z` — совпадает день-в-день с моментом «ошибки». Это доказало,
  что сессия реально создавалась, баг — ложноотрицательный UI-результат, не отказ входа.
- **Фикс (0.7.5):** `login.action.ts` — сигнатурная проверка `apiBody.error === 'invalid_request'
  && apiBody.error_description === 'request not found'` теперь трактуется как успех; редирект на
  `redirectTo` (для OIDC-входа это абсолютный URL на `/api/auth/oauth2/authorize`, см.
  `use-post-sign-in-callback.ts`) штатно завершает flow полноценным HTTP-переходом, где
  `ctx.request` уже присутствует.
- **Побочный инцидент деплоя (0.7.6):** первый передеплой 0.7.5 упал в crash-loop —
  `MODULE_NOT_FOUND` на `@swc/helpers` в standalone-сборке (известный класс бага трейсинга
  Next.js, `.claude/docs/nextjs-standalone-tracing.md`, уже чинили в aboi/time тем же паттерном).
  Прод не пострадал — zero-downtime rollout откатился сам, старый контейнер остался healthy.
  Фикс — сужённый глоб `../../node_modules/.bun/@swc+helpers*/node_modules/@swc/helpers/**/*` в
  `outputFileTracingIncludes` (`next.config.ts`), точная копия рабочего паттерна из `aboi`.
  Деплой-агент дополнительно вручную снёс осиротевший crash-looping контейнер `auth-hub-app-17`
  от первой неудачной попытки (rollout ожидает ровно 1 старый контейнер, нашёл 2).
- **Проверка:** `nx typecheck:tsgo auth-hub` и `nx lint auth-hub` зелёные на обоих коммитах.
  Живая проверка через account chooser в браузере не проводилась — фикс верифицирован по
  прод-логам/Redis, не через UI-тест; стоит перепроверить вживую при следующей сессии над
  account chooser.
- Коммиты: `7df17215` (0.7.5, login.action.ts), `a267bbb6` (0.7.6, next.config.ts).

## 0.7.3 → 0.7.4: убраны references на libs из tsconfig.json — хрупкий TS6305 редирект (2026-08-07)

`references` на `libs/consent`, `libs/email`, `libs/auth`, `libs/chakra-provider`,
`libs/analytics`, `libs/ui`, `libs/forms` вели на solution-конфиг библиотек — TypeScript брал
последний подпроект из их `references` (`tsconfig.spec.json`), чей output (`out-tsc/spec/`) не
собирается ни одним Nx-таргетом → `TS6305` + каскад `TS7006`. Образец фикса — `dashboard-agent`
(0.11.1, `885ceaf2`), механика — `.claude/rules/libs.md`.

Убраны все `references` на `libs/*` (оставлен `./tsconfig.spec.json`). Приложение расширяет
`tsconfig.next-app.json` (`outDir` без явного `rootDir`) — после удаления `references`
TypeScript инферил `rootDir` слишком узко и падал `TS6059`; фикс — явный override
`"rootDir": "../.."`. `nx typecheck:tsgo auth-hub` теперь полностью чист (пропали и 2
`TS7006`, бывшие следствием того же каскада `any`). `nx build auth-hub` падает на
`AUTH_ENCRYPTION_KEY обязателен в production` — это pre-existing локальная нехватка секрета
(см. `.claude/rules/env-files.md`), TypeScript-фаза самого билда прошла чисто, не связано с
этой правкой.

## Сессия 2026-07-30 (день) — сверка плана с кодом, закрытие инцидента prod-500, деплой-запрос v0.7.3

Сессия без изменений кода: аудит состояния, документация, координация.

- **Инцидент `auth-hub-prod-500` закрыт** (тред agent-mail): 29.07 ночью все better-auth роуты
  прода отдавали 500 (StormyDog), 30.07 в 04:07 UTC BlackCove передеплоил с `seed: true`
  (8 OIDC-клиентов пересозданы, redirectUrls studio 3020→3024). Проверено curl:
  discovery / get-session / `/sign-in` — 200. **`/api/auth/jwks` → 404 — штатно:** id_token
  подписывается HS256, jwt-плагин better-auth не подключён, роута физически нет (хотя
  `jwks_uri` в discovery объявлен — особенность better-auth). Во время инцидента 500 был на
  всём `/api/auth/*`. Подтверждение отправлено в тред (msg #939).
- **PLAN.md сверен с кодом** (коммит `d8204e4a`): блоки «v0.4.0 Возврат на исходный сайт»
  (реализован `71a20875` 2026-05-28 + `6dec3013`) и «v0.5.0 RP-Initiated Logout»
  (`78340e8a` 2026-05-29 + тираж на 6 hub-client приложений `97752db8` 2026-06-06) давно
  сделаны, но не были отмечены. Заголовок статуса поднят v0.6.4 → v0.7.3. Попутно
  подтверждён `end_session_endpoint` на проде: `/api/auth/oauth2/endsession`.
- **Обнаружено: v0.7.3 не попала в утренний деплой** — `a3cae99f` закоммичен 04:44 UTC,
  через 37 минут после деплоя BlackCove (04:07 UTC). Прод без фикса парсинга ошибок.
  Deploy-request отправлен (msg #940, тред `deploy-auth-hub`; lint + typecheck:tsgo зелёные,
  seed не нужен). На момент закрытия сессии — ожидает выполнения BlackCove.

Бэклог PLAN.md после сверки пуст; открытых задач по Ключнице в корневом PLAN.md тоже нет.

## Версия 0.7.3 — 2026-07-30 (парсинг ошибок по кодам, vitest, e2e linked-email)

### Хрупкий парсинг ошибок Better Auth → стабильные `body.code`

`login.action.ts` маршрутизировал «вход vs авторегистрация» матчингом текста ошибки
(`message.includes('invalid')`, `'user not found'`, `'credential account not found'` и т.п.) —
смена текста сообщений в апстриме `better-auth` молча увела бы существующих пользователей в
`trySignUp`. Изучены исходники `better-auth`/`@better-auth/core` (bun cache,
`node_modules/.bun/better-auth@1.6.23.../dist/api/routes/sign-in.mjs` и `sign-up.mjs`): все
ошибки бросаются через `APIError.from(status, BASE_ERROR_CODES.X)`, где `X.code` — стабильная
строка, не зависящая от текста. Найденные коды: `INVALID_EMAIL_OR_PASSWORD` (единый код для
«юзер не найден» И «неверный пароль» — namespace одинаковый в обоих случаях),
`EMAIL_NOT_VERIFIED`, `USER_ALREADY_EXISTS[_USE_ANOTHER_EMAIL]`, `PASSWORD_TOO_SHORT`/`_LONG`.
`login.action.ts` переведён на проверку `apiCode`/`signUpCode` вместо текста. typecheck+lint
зелёные.

### Vitest-инфраструктура + первый unit-тест

`vitest.config.ts` (environment: `node` — чистая server-логика, jsdom не нужен) +
`tsconfig.spec.json` с reference из корневого `tsconfig.json`, по образцу `archetest`
(`.claude/docs/unit-testing.md`). Target `test` добавлен в `project.json`. Первый тест —
`src/lib/resolve-login-email.spec.ts`, 4 кейса (без linked-адреса / приоритет primary над
linked / резолв подтверждённого linked-email / игнор неподтверждённого), `prisma` замокан
через `vi.mock`. `nx test auth-hub` зелёный.

### E2e: вход по linked-email (закрывает пробел Этапа 8.5)

`apps/auth-hub-e2e/src/04-linked-email-login.spec.ts` + новые `helpers/db.helpers.ts` и
`helpers/prisma-cjs-wrapper.js` (по образцу `driving-school-e2e`, адаптировано под собственный
generated-клиент auth-hub вместо shared `*-db`-либы). Primary-аккаунт создаётся через реальный
`/api/auth/sign-up/email` (пароль хешируется штатным scrypt Better Auth — подделывать вручную
хрупко), linked-email вставляется напрямую в БД (эквивалент состояния после self-service
подтверждения в `/profile/emails/`, без реальной отправки письма). Два теста: успешный вход
под primary-сессией + «Неверный пароль» без дубль-регистрации. Типизация методов Prisma —
структурным интерфейсом (`AuthHubPrismaClient`), а не импортом полного generated-клиента:
`tsc --build` из другого Nx-приложения падает на rootDir-границах (TS6059/TS6307) — этот же
класс бага уже преэкзистентно сломан в `driving-school-e2e:typecheck` (`schoolPartnership`
does not exist on generic `PrismaClient`), не повторили его здесь.

⚠️ Проверено вживую ВРУЧНУЮ (curl sign-up + браузер), а не через `nx e2e` — `global-setup.ts`
всего проекта требует `DEV_SESSION_TOKEN`/`ALLOW_DEV_SESSION` для admin-логина (используется
`02-admin.spec.ts`), которых нет в локальном `.env.local` (по правилу `env-files.md` эта пара
живёт только в `.env.staging`). Прецедент — `grandslamcup/.env.local` уже держит их локально
для этой же цели; не стал заводить их auth-hub ради этой сессии, чтобы не трогать уже
запущенный чужой dev-сервер (порт 3014 был занят процессом, стартовавшим раньше моей сессии).
Если появится необходимость гонять `nx e2e auth-hub-e2e` локально регулярно — завести
`ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN` в `.env.local` по этому прецеденту.

### Побочное: hydration-«баг» `/sign-in` из бэклога v0.6.4 — не баг

Расследование планового пункта «hydration-нестабильность `/sign-in`» (подозревался
Telegram-виджет) показало другой источник: консольное «Encountered a script tag while
rendering React component» — это `ColorModeProvider`/`next-themes`, намеренно рендерящий
блокирующий `<script>` для защиты от FOUC. Воспроизведено на `/` и `/sign-in` — предупреждение
сайт-wide на любой странице с `ColorModeProvider`, безвредно. Задокументировано в
`.claude/docs/ui-components.md`, чтобы не путать с реальным багом повторно.

## Версия 0.7.1 — 2026-07-29 (seed: localhost-redirect studio 3020 → 3024)

В `redirectUrls` OIDC-клиента `studio-prod` localhost-адреса указывали на 3020 — порт, который
студия давно освободила (его занял `form-docs`). Локальный вход в неё по OIDC падал с
`redirect_uri` mismatch. Исправлено на 3024, рядом положен комментарий, объясняющий, почему это
не косметика: локальные приложения ходят в **прод**-Ключницу, поэтому `localhost`-адрес обязан
лежать в боевой БД.

Дрейф нашёл новый guard-тест `libs/infra-config/src/app-ports.guard.spec.ts` (`nx test infra-config`),
сверяющий порт по трём источникам — `.env` приложения, `.claude/commands/<app>.md` и этот seed.
Он же поймал второе расхождение: командный файл самой Ключницы объявлял 3010 при реальном 3014.
Подробности — `PLAN-INFRA.md` §34.2.

✅ **Re-seed прода прогнан (2026-07-30, BlackCove, тред `auth-hub-prod-500`)** —
`deploy_app(auth-hub, seed:true)`, exitCode 0, лог сида подтвердил `✓ studio-prod (Studio Letar)`
среди 8 пересозданных OIDC-клиентов. redirectUrls обновлены на боевой БД, локальный вход в
studio через прод-Ключницу восстановлен. Деплой шёл с HEAD main, попутно захватил Telegram-фикс
`e5b56b7b` из параллельной сессии.

⚠️ **Побочная находка, ждёт проверки.** При подготовке деплоя выяснилось, что на s2 в окружении
Ключницы не было `OIDC_APREL8008_SECRET` (7 секретов из 8), хотя в закоммиченном
`.env.docker.enc` он есть с момента регистрации клиента. Скорее всего checkout на сервере
отставал, но если seed с этим секретом там **никогда** не отрабатывал, строки клиента
`aprel8008-prod` в боевой `oauthApplication` может не быть вовсе — то есть вход в админку
aprel8008 через SSO сломан. Проверить после прогона (запрошено у BlackCove тем же тредом).

## Версия 0.7.0 — 2026-07-28 (152-ФЗ: страница /privacy)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Общий
компонент `CookieBanner` (`@letar/ui`) уже был подключён в layout с дефолтным `privacyUrl="/privacy"`,
но самой страницы не было — клик «Подробнее в политике ПДн» вёл на 404. Добавлена минимальная страница
`/privacy` (кто оператор, какие данные, сроки, права субъекта, cookie/аналитика). Полная сводка по
всем затронутым приложениям — в root `PLAN.md` §7 Этап 0.8.

## Версия 0.6.5 — 2026-07-16 (аудит логин-форм монорепо)

Кросс-приложенческий фикс находки v0.6.4 (см. ниже, «Бэклог» PLAN.md): логин-формы без
`method="post"` до гидрации React сабмитятся нативным GET — пароль попадает в URL/history/
Referer/access-логи. Пофикшено `sign-in`/`sign-up`/`change-password` (3 файла). Аудит расширил
скоуп за пределы auth-hub — та же проблема оказалась и в самой библиотеке `@letar/forms` (оба
корневых `<form>`-компонента, `FormSimple`/`FormWithApi`), а не только в raw-формах точечных
приложений — фикс библиотеки закрывает риск для всех текущих и будущих потребителей (включая
driving-school). Всего исправлено 15 мест по монорепо: libs/forms ×2, auth-hub ×3, aboi ×3,
dsperevod ×3, svoichuzhie ×4. Typecheck/lint зелёные, никаких breaking changes (чисто аддитивный
HTML-атрибут).

## Версия 0.6.4 — 2026-07-16 (Этап 8.5: вход по любому linked-email)

### Ключевое архитектурное решение: без перехвата core-резолва Better Auth

Задача изначально была сформулирована как «перехват резолва sign-in в Better Auth» с риском
для core auth-flow ~10 downstream-приложений. Spike показал, что перехват не нужен:
email+password и magic-link входы в Ключнице идут ТОЛЬКО через её собственные server actions
(`loginUser`, `sendMagicLinkAction`) — downstream-приложения попадают на них через
OIDC-редирект на hub UI, прямых вызовов `/api/auth/sign-in/email` мимо UI нет. Резолв
сделан на уровне actions, core Better Auth не тронут.

### `resolveLoginEmail()` — `src/lib/resolve-login-email.ts`

- Вход: любой email (нормализуется lowercase+trim). Выход: `{ email, resolved }`.
- Если email — чей-то **основной** `User.email` → возвращается как есть (`resolved: false`).
  Primary-совпадение всегда приоритетнее linked-записи: иначе устаревшая `UserEmail`-запись
  могла бы «затенить» вход в другой аккаунт.
- Если email — **подтверждённый** `UserEmail` → возвращается основной адрес владельца
  (`resolved: true`). Неподтверждённые привязки игнорируются: иначе злоумышленник мог бы
  привязать чужой адрес без подтверждения и перехватывать попытки входа по нему.
- Использует raw `prisma` (не enhanced) — `UserEmail` под `@@deny('all', true)`.

### Закрытые попутно баги (оба существовали с v0.6.2)

1. **Дубль-аккаунт при входе по linked-email:** уникальность `UserEmail.email` не пересекается
   с `User.email` → ввод linked-адреса + пароля давал «user not found», `loginUser` уходил в
   auto-sign-up и молча создавал ВТОРОЙ аккаунт с linked-адресом как основным. Magic link с
   `disableSignUp: false` — та же дыра. Фикс: резолв до Better Auth + guard в `loginUser`
   (`resolved=true` при invalid credentials → «Неверный пароль», без trySignUp).
2. **Гонка в `verifyAddedEmail`:** токен подтверждения живёт 24ч; за это время адрес мог стать
   чьим-то основным через обычную регистрацию — подтверждение привязки создало бы конфликт с
   резолвом входа. Фикс: перепроверка `User.email` на момент подтверждения; при конфликте
   привязка удаляется с ошибкой «уже используется».

### Известные ограничения (задокументированы в коде)

- Magic-link письмо при вводе linked-адреса уходит на ОСНОВНОЙ адрес владельца (callback
  плагина получает уже отрезолвленный email; оба адреса принадлежат одному пользователю).
- Passkey/OAuth-входы не затронуты — identity там не по введённому email.

### Проверка

- Живой E2E через UI: ввод linked-адреса + пароля → сессия primary-аккаунта (подтверждено
  `get-session` и серверным логом вызова `loginUser`).
- Скрипт-матрица резолва на dev-БД: verified/unverified/primary/unknown/UPPERCASE — все кейсы
  корректны; дубль-аккаунт не создаётся.
- Побочная находка при проверке (НЕ фиксилось, кандидат в отдельную задачу): до hydration
  React-формы `/sign-in` сабмитятся нативным GET — email+пароль попадают в URL (логи,
  history). На медленных клиентах это реальная утечка; лечится `method="post"` fallback'ом
  или `action`-атрибутом на формах логина.

### Деплой

- Прод s2: BlackCove, msg #488, коммит `b7b8635`, zero-downtime, rollback-тег
  `auth-hub:b7b863568`. Попутно применилась миграция `add_user_email_multi_email` — v0.6.2 до
  этого на проде не была, весь Этап 8.5 уехал одной пачкой.
- Staging s3 передеплоен на `6935f11` (msg #490), e2e через `run_e2e` — 10/10 зелёных,
  `lastStatus` warn-gate'а обновлён на актуальный коммит.

## Версия 0.6.3 — 2026-07-16 (Этап 8.5: merge двух аккаунтов)

### Скрипт: `infra/migrations/auth-hub-merge-accounts.ts`

Продолжение §8.5 — self-service флоу нескольких email (v0.6.2) не покрывает случай, когда
человек уже завёл два разных `User` (например, один раз через email/password, другой раз через
Google OAuth с другим email). Реализован параметризованный ручной скрипт-инструмент (не UI, не
server action) по прецеденту `infra/migrations/kami-owner-migration.ts`, но общего назначения:

- **Параметры (env):** `CANONICAL_EMAIL` (остаётся), `DUPLICATE_EMAIL` (будет удалён),
  `DRY_RUN` — **инверсия дефолта** относительно owner-миграций: без явного `DRY_RUN=0` ничего
  не применяется. Merge необратим и затрагивает потенциально живые сессии, цена ошибки выше,
  чем у owner-скриптов с предсказуемыми пустыми дублями.
- **Клиент БД:** собственный `ZenStackClient` внутри скрипта (импорт схемы через относительный
  путь), НЕ `apps/auth-hub/src/lib/db.ts` — `getEnhancedPrisma` заблокировал бы почти все
  операции (`@@deny('all', true)` на нужных моделях), а `rawOrm`/`prisma` используют алиас
  `@/generated/schema`, ненадёжно резолвящийся при запуске `bun run` вне tsconfig приложения.
- **Перенос relations** (внутри одной `$transaction`): `Account` — по одной записи из-за
  составного `@@unique([providerId, accountId])` (совпадение только `providerId` — не
  конфликт, разные внешние аккаунты одного провайдера сосуществуют; полное совпадение
  `providerId+accountId` физически невозможно на уровне БД, обработано как defensive dead-code);
  `Passkey`/`OauthApplication`/`OauthAccessToken`/`TelegramToken`/`ConsentLog` — простой перенос
  `userId`; `OauthConsent` — при смысловом дубле (оба давали consent одному клиенту) запись
  duplicate удаляется; `ProjectProfile` (`@@unique([userId, projectSlug])`) — при конфликте
  roles объединяются (union), metadata canonical имеет приоритет (потеря metadata duplicate —
  warning в лог); `UserEmail` — простой перенос, email глобально уникален.
- **Email самого duplicate** сохраняется как доп. подтверждённый `UserEmail` у canonical, по
  прецеденту `setPrimaryEmail` в `emails.action.ts`.
- **Roles** — union `canonical.roles` и `duplicate.roles`.
- **Session НЕ переносятся** — `deleteMany` на обеих сторонах (canonical + duplicate),
  принудительный re-login. Причина та же, что у `setPrimaryEmail`: `cookieCache` Better Auth
  (5 мин TTL) может отдать устаревший email/userId в OIDC `id_token` ~10 downstream-приложениям.
- **Аудит:** своей `AuditLog`-модели в auth-hub нет (в отличие от dsperevod/aboi) — заводить её
  ради разового ручного скрипта признано непропорциональным. Вместо этого — structured
  консоль-лог (`✅/⚠️/❌`) с инструкцией в докстринге перенаправлять stdout в файл (`tee`) при
  реальном запуске.
- **Бэкап** не встроен в скрипт (`pg_dump` — ответственность оператора) — явный текстовый
  warning в консоли перед транзакцией плюс требование в докстринге.

**Проверено вживую на локальной БД** (тестовые `User`/`Account`/`ProjectProfile`/`OauthConsent`
и т.д. созданы напрямую SQL, вычищены после): dry-run корректно показал сводку без изменений;
реальный merge прогнан с тремя edge-case сценариями — (1) `Account` с одинаковым `providerId`,
разным `accountId` → оба сохранены без конфликта; (2) `ProjectProfile` с одинаковым
`projectSlug` у обеих сторон → roles объединены `[reader, writer]`, metadata canonical
сохранена; (3) `OauthConsent` дубль по одному клиенту → лишняя запись удалена; повторный запуск
скрипта после успешного merge — идемпотентен (`Duplicate не найден`, exit 0, без изменений).

**Прод-запуск не выполнялся** — нет конкретной пары существующих аккаунтов для склейки, скрипт
ждёт первого реального кейса.

**Коммиты:** `a0eb74a` (скрипт + PLAN.md), `47c5b2d` (docs, глобальный PLAN.md).

---

## Версия 0.6.2 — 2026-07-16 (Этап 8.5: self-service несколько email на аккаунт)

### Фича: `/profile/emails/`

Реализация §8.5 корневого `PLAN.md` — управление своими email в профиле (как GitHub):
добавление дополнительного адреса с подтверждением по ссылке (свой токен, 24ч TTL, не
пересекается с core Better Auth `Verification`), удаление, назначение подтверждённого адреса
основным. Новая модель `UserEmail`.

**Не покрыто:** вход по любому linked-email (требует перехвата резолва sign-in в Better Auth —
риск для core auth-flow ~10 downstream-приложений, отдельная задача) и merge двух уже
существующих РАЗНЫХ аккаунтов (остаётся ручным скриптом владельца, необратимо).

### Два бага, найденные и пофикшенные при живой проверке

1. **`revalidatePath` во время рендера страницы подтверждения** (`/profile/emails/verify`) —
   вызывается не через форму/transition, Next.js это запрещает. Страница падала 500 **после**
   уже успешно применённого обновления БД (сам apply был идемпотентным side-effect, крашился
   только код после него). Убран лишний вызов — страница и так рендерится без кэша.
2. **Смена основного email напрямую в БД не инвалидировала `cookieCache` Better Auth** (до 5
   минут в hub-provider профиле) — активная сессия и OIDC `id_token` для downstream-приложений
   Ключницы временно отдавали бы устаревший email. Исправлено принудительным `auth.api.signOut`
   сразу после смены — пользователь перелогинивается с новым основным адресом.

Проверено вживую end-to-end: create user → add email → SMTP-фейл в dev корректно обработан →
verify по токену → set-primary → forced signOut → re-login по новому primary email → 200.
Тестовые данные вычищены из dev-БД.

Форма формы через новый `createForm()`-инстанс `@/auth-hub-form` (раньше в auth-hub не было ни
одного — существующие формы профиля используют raw `<form>`, что нарушает правило
`.claude/rules/forms.md`; новый код не должен был повторять эту практику).

**Коммиты:** `1ffee51`.

---

## Версия 0.6.1 — деплой 2026-07-03 (Фикс OIDC invalid_grant)

### Проблема: invalid_grant при входе через Ключницу

После логина через любого провайдера (Яндекс, email, etc.) и consent-экрана, dashboard получал `invalid_grant: invalid code` при token exchange.

**Корневая причина — баг в better-auth при использовании Redis `secondaryStorage`:**

1. Consent endpoint вызывает `updateVerificationByIdentifier(consentCode, {identifier: authCode})`
2. `updateVerificationByIdentifier` обновляет JSON под старым Redis-ключом `verification:consentCode` — меняет `identifier` внутри, но **НЕ переименовывает Redis-ключ**
3. При token exchange `consumeVerificationValue(authCode)` ищет `verification:authCode` → не находит (ключ по-прежнему `verification:consentCode`) → `invalid_grant`

**Диагностика:**

- nginx логи dash.letar.best (proxy-host-7): `code=uUwOvv7MzXZ9mEMAaRQCyG1wPsE7ggKO` в callback
- Redis: ключ `verification:6XQfqAjkD56...` (consent_code), внутри `identifier: "uUwOvv7..."` (authCode)
- Redis: ключ `verification:uUwOvv7...` — отсутствует
- PostgreSQL `Verification` — OIDC records отсутствуют (всё хранилось в Redis)

**Решение:** добавлен `verification: { storeInDatabase: true }` в `buildHubProviderAuth` (`libs/auth/src/server/create-auth/index.ts`). OIDC authorization codes теперь хранятся в PostgreSQL, где `updateVerificationByIdentifier` корректно обновляет запись по identifier. Redis остаётся только для rate-limit.

**Коммиты:**

- `ecf9cde` — fix(auth-hub): правильное извлечение сообщения из APIError (`error.body.message`)
- `80fdfe0` — fix(auth-hub): storeInDatabase для OIDC verification (обход бага Redis)

**Попутно исправлено:**

- "Ошибка входа:" с пустым текстом при email/password — Better Auth бросает `APIError`, реальное сообщение в `error.body.message`, а не `error.message`

---

## Версия 0.6.0 — деплой 2026-06-18 (Этап 9: деплой + верификация)

### Деплой Этапа 8

- `AUTH_ENCRYPTION_KEY` добавлен в `.env.docker.enc` (commit `2ed6f12`) и сохранён в KeePassXC
- BlackCove выполнил деплой auth-hub, `/sync-env`, перезапуск контейнера
- После деплоя auth.letar.best был недоступен (500) — причина: `AUTH_ENCRYPTION_KEY` не попал в контейнер без `/sync-env`. Исправлено срочным запросом BlackCove
- Backfill `encrypt-client-secrets.ts --execute` выполнен BlackCove (подтверждено msg #918)
- `kami@letar.best` повышен до ADMIN роли через SQL UPDATE (BlackCove msg #919)
- Admin UI `/admin/clients` верифицирован вручную: 7 клиентов активны, все кнопки работают

### Проблема с agent-mail fetch_inbox

`fetch_inbox` возвращает только метаданные без тела сообщений — ответы BlackCove были незаметны, что привело к 4 повторным пингам про backfill. Нужно использовать `search_messages` с последующим чтением или попросить BlackCove дублировать ответы в теме письма.

---

## Версия 0.6.0 — 2026-06-15 (Этап 8: Admin UI + at-rest шифрование)

### Admin UI OAuth-клиентов (`/admin/clients`)

Полный CRUD для управления OIDC-приложениями Ключницы:

- **Список** (`/admin/clients`) — таблица с бейджами статуса, кнопками toggle/edit
- **Создание** (`/admin/clients/new`) — двухэтапный флоу:
  1. `RisksConsent` — экран с 4 рисками hub-client режима (бренд, OAuth-аккаунт, user.id, 152-ФЗ)
  2. `ClientForm` — имя, clientId, redirect URLs, тип (web/spa/native), skipConsent
  - После создания: redirect на `/admin/clients/<id>?secret=<plaintext>` → `SecretBanner`
- **Детали** (`/admin/clients/[id]`) — карточка с атрибутами + `RotateSecretButton` + `DeleteClientButton`
- **Редактирование** (`/admin/clients/[id]/edit`) — форма с locked clientId

**`SecretBanner`** — plaintext секрет отображается ОДИН РАЗ через `?secret=` в URL. Исчезает через 5 минут или при перезагрузке. Кнопка «Скопировать».

**Server actions** (`_actions/client.action.ts`): `createClientAction`, `updateClientAction`, `rotateSecretAction`, `deleteClientAction`. Валидация через Zod с `.strip()`.

### At-rest шифрование (`libs/auth/server/crypto.ts`)

**AES-256-GCM** — для долгосрочных секретов (`clientSecret`):

- Каждый вызов → уникальный random IV → не-детерминированный
- Формат: `gcm:<iv-hex>:<cipher-hex>:<tag-hex>`
- Обратная совместимость: plaintext без `gcm:` префикса → возвращается без изменений

**AES-256-CBC детерминированный** — для токенов, где нужен WHERE lookup:

- IV = первые 16 байт HMAC-SHA256(key, salt) → уникален per-field, детерминирован
- Формат: `cbc:<cipher-hex>`
- Применяется для `oauthAccessToken.accessToken/refreshToken`

**10 unit-тестов** в `crypto.spec.ts`: round-trip, random IV, детерминированность, обратная совместимость, error cases.

### Encryption ORM proxy (`src/lib/crypto-orm.ts` + `src/lib/db.ts`)

Прозрачное шифрование через Proxy без изменений кода потребителей:

| Модель             | Поле                          | Метод                         |
| ------------------ | ----------------------------- | ----------------------------- |
| `oauthApplication` | `clientSecret`                | GCM (non-deterministic)       |
| `oauthAccessToken` | `accessToken`, `refreshToken` | CBC (deterministic для WHERE) |
| `account`          | `accessToken`, `refreshToken` | GCM                           |

**Dev-режим**: если `AUTH_ENCRYPTION_KEY` не задан → предупреждение в консоль, шифрование пропускается. В production → `throw`.

### Social provider loader (`libs/auth/server/social-loader.ts`)

```typescript
export const auth = await createAuthAsync({
  mode: 'standalone',
  social: { source: 'db', load: createSocialProviderLoader(prisma, decryptSecret, key) },
  // ...
})
```

Читает таблицу `socialProvider` из БД, расшифровывает `clientSecret`, передаёт в Better Auth.

### Backfill скрипт (`scripts/encrypt-client-secrets.ts`)

```bash
# Dry-run (показывает что будет зашифровано):
bun run scripts/encrypt-client-secrets.ts

# Реальное шифрование:
bun run scripts/encrypt-client-secrets.ts --execute
```

Идемпотентен: уже зашифрованные записи (`gcm:` prefix) пропускает.

### Исправления инфраструктуры

- `libs/auth/tsconfig.lib.json` — добавлено исключение `src/**/*.spec.ts` из lib-сборки (tsc падал на spec-файлах при генерации `.d.ts`)
- `libs/auth/src/server/create-auth/index.ts` — cast через `unknown` для `buildHubProviderAuth` чтобы избежать непортабельной ссылки на Zod в `.d.ts`

### Файлы

- `libs/auth/src/server/crypto.ts` — AES-256-GCM/CBC функции
- `libs/auth/src/server/crypto.spec.ts` — 10 unit-тестов
- `libs/auth/src/server/social-loader.ts` — DB loader для провайдеров
- `libs/auth/src/server/index.ts` — экспорт (обновлён)
- `libs/auth/src/server/create-auth/types.ts` — `StandaloneSocialSource` тип
- `libs/auth/src/server/create-auth/index.ts` — `createAuthAsync()` + `resolveSocialProviders()`
- `apps/auth-hub/src/lib/crypto-orm.ts` — encryption proxy для 3 моделей
- `apps/auth-hub/src/lib/db.ts` — ORM с encryption proxy
- `apps/auth-hub/src/lib/prisma.ts` — re-export шим
- `apps/auth-hub/src/app/admin/clients/**` — 10 файлов Admin UI
- `apps/auth-hub/scripts/encrypt-client-secrets.ts` — backfill скрипт

**Коммит:** `4e70c76`

---

## v0.5.0 — Глобальный выход: RP-Initiated Logout ✅ (реализовано 2026-05-29…06-06)

> ✅ **Реализовано:** `oidcLogout` в `createLogoutAction` (`@letar/auth`, коммит `78340e8a`
> 2026-05-29) + все 6 hub-client приложений (archetest/time/grandslamcup/kami/
> animatrona-tracker/dashboard, коммит `97752db8` 2026-06-06). Открытый вопрос п.1.1 снят:
> Better Auth отдаёт `end_session_endpoint` в discovery — `/api/auth/oauth2/endsession`
> (без подчёркиваний; подтверждено на проде 2026-07-30). Ручной чеклист тестирования ниже
> формально не прогонялся — фича на проде с июня, жалоб не было.
> Историческая спека, перенесена из PLAN.md при архивации 2026-07-30.

### Проблема

Кнопка «Выйти» на клиентских сайтах (archetest, time, grandslamcup, kami, animatrona-tracker, dashboard) очищает только **локальную** Better Auth сессию (cookie сайта). Сессия на Ключнице (`auth.letar.best`) при этом **не завершается**.

Последствия:

- Пользователь нажал «Выйти» на archetest — он вышел с archetest, но на Ключнице остался залогинен
- Если пользователь снова заходит на archetest (или любой другой OIDC-сайт), SSO срабатывает автоматически — он попадает обратно без ввода пароля
- Невозможно полноценно выйти со всех устройств через один клик
- На чужом компьютере «выйти» нельзя — другой человек просто снова войдёт через SSO

### Решение: RP-Initiated Logout (OIDC стандарт)

Стандарт [OpenID Connect RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html) описывает механизм, при котором клиентское приложение (RP) инициирует выход на стороне OIDC-провайдера.

**Итоговый flow выхода:**

```
1. Пользователь жмёт «Выйти» на клиентском сайте
2. Клиент вызывает signOut() → очищает локальную сессию (cookie)
3. Клиент делает 302 редирект → auth.letar.best/api/auth/oauth2/end_session
   Параметры: client_id, post_logout_redirect_uri (опционально id_token_hint)
4. Ключница завершает OIDC сессию пользователя
5. Ключница делает 302 редирект → post_logout_redirect_uri клиента
   (например /sign-in или /logged-out на сайте клиента)
6. Пользователь видит страницу входа — он вышел везде
```

**Что НЕ выбрано и почему:**

- ❌ **Back-channel logout** (OIDC Back-Channel Logout spec) — Ключница уведомляет клиентов server→server. Сложнее в реализации, требует отдельного logout endpoint на каждом клиенте, избыточно.
- ❌ **Front-channel logout через iframe** — Ключница грузит скрытые iframe всех клиентов для выхода параллельно. Проблемы с CSP, Safari ITP, 3rd-party cookies.
- ✅ **RP-Initiated Logout** — самый простой и стандартный вариант. Один редирект.

---

### Задачи

#### 1. Ключница (auth-hub) — проверить и настроить `end_session_endpoint`

**1.1. Проверить поддержку `end_session_endpoint` в better-auth**

Better Auth oidcProvider вероятно реализует `end_session_endpoint` как часть стандарта. Нужно проверить через:

- `GET https://auth.letar.best/api/auth/.well-known/openid-configuration` → есть ли поле `end_session_endpoint`
- Документация better-auth oidcProvider

Если endpoint есть — идём дальше. Если нет — нужно реализовать его вручную (API route `/api/auth/[...betterauth]/route.ts` уже есть, добавить `GET /oauth/end-session`).

**1.2. Добавить `post_logout_redirect_uris` в каждый trustedClient**

В `apps/auth-hub/src/lib/auth.ts` → секция `trustedClients` — добавить поле `postLogoutRedirectUris` для каждого клиента:

| Клиент                  | `post_logout_redirect_uri`                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| archetest-prod          | `https://archetest.letar.best/sign-in`                                                        |
| time-prod               | `https://time.letar.best/`                                                                    |
| grandslamcup-prod       | `https://grandslamcup.letar.best/sign-in`, `https://grandslamcup-stage.s3.letar.best/sign-in` |
| kami-prod               | `https://kami.letar.best/sign-in`                                                             |
| animatrona-tracker-prod | `https://animatrona-tracker.letar.best/sign-in`                                               |
| dashboard-prod          | `https://dash.letar.best/auth/signin`                                                         |

Также добавить localhost-варианты для разработки.

**1.3. (Если нужно) Страница `/oauth/logged-out` на Ключнице**

Если better-auth при end_session редиректит на свою страницу до редиректа к клиенту — возможно нужна промежуточная страница. Уточнить по итогам п.1.1.

---

#### 2. `libs/auth` — расширить `createLogoutAction`

Файл: `libs/auth/src/server/factories/create-logout-action.ts`

Добавить поддержку OIDC logout через новую опцию:

```typescript
interface OidcLogoutOptions {
  /** URL end_session_endpoint Ключницы */
  endSessionUrl: string
  /** OIDC client_id этого приложения */
  clientId: string
  /** URL, куда Ключница вернёт пользователя после выхода */
  postLogoutRedirectUri: string
}

interface LogoutActionOptions {
  redirectTo?: string
  oidcLogout?: OidcLogoutOptions // НОВОЕ
  onBeforeLogout?: () => Promise<void>
  onAfterLogout?: () => Promise<void>
}
```

**Новое поведение с `oidcLogout`:**

1. Вызвать `auth.api.signOut()` — очистить локальную сессию
2. Вызвать `onAfterLogout?.()` callbacks
3. Вместо `redirect(redirectTo)` — сделать `redirect(endSessionUrl + queryParams)`

Итоговый URL редиректа:

```
https://auth.letar.best/api/auth/oauth2/end_session
  ?client_id=archetest-prod
  &post_logout_redirect_uri=https%3A%2F%2Farchetest.letar.best%2Fsign-in
```

Опция `id_token_hint` — **не используем** (optional по стандарту, требует хранить id_token, усложняет). Ключница должна доверять `client_id`.

---

#### 3. Клиентские приложения — обновить logout

Для каждого из 6 приложений сделать одинаковые изменения.

**Файл:** `apps/<app>/src/app/_actions/auth.actions.ts`

Текущее состояние (неправильно):

- archetest, time, grandslamcup: `signOut()` клиентский — не через createLogoutAction
- kami: `createLogoutAction(auth)` — только локальный signOut
- animatrona-tracker: `signOut()` клиентский
- dashboard: `signOut()` клиентский

**Что сделать по каждому:**

| Приложение             | Порт dev | `client_id`               | Файлы для изменения                                            |
| ---------------------- | -------- | ------------------------- | -------------------------------------------------------------- |
| **archetest**          | 3012     | `archetest-prod`          | `_actions/auth.actions.ts` + header.tsx + mobile-drawer.tsx    |
| **time**               | 3013     | `time-prod`               | `_actions/auth.actions.ts` + toolbar.tsx                       |
| **grandslamcup**       | ?        | `grandslamcup-prod`       | `_actions/auth.actions.ts` + user-menu.tsx + mobile-drawer.tsx |
| **kami**               | ?        | `kami-prod`               | `_actions/auth.actions.ts` + sign-out-button.tsx               |
| **animatrona-tracker** | ?        | `animatrona-tracker-prod` | `_actions/auth.actions.ts` + profile-client.tsx                |
| **dashboard**          | ?        | `dashboard-prod`          | `_actions/auth.actions.ts` + Sidebar.tsx                       |

**Паттерн для каждого:**

```typescript
// apps/archetest/src/app/_actions/auth.actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

export const logoutAction = createLogoutAction(auth, {
  oidcLogout: {
    endSessionUrl: 'https://auth.letar.best/api/auth/oauth2/end_session',
    clientId: 'archetest-prod',
    postLogoutRedirectUri: 'https://archetest.letar.best/sign-in',
  },
})
```

**Клиентские компоненты** — заменить прямой вызов `signOut()` на вызов Server Action через `<form action={logoutAction}>` или `startTransition(() => logoutAction())`. Это важно: редирект на Ключницу должен происходить на сервере (Server Action делает `redirect()`), а не на клиенте (чтобы не получить CORS).

---

#### 4. Добавить `BETTER_AUTH_OIDC_ISSUER` env var в клиентские приложения

Для гибкости — URL Ключницы не хардкодить, а брать из env:

```env
# .env клиентского приложения
BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best
OIDC_CLIENT_ID=archetest-prod
```

Тогда в `auth.actions.ts`:

```typescript
endSessionUrl: ;
;`${process.env.BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/end_session`
```

---

#### 5. Тестирование

- [ ] Войти на archetest через Ключницу
- [ ] Нажать «Выйти» — убедиться, что редиректит через auth.letar.best/end_session
- [ ] После выхода — зайти снова на archetest — должен появиться экран входа (не SSO автоматически)
- [ ] Выйти с одного сайта — проверить что другой сайт тоже требует логин
- [ ] Кнопка выхода на самой Ключнице (`/profile`) — проверить что она **не** делает OIDC logout (у неё нет client_id)

---

### Файлы к изменению (чеклист)

```
libs/auth/src/server/factories/create-logout-action.ts   ← добавить OidcLogoutOptions
apps/auth-hub/src/lib/auth.ts                             ← постараться добавить postLogoutRedirectUris
apps/archetest/src/app/_actions/auth.actions.ts           ← создать, использовать createLogoutAction
apps/archetest/src/app/[locale]/_components/header.tsx    ← заменить signOut() на logoutAction
apps/archetest/src/app/[locale]/_components/mobile-drawer.tsx
apps/time/src/app/_actions/auth.actions.ts
apps/time/src/app/_components/toolbar.tsx
apps/grandslamcup/src/app/_actions/auth.actions.ts
apps/grandslamcup/src/app/_components/header/user-menu.tsx
apps/grandslamcup/src/app/_components/header/mobile-drawer.tsx
apps/kami/src/app/_actions/auth.actions.ts                ← обновить createLogoutAction с oidcLogout
apps/kami/src/app/_components/header/sign-out-button.tsx
apps/animatrona-tracker/src/app/_actions/auth.actions.ts
apps/animatrona-tracker/src/app/profile/_components/profile-client.tsx
apps/dashboard/src/app/_actions/auth.actions.ts
apps/dashboard/src/app/_components/layout/Sidebar.tsx
```

---

### Риски и открытые вопросы

1. **Поддерживает ли better-auth oidcProvider `end_session_endpoint`?** — Проверить п.1.1 перед началом. Если нет — нужно реализовать кастомный route.

2. **Локальная разработка** — в dev окружении `endSessionUrl` должен указывать на `http://localhost:3014`, а `postLogoutRedirectUri` — на `http://localhost:<port>`. Решение: env vars (см. п.4).

3. **id_token_hint** — Без него некоторые OIDC провайдеры отказывают. Если better-auth требует — нужно научиться читать id_token из аккаунта. Проверить по итогам тестирования п.1.1.

4. **Параллельный выход** — RP-Initiated Logout завершает только OIDC сессию на Ключнице, но не завершает сессии других клиентских приложений. То есть: пользователь вышел с archetest → вышел с Ключницы → но на time.letar.best сессия ещё активна до истечения. Это **нормальное поведение** для OIDC (front-channel/back-channel logout для мгновенной инвалидации — за рамками этой задачи).

---

## v0.4.0 — Возврат на исходный сайт при смене аккаунта ✅ (реализовано 2026-05-28)

> ✅ **Реализовано:** `oidc_pending` cookie + route `/auth/post-login` + `/api/oidc-capture` +
> `oidc-pending-capture.tsx`; подключено в oauth-buttons/passkey/telegram/account-chooser.
> Коммиты: `71a20875` (2026-05-28), фикс `6dec3013` (2026-06-05). Текст ниже сохранён как
> историческая спека — реализация местами отличается в деталях (появился `/api/oidc-capture`).
> Перенесена из PLAN.md при архивации 2026-07-30.

### Проблема

При смене аккаунта через «Войти под другим аккаунтом» на account chooser:

- **Email/password:** после входа пользователь корректно возвращается на исходный сайт ✅
- **Соцсети (Google/VK/Яндекс):** после входа пользователь оказывается на главной странице Ключницы (`/`), а не возвращается на сайт, с которого пришёл ❌

**Ожидаемое поведение:** при смене аккаунта любым способом входа пользователь после авторизации должен автоматически вернуться на тот сайт/URL, который инициировал OIDC flow.

---

### Диагностика: почему ломается на соцсетях

**Текущий flow при смене аккаунта:**

```
1. Пользователь на archetest.letar.best → нажимает "Войти через Ключницу"
2. Ключница: GET /api/auth/oauth2/authorize?client_id=archetest-prod&redirect_uri=...&state=...&code_challenge=...
3. Пользователь залогинен → показывает account chooser на /oauth/consent?consent_code=XYZ&client_id=...&scope=...
4. Нажимает "Войти под другим аккаунтом"
5. handleSwitchAccount: signOut() → router.push('/sign-in?consent_code=XYZ&client_id=...&scope=...&...')
6. На /sign-in: usePostSignInCallback() строит callbackUrl = http://auth.letar.best/api/auth/oauth2/authorize?...
7a. Email/password: loginUser({ callbackUrl }) → Better Auth редиректит на callbackUrl → OIDC authorize → archetest ✅
7b. Соцсети: signIn.social({ callbackURL: callbackUrl }) → Google → /api/auth/callback/google → ??? → / ❌
```

**Причина** — `callbackURL` не выживает в цепочке редиректов через внешний OAuth провайдер. Better Auth кодирует `callbackURL` в state-параметр или cookie при старте social OAuth, но URL вида `http://auth.letar.best/api/auth/oauth2/authorize?client_id=X&redirect_uri=https://...&state=Y&code_challenge=Z` содержит вложенные URL с двоеточиями, амперсандами и знаками равенства — это может вызывать двойное кодирование или не пройти валидацию в Better Auth после callback от Google/VK/Яндекс. Email/password не проходит внешний редирект, поэтому у него проблемы нет.

---

### Решение: OIDC Pending Auth Cookie

Вместо того чтобы передавать полный authorize URL через social OAuth redirect chain, хранить OIDC-параметры в серверной httpOnly-cookie (`oidc_pending`) и восстанавливать их после любого входа.

**Новый flow:**

```
1–5. Без изменений (account chooser → signOut → /sign-in с OIDC params)
6. /sign-in (Server Component): видит OIDC params в URL → устанавливает cookie
   Set-Cookie: oidc_pending=<base64(params)>; HttpOnly; SameSite=Lax; Max-Age=600; Path=/
7. Email/password или соцсети — логин проходит как обычно
8. После логина: Better Auth вызывает свой callback
9. Новый промежуточный redirect route: /auth/post-login
   - Читает cookie oidc_pending
   - Если есть → удаляет cookie, redirect → /api/auth/oauth2/authorize?<params из cookie>
   - Если нет → redirect → / (обычная главная страница)
10. OIDC authorize с активной сессией → redirect обратно на archetest ✅
```

Для email/password callbackUrl по-прежнему можно передавать напрямую (как сейчас) — это резервный вариант. Cookie добавляет второй уровень надёжности, который работает для всех методов входа.

---

### Задачи

#### 1. Установка cookie на /sign-in (Server Component)

Файл: `apps/auth-hub/src/app/(auth)/sign-in/page.tsx`

Добавить серверную логику: если в URL присутствуют OIDC параметры (`client_id`, `redirect_uri`, `response_type`), установить cookie `oidc_pending` с base64-закодированными параметрами.

Параметры cookie:

- `httpOnly: true` — недоступна из JS
- `sameSite: 'lax'` — работает после внешнего OAuth редиректа (GET)
- `maxAge: 600` — 10 минут (достаточно для прохождения OAuth)
- `path: '/'` — видна всем роутам Ключницы
- `secure: true` в production

Что хранить в cookie (JSON → base64):

```json
{
  "client_id": "archetest-prod",
  "redirect_uri": "https://archetest.letar.best/api/auth/oauth2/callback/letar-auth",
  "response_type": "code",
  "scope": "openid profile email",
  "state": "...",
  "code_challenge": "...",
  "code_challenge_method": "S256",
  "nonce": "..."
}
```

#### 2. Промежуточный route `/auth/post-login`

Файл: `apps/auth-hub/src/app/auth/post-login/route.ts` (новый)

Route handler (GET), который:

1. Читает сессию (проверяет что пользователь залогинен)
2. Читает cookie `oidc_pending`
3. Если cookie есть: удаляет cookie, redirects → `/api/auth/oauth2/authorize?<params>`
4. Если cookie нет: redirects → `/`

```typescript
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', process.env.BETTER_AUTH_URL!))
  }

  const cookieStore = await cookies()
  const pending = cookieStore.get('oidc_pending')

  if (pending) {
    const params = JSON.parse(Buffer.from(pending.value, 'base64').toString())
    const qs = new URLSearchParams(params).toString()
    const response = NextResponse.redirect(new URL(`/api/auth/oauth2/authorize?${qs}`, process.env.BETTER_AUTH_URL!))
    response.cookies.delete('oidc_pending')
    return response
  }

  return NextResponse.redirect(new URL('/', process.env.BETTER_AUTH_URL!))
}
```

#### 3. Направить callbackURL соцсетей на `/auth/post-login`

Файл: `apps/auth-hub/src/app/(auth)/sign-in/_components/oauth-buttons.tsx`

Вместо `callbackUrl = usePostSignInCallback()` использовать фиксированный `/auth/post-login`:

```typescript
export function AuthOAuthButtons() {
  // Соцсети всегда редиректят на /auth/post-login, который читает cookie
  // и продолжает OIDC flow (или идёт на /, если не было OIDC контекста)
  return <OAuthButtons providers={['google', 'github', 'vk', 'yandex']} callbackUrl="/auth/post-login" />
}
```

Email/password оставить как есть (callbackUrl из `usePostSignInCallback`) — там работает и без cookie.

#### 4. Убедиться, что magic link тоже работает

Файл: `apps/auth-hub/src/app/(auth)/sign-in/_components/magic-link-form.tsx`

Magic link после верификации тоже должен читать cookie. Для этого:

- Если в URL при запросе magic link есть OIDC params — сохранить в cookie
- `callbackUrl` для magic link установить в `/auth/post-login`
- Или оставить текущий `usePostSignInCallback` — нужно проверить, работает ли он для magic link сейчас

#### 5. Обновить `handleSwitchAccount` в AccountChooser

Файл: `apps/auth-hub/src/app/oauth/consent/_components/account-chooser.tsx`

Cookie устанавливается на sign-in page (Server Component), поэтому при редиректе на `/sign-in` с OIDC params cookie будет создана автоматически. Изменений в `handleSwitchAccount` не нужно — логика остаётся прежней (передать OIDC params в URL `/sign-in`).

---

### Сценарии тестирования

| Сценарий                                        | Ожидаемый результат                                        |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Смена аккаунта → email/password                 | Возврат на исходный сайт ✅                                |
| Смена аккаунта → Google                         | Возврат на исходный сайт ✅                                |
| Смена аккаунта → VK                             | Возврат на исходный сайт ✅                                |
| Смена аккаунта → Яндекс                         | Возврат на исходный сайт ✅                                |
| Смена аккаунта → Magic Link                     | Возврат на исходный сайт ✅                                |
| Вход на Ключницу напрямую (без OIDC) → Google   | Редирект на `/` (не на `/auth/post-login` — cookie нет) ✅ |
| Cookie истекла за 10 минут                      | Редирект на `/` (не ошибка) ✅                             |
| Прямой переход на `/auth/post-login` без сессии | Редирект на `/sign-in` ✅                                  |

---

### Файлы к изменению

```
apps/auth-hub/src/app/(auth)/sign-in/page.tsx           ← установка oidc_pending cookie
apps/auth-hub/src/app/auth/post-login/route.ts           ← новый route: читает cookie, продолжает OIDC
apps/auth-hub/src/app/(auth)/sign-in/_components/oauth-buttons.tsx  ← callbackUrl → /auth/post-login
apps/auth-hub/src/app/(auth)/sign-in/_components/magic-link-form.tsx ← проверить/обновить
```

---

## Версия 0.2.1 — 2026-04-10

### Fix: продолжение OIDC flow после OAuth на /sign-in

**Проблема:** Пользователь, попадая из клиентского приложения на `auth.letar.best/sign-in?client_id=...&redirect_uri=...&response_type=code&state=...` (OIDC authorization_code flow), после успешного логина через Google/Яндекс/VK/GitHub оказывался на главной ключницы вместо возврата в клиентское приложение. Better Auth OIDC Provider сохранял query в cookie `oidc_login_prompt` и редиректил на `loginPage` со всеми параметрами, но на странице `/sign-in` ни OAuth кнопки, ни email-форма не использовали этот query для восстановления OIDC flow — передавали дефолтный `callbackURL = '/'` в Better Auth.

**Решение:**

- Создан хук `src/app/(auth)/_hooks/use-post-sign-in-callback.ts`, который проверяет наличие OIDC параметров (`client_id` + `redirect_uri` + `response_type`) в query и возвращает `/api/auth/oauth2/authorize?<исходная query>`, если это OIDC flow. После успеха Better Auth редиректит на этот внутренний URL, authorize endpoint находит свежую сессию и продолжает выдачу кода клиентскому приложению.
- `AuthOAuthButtons`, `LoginForm`, `MagicLinkForm` на `/sign-in` используют этот хук и передают результат как `callbackURL` в `signIn.social` / `signIn.oauth2` / `auth.api.signInEmail` / `auth.api.signInMagicLink`.
- `libs/auth/src/client/oauth-buttons.tsx` уже поддерживал проп `callbackUrl` — правок не потребовалось.

## Версия 0.1.0

### Реализовано

- Базовая структура приложения (Next.js 16 + Chakra UI v3)
- Роуты авторизации (login, signup)
- OAuth интеграция
- Панель администратора (каркас)
- Профиль пользователя (каркас)

### 2026-07-30 — Telegram API через tg-proxy (обход блокировки s1/s2)

- `sendBotMessage()` (`src/lib/telegram/plugin.ts`) переведён на `TELEGRAM_API_ROOT` вместо
  хардкода `api.telegram.org`, заблокированного провайдером ДЦ на s1/s2. Дефолт
  `https://tg-proxy.letar.best` — компоновка через `docker-compose.production.yml`, без изменений
  `.env.docker.enc`.

---

**Последнее обновление:** 2026-07-30
