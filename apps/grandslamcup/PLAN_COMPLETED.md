# Grand Slam Cup — Выполненные задачи

Детальное описание всех реализованных фич.

## 2026-08-25 — `schema.zmodel` разбит на 8 доменных файлов

`schema.zmodel` (1613 строк) декомпозирован на `schema/{users,geo,competition,teams,matches,
judging,content,social}.zmodel` с циклическими cross-file импортами между ними — методика уже
была протестирована в одноразовом worktree 2026-08-24 (см.
`.claude/docs/zenstack-multifile-schema-circular-imports.md`), это применение к реальному файлу.
Корневой `schema.zmodel` теперь только импортирует 8 доменных файлов и держит
`datasource`/`generator`/`plugin`-блоки (импорты обязаны идти раньше них).

Единственная реальная сложность — двусторонние зависимости `users.zmodel` ↔ `geo.zmodel`
(`User.organizedCities: CityOrganizer[]` и `CityOrganizer.user: User`): оба файла импортируют
друг друга, `zenstack generate` (3.9.2) отработал без ошибок. `nx zenstack:generate` не изменил
ни одного файла в `src/generated/`/`prisma/` — декомпозиция чисто структурная. `nx db:push` —
база уже синхронна (drift отсутствует), `nx typecheck:tsgo`/`nx lint` зелёные.

Причина «Postgres EACCES»/`AggregateError` при `nx dev`/`nx build` (см. запись ниже про
`pressScale`) найдена: не отсутствие compose-конфигурации для локальной БД, а просто выключенный
Docker-контейнер `grandslamcup-db` (postgres:16-alpine, порт `5453:5432`, данные целы в volume) —
стоял `Exited` около месяца. Фикс — `docker start grandslamcup-db`. Проверено: `pg_isready` →
`accepting connections`, `nx build grandslamcup` полностью зелёный (113/113 страниц, включая
`/[citySlug]/donate`, `/[citySlug]/rules`, которые раньше падали на пререндере).

⚠️ Контейнер запущен вручную (`docker start`), не через compose с `restart: unless-stopped` —
после перезагрузки Windows/Docker Desktop с высокой вероятностью снова окажется `Exited`. Если
`nx dev grandslamcup` опять начнёт падать на подключении к БД — сначала `docker ps -a --filter
name=grandslamcup-db`, не искать проблему в коде.

## 2026-08-19 — Глубина нажатия кнопок/ссылок на общую `pressScale` (`@letar/ui`)

`buttonRecipe`/`linkRecipe` переведены с литеральных `scale(...)` на общую лестницу `pressScale`
из `@letar/ui` (v0.15.0) — тот же перенос независимо сделан в domwellbes (эталон), driving-school,
aprel8008. Значения по шагам изменились не только текстом: `xs` 0.9→0.95, `sm` 0.9→0.96, `lg`
0.97→0.98, `xl` 0.98→0.985, ссылка 0.9→0.96. Дев-сервер не поднимался из-за несвязанной проблемы с
БД (Postgres EACCES), поэтому значения проверены не браузером, а прямым резолвом recipe через
`bun run` — см. `.claude/docs/interactive-press-feedback.md#проверка-без-браузера`. `next build`
успешно компилируется (`@letar/ui` резолвится), падает только на пререндере страниц с БД-запросом
— та же несвязанная причина. `iconButtonRecipe` на шкалу не переведён и задокументирован на месте:
иконка мельче нижнего шага `pressScale`, нужно заметнее проседание. Коммит `e31c344e`.

## 2026-08-19 — Webpack-фикс `@tanstack/devtools-ui@0.7.0` — server-половина графа

Тот же баг, что уронил dev-сервер `driving-school` (500, `Attempted import error: 'use' is not
exported from 'solid-js/web'` через `@letar/query-provider`) — grandslamcup в зоне риска той же
причины (webpack в dev). Существующий `config.resolve.alias['@tanstack/devtools-ui'] = false`
работал только в prod (`if (!dev)`); расширен на `if (isServer || !dev)`. Полный разбор —
PLAN.md §51 и `apps/driving-school/PLAN_COMPLETED.md`.

## v3.38.5 — 2026-08-14 (удалён мёртвый локальный `UserMenu`)

Аудит по всему монорепо на предмет дублей меню аккаунта (`domwellbes`, `driving-school`,
`mandala`, `grandslamcup` — все держали свои копии вместо `libs/ui/src/lib/user-menu.tsx`) нашёл,
что у grandslamcup дубль оказался уже мёртвым кодом: `public-header.tsx` давно использует
`UserMenu` из `@letar/ui` (с `extraItems` под роли тренера/поэта/счетовода/ведущего), мобильная
версия — `MobileAuthSection` оттуда же. Локальный `_components/header/user-menu.tsx` нигде не
импортировался — удалён. Функциональность не менялась, только очистка.

## v3.38.4 — 2026-08-05 (fix: 6 ошибок typecheck:tsgo + tsconfig.spec.json приведён к стандарту)

**typecheck:** починены 6 предсуществующих ошибок `nx typecheck:tsgo grandslamcup` (не связаны с
tsconfig.spec.json ниже, найдены попутно):

- `admin/settings/page.tsx` — `initialConfig` не передавал `autoAnnouncement`/`autoHalfTime`/
  `autoResult` в `TelegramSettingsForm`, хотя поля есть в `TelegramConfig` (schema.zmodel:1536-1540).
- `match/[id]/presenter/_actions/presenter.action.ts` — `let replacement: T | null = null`,
  присваиваемый только внутри колбэка `updateMatchState`, снаружи TS видел исходный `null` и после
  `if (replacement)` схлопывал тип до `never` (воспроизводится и обычным `tsc`, не баг tsgo).
  Стандартный обход — ref-объект (`{ value: T | null }`): доступ к свойству не подвержен той же
  проблеме с контролем потока через замыкание.
- `score/_components/scorer-vote-input.tsx` — мёртвая переменная `label` (нигде не рендерилась).
- `score/_components/wizard/step-pair-results.tsx` — `Badge size="xl"` не входит в допустимые
  значения Chakra v3 (`xs|sm|md|lg`); визуальный размер и так задавался через `fontSize="2xl"`.

**tsconfig.spec.json:** ⚠️-пометка в `.claude/docs/unit-testing.md` про «обязательный
tsconfig.spec.json» долго не относилась к grandslamcup — в приложении не было ни одного теста.
Первый реальный тест появился в v3.38.2 (`album.action.spec.ts`), но `nx test grandslamcup` прошёл
и без `tsconfig.spec.json`. Причина — версия vite резолвится per-package по peer-dep хешу в общем
bun-сторе (`node_modules/.bun/vite@X+<hash>`): у grandslamcup хешнулась `vite@8.2.0`, где баг
per-file tsconfig-резолва oxc (описан в unit-testing.md) не воспроизводится, тогда как у archetest —
`vite@8.1.3`, где воспроизводится (проверено эмпирически: временный снос `tsconfig.spec.json` в
archetest даёт `TSCONFIG_ERROR`, в grandslamcup — нет). Это делает отсутствие файла у grandslamcup
случайной удачей, а не гарантией: любой будущий `bun install`/апдейт зависимостей может перехешить
peer-deps и подсунуть другую версию vite. Добавлен `tsconfig.spec.json` по образцу `mandala` —
приводит приложение к общему стандарту монорепо и снимает эту хрупкость. Подробности и общий вывод
про версии vite — `.claude/docs/unit-testing.md`.

`nx test grandslamcup` + `nx typecheck:tsgo grandslamcup` + `nx lint grandslamcup` (227 ошибок —
предсуществующий репо-wide техдолг `curly`/пр. в несвязанных файлах, не трогали) — проверено.

## v3.38.2 — 2026-08-04 (fix: path traversal в загрузке обложки альбома)

Найдено при аудите (референс — фикс `mandala`, коммит `a18f21a6`): `moveAlbumCover` в
`_actions/album.action.ts` принимала `tempPath` из Server Action, проверенный только Zod-схемой
(`z.string()`) и вызывающим кодом через `startsWith('albums/temp/')` — эта проверка не защищает от
`../` внутри строки. Авторизованный poet мог переместить произвольный файл сервера в
`uploads/albums/<albumId>/`, откуда он раздаётся публично через `/api/files/[...path]`.

Исправлено через `resolveUploadPath` из `@letar/image-upload/server` (нормализация пути + проверка
выхода за корень) — та же защита, что уже стоит в `serve-uploads.ts`.

Попутно найден и закрыт независимый второй путь того же класса бага: `generateFilename`
(`lib/upload/save-file.ts`) брал расширение файла через `originalName.split('.').pop()` без очистки
от `/` — `join()` в `api/upload/album-cover/route.ts` мог уйти за пределы `uploads/` уже на этапе
`writeFile`, если атакующий прислал `file.name` с `../` внутри. Расширение теперь фильтруется до
алфавитно-цифровых символов.

Тест на traversal: `_actions/__tests__/album.action.spec.ts` (5 кейсов, положительный контроль —
реальный файл вне `uploads/`, по образцу `mandala/api/og-image/__tests__/route.spec.ts`). Для этого
`moveAlbumCover` экспортирована из модуля, а в `vitest.config.ts` добавлен alias
`@letar/image-upload/server` (у Vite нет доступа к путям из `tsconfig.json` в тестах — тот же приём,
что в `mandala/vitest.config.ts`).

`nx lint`/`nx typecheck:tsgo` на затронутых файлах — чисто; репо-wide ошибки в обоих командах —
предсуществующий техдолг в несвязанных файлах (не трогали).

## v3.38.1 — 2026-07-30 (eslint: игнор сгенерированного Serwist-бандла)

Найдено в `studio` (Фаза 11 блока H): после `next build --webpack` Serwist генерирует
`public/sw.js`/`public/swe-worker-*.js` — минифицированные бандлы, не исходный код. `eslint .`
пытался их линтить и падал на минифицированном коде (`no-var`, `prefer-const` и т.п.). В studio и
archetest ignore уже стоял в `eslint.config.mjs`; в grandslamcup — отсутствовал, хотя `project.json`
использует тот же `next build --webpack` для Serwist. Добавлен `ignores: ['public/sw.js',
'public/swe-worker-*.js']` рядом с существующим `.next/**/*`. Проверено: `nx build grandslamcup` →
`nx lint grandslamcup` больше не упоминает `public/sw.js`/`swe-worker-*`. `driving-school` Serwist
не использует — фикс не требуется.

## v3.38.0 — 2026-07-28 (152-ФЗ: страница /privacy)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). `CookieBanner`
из `@letar/ui` был подключён с `privacyUrl="/privacy"`, но страницы не существовало — битая ссылка.
Добавлена минимальная страница `/privacy` (оператор, какие данные собираются у игроков/судей, сроки,
права субъекта, cookie/аналитика). Полная сводка — root `PLAN.md` §7 Этап 0.8.

## Фаза 7 — Стабильность счетовода + Оффлайн (v3.30.0+)

> Источник: инцидент 2026-04-14, матч СПб — таймер ушёл в минус, интерфейс завис.
> Перенесено из PLAN.md 2026-07-21 (`/workflow:archive-completed`) — все пункты закрыты.

### Группа A — Экстренные исправления

1. ~~**Таймер зависал: кнопка завершения не появлялась при овертайме**~~ ✅ v3.30.0 — кнопка «Выступление окончено» теперь показывается всегда при `isOvertime`, не зависит от `timer.isRunning`. При работающем таймере + овертайм лейбл меняется на «⚠ Форс-завершить».

2. ~~**isPending зависал навсегда**~~ ✅ v3.30.0 — авто-сброс через 8 секунд + сообщение об ошибке.

3. ~~**Классический режим `?mode=classic` удалён**~~ ✅ v3.30.0 — устранён источник случайного «Завершить матч» без подтверждения.

### Группа B — Улучшения ввода времени

4. ~~**Ручной ввод времени при овертайме**~~ ✅ v3.30.0 — кнопка «✏ Своё время» в диалоге, поле ввода М:СС.

### Группа C — Оффлайн

5. ~~**Автоматическая предзагрузка оффлайн-данных**~~ ✅ v3.30.0 — `OfflineStatusBar` сохраняет снэпшот при монтировании.

6. ~~**Оптимистичный СТОП таймера**~~ ✅ v3.30.0 — мгновенное обновление UI при нажатии СТОП, оффлайн-очередь `STOP_TIMER`.

7. ~~**Операции STOP_TIMER, END_PERFORMANCE в sync API**~~ ✅ v3.30.0.

---

## Три архитектурных бага `/api/auth/dev-session` на staging — закрыты системно через `@letar/auth` (§18 Сессии №58–60, 2026-07-11)

Живой прогон staging-e2e (BlackCove) поочерёдно вскрыл три независимых бага в dev-session
auth-бэкдоре, каждый маскировал следующий. Роут вынесен из grandslamcup в переиспользуемую
фабрику `createDevSessionRoute` в `@letar/auth/server` (0.7.0 → 0.8.2), чтобы будущие
staging-e2e приложения (§18.6 roadmap) не наступали на те же грабли.

1. **`NODE_ENV === 'production'` не годится как индикатор окружения** — Next.js production-билд
   (`next build`/`next start`, которым собирается и staging-образ) всегда выставляет
   `NODE_ENV=production` независимо от реального окружения. Заменено на двойную защиту: явный
   флаг `ALLOW_DEV_SESSION=true` + секретный `DEV_SESSION_TOKEN` (constant-time сравнение,
   `node:crypto timingSafeEqual`), fail-closed если токен не настроен. Обе переменные — правило в
   `.claude/rules/env-files.md`: только `.env.staging`/`.env.local`, никогда `.env.docker`.
   Попутно починена ложноположительная проверка в `global-setup.ts` — `waitForURL('**/admin**')`
   совпадал с URL и успешного, и 403-запроса (из-за `redirect=/admin` в query dev-session), маскируя
   провал во всех прошлых прогонах; теперь проверяется факт установки cookie.
2. **Редирект на bind-адрес `0.0.0.0`** — `new URL(redirect, request.url)` резолвился во
   внутренний bind-адрес контейнера (Next.js standalone слушает `0.0.0.0`) за Docker port-forward
   и NPM reverse-proxy, не в клиентский host:port. Cookie сессии ставилась корректно, но браузер
   получал `307 → http://0.0.0.0:<port>/admin` → `ERR_CONNECTION_REFUSED`. Исправлено: base URL
   резолвится из `x-forwarded-host`/`host` заголовков (+ `x-forwarded-proto`), фолбэк на
   `request.url` если заголовков нет (локальный `nx dev`).
3. **Cookie без `__Secure-` префикса** — Better Auth сам вычисляет имя cookie сессии через
   `createCookieGetter` (better-auth internals): если `baseURL`/`BETTER_AUTH_URL` начинается с
   `https://` (staging/prod), реальное имя — `__Secure-better-auth.session_token`, не голое
   `better-auth.session_token`, и требует атрибут `Secure` (иначе браузер вообще не примет cookie
   по спецификации `__Secure-` prefix, RFC 6265bis). Cookie физически создавалась и была валидна в
   БД, но `getSession()` искал её под другим именем → `/admin` редиректил на `/sign-in`. Добавлена
   опция `useSecureCookies` (по умолчанию — `BETTER_AUTH_URL?.startsWith('https://')`),
   повторяющая логику самого Better Auth.

Все три бага найдены и подтверждены на живом staging-прогоне (curl + прямые SQL-запросы к БД)
агентом BlackCove; фиксы каждый раз коммитились и пушились в `origin/main` сразу после разбора.
Побочно найден и починен связанный баг в `dashboard-agent`: `run_e2e` не переключался с root на
`deploy` перед запуском nx (в отличие от `deploy-affected.sh`), оставляя root-owned `.nx`/
`test-output` на s3 — фикс `apps/dashboard-agent/src/routes/e2e.ts` 0.7.2 → 0.7.3.

Коммиты: `5a328c4` (NODE_ENV), `bf3fd3a` (редирект), `7d9d384` (cookie-префикс), `059a608`
(dashboard-agent root-fix). Подробности — корневой `PLAN.md` §18 Сессии №58–60.

## Staging-пайплайн на s3 — реальный HTTPS-домен + анонимизированный прод-снепшот (§18 Сессия D, 2026-07-11)

Первый живой прогон полного staging-gated пайплайна (deploy-mcp): `deploy_app(staging)` →
анонимизированный снепшот прод-БД → `run_e2e` → `e2e_status`.

- Домен переименован `grandslamcup.stage.s3.letar.best` → `grandslamcup-stage.s3.letar.best`
  (дефис вместо точки — двухлейбловый вариант не попадал под существующий DNS wildcard
  `*.s3 CNAME s3.letar.best`, wildcard матчит только один лейбл).
- Найден и исправлен PORT-баг в `docker-compose.staging.yml`: `${PORT:-3018}` интерполировался
  и в маппинг портов, и (через `env_file`) внутрь контейнера — Next.js слушал бы 3018 вместо 3016. Хостовый порт захардкожен (`3018:3016`), `PORT` в `.env.staging` теперь однозначно
  внутренний порт контейнера.
- Данные — `apps/grandslamcup/scripts/anonymize-staging-db.ts`, не пустая БД: `pg_dump` на s2 с
  исключением `Account`/`Session`/`Verification`/`consentLog`/`PushSubscription` (флаги `-T`) →
  `pg_restore --data-only` на s3 → анонимизация `User.email/name/image/telegramChatId` и
  `RosterApplication`-контактов. Найден и исправлен баг скрипта: `DATABASE_URL` с base64-паролем
  без URL-энкодинга падал на парсинге (пароль содержал `+`/`/`/`=`) — фикс `encodeURIComponent`.
- NPM proxy host на s3 → форвард на docker-хост-гейтвей `172.17.0.1:3018` (не имя контейнера —
  NPM и staging-compose в разных Docker-сетях), Let's Encrypt HTTP-01 сертификат.
- **E2E: 3/28 passed** — не блокер (warn-only gate). Гипотеза «нет активного сезона» **не
  подтвердилась при дальнейшем разборе** (см. запись ниже, 2026-07-11 продолжение) — настоящая
  причина другая.

## Разбор e2e-провалов и повторный прогон (§18 Сессия D продолжение, 2026-07-11)

Настоящая причина 3/28: `anonymize-staging-db.ts` анонимизировал служебный e2e-fixture
`admin@grandslamcup.ru` (на нём держится `global-setup.ts` через `/api/auth/dev-session`) —
роут не находил юзера с этим email и создавал нового несвязанного admin'а без
`CityOrganizer`/`Player`-связей, откуда каскад провалов по всем admin-зависимым тестам.
Не отсутствие данных о сезоне.

- ✅ `admin@grandslamcup.ru` исключён из анонимизации (`WHERE email != ...`).
- ✅ Alt-баг подтверждён по логу реального прогона (ровно 2 элемента: header+hero на `/`, оба
  легитимны для доступности) — тест `01-public.spec.ts` теперь скоупит через `page.locator('header')`.
- ✅ `01-public.spec.ts` обновлён под мультигород: `/` — city-selector без меню
  (`buildNavItems` возвращает `[]` на root, `nav-config.ts`), секции дашборда
  («Ближайшие матчи»/«Таблица»/«Последние результаты») и меню навигации живут только на
  `/[citySlug]` — тесты теперь делают `goto('/spb')` перед проверкой. Команды/Поэты/Стадионы
  (`/teams`, `/players`, `/venues`) не тронуты — это намеренно глобальные страницы без
  city-фильтра.
- ✅ Снепшот пересобран с фиксом BlackCove → **18/28 passed** (было 3/28). Попутно найдены и
  починены им же:
  - в `.env.staging` не было `DATABASE_URL` — скрипты подхватывали закоммиченный dev `.env`
    (прод-порт 5453) → `ECONNREFUSED` на s3;
  - **🔴 критично:** `POSTGRES_PASSWORD` сгенерирован через `openssl rand -base64 32` — содержал
    `+`/`/`/`=`, ломавшие парсинг `DATABASE_URL` при интерполяции в `docker-compose.staging.yml`
    → **все страницы staging отдавали 500** с самого первого деплоя (прогон 3/28 шёл на
    неработающем приложении, не на «недостающих данных»). Перегенерирован через
    `openssl rand -hex 32`. **Урок:** для значений, интерполируемых в connection string/URL —
    `-hex`, не `-base64` (символы `+`/`/`/`=` не экранируются автоматически).
- ⚠️ **Осталось 10/28:**
  - **7 — все `03-admin.spec.ts`.** `/api/auth/dev-session` проверяет `NODE_ENV === 'production'`,
    но Next.js standalone-сборка (`next build`/`next start`) **всегда** выставляет
    `NODE_ENV=production` независимо от env-файлов — dev-session структурно не может работать на
    собранном staging-образе. Плюс `global-setup.ts` `waitForURL('**/admin**')` ложно совпадает с
    самим URL dev-session (`redirect=/admin` в query-строке) — все прошлые прогоны рапортовали
    «Admin авторизован» даже получив 403, маскируя проблему всё время. **Следующая задача**
    (архитектурное решение) — см. `PLAN.md` пункт 37.
  - **2 — locator strict-mode violations** («переход на Расписание», «переход на Команды») — не
    продакшн-баги, нужно уточнить селекторы теста.
  - **1 — «Ближайшие матчи» не рендерится** на `/spb` — вероятно, в анонимизированном снепшоте
    нет матчей с датой в будущем относительно текущего времени сервера. Не разобрано глубже.

## v3.37.0–3.37.2 — Consent-гейт PWA + два продакшн-хотфикса (2026-07-02 — 2026-07-03)

### Контекст

Обнаружено при разборе жалобы пользователя на "This page couldn't load" в браузере: Service Worker регистрировался автоматически при заходе на сайт без согласия пользователя (молча прекачивал ~46 МБ статики). По ходу диагностики всплыли ещё два независимых бага.

### Реализовано

**3.37.0 — Consent-гейт перед регистрацией SW**

- `service-worker-registration.tsx`: SW регистрируется только при `isAccepted === true` из `useOfflineConsent('grandslamcup-offline-consent')` (`@letar/hooks`), по образцу `apps/mandala`
- `offline-consent-banner.tsx`: новый баннер снизу экрана с кнопками «Включить оффлайн» / «Не сейчас», повторный показ через 7 дней после отказа
- `@letar/hooks` добавлен в `implicitDependencies` package.json
- Правило задокументировано в `.claude/docs/pwa-offline.md` как обязательное для всех PWA-приложений монорепо

**3.37.1 — Снятие уже установленного SW**

- `registrationRef` был пуст при каждом маунте компонента и не видел SW, установленный ДО внедрения consent-гейта (для пользователей, посещавших сайт раньше). Теперь при отказе от согласия ищем и снимаем **любую** активную регистрацию через `navigator.serviceWorker.getRegistration('/')`, а не только свою

**3.37.2 — CookieBanner ContextError (предсуществующий баг, не связан с SW)**

- `CookieBanner` (использует Chakra `Box`/`Button`/`Checkbox`) рендерился в `layout.tsx` **до** `<Providers>`/`<ChakraProvider>`. Пока `shown === false` (уже есть cookie-согласие в localStorage) баг маскировался — компонент возвращал `null`. При первом визите или после очистки localStorage баннер пытался отрисовать Chakra-компоненты без контекста → `Uncaught ContextError: useContext returned undefined` → крах всей страницы (браузер показывал "This page couldn't load")
- Перенесён внутрь `<Providers>`
- Проверены остальные 8 приложений с `CookieBanner` из `@letar/ui` (studio, svoichuzhie, aprel8008, driving-school, imot, premium-rosstil, auth-hub, dsperevod) — везде корректно, баг был локальным для grandslamcup

### Побочная находка (не код grandslamcup)

- Инцидент `stats.letar.best` (Umami) 502 в тот же день — `umami-app` был в crash loop из-за рассинхрона пароля БД в трёх местах (.env.docker обновлён после создания контейнера + старый пароль в volume postgres). Устранено BlackCove, не связано с деплоем grandslamcup — совпадение по времени.

### Деплой

Все три версии задеплоены на s2 через BlackCove (Deploy Agent): 3.37.0 (commit `b1fd113`), 3.37.1 (commit `150583f`), 3.37.2 (commit `efda988`, urgent).

## v0.1.0 — Инициализация (2026-04-02)

### Реализовано

- Создан проект с Next.js 16 + Chakra UI v3
- Настроена авторизация через Ключницу (OIDC, clientId: `grandslamcup-prod`)
- PostgreSQL + ZenStack с минимальной схемой (User, Account, Session, Verification)
- Тема с поддержкой тёмной/светлой темы (brand: красный #FF0000, accent: синий #0051FF)
- Favicon из SVG логотипа + ICO для поисковиков
- Umami аналитика
- Страница входа через Ключницу (`/sign-in`)
- Заглушка главной страницы
- Зарегистрирован в инфраструктуре деплоя (s2)
- Команда воркфлоу `/grandslamcup`

## v0.2.0 — Модель данных (2026-04-02)

### Реализовано

- 7 enum'ов: SeasonStatus, MatchStatus, LineupStatus, PlayerRole, CardType, CardReason, HalfStartTeam
- 15 новых моделей:
  - **Справочники:** City, Venue, CityOrganizer
  - **Турнирная структура:** Season, League, Round, Tour
  - **Участники:** Team, Player, TeamSeason, PlayerTeamSeason, Transfer
  - **Матчи и результаты:** Match, MatchLineup, PlayerPerformance, Card
  - **Кэшированные данные:** Standings, PlayerRating
- Модификация User: добавлены связи player и organizedCities

### Архитектурные решения

- **Роли через доменные модели:** UserRole остаётся USER/ADMIN. Организатор = CityOrganizer (many-to-many User↔City). Тренер = PlayerTeamSeason с role COACH/PLAYING_COACH. Один человек может быть организатором, тренером и игроком одновременно.
- **Float для очков:** 0 / 0.5 / 1 (победа/ничья/поражение)
- **Int[] для оценок:** PostgreSQL native arrays для хранения 5 оценок жюри
- **Токены доступа:** scorerToken и presenterToken на Match — уникальные cuid(), доступ по ссылке без регистрации
- **Опциональная привязка Player → User:** не все поэты имеют аккаунты
- **Access control:** публичный read для всех моделей, admin-only CRUD. Тонкие политики для организаторов/тренеров — в следующих итерациях.

## v0.3.0 — Админка (2026-04-02)

### Реализовано

- Admin layout с sidebar навигацией (7 разделов) + header
- `lib/roles.ts`: хелперы `isAdmin`, `requireAdmin`, `requireAdminAction`
- Дашборд со статистикой (6 счётчиков)
- CRUD: города, площадки, сезоны (+ лиги), команды (полные формы + удаление с подтверждением)
- Списки: поэты, матчи (read-only)
- `DeleteDialog` — переиспользуемый диалог подтверждения удаления
- Error boundary + loading skeleton

## v0.4.0 — Form API + TanStack Query (2026-04-03)

### Реализовано

- Формы переписаны на `<Form>` API из `@letar/forms` (декларативные `Form.Field.*`)
- ZenStack form plugin (`@form.*` директивы) — автогенерация Zod схем с `.meta({ ui })`
- TanStack Query: `useQuery` для списков + `invalidateQueries` при мутациях
- API роуты: `GET /api/admin/{cities,venues,seasons,teams}`
- `onFieldChange` — автогенерация slug из кириллицы при создании (не перезаписывает при редактировании)
- `transliterate.ts` — общая утилита транслитерации
- `QueryProvider` из `@letar/query-provider` (preset: standard)

## v0.5.0 — Live Match Scoring Phase 1 (2026-04-03)

### Реализовано

- **SSE инфраструктура** (адаптирована из driving-school):
  - `src/lib/sse/match-sse-manager.ts` — SSE менеджер с каналами `match:{id}`, GC (30s), heartbeat (15s)
  - `src/lib/sse/match-state.ts` — In-memory состояние матча (фаза, судьи, перформансы) через `globalThis` singleton
  - `src/app/api/match/[id]/sse/route.ts` — SSE endpoint с авторизацией по role+token
  - `src/app/_hooks/use-match-sse.ts` — Клиентский хук с auto-reconnect и exponential backoff
- **Scoring** (`src/lib/scoring.ts`): `calculateAdjusted` (drop max/min, sum 3), `calculateTotal`, `isValidScore`
- **2 новые модели БД**: `JudgeSession` (token-based auth для судей), `JudgeVote` (unique constraint на [session, performance, dimension])
- **Enum** `VoteDimension` (TEXT, DELIVERY)
- **Экран скорера** (`/match/[id]/score`):
  - `page.tsx` — валидация `?token=scorerToken`, загрузка матча
  - `scorer-client.tsx` — SSE подключение, connection status
  - `jury-panel.tsx` — QR-код регистрации жюри (qrcode.react), мониторинг 0/5...5/5
  - `vote-panel.tsx` — выбор поэта, кнопки голосования, прогресс, результаты
  - `scoreboard.tsx` — текущий счёт с фазовыми бейджами
  - `scorer.action.ts` — 10 server actions (startMatch, createJuryInvite, setCurrentPerformer, startTextVoting, startDeliveryVoting, enterManualVote, resetJudgeVote, nextRound, finishHalf, finishMatch)
- **Экран судьи** (`/match/[id]/judge`):
  - `page.tsx` — проверка cookie / invite key
  - `judge-client.tsx` — state machine (REGISTER → WAITING → VOTE → VOTED)
  - `register-form.tsx` — ввод имени
  - `vote-buttons.tsx` — кнопки 1-5 (mobile-first, крупные)
  - `waiting-screen.tsx` — ожидание между голосованиями
  - `judge.action.ts` — registerJudge, submitVote с duplicate protection

### Архитектурные решения

- **SSE вместо WebSocket**: односторонний поток (сервер → клиент), нативная поддержка Next.js, авто-реконнект
- **Мутации через Server Actions**: клиент → сервер через `'use server'` функции
- **In-memory + DB**: эфемерное состояние (фаза, подключения) в памяти, персистентное (голоса, сессии) в PostgreSQL
- **QR-авторизация для судей**: скорер генерирует invite key → QR → судья сканирует → cookie с token
- **Voting state machine**: IDLE → TEXT_VOTING → TEXT_COMPLETE → DELIVERY_VOTING → DELIVERY_COMPLETE → ROUND_COMPLETE → IDLE

## v0.6.0 — Экран ведущего + Таймер (2026-04-03)

### Реализовано

- **Экран ведущего** (`/match/[id]/presenter`) — управление процессом со сцены
  - `presenter-client.tsx` — SSE подключение, компактный UI
  - `compact-scoreboard.tsx` — минимальный счёт
  - `voting-controls.tsx` — кнопки управления голосованием
  - `judge-progress.tsx` — прогресс с именами судей
  - `score-display.tsx` — результаты раундов
- **Таймер выступления** (`performance-timer.tsx`): 3 минуты, зелёный → жёлтый (2:30) → красный (3:00), вибрация
- **Отмена голосования** — возврат к фазе IDLE
- **Таймаут судей** — визуальная подсветка судей, не проголосовавших за 60 секунд
- SSE события: `timer:started`, `timer:stopped`, `timer:reset`, `voting:cancelled`

## v0.7.0 — MVP матча + Публичная часть (2026-04-03)

### Реализовано

- **8 публичных страниц** в route group `(public)`:
  - `/` — главная (герой, ближайшие матчи, топ-5 таблицы)
  - `/standings` — турнирная таблица (расчёт на лету, группировка по лигам)
  - `/schedule` — расписание по турам, фильтр по сезону
  - `/matches/[id]` — результаты поэт-по-поэту, MVP
  - `/teams` — карточки команд
  - `/teams/[slug]` — профиль, статистика И/В/Н/П, состав, календарь
  - `/players` — рейтинг по среднему баллу
  - `/players/[slug]` — профиль, история выступлений
- `PublicHeader` — навигация + мобильные ссылки
- `MatchCard` — переиспользуемая карточка матча
- `findMatchMVP()` в `scoring.ts`
- Metadata для всех публичных страниц (SEO)

## v0.7.1 — OG-карточки (2026-04-03)

### Реализовано

- OG-image для матчей (`opengraph-image.tsx`) — 1200x630, динамическая генерация
- OG metadata для страниц матчей, команд, поэтов
- Превью при шаринге в Telegram/VK

## v0.8.0 — Кабинет тренера + Стадионы (2026-04-03)

### Реализовано

- **Кабинет тренера** (`/coach`) — user-auth через OIDC:
  - `layout.tsx` — `requireCoach()` auth guard, sidebar (teal accent)
  - `page.tsx` — дашборд: профиль команды, состав, ближайшие матчи
  - `roster/page.tsx` — полный список игроков команды
  - `matches/page.tsx` — история матчей со статусами заявок
  - `_actions/coach.action.ts` — `updateTeamProfileAction`, `submitMatchLineupAction` (5-8 игроков, мин 6 часов до матча)
- **Экран тренера на матче** (`/match/[id]/coach?token=xxx`):
  - Token-based auth (`homeCoachToken` / `awayCoachToken` на Match)
  - SSE подписка (role=coach), mobile-first
  - `player-list.tsx` — статусы, кнопка "Выпустить" (48px+ строки)
  - `match-score-readonly.tsx` — реалтайм счёт
  - `round-results.tsx` — результаты раундов
  - `coach-match.action.ts` — `sendPlayerAction`, `substitutePlayerAction` (макс 2 замены во 2-м тайме)
- **Страницы стадионов**:
  - `/venues` — список + Яндекс.Карты (JS API v3, маркеры с автоцентром)
  - `/venues/[slug]` — детальная страница (описание, карта, домашние команды, последние матчи)
  - `yandex-map.tsx` — клиентский компонент, lazy loading, `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`
- Auth helpers: `requireCoach()`, `requireCoachAction()`, `CoachContext` type
- Ссылки скорер/ведущий/тренер в админке матчей

## v0.9.0 — Фаза 2 Расширение (2026-04-03)

### Реализовано

- **Личный зачёт поэтов** — расширенные рейтинги:
  - Фильтры по сезону/городу/команде (`player-filters.tsx`)
  - Минимум 3 выступления, медали топ-3 (`player-rating-table.tsx`)
  - Профиль: тренд (↑↗→↘↓), лучшие выступления, статистика по сезонам, ср. текст/подача
  - Admin: `recalculateRatingsAction` → upsert `PlayerRating`
- **Экран проектора** (`/match/[id]/live`):
  - Тёмный фон, крупный шрифт (счёт 8xl), SSE (role=public)
  - Fullscreen API по клику, cursor:none
  - `live-scoreboard.tsx`, `live-current-round.tsx`
- **Зрительское голосование** (`/match/[id]/audience`):
  - Модель `AudienceVote` (@@unique [performanceId, sessionToken])
  - Mobile-first: кнопки 1-5, cookie `audience_token` (24 часа)
  - API `/api/match/[id]/audience-stats` — средние баллы зрителей
- **Защита от повторных судей**:
  - Cookie `judge_fingerprint` (30 дней) + поле `JudgeSession.fingerprint`
  - Предупреждение скореру через SSE при дублировании устройства
  - Admin → Аналитика (`/admin/analytics`): щедрость судей, разброс, повторные устройства
- **Протокол матча** (`/match/[id]/protocol`):
  - Print-friendly CSS, таблица по раундам, составы, MVP, подписи
- **iCal-экспорт** (`/api/schedule/ical`):
  - VCALENDAR с фильтрами season/team
  - Кнопка "Добавить в календарь" на `/schedule`

## v1.0.0 — Заявки на состав и трансферы (2026-04-03)

### Реализовано

- **Модель данных:**
  - Enum `ApplicationStatus` (PENDING/APPROVED/REJECTED), `RosterAppType` (NEW_PLAYER/TRANSFER)
  - Модель `RosterApplication` — единая заявка на нового игрока или трансфер
  - Поле `transferWindowOpen` в Season для управления трансферным окном
  - Relations в User, Player, TeamSeason → RosterApplication

- **Кабинет тренера — управление составом:**
  - `coach/_actions/roster.action.ts` — 3 actions: addNewPlayer, requestTransfer, removePlayer
  - `/coach/roster` — обновлённая страница с кнопками "Добавить" и "Убрать"
  - `/coach/roster/add` — форма добавления нового игрока (имя, контакты, роль, комментарий)
  - `/coach/transfers` — страница трансферов (статус окна, поиск игроков, список заявок)
  - API: `/api/coach/applications` (список заявок), `/api/coach/available-players` (поиск для трансферов)

- **Админ-модерация:**
  - `admin/moderation/_actions/moderation.action.ts` — approve/reject actions с автосозданием Player/PTS/Transfer
  - `/admin/moderation` — таблица заявок с фильтрами и кнопками одобрения/отклонения
  - Toggle трансферного окна в настройках сезона (`/admin/seasons/[id]`)
  - `toggleTransferWindowAction` в seasons.action.ts

- **Навигация:** "Трансферы" в coach sidebar, "Заявки" в admin sidebar

### Файлы

```
schema.zmodel (обновлён)
src/app/coach/_actions/roster.action.ts (создан)
src/app/coach/roster/page.tsx (обновлён)
src/app/coach/roster/_components/roster-client.tsx (создан)
src/app/coach/roster/add/page.tsx (создан)
src/app/coach/transfers/page.tsx (создан)
src/app/api/coach/applications/route.ts (создан)
src/app/api/coach/available-players/route.ts (создан)
src/app/admin/moderation/page.tsx (создан)
src/app/admin/moderation/_actions/moderation.action.ts (создан)
src/app/admin/seasons/_components/transfer-window-toggle.tsx (создан)
src/app/admin/seasons/_actions/seasons.action.ts (обновлён)
src/app/admin/seasons/[id]/page.tsx (обновлён)
src/app/admin/_components/admin-sidebar.tsx (обновлён)
src/app/coach/_components/coach-sidebar.tsx (обновлён)
```

## v1.2.0 — Адаптация под КБС-Москва 2026 (2026-04-03)

### Реализовано

- **Универсальная турнирная модель:**
  - Enum `TournamentFormat` (ROUND_ROBIN, SWISS), `StageType` (GROUP, PLAYOFF_UPPER, PLAYOFF_LOWER, GRAND_FINAL)
  - Настройки Season: format, maxSubstitutions, drawAllowed, homeVenuesEnabled, showLiveScore
  - Модели `Stage` (этап турнира), `BracketSlot` (слот в DE сетке), `PlayerSuspension` (отстранение)
  - `hasTiebreak` в Match для 11-й пары при ничьей
  - `ASSISTANT_COACH` роль, расширенные CardReason (PERFORMANCE, UNSANCTIONED_DISS, INSULT, AGGRESSION)

- **Бизнес-логика:**
  - `lib/swiss.ts` — генерация пар швейцарки по W-L записи, проверка повторов, bye
  - `lib/bracket.ts` — генерация DE сетки на 16 команд (WB R1-R4, LB R1-R7, гранд-финал)
  - `lib/cards.ts` — правила карточек по формату (2 жёлтых=красная для Москвы, дисквалификация для СПб)
  - `lib/roles.ts` — ASSISTANT_COACH в requireCoach

- **Админка:**
  - `/admin/seasons/[id]/stages` — создание этапов, генерация раундов швейцарки, генерация DE сетки
  - `/admin/seasons/[id]/bracket` — визуализация верхней/нижней сетки по раундам
  - Actions: createSwissStages, generateSwissRound, generatePlayoffBracket, getBracket

- **Публичная часть:**
  - `/bracket/[seasonSlug]` — визуальная турнирная сетка для зрителей

### Файлы

```
schema.zmodel (обновлён — TournamentFormat, StageType, Stage, BracketSlot, PlayerSuspension, Season fields, Match.hasTiebreak, Round.stageId, CardReason, PlayerRole)
src/lib/swiss.ts (создан)
src/lib/bracket.ts (создан)
src/lib/cards.ts (создан)
src/lib/roles.ts (обновлён)
src/app/admin/seasons/_actions/stages.action.ts (создан)
src/app/admin/seasons/[id]/stages/page.tsx (создан)
src/app/admin/seasons/[id]/bracket/page.tsx (создан)
src/app/(public)/bracket/[seasonSlug]/page.tsx (создан)
```

## v1.1.0 — Фото к матчам (2026-04-03)

### Реализовано

- **Инфраструктура изображений:**
  - Модель `MatchPhoto` (path, caption, order, size, mimeType, uploadedBy)
  - Enum `ImageCategory` (MATCH, TEAM, PLAYER, VENUE, OTHER)
  - API `/api/upload` — FormData загрузка (image/\*, max 10MB, auth: ADMIN или тренер команды)
  - API `/api/files/[...path]` — сервинг из `uploads/` с traversal-защитой и кэшированием
  - Утилита `getPhotoUrl()` — конвертация path → API URL

- **UI компоненты:**
  - `PhotoUploader` — drag & drop, множественная загрузка, preview, подписи к фото
  - `PhotoGallery` — responsive сетка (2/3/4 cols), lightbox с навигацией, удаление

- **Страницы:**
  - `/admin/matches/[id]/photos` — загрузка + галерея с удалением
  - `/coach/matches/[id]/photos` — загрузка (только свои матчи)
  - Публичная `/matches/[id]` — секция "Фото" с галереей

- **Server actions:** deletePhoto, updatePhotoCaption

### Файлы

```
schema.zmodel (обновлён — MatchPhoto, ImageCategory, relations)
src/lib/images.ts (создан)
src/app/api/upload/route.ts (создан)
src/app/api/files/[...path]/route.ts (создан)
src/app/_components/photo-uploader.tsx (создан)
src/app/_components/photo-gallery.tsx (создан)
src/app/admin/matches/[id]/photos/page.tsx (создан)
src/app/admin/matches/_actions/photos.action.ts (создан)
src/app/admin/matches/_components/matches-client.tsx (обновлён)
src/app/coach/matches/[id]/photos/page.tsx (создан)
src/app/(public)/matches/[id]/page.tsx (обновлён)
```

## v1.2.0 — Универсальная турнирная модель (2026-04-03)

### Реализовано

- **Турнирные форматы:** Round-Robin (СПб) + Swiss + Double Elimination (Москва)
- **Швейцарская система** (`lib/swiss.ts`): генерация пар по W-L, проверка повторов, bye
- **Double Elimination** (`lib/bracket.ts`): DE-сетка 16 команд (WB R1-R4, LB R1-R7, гранд-финал)
- **Модели:** Stage, BracketSlot, SwissRound, PlayerSuspension
- **Обновлённые карточки** (`lib/cards.ts`): 2 жёлтых=красная, диссы, отстранения
- **Заместитель тренера** (ASSISTANT_COACH), тай-брейк (11-я пара)
- **Админка этапов:** генерация раундов швейцарки и сетки DE

## v1.3.0 — Новости, донаты, PWA (2026-04-03)

### Реализовано

- **Новостная лента:** модель NewsPost, admin CRUD, markdown-рендеринг, связь с матчем
- **Донаты:** модель DonateLink, admin CRUD, публичная страница
- **PWA:** Service Worker (Network First + offline fallback), прекеширование, `/offline`

## v1.4.0 — Миграция данных с Tilda (2026-04-03)

### Реализовано

- Краулер + экстрактор HTML с grandslamcup.ru (cheerio)
- Seed v1: 1 город, 30 стадионов, 2 сезона, 23 команды, 83 матча

## v1.5.0 — Миграция из Telegram (2026-04-03)

### Реализовано

- **Seed v2** из `spb-clean.json` + `moscow-clean.json` (AI-экстракция из Telegram)
- 2 города, 97 площадок, 5 сезонов, 46 команд, 1136 игроков, 99 матчей

## v1.6.0 — Карточки в live scoring + автопродвижение (2026-04-03)

### Реализовано

- **Карточки в live scoring:** автоматическая красная при 2 жёлтых, SSE `card:issued`, CardDialog
- **Автопродвижение в сетке DE:** `bracket-advance.ts`, hook в `finishMatchAction`
- **Swiss standings:** W-L формат, badge "Швейцарская система"

## v1.7.0 — Mobile UX + E2E тесты (2026-04-03)

### Реализовано

- **Mobile UX:** hamburger menu (public, admin, coach), Drawer навигация, touch targets 44px (WCAG)
- **E2E тесты:** 28 тестов Playwright (public, standings, admin, teams/players)
- `loading.tsx` и `error.tsx` для public и coach

## v1.9.0 — Tournament Bracket UI (2026-04-03)

### Реализовано

- **Double Elimination визуализация:** CSS Grid + SVG коннекторы (desktop), SegmentGroup + tabs (mobile)
- 4 визуальных состояния: TBD, SCHEDULED, LIVE (pulsing), FINISHED (winner green)
- `useBracketPositions` для L-образных SVG-коннекторов

## v2.0.0 — City-Based Routing (2026-04-04)

### Реализовано

- **BREAKING:** все публичные URL включают город (`/spb/standings`, `/moscow/teams`)
- Корневая `/` — выбор города, `[citySlug]/layout.tsx`, `CityProvider` context
- Глобальные страницы: `/news`, `/rules`, `/donate`

## v2.1.0 — Swiss Bracket визуализация (2026-04-04)

### Реализовано

- **Swiss Bracket** (CS2 Major стиль): `lib/swiss-bracket.ts` + компоненты
- Desktop: CSS Grid 5×10 + SVG L-коннекторы (winner зелёный, loser красный пунктир)
- Mobile: Tabs по раундам + вертикальный список W-L групп
- Бейджи "В плей-офф" / "Вылет", сводка прогресса

## v2.3.0 — Редизайн публичных страниц (2026-04-05)

### Реализовано

- Расширена тема: анимации, stagger-классы
- Hero-блок, таблица standings, MatchCard, Header, Footer — полный визуальный полиш
- SectionHeading компонент, empty state

## v2.4.0 — Загрузка фото (2026-04-05)

### Реализовано

- `lib/upload/` — утилиты по паттерну driving-school
- API: `/api/upload/team-logo`, `/api/upload/entity-photo`
- `TeamLogoUploader`, `EntityPhotoUploader` — клиентские компоненты
- Admin + Coach: uploaders в формах

## v2.5.0 — Товарищеские матчи (2026-04-05)

### Реализовано

- Enum `MatchType` (REGULAR, FRIENDLY), опциональные `tourId`/`leagueId`
- Бейдж "Товарищеский", товарищеские не влияют на standings
- Фильтр ближайших матчей по дате

## v2.6.0 — Управление пользователями (2026-04-05)

### Реализовано

- `/admin/users` — список с поиском, роли и города в бейджах
- `/admin/users/[id]` — назначение ADMIN, организатора города
- Защита от самодемотирования

## v2.7.0 — Мобильная доступность админки (2026-04-08)

### Реализовано

- **17 таблиц** (админка + кабинет тренера): `overflowX="auto"` — горизонтальный скролл вместо обрезки
- **Matches ссылки** → выпадающее `Menu` (7 пунктов), колонка "Площадка" скрыта на мобиле
- **Roster admin:** фиксированные ширины → adaptive (`w="180px"` → `minW="140px"`), статус скрыт на мобиле
- **Touch targets:** кнопки edit/delete увеличены до 44×44px (WCAG 2.1 AA)
- **Moderation:** скрытие Роль/Подал/Дата на мобиле (8→5 колонок)
- **Layouts:** padding `p={6}` → `p={{ base: 3, md: 6 }}`
- **Диалоги:** responsive `maxW={{ base: "calc(100vw - 32px)", sm: "lg" }}`
- **Формы:** Telegram/VK поля стекаются на мобиле (`direction={{ base: 'column', sm: 'row' }}`)
- **Dark theme:** `border.muted`/`border.subtle` gray.800→gray.700 (видимые рамки полей ввода)

## Планирование: разворот в `resentiment` (2026-06-15)

> ⚠️ Сессия **проработки концепции, без реализации кода**. Результат — новый раздел **R (R.0–R.14)** в [PLAN.md](./PLAN.md). Коммиты: `8b3c193`, `c615338`, `915e7aa`, `6517658`.

### Проработано (план, не код)

- **Пивот:** `grandslamcup` → **resentiment** — из «сайта одного турнира КБС» в **мультифест-платформу** (white-label) для поэтических фестов. КБС остаётся legacy-инстансом (история + кроссфестинг). [R.0–R.1, R.6]
- **Экономика платформы (R.1.2):** комиссия с призового фонда (`platformFeePct`) + источники дохода (сбор за фест, аренда полевого комплекта, спонсоры, премиум, донаты).
- **Фест «Ресентимент» (R.2):** миссия (сублимация обиды, высказать наболевшее), девиз «СМЫСЛ важнее рифмы / ЧУВСТВА сильнее себя», команда «Сорянка», темы таймов «О себе»/«Путешествия», судейство после каждого выступления, заранее записанные выступления, множественные зачёты + зрительское голосование (зал/онлайн), роль `PRODUCER` + призовой фонд (50%).
- **Видео (R.3):** во все тематические разделы, теги стихов/тем.
- **ПНЧ «Поэты Не Читают» (R.4):** сатирический «Честный устав» строго в правовом поле (прозрачность + согласие), скрытный гэг судейства, двойная таблица «честная/уставная». **Только в Ресентименте.**
- **Полевой комплект (R.7):** локальный сервер + Wi-Fi-мост, обязательное мобильное судейство, офлайн-first.
- **Архитектура (R.13):** раздельные фронт-приложения/домены + **общая БД** (модульный монолит, не микросервисы); реестр поэтов `poets-hub`, публичное API стихов, премиум-сайты (поэт P0 → команда P1).
- **Формат «Двоемыслие» (R.14):** оси Смысл/Чувства, музыка/реквизит, фича «Допрос зала» (min/max по «Смыслу»).
- **Трассируемость (R.12):** 37 пунктов требований из диалога → разделы плана. Дорожная карта фаз R-A…R-R.

**Реализация отложена** (по решению пользователя — не ранее ~конца июня 2026). Следующий шаг: утвердить открытые вопросы R.10 → схема БД → миграция.

---

## Инцидент — потеря ADMIN-роли после консолидации аккаунтов в Ключнице (2026-07-03)

> ⚠️ Оперативный фикс прод-данных, без изменения кода.

### Проблема

После входа пользователя через Ключницу (OIDC) в grandslamcup создался **новый** локальный аккаунт `kami@letar.best` с ролью по умолчанию `USER` вместо `ADMIN`.

### Причина

Ключница (`auth-hub`) в какой-то момент консолидировала/удалила дублирующиеся пользовательские записи. Старые `Account.accountId` в grandslamcup (у двух личных ящиков владельца, один с ролью ADMIN) остались указывать на несуществующие id в `auth-hub`. При следующем OIDC-логине под актуальным ключница-аккаунтом Better Auth не нашёл совпадения по `accountId` и создал новый User без прав.

### Диагностика

- Сверка `grandslamcup.Account.accountId` ↔ `auth-hub.User.id` напрямую в прод-БД (SSH-туннель на s2, `docker exec <container> psql`) — оба старых accountId не найдены в `auth-hub`.
- Найден профиль `Player` («Ками Летар»), привязанный к старому ADMIN-аккаунту.

### Фикс

```sql
UPDATE "User" SET roles = ARRAY['ADMIN','USER']::"UserRole"[] WHERE id = 'xvBwgGJVLDk8E0eielKJB9H1BBnPqtG2';
UPDATE "Player" SET "userId" = 'xvBwgGJVLDk8E0eielKJB9H1BBnPqtG2' WHERE id = 'cmoj2dfq5000001pfh91g04nv';
```

Старые осиротевшие аккаунты (два личных ящика владельца) оставлены как есть — не мешают, просто больше не используются для входа.

### Вывод на будущее

Один и тот же паттерн способен повторяться в **любом** приложении на Ключнице (genericOAuth без явной привязки по email при отсутствии `accountId`-совпадения → новый юзер без ролей). Если аналогичная жалоба всплывёт в другом приложении — сначала сверять `Account.accountId` с текущим `auth-hub.User.id`, а не только роли.

---

## `prisma/seed.ts` — PrismaClient без driver adapter (2026-07-21, v3.37.4)

Тот же класс бага, что нашёлся и был первым продиагностирован в `mandala` (см. её
`PLAN_COMPLETED.md`, батч §18.7 M1/2): `import { PrismaClient } from '../src/generated/prisma'`
(bare index) резолвился в `zenstack:generate`-перезаписанный `export * from './browser'` —
там нет класса `PrismaClient`, только типы; плюс Prisma 7 требует явный driver adapter, `new
PrismaClient()` без параметров больше не собирается.

Фикс — импорт переведён на явный `../src/generated/prisma/client` + добавлен `PrismaPg`
adapter по образцу `animatrona-tracker/prisma/seed.ts`. Проверено локально (временный
`postgres:17-alpine` контейнер, `nx db:push` + `nx db:seed` — дошёл до реального запроса к БД,
контейнер удалён после проверки). Коммит `6efa4e59`.

---

## `ScorerLineupDialog` — `Box as="label"` заменён на `asChild` + onClick (2026-08-04, v3.38.3)

`.claude/rules/components.md` запрещает проп `as=` в Chakra UI v3. В строке выбора игрока
(`_components/scorer-lineup-dialog.tsx`, диалог заявки состава счетоводом) `Box as="label"`
оборачивал `Checkbox.Root` — комментарий рядом объяснял, что единственный обработчик клика висит
на скрытом input чекбокса, а `Box`-как-`label` просто ретранслирует клик туда.

Наивная замена на `asChild` + вложенный `<label><Checkbox.Root/></label>` создала бы
задокументированный в том же файле антипаттерн «`<input>` вложен в `<label>`» — двойной toggle
на клике прямо по чекбоксу (клик по input срабатывает напрямую + всплывает до label и
активирует его повторно).

Решение проще, чем `htmlFor`/`id`-пара: `Checkbox.Root` в Chakra v3 — не нативный `<input>`, а
компонент со своим `Checkbox.HiddenInput` внутри, так что `label`-семантика вообще не нужна.
`Box` избавлен от `as`/`asChild` целиком, вместо этого строка целиком кликабельна через
`onClick={() => toggle(player.id)}`; `Checkbox.Root` сохранил свой `onCheckedChange`, но с
`onClick={(e) => e.stopPropagation()}`, чтобы клик по самому чекбоксу не всплывал до строки и не
вызывал `toggle` дважды.

Проверено: `nx lint grandslamcup` — файл чист (221 существующая ошибка `curly` в других файлах
приложения не связана с правкой); `nx typecheck:tsgo grandslamcup` — 6 ошибок в других файлах,
файл не затронут.

---

### Фикс `references` на библиотеки в `tsconfig.json` (2026-08-07)

`apps/grandslamcup/tsconfig.json` ссылался на 9 библиотек через `references` — тот же
редирект-баг, что в `dashboard-agent` (0.11.1), см. `.claude/rules/libs.md`.

- Из `references` убраны все 9 ссылок на `libs/*`, оставлена только `./tsconfig.spec.json`.
- Добавлен `"rootDir": "../.."` — без него после удаления библиотечных `references` вылезал
  `TS6059: not under 'rootDir'` (тот же механизм, что в `form-develop-app`/`form-example`:
  приложение расширяет `tsconfig.next-app.json` с заданным `outDir`, TypeScript сам выводил
  узкий `rootDir`).
- `nx typecheck:tsgo grandslamcup --skip-nx-cache` — 8 ошибок `TS7006`/`TS7031` в 4 файлах
  (`city-form.tsx`, `season-form.tsx`, `team-form.tsx`, `venue-form.tsx`) — те же файлы/строки,
  что и в базовом прогоне до правки, не регрессия.
- `nx build grandslamcup --skip-nx-cache` — TypeScript-стадия проходит («Compiled successfully»);
  билд падает на сборе данных страницы `EACCES`/`AggregateError` при обращении к БД во время
  сбора статических данных — недоступность Postgres в текущем окружении, не связано с правкой.

---

**Последнее обновление:** 2026-08-07

---

# Наследие: ТЗ Кубка Большого Слэма (КБС) — завершённые фазы

> Перенесено из PLAN.md: 2026-08-09. Раздел "Наследие: ТЗ КБС" в PLAN.md описывает исходное
> ТЗ турнира до пивота на `resentiment`; ниже — те его части, которые полностью реализованы.
> Активные/незакрытые части КБС (Фазы 9–15 — не начаты, Фаза 6 Группы D/E/F, Фаза 5 п.33/37-хвост,
> раздел 11 Swiss Bracket — спроектирован, но не реализован) остались в PLAN.md.

## Фаза 8 — Альбомы стихов поэта

> Источник: задача 2026-05-16. Поэт может объединять свои стихи в именованные альбомы с обложкой.

### Контекст и мотивация

Сейчас стихи поэта отображаются плоским списком на странице профиля. Альбомы дают возможность группировать стихи по темам, периодам или подборкам — с визуальной обложкой и датой публикации.

---

### Техническое задание

#### База данных (schema.zmodel)

**Новая модель `Album`:**

```zmodel
model Album {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  coverImage  String?                          // путь к файлу, сервится через /api/files/
  publishedAt DateTime?                        // null = черновик
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  playerId    String
  player      Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
  albumPoems  AlbumPoem[]

  @@index([playerId])
  @@index([playerId, publishedAt])
  @@allow('read', publishedAt != null || (auth() != null && player.userId == auth().id))
  @@allow('create,update,delete', auth() != null && player.userId == auth().id)
  @@allow('create,update,delete', auth() != null && 'ADMIN' in auth().roles)
}
```

**Новая pivot-модель `AlbumPoem` (стих в альбоме):**

```zmodel
model AlbumPoem {
  id        String @id @default(cuid())
  albumId   String
  poemId    String
  sortOrder Int    @default(0)
  album     Album  @relation(fields: [albumId], references: [id], onDelete: Cascade)
  poem      Poem   @relation(fields: [poemId], references: [id], onDelete: Cascade)

  @@unique([albumId, poemId])
  @@index([albumId, sortOrder])
  @@allow('read', album.publishedAt != null || (auth() != null && album.player.userId == auth().id))
  @@allow('create,update,delete', auth() != null && album.player.userId == auth().id)
  @@allow('create,update,delete', auth() != null && 'ADMIN' in auth().roles)
}
```

**Изменения в существующих моделях:**

- `Player` — добавить `albums Album[]`
- `Poem` — добавить `albumPoems AlbumPoem[]`

**Slug альбома** генерируется через `transliterate(title)` + суффикс `-YYYYMM` при коллизии.

**Миграция:** `nx db:migrate grandslamcup -- --name add_album`

---

#### Публичный UI (страница поэта)

**Где:** `apps/grandslamcup/src/app/(public)/[citySlug]/players/[slug]/page.tsx`

**Что изменить:**

- В Prisma-запрос добавить `albums: { where: { publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' }, take: 4, select: { id, title, slug, coverImage, publishedAt, _count: { albumPoems } } }` + `_count: { albums: true }` для подсчёта всех альбомов и `_count: { poems: true }` для подсчёта стихов без альбома (через `NOT albumPoems.some`)
- Вставить `<PlayerAlbumsList>` **перед** `<PlayerPoemsList>` (альбомы вверху секции)
- Черновики на публичном профиле не показываются; управление черновиками — только через `/my/poems`

**Сетка постеров на профиле поэта:**

На странице поэта отображается одна горизонтальная сетка квадратных плиток. Максимум 6 плиток, с переносом на мобиле:

| Плитка                | Условие показа                                          | Содержимое                             |
| --------------------- | ------------------------------------------------------- | -------------------------------------- |
| Альбом × 4 (макс)     | Есть опубликованные альбомы                             | Обложка + год + название               |
| **«Разное»**          | Есть стихи, не входящие ни в один опубликованный альбом | Иконка + «Разное» + «N стихов»         |
| **«Все альбомы (N)»** | Количество опубликованных альбомов > 4                  | Иконка-стрелка + «Все альбомы» + число |

Плитка **«Разное»** — ссылка на якорь `#poems` (плоский список стихов ниже на той же странице). Название «Разное» отражает стихи вне альбомов — звучит нейтрально и по-человечески, не технически.

Плитка **«Все альбомы»** — ссылка на страницу `/{citySlug}/players/{slug}/albums` (список всех альбомов поэта). Появляется только если альбомов строго больше 4.

**Примеры раскладки:**

```
// 5+ альбомов, есть свободные стихи:
[Альбом 1] [Альбом 2] [Альбом 3] [Альбом 4] [Разное] [Все альбомы (7)]

// 2 альбома, есть свободные стихи:
[Альбом 1] [Альбом 2] [Разное]

// 4 альбома, нет свободных стихов:
[Альбом 1] [Альбом 2] [Альбом 3] [Альбом 4]

// Нет альбомов, есть стихи:
[Разное]   ← секция «Альбомы» не показывается, остаётся только PlayerPoemsList
```

**Внешний вид постера альбома:**

- `aspectRatio="1"` (квадратный), адаптивная ширина через CSS grid
- `Next.js Image` для обложки, иконка `LuBookOpen` как плейсхолдер если нет
- Под изображением: год из `publishedAt` (серый, мелкий) + название (жирное)
- Hover: `translateY(-2px)` + тень

**Плитка «Разное»:** нейтральный фон, иконка `LuScrollText`, текст «Разное» крупно + «N стихов» мелко снизу. Ссылка на `#poems`.

**Плитка «Все альбомы»:** нейтральный фон, иконка `LuLayoutGrid`, «Все альбомы» крупно + «(N)» в скобках. Ссылка на `/{citySlug}/players/{slug}/albums`.

**Стихи без альбома** остаются в `PlayerPoemsList` без изменений (плоский список с якорем `id="poems"` ниже по странице). Стихи в альбоме не скрываются из плоского списка.

**Новый роут** для полного списка альбомов: `/{citySlug}/players/{slug}/albums` — простая страница со всеми опубликованными альбомами поэта в сетке постеров (без ограничения в 4).

---

#### Страница альбома

**Новые роуты (создать оба):**

- `apps/grandslamcup/src/app/(public)/[citySlug]/players/[slug]/albums/[albumSlug]/page.tsx`
- `apps/grandslamcup/src/app/(public)/players/[slug]/albums/[albumSlug]/page.tsx` (дубль без citySlug — редирект на версию с городом, по аналогии с `/players/[slug]/poems/[poemSlug]`)

**Содержимое страницы альбома:**

- Hero: обложка (широкий баннер или квадратная превью), заголовок альбома, год публикации, имя поэта
- Список стихов с нумерацией и ссылками на `/{citySlug}/players/{slug}/poems/{poemSlug}`
- `generateMetadata` с OG-данными

**Компонент:** `albums/[albumSlug]/_components/album-poem-item.tsx` (Server Component) — строка стихотворения в списке.

---

#### Управление альбомами (личный кабинет)

**Новый раздел:** `apps/grandslamcup/src/app/my/poems/`

Страницы:

| Путь                              | Файл                                      | Описание                                        |
| --------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `/my/poems`                       | `my/poems/page.tsx`                       | Хаб управления: список стихов + список альбомов |
| `/my/poems/albums/new`            | `my/poems/albums/new/page.tsx`            | Форма создания альбома                          |
| `/my/poems/albums/[albumId]/edit` | `my/poems/albums/[albumId]/edit/page.tsx` | Редактирование альбома + состав стихов          |

Все страницы защищены `requirePoet()` с редиректом.

**Компоненты:**

| Файл                                  | Тип    | Пропсы                                    | Назначение                                                                              |
| ------------------------------------- | ------ | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `_components/albums-list.tsx`         | Client | `{ albums: AlbumListItem[], playerId }`   | Список альбомов: обложка, название, статус, кнопки «Ред.», «Удалить», toggle публикации |
| `_components/album-form.tsx`          | Client | `{ albumId?, initialData?, playerPoems }` | Форма создания/редактирования: title + upload обложки (с превью) + publishedAt          |
| `_components/album-poem-selector.tsx` | Client | `{ albumId, albumPoems, allPoems }`       | Два столбца «В альбоме» / «Все стихи», drag-n-drop порядка                              |

---

#### API: загрузка обложки

**Новый роут:** `apps/grandslamcup/src/app/api/upload/album-cover/route.ts`

- `POST multipart/form-data` с полями `file` (изображение) и опциональным `albumId`
- Авторизация через `requirePoetAction()`, проверка `album.playerId === poet.playerId`
- Ресайз через sharp (квадратная обрезка 800×800 или сохранение соотношения — уточнить)
- Сохранение в `uploads/albums/{albumId}/cover-{timestamp}.webp`
- Если `albumId` передан — сохранить путь в `Album.coverImage` и удалить старую обложку
- Вернуть `{ success: true, path, url }`

**Подход для нового альбома (albumId ещё не существует):**

1. Загрузить обложку → получить временный `path` (`uploads/albums/temp/...`)
2. Передать `path` в `createAlbumAction` как `coverImage`
3. В action — переместить файл в `uploads/albums/{newAlbumId}/`

---

#### Server Actions

**Файл:** `apps/grandslamcup/src/app/my/poems/_actions/album.action.ts`

| Action                      | Сигнатура                                                                           | Описание                                    |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| `createAlbumAction`         | `(input: { title, coverImage?, publishedAt? })` → `ActionResult<{ albumId, slug }>` | Создать альбом, переместить обложку из temp |
| `updateAlbumAction`         | `(input: { albumId, title, coverImage?, publishedAt? })` → `ActionResult`           | Обновить метаданные                         |
| `deleteAlbumAction`         | `(albumId)` → `ActionResult`                                                        | Удалить альбом (стихи остаются)             |
| `toggleAlbumPublishAction`  | `(albumId)` → `ActionResult<{ publishedAt }>`                                       | Поставить/убрать `publishedAt = now()`      |
| `addPoemToAlbumAction`      | `(input: { albumId, poemId })` → `ActionResult`                                     | Добавить стих в альбом                      |
| `removePoemFromAlbumAction` | `(input: { albumId, poemId })` → `ActionResult`                                     | Убрать стих из альбома                      |
| `reorderAlbumPoemsAction`   | `(input: { albumId, poemIds: string[] })` → `ActionResult`                          | Переупорядочить стихи (транзакция)          |

Каждый action вызывает `revalidatePath` для `/my/poems` и публичной страницы альбома.

---

#### Admin

**Изменить:** `apps/grandslamcup/src/app/admin/players/[id]/page.tsx`

- Добавить в Prisma-запрос: `albums: { select: { id, title, publishedAt, _count: { albumPoems } } }`
- Добавить секцию «Альбомы» после секции «Стихи»

**Новый компонент:** `apps/grandslamcup/src/app/admin/players/[id]/_components/player-albums-admin.tsx`

- Server Component с внутренними кнопками-ссылками
- Таблица: название | кол-во стихов | статус (опубликован/черновик) | дата | ссылка на редактирование

---

#### Типы

**Файл:** `apps/grandslamcup/src/app/my/poems/_types/album.types.ts`

```typescript
export interface AlbumListItem {
  id: string
  title: string
  slug: string
  coverImage: string | null
  publishedAt: Date | null
  _count: { albumPoems: number }
}

export interface PoemOption {
  id: string
  title: string
  slug: string
  published: boolean
}

export interface AlbumFormData {
  title: string
  coverImage: string | null
  publishedAt: string | null // ISO string
}
```

---

#### Структура новых файлов

```
apps/grandslamcup/
├── schema.zmodel                                             [ИЗМЕНИТЬ]
│
└── src/app/
    ├── api/upload/album-cover/route.ts                       [СОЗДАТЬ]
    │
    ├── (public)/[citySlug]/players/[slug]/
    │   ├── page.tsx                                          [ИЗМЕНИТЬ]
    │   ├── albums/[albumSlug]/
    │   │   ├── page.tsx                                      [СОЗДАТЬ]
    │   │   └── _components/album-poem-item.tsx               [СОЗДАТЬ]
    │   └── _components/
    │       ├── player-albums-list.tsx                        [СОЗДАТЬ]
    │       └── album-poster.tsx                              [СОЗДАТЬ]
    │
    ├── (public)/players/[slug]/albums/[albumSlug]/
    │   └── page.tsx                                          [СОЗДАТЬ] (redirect)
    │
    ├── my/poems/
    │   ├── page.tsx                                          [СОЗДАТЬ]
    │   ├── albums/new/page.tsx                               [СОЗДАТЬ]
    │   ├── albums/[albumId]/edit/page.tsx                    [СОЗДАТЬ]
    │   ├── _actions/album.action.ts                          [СОЗДАТЬ]
    │   ├── _components/
    │   │   ├── album-form.tsx                                [СОЗДАТЬ]
    │   │   ├── albums-list.tsx                               [СОЗДАТЬ]
    │   │   └── album-poem-selector.tsx                       [СОЗДАТЬ]
    │   └── _types/album.types.ts                             [СОЗДАТЬ]
    │
    └── admin/players/[id]/
        ├── page.tsx                                          [ИЗМЕНИТЬ]
        └── _components/player-albums-admin.tsx               [СОЗДАТЬ]
```

---

### Задачи (чеклист) — ✅ ВЫПОЛНЕНО 2026-05-17 (v3.35.0)

#### Фаза 1: База данных

- [x] Добавить модели `Album` и `AlbumPoem` в `schema.zmodel`
- [x] Добавить `albums Album[]` в `Player`, `albumPoems AlbumPoem[]` в `Poem`
- [x] `nx zenstack:generate grandslamcup`
- [x] `nx db:migrate grandslamcup -- --name add_album`

#### Фаза 2: API загрузки обложки

- [x] `apps/grandslamcup/src/app/api/upload/album-cover/route.ts`

#### Фаза 3: Server Actions

- [x] `my/poems/_actions/album.action.ts` (9 actions)
- [x] `my/poems/_types/album.types.ts`

#### Фаза 4: Публичный UI

- [x] `_components/album-poster.tsx` (Client Component)
- [x] `_components/player-albums-list.tsx` (Server Component)
- [x] `albums/[albumSlug]/page.tsx` с `generateMetadata`
- [x] `albums/[albumSlug]/_components/album-poem-item.tsx`
- [x] Обновить `[slug]/page.tsx` — добавить загрузку альбомов
- [x] `(public)/players/[slug]/albums/[albumSlug]/page.tsx` (редирект-дубль)
- [x] `(public)/[citySlug]/players/[slug]/albums/page.tsx` (все альбомы)

#### Фаза 5: Управление в /my/poems

- [x] `my/poems/page.tsx`
- [x] `_components/album-form.tsx`
- [x] `_components/albums-list.tsx`
- [x] `_components/album-poem-selector.tsx`
- [x] `_components/album-cover-upload.tsx`
- [x] `my/poems/albums/new/page.tsx`
- [x] `my/poems/albums/[albumId]/edit/page.tsx`

#### Фаза 6: Admin

- [x] Обновить `admin/players/[id]/page.tsx` — секция альбомов в карточке

#### Фаза 7: Качество

- [x] `nx typecheck:tsgo grandslamcup` — 0 ошибок в новых файлах
- [x] `nx lint grandslamcup` — eslint --fix curly (44 → 0) + dprint format
- [x] `PlayerPoemsList`: добавить `id="poems"` для якоря плитки «Разное»
- [x] `prisma/seed.ts` + `db:seed` target

---

---

## Фаза 6 — Обратная связь 2026-04-10 (v3.22.0+)

> Источник: заметки пользователя, `C:\Users\Kami\Desktop\КБС.md`, после прогона матча в СПб.

### Группа A — Критические production-баги

1. ~~**404 на `/admin/matches/[id]/edit`**~~ ✅ v3.23.0 — удалена ссылка «Редактировать матч» из desktop- и mobile-вариантов таблицы `matches-client.tsx`. Редактирование оценок остаётся через `EditScoresButton` на детальной странице. Полноценный edit-роут — в скоупе Группы C.

2. ~~**Страница поэта в админке падает**~~ ✅ v3.23.0 — убрано `pendingUserId: true` из `include` в `admin/players/[id]/page.tsx:37`. Это скалярное поле, а не relation.

3. ~~**Протокол матча вешает ошибку**~~ ✅ v3.23.0 — в Next.js 16 Server Component не может иметь inline `onClick`. Кнопка печати вынесена в client-компонент `protocol/_components/print-button.tsx`. Добавлен `protocol/error.tsx`.

4. ~~**Модал «Карточка» появляется за пределами экрана**~~ ✅ v3.23.0 — `card-dialog.tsx` переписан с устаревшей `<DialogRoot><DialogContent>` на compound `Dialog.Root → Portal → Dialog.Backdrop → Dialog.Positioner → Dialog.Content`.

5. ~~**Push-уведомления: «не удалось подписаться»**~~ ✅ v3.23.0 — добавлены `res.ok` проверки на клиенте (`push-subscribe-button.tsx`), серверный `route.ts` обёрнут в try/catch с осмысленными ошибками. При ошибке сервера клиент откатывает браузерную подписку.

6. ~~**Неверные статусы матчей 1 марта**~~ ✅ v3.23.0 — `getDisplayStatus` существовала в `match-status.ts`, но **нигде не использовалась в UI**. Заменено на `getDisplayStatus(match)` в 6 местах: `matches-client.tsx` (desktop+mobile), `match-hero-admin.tsx`, `(public)/matches/[id]`, `(public)/[citySlug]/matches/[id]`, `match-card.tsx`, `opengraph-image.tsx`, `coach/matches/page.tsx`. Локальные дубли `STATUS_LABEL`/`STATUS_COLOR` удалены в пользу общих `matchStatusLabels`/`matchStatusColors`.

### Группа B — UX счетовода / ведущего / тренера

7. ~~**Личные кабинеты счетовода и ведущего в меню пользователя**~~ ✅ v3.24.0 — `/api/auth/me` возвращает `isScorer`/`isPresenter`, `UserMenu` показывает пункты «Кабинет счетовода» / «Кабинет ведущего» только для назначенных. Созданы страницы `/my/scorer-matches` и `/my/presenter-matches` с секциями LIVE/предстоящие/прошедшие.

8. ~~**Полный ручной контроль счетовода**~~ ✅ v3.24.0 — добавлены 2 server action: `forceCompleteVotingAction` (завершение голосования с неполным жюри, гибкий подсчёт adjusted) и `updatePerformanceScoresAction` (редактирование оценок уже подсчитанного выступления + пересчёт счёта матча). UI в `vote-panel.tsx`: кнопка «Завершить с неполным жюри» во время фаз голосования + `ScoreEditorDialog` (✏ рядом с каждым выступлением в истории).

9. ~~**Быстрый ввод оценок — кликабельные блоки 1-5**~~ ✅ v3.24.0 — новый компонент `scorer-vote-input.tsx`: 5 колонок по одному на судью, в каждой блоки 1-5 с цветом судьи (`JUDGE_COLORS`). Использует существующий `enterManualVoteAction`. Колонка блокируется когда судья проголосовал. Показывается в `vote-panel.tsx` во время TEXT_VOTING/DELIVERY_VOTING.

10. ~~**Большой таймер ведущего на весь экран**~~ ✅ v3.24.0 — новый компонент `fullscreen-timer.tsx`: `position:fixed inset:0 bg:black`, цифры через `clamp(6rem, 30vw, 40rem)`, обратный отсчёт 3:00 → 0:00 → «+» для превышения. Крупные кнопки старт/стоп/сброс. Кнопка «Таймер на весь экран» в `presenter-client.tsx`, выход по ESC или кнопке.

11. ~~**Ведущий умеет работать без скорера**~~ ❌ **отменено 2026-04-10** — Скорер всегда присутствует на матче. У ведущего узкоспециализированный интерфейс только для него самого (таймер, жеребьёвка, отвод судей, подсказки залу). Скорер может работать один (ведущий подаёт знаки аналогово) или оба с интерфейсами — тогда часть ведущего автоматизируется. Улучшения интерфейса ведущего пойдут отдельной задачей, не через дублирование функционала скорера.

12. ~~**Счетовод может заявить состав за команду**~~ ✅ v3.24.0 — новый server action `submitScorerLineupAction` с проверкой `match.scorerUserId === currentUser.id || isAdmin` (без 6-часового окна). В `scorer-client.tsx` секция «Составы команд» с двумя карточками и кнопкой «Заявить состав» / «Изменить состав». Новый диалог `scorer-lineup-dialog.tsx` с чекбоксами из roster команды (5-8 игроков). `page.tsx` загружает `roster` для обеих команд.

13. ~~**Кабинет тренера — расширить редактирование команды**~~ ✅ v3.24.0 — `/coach/page.tsx` теперь показывает `<EditTeamButton>` рядом с именем команды (видна только для `coach.role === 'COACH'`, не для ASSISTANT_COACH). Добавлено отображение description команды под заголовком. Переиспользует существующий диалог редактирования.

### Группа C — Пошаговый пайплайн проведения матча

14. ~~**Редизайн интерфейса скорера как последовательного workflow**~~ ✅ v3.25.0 — реализован 11-шаговый wizard в `apps/grandslamcup/src/app/match/[id]/score/_components/wizard/`. Ключевое архитектурное решение: wizard state **вычисляемый** через `computeWizardStep(match, matchState)` — нет локальной machine, просто реактивное отображение текущего состояния матча. При любом SSE event wizard автоматически перерисовывается на нужный шаг.

    **Реализованные шаги:**
    1. ✅ START_MATCH — большая кнопка старта + проверка составов
    2. ✅ SELECT_JURY — QR + 5 слотов с цветами + ручное назначение
    3. ✅ COIN_FLIP — две карточки команд + кнопка жеребьёвки
    4. ✅ PERFORMER_PICK — ожидание тренера + fallback ручного выбора
    5. ✅ TEXT_VOTING — имя + таймер + ScorerVoteInput + кнопка force-complete
    6. ✅ DELIVERY_VOTING — тот же компонент с prop dimension
    7. ✅ PAIR_RESULTS — разбор пары (отброс min/max) + победитель
    8. ✅ HALF_SUMMARY — итоги тайма, топ-3, таблица всех пар
    9. ✅ INTERMISSION — перерыв с таймером
    10. Объединено с 11 → финальный экран
    11. ✅ VICTORY_POEM — выбор поэта команды-победителя
    12. ✅ MATCH_FINISHED — финальный счёт + MVP + ссылки

    **Стратегия отката:** `?mode=classic` → возврат к старому `scorer-client.tsx` (не трогался, остаётся для emergency).

15. ~~**Поле «победное стихотворение» в модели Match**~~ ✅ v3.25.0 — добавлено `Match.victoryPoemPlayerId: String?` с relation `victoryPoemPlayer Player?`. Миграция `add_victory_poem`. Используется в шаге VICTORY_POEM + отображается в MATCH_FINISHED.

---

## Фаза 5 — Обратная связь и доработки (v2.7.0+)

> Источник: фидбек от Морены Лабутиной (зам. тренера) и организаторов, 2026-04-06

### Группа A — Баги и критические исправления

1. ~~**Тренер не может редактировать профили игроков с привязанной учёткой**~~ ✅ v2.8.0

2. ~~**Метка "ASSISTANT_COACH" отображается как raw enum**~~ ✅ v2.8.0

3. ~~**На мобиле в админке не листается таблица вправо**~~ ✅ v2.7.0

4. ~~**Поля ввода не видны на тёмной теме**~~ ✅ v2.7.0

5. ~~**Команда "СТИХИ НАРОДА" → 404**~~ ✅ v2.8.0 (redirect на правильный город)

6. ~~**Нет отступа логотипа от шапки на мобиле (главная)**~~ ✅ v2.8.0

7. ~~**Прошедшие матчи остаются в статусе SCHEDULED**~~ ✅ v2.8.0 (псевдостатус PAST_SCHEDULED)

### Группа B — Роли и модель команды

8. ~~**Рефакторинг ролей в команде**~~ ✅ v3.6.0
   - Ограничение 1 COACH на команду (5 проверок), фильтрация неиграющих на паблике

9. ~~**Счетовод и ведущий — новые роли**~~ ✅ v3.6.0
   - Назначение в админке (dropdown), страницы `/presenters` и `/scorers`

10. ~~**Привязка поэта к учётке — улучшение UX**~~ ✅ v2.9.0
    - Кнопка "Это я" на публичной странице поэта → заявка с модерацией (pendingUserId)
    - ✅ UI одобрения в модерации — диалог подтверждения с аватаром, данными пользователя, причиной отказа (v3.18.0)

### Группа C — Расширенная статистика

11. ~~**Рейтинговая таблица поэтов**~~ ✅ v3.0.0
    - Колонки "Всего" и "Лучший", сортировка по суммарному баллу
    - ✅ График динамики балл��в (recharts) + таблица ��стории соперников (v3.18.0)

12. ~~**Расширенная статистика поэта**~~ ✅ v3.0.0
    - Карточки, тридцатки, процент побед, ср. время, метка "Дебют"

13. ~~**Статистика в кабинете тренера**~~ ✅ v3.0.0
    - W/D/L, очки, средний балл, топ-3 перформера

14. ~~**Карточки на страницах поэтов и команд**~~ ✅ v3.0.0
    - Поэт: badge в hero. Команда: суммарные + предупреждение о дисквалификации

15. ~~**Реестр дисквалифицированных поэтов**~~ ✅ v3.10.0
    - Чтение чужих стихов → минимальные оценки (1) + дисквалификация на сезон
    - ✅ Админка `/admin/suspensions` — управление отстранениями, создание с поиском поэта
    - ✅ Кнопка "Плагиат" в деталях матча `/admin/matches/[id]` — обнуление оценок + дисквалификация
    - ✅ Публичный реестр `/[citySlug]/suspensions` — "Чтение чужих стихов", "До конца сезона"
    - ✅ Проверка при формировании заявки — дисквалифицированные не допускаются

### Группа D — Кликабельность и навигация

16. ~~**Ссылки в таблицах и списках**~~ ✅ v3.1.0
    - Кабинет тренера, roster, матч — все имена кликабельны

17. ~~**Бесконечная загрузка для списков**~~ ✅ v3.6.0
    - "Показать ещё" для поэтов и команд (server-side pagination)

18. ~~**Индикация загрузки**~~ ✅ v3.1.0
    - TopLoader + loading.tsx для match, profile, sign-in

19. ~~**Активный матч в расписании**~~ ✅ v3.1.0
    - LIVE матчи в отдельной секции "Сейчас идёт", не попадают в прошедшие

### Группа E — Кабинет тренера (доработки)

20. ~~**Ближайшие матчи и мотивация заполнить состав**~~ ✅ v3.2.0
    - CTA "Заявить состав" на дашборде, предупреждения по времени
    - ✅ Push-уведомления за день до матча — модель PushSubscription, web-push API, кнопка подписки в хедере, cron endpoint (v3.18.0)

21. ~~**Заявки — упрощение**~~ ✅ v2.9.0
    - Тренер добавляет игроков мгновенно, модерация только для трансферов

22. ~~**Товарищеские матчи**~~ ✅ v3.2.0 → v3.7.0 → v3.17.0 (challenge workflow)
    - Организатор создаёт через `/admin/matches/create`
    - ✅ Заявка от тренера: модель FriendlyMatchRequest, `/coach/friendly`, модерация `/admin/moderation/friendly`
    - ✅ v3.17.0: Workflow «Тренер → Соперник → Админ» — тренер-соперник принимает/отклоняет вызов перед модерацией

23. ~~**Заявка состава на матч из кабинета тренера**~~ ✅ v3.2.0
    - `/coach/matches/[id]/lineup` — выбор 5-8 игроков, предзаполнение
    - Отображение в Telegram-афише с гиперссылками на профили

### Группа F — Telegram-бот

24. ~~**Бот для публикации в канал Telegram**~~ ✅ v3.14.0
    - ✅ Модель TelegramConfig (глобальный токен) + City.telegramChatId (канал города)
    - ✅ Кнопки "Анонс", "Итог тайма", "Результат" в админке матча
    - ✅ Афиша: составы, ведущий, счетовод, ссылки на профили, Яндекс.Карты
    - ✅ Метка 🆕 для дебютантов, товарищеские с другим заголовком
    - ✅ Промежуточные итоги по таймам, финальный результат с MVP и карточками
    - ✅ /admin/settings — настройки бота (токен, тест, вкл/выкл)
    - ✅ API cron: `/api/telegram/weekly` и `/api/telegram/today`
    - TODO: Настроить cron на сервере после деплоя — согласовать расписание с организаторами
      - `GET /api/telegram/weekly?secret=CRON_SECRET` — еженедельное расписание (предложение: пн 09:00 МСК)
      - `GET /api/telegram/today?secret=CRON_SECRET` — утреннее напоминание (предложение: ежедневно 09:00 МСК)
      - `GET /api/push/match-reminder?secret=CRON_SECRET` — push за день до матча (предложение: ежедневно 17:00 МСК)
    - ✅ Постер (satori→PNG) для анонсов и результатов — автоматически с sendPhoto (v3.18.0)

### Группа G — Пайплайн матча (ревизия)

25. **Детальная ревизия пайплайна проведения матча** (в процессе)
    - Создание матча организатором: команды, время, место, счетовод, ведущий
    - Тренеры заявляют составы через кабинет
    - После заполнения — матч можно опубликовать в Telegram
    - ~~**Интерфейс тренера:** выбор кто выходит, статус игроков (не играл / 1-й тайм / оба), **отвод судьи**~~ ✅ v3.11.0
    - ~~**Интерфейс ведущего:** жеребьёвка, опция "разрешён ли отвод судьи"~~ ✅ v3.12.0
    - ~~**Интерфейс судьи:** изменение голоса до финального подсчёта, cookie-блокировка для 2-го тайма~~ ✅ v3.12.0
    - ~~**Интерфейс счетовода (оффлайн):** полная работа без интернета (предзагрузка составов → IndexedDB), ввод оценок вручную, публикация при восстановлении связи~~ ✅ v3.13.0
    - ~~**Интерфейс проектора:** экран перерыва с донатами, "оставить подарок на баре"~~ ✅ v3.12.0
    - Нет возможности добавить новый матч из админки — ✅ уже есть `/admin/matches/create`
    - ~~Нет ручного ввода/редактирования оценок и итогов в админке — добавить~~ ✅ v3.12.0
    - ~~Фильтры матчей в админке по городу и статусу~~ ✅ v3.12.0

### Группа H — Личный кабинет поэта

26. ~~**Личный кабинет поэта**~~ ✅ v3.3.0
    - `/poet` — дашборд, профиль, стихи. Модель Poem с CRUD.

27. ~~**Ссылка на Ключницу в профиле**~~ ✅ v3.3.0
    - Ссылка "Настройки аккаунта" в `/poet/profile`

### Группа I — Фотографии

28. ~~**Увеличить лимит загрузки до 15 МБ + ресайз**~~ ✅ v3.4.0
    - 15 МБ лимит, sharp ресайз до 1920px, аватары 400x400

29. ~~**Кадрирование 1:1 для фото профиля поэта**~~ ✅ v3.4.0
    - react-easy-crop (круглый, aspect 1:1) в EntityPhotoUploader

### Группа J — Прочее

30. ~~**Объединение дублей профилей поэтов**~~ ✅ v3.7.0
    - Пример: "Судаков Павел" и "Паша Судаков" — один человек
    - ✅ `/admin/players/merge` — поиск, preview переносимых данных, транзакционное объединение с проверкой unique constraints

31. ~~**История команд поэта**~~ ✅ v3.6.0
    - Timeline на профиле поэта: сезон, команда, лига, роль, даты

32. ~~**Мобильная админка — полная проверка**~~ ✅ v3.21.0
    - ✅ 3 shared-компонента: AdminResponsiveList, AdminCard, AdminActionsMenu
    - ✅ 14 таблиц → карточки на mobile (< md): Cities, Venues, Seasons, Teams, Players, Matches, Moderation, Friendly, Claims, Suspensions, Users, News, Donate
    - ✅ Фикс search/filter overflow: minW="200px" → minW="0", dropdown w={{ base: '100%', sm: '200px' }}
    - ✅ Action-кнопки → ⋮ меню на mobile через AdminActionsMenu
    - ✅ Шапка: «КБС Админ» на mobile, имя пользователя скрыто на < md
    - ✅ Desktop-вид без изменений — переключение через display={{ base, md }}

33. **Трансляция матча на сайте (вопрос)**
    - Возможность встраивания стрима (YouTube/VK Live) на страницу матча
    - Требует уточнения у организатора

34. ~~**Новости и Поддержать — привязка к городу**~~ ✅ v3.6.0
    - cityId на NewsPost/DonateLink, городские роуты, header/footer ссылки, выбор города в админке

35. ~~**Привязка поэт↔пользователь из админки**~~ ✅ v3.9.0
    - `/admin/players/[id]`: секция привязки — привязать по email, отвязать, одобрить/отклонить заявку "Это я"
    - `/admin/users/[id]`: секция привязки — поиск поэта по имени с debounce, привязка, отвязка
    - `/admin/moderation/claims`: страница модерации заявок "Это я" (pendingUserId)
    - Кнопка "Привязка профилей" с badge на странице модерации

### Группа K — Инфраструктура

36. ~~**Staging-окружение gsc-test.letar.best**~~ ✅ (устарело, s1 выведен из эксплуатации
    2026-06-20 — см. пункт 37 ниже, полностью заменено новым пайплайном на s3)
    - ✅ `docker-compose.staging.yml` — отдельные контейнеры на s1 (порты 5453/3016)
    - ✅ `.env.staging.example` — шаблон переменных
    - ✅ `--staging` флаг в `deploy-affected.sh` (compose, env, image tag)
    - ✅ `infra/staging/sync-db-staging.sh` — pg_dump/restore prod→staging
    - ✅ SSH s1→s2 настроен для скрипта синхронизации
    - ✅ OIDC redirect URI в `auth-hub/src/lib/auth.ts` (trustedClients)
    - ✅ `robots.ts` запрещает индексацию staging-доменов
    - ✅ Зарегистрирован в Dashboard (DeployedApp на s1)
    - Workflow: `./deploy-affected.sh --app grandslamcup --staging` → проверка → prod

37. ~~**Staging-пайплайн на s3, HTTPS-домен, deploy-mcp e2e-gate (§18 Сессия D)**~~ ✅ 2026-07-11
    - ✅ Домен `grandslamcup-stage.s3.letar.best` (один лейбл — под существующий DNS wildcard
      `*.s3 CNAME s3.letar.best`), NPM proxy host на s3 + Let's Encrypt HTTP-01
    - ✅ `.env.staging` на s3 — `OIDC_CLIENT_SECRET` тот же, что у прод-клиента `grandslamcup-prod`
      (не отдельный секрет), redirect URI зарегистрирован в auth-hub seed.ts
    - ✅ Данные — анонимизированный снепшот прода (`scripts/anonymize-staging-db.ts`), не пустая
      БД: `pg_dump` без Account/Session/Verification/consentLog/PushSubscription →
      `pg_restore --data-only` → анонимизация User/RosterApplication
    - ✅ `deploy_app({target:"staging"})` → `run_e2e` → `e2e_status` через deploy-mcp — первый
      живой прогон end-to-end (нашёл и починил баг раннера в dashboard-agent, не в grandslamcup)
    - ~~⚠️ Гипотеза «нет активного сезона» (3/28 passed)~~ ❌ **не подтвердилась** — настоящая
      причина: `anonymize-staging-db.ts` анонимизировал служебный e2e-fixture
      `admin@grandslamcup.ru`, ломая весь admin-пласт тестов. ✅ Исправлено — email исключён из
      анонимизации.
    - ✅ **Alt-баг подтверждён и исправлен** — `getByAltText('Grand Slam Cup')` резолвился в
      header+hero на `/` (оба легитимны для доступности), тест теперь скоупит через
      `page.locator('header')`.
    - ✅ **`01-public.spec.ts` обновлён под мультигород** — `/` это city-selector без меню
      (`buildNavItems` возвращает `[]` на root), секции дашборда живут только на `/[citySlug]` —
      тесты теперь делают `goto('/spb')` перед проверкой.
    - ✅ **Снепшот пересобран с фиксом → 18/28 passed** (было 3/28). Попутно найдены и починены
      BlackCove: (1) в `.env.staging` не было `DATABASE_URL` — скрипты подхватывали закоммиченный
      dev `.env` (прод-порт 5453) → `ECONNREFUSED`; (2) **🔴 критично** — `POSTGRES_PASSWORD` через
      `openssl rand -base64 32` содержал `+`/`/`/`=`, ломавшие парсинг `DATABASE_URL` при
      интерполяции в `docker-compose.staging.yml` → **все страницы staging отдавали 500** с самого
      первого деплоя (прогон 3/28 шёл на неработающем приложении, не на «недостающих данных») —
      перегенерирован через `openssl rand -hex 32` (без спецсимволов; для чего угодно, что
      интерполируется в connection string — `-hex`, не `-base64`).
    - ⚠️ **Осталось 10/28, разбито по категориям:**
      - **7 — все `03-admin.spec.ts`.** ✅ **Три архитектурных бага найдены и закрыты системно
        (не только в grandslamcup), см. корневой `PLAN.md` §18 Сессии №58–60:**
        1. `/api/auth/dev-session` проверял `NODE_ENV === 'production'`, структурно сломано на
           любом production-билде (staging тоже). Вынесено в `createDevSessionRoute`
           (`@letar/auth/server`) с двойной защитой `ALLOW_DEV_SESSION`+`DEV_SESSION_TOKEN`.
        2. Редирект строился от `request.url`, резолвящегося в bind-адрес контейнера `0.0.0.0` —
           браузер получал `ERR_CONNECTION_REFUSED` при валидной cookie. Base URL теперь
           резолвится из `x-forwarded-host`/`host` заголовков.
        3. Cookie ставилась под именем `better-auth.session_token` без `__Secure-` префикса —
           Better Auth сам требует этот префикс + атрибут `Secure`, когда `BETTER_AUTH_URL`
           начинается с `https://` (staging/prod), и не находил сессию под другим именем.
           Новая опция `useSecureCookies` в фабрике решает это по умолчанию.
           `@letar/auth` 0.7.0 → 0.8.2. `global-setup.ts` больше не доверяет `waitForURL`-паттерну —
           проверяет факт установки cookie. Паттерн задокументирован в `.claude/docs/e2e-testing.md`
           для тиража на будущие staging-e2e приложения (§18.6).
        4. `dashboard-agent` `run_e2e` не переключался на пользователя `deploy` перед `nx e2e` —
           root-owned `.nx`/`test-output` блокировали последующие деплои/прогоны (`EACCES`).
           Фикс через `sudo -u deploy -H`, следом регрессия — голый `sudo` сбрасывал `BASE_URL`/
           `DEV_SESSION_TOKEN`, чинилось `--preserve-env=BASE_URL,DEV_SESSION_TOKEN`.
           `dashboard-agent` 0.7.2 → 0.7.4.
        5. `apps/grandslamcup-e2e/src/global-setup.ts` искал cookie `better-auth.session_token`
           без учёта `__Secure-` префикса из п.3 — заменено на поиск по суффиксу
           (`cookie.name.endsWith(...)`). Поправлено BlackCove напрямую, коммит `50d72bc`.
           **✅ Закрыто 2026-07-11 — 24/28 passed**, `[Global Setup] Admin авторизован` подтверждён.
      - **Осталось 4/28, все тестовые, не инфраструктура (staging-пайплайн деплоя/e2e сам по себе
        закрыт и стабилен — см. выше, доделывать нужно только тесты):**
        1. `01-public.spec.ts` — «переход на Расписание»: `strict mode violation`, локатор ссылки
           совпадает одновременно с header- и footer-навигацией.
        2. `01-public.spec.ts` — «Ближайшие матчи» не рендерится на `/spb`: вероятно, в
           анонимизированном снепшоте нет матчей с датой в будущем относительно текущего времени
           сервера. Не разобрано глубже (нужно проверить данные снепшота или сгенерировать
           тестовый матч в будущем).
        3. `03-admin.spec.ts` — «список городов загружается»: `strict mode violation`,
           `getByText('Санкт-Петербург')` совпадает и с `<p>`, и с `<td>` в таблице.
        4. `03-admin.spec.ts` — «список сезонов загружается»: та же природа,
           `getByText('КБС СПб Сезон 1')` совпадает и с `<p>`, и с `<td>`.
        - **➡️ Следующая задача (владелец `grandslamcup-e2e`):** сузить локаторы в пп. 1, 3, 4
          через `page.locator('header')`/`page.locator('table')`/`data-testid` (по аналогии с уже
          применённым фиксом alt-текста логотипа); по п. 2 — проверить/дополнить данные снепшота.
          Не блокирует staging-пайплайн — можно делать в любое время.
    - Подробности процесса — корневой `PLAN.md` §18 (Сессии №55–61), `apps/dashboard-agent/
PLAN_COMPLETED.md` v0.7.4, тред agent-mail `grandslamcup-staging-pilot`.

---

---

## 10. Фазы реализации

### Фаза 1 — MVP

1. ~~Создание приложения в монорепо~~ ✅ v0.1.0
2. ~~Модель данных (schema.zmodel)~~ ✅ v0.2.0
3. ~~Auth (суперадмин + организаторы + тренеры)~~ ✅ v0.1.0
4. ~~Админка: сезоны, команды, игроки, стадионы, матчи~~ ✅ v0.3.0 + v0.4.0
5. ~~**Живой скоринг: судьи на телефонах + скорер** (Phase 1 MVP)~~ ✅ v0.5.0
6. ~~Таймер с вибрацией + отмена голосования + таймаут судей + экран ведущего (Phase 2)~~ ✅ v0.6.0
7. ~~MVP матча (автоматически)~~ ✅ v0.7.0
8. ~~Публичная часть: таблицы, расписание, профили команд, результаты матчей~~ ✅ v0.7.0
9. ~~Шаринг результатов (OG-карточки для Telegram/VK)~~ ✅ v0.7.1
10. ~~Миграция данных с Tilda~~ ✅ v1.4.0 (итерация 1 — СПб из HTML)
    ~~10b. Миграция данных из Telegram (итерация 2 — СПб + Москва из AI-экстракции)~~ ✅ v1.5.0
11. ~~Деплой~~ ✅ v2.7.0

### Фаза 2 — Расширение

1. ~~Кабинет тренера (заявки на матч, управление составом)~~ ✅ v0.8.0
2. Уведомления тренерам (email / Telegram — за день до матча)
3. ~~Регистрация команд / заявки / трансферы~~ ✅ v1.0.0
4. ~~Личный зачёт поэтов (рейтинги, профили)~~ ✅ v0.9.0
5. ~~Экран для проектора (`/match/[id]/live`)~~ ✅ v0.9.0
6. ~~Зрительское голосование (народное жюри)~~ ✅ v0.9.0
7. ~~Защита от повторных судей + аналитика судейства~~ ✅ v0.9.0
8. ~~Протокол матча (PDF)~~ ✅ v0.9.0
9. ~~Страницы стадионов с картой~~ ✅ v0.8.0
10. ~~iCal-экспорт расписания~~ ✅ v0.9.0

### Фаза 3 — КБС-Москва 2026

1. ~~Универсальная турнирная модель (ROUND_ROBIN + SWISS)~~ ✅ v1.2.0
2. ~~Швейцарская система (генерация раундов)~~ ✅ v1.2.0
3. ~~Double Elimination плей-офф (сетка 16 команд)~~ ✅ v1.2.0
4. ~~Обновлённые карточки (2 жёлтых=красная, диссы, отстранения)~~ ✅ v1.2.0
5. ~~Заместитель тренера (ASSISTANT_COACH)~~ ✅ v1.2.0
6. ~~Тай-брейк при ничьей (11-я пара)~~ ✅ v1.2.0
7. ~~Интеграция карточек в live scoring (автоматическая красная при 2 жёлтых)~~ ✅ v1.6.0
8. ~~Автопродвижение в сетке (победитель → следующий слот)~~ ✅ v1.6.0
9. ~~Обновление standings для SWISS формата (W-L запись)~~ ✅ v1.6.0

### Фаза 4 — Улучшения

1. ~~Новостная лента / блог (обзоры матчей)~~ ✅ v1.3.0
2. ~~Фото привязанные к матчам~~ ✅ v1.1.0
3. Telegram-бот (уведомления о матчах, результаты, расписание)
4. ~~Донаты / призовой фонд~~ ✅ v1.3.0
5. ~~PWA~~ ✅ v1.3.0
6. ~~Mobile UX аудит: hamburger menu, error.tsx в public routes, touch targets в admin~~ ✅ v1.7.0
7. ~~E2E тесты (Playwright, 28 тестов)~~ ✅ v1.7.0
8. ~~Swiss Bracket визуализация (CS2 Major стиль)~~ ✅ v2.1.0
9. ~~Редизайн публичных страниц (hero, таблицы, карточки, header, footer)~~ ✅ v2.3.0
10. ~~Управление пользователями — список, назначение организаторов городов, роли~~ ✅ v2.6.0
11. ~~Мобильная доступность админки — overflowX таблицы, touch targets, responsive диалоги, dark theme borders~~ ✅ v2.7.0

### E2E тесты — покрытие

| Файл                       | Кол-во | Покрытие                                       |
| -------------------------- | ------ | ---------------------------------------------- |
| `01-public.spec.ts`        | 10     | Главная, логотип, секции, навигация            |
| `02-standings.spec.ts`     | 6      | Round-Robin, Swiss W-L, badge, переключение    |
| `03-admin.spec.ts`         | 8      | Auth redirect, дашборд, sidebar, CRUD страницы |
| `04-teams-players.spec.ts` | 4      | Профили команд, поэты, расписание              |
| **Итого**                  | **28** | Публичные + admin + auth                       |

**Запуск:** `nx e2e grandslamcup-e2e -- --project=chromium`
**Auth:** `/api/auth/dev-session` (dev-only, описано ниже)

---

---

## 13. Технический долг / инфра (2026-06)

- [x] **OIDC `offline_access` scope** — добавлен в `src/lib/auth.ts` → refresh_token теперь сохраняется в `account` (2026-06-26)
- [x] **MobileAuthSection** — самодельная auth-секция в `mobile-drawer.tsx` заменена на `MobileAuthSection` из `@letar/ui` (2026-06-26)
