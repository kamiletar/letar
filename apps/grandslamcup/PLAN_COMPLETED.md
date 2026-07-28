# Grand Slam Cup — Выполненные задачи

Детальное описание всех реализованных фич.

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

**Последнее обновление:** 2026-07-21 (фикс `prisma/seed.ts`; код — v3.37.4)
