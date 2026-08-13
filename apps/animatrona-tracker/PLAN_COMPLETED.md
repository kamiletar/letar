# Выполненные задачи — Animatrona Tracker

## Гидратационный мисматч `autoSkipEnabled`/`trackMode` (v0.11.4, 2026-08-13)

Найдено попутным аудитом при исследовании best practices для form-docs P7. Оба поля читали
`localStorage` прямо в инициализаторе `useState` (`use-chapter-nav.ts`, `tracker-video-player.tsx`)
— на клиенте это происходит уже на первом (гидратирующем) рендере, сервер всегда рендерит дефолт
(`false` / `'RUSSIAN_DUB'`). Расхождение без предупреждения в консоли — риск, что React «поженит»
DOM с чужим значением и переключатель автопропуска/дорожки перестанет совпадать с видимым
состоянием. Фикс: `useState` стартует с дефолта одинаково на сервере и первом клиентском рендере,
сохранённое значение подтягивается отдельным `useEffect`. Новый паттерн-документ —
`.claude/docs/ssr-hydration-persisted-state.md`. `typecheck:tsgo` и `lint` зелёные.

## `robots.ts`: `Disallow: /` (2026-08-12, PLAN-INFRA.md §33)

Часть кросс-приложенческого захода по инфраструктурным трекам. Индексационная политика
приложения (публичный каталог vs всё за авторизацией) не была решена — решение владельца:
весь сайт за авторизацией, публичная индексация каталога/плеера не задумана. Добавлен
`src/app/robots.ts` с безусловным `Disallow: /`, по образцу `auth-hub`/`dashboard`.

`typecheck:tsgo` зелёный. Commit `22e92b77`.

## `tsconfig.json`: убраны `references` на библиотеки — TS6305/TS6059 (2026-08-07)

Тот же баг и фикс, что в `dashboard-agent` (0.11.1, `.claude/rules/libs.md` § «Тот же редирект
под обычным `tsc`»): `references` на `../../libs/*` вели на solution-конфиг библиотек и
редиректили на `tsconfig.spec.json`, давая вечный `TS6305`. Массив `references` убран целиком.

Два побочных эффекта:

1. `TS6059: not under rootDir` для путей-алиасов на библиотеки — фикс `"rootDir": "../.."`.
2. Приложение и так использует «смешанную модель» (часть библиотек инлайнится напрямую через
   `include: ["../../libs/X/src/**/*.ts"]`) — без `references` эти glob'ы стали пропускать
   `*.spec.ts(x)` библиотек прямо в основную программу (раньше их отсекал сам механизм project
   references), дав ~650 сторонних ошибок компиляции тестовых файлов. Фикс — добавить
   `../../libs/**/*.spec.ts(x)` и `*.test.ts(x)` в `exclude`, аналогично тому, что уже было для
   `src/**` самого приложения.

Проверено: `nx typecheck:tsgo animatrona-tracker --skip-nx-cache` — было 40 ошибок TS6059, стало 0.
`nx build animatrona-tracker` падает на `ECONNREFUSED 127.0.0.1:5439` при пререндере — не связано
с этой правкой, в песочнице агента нет локального Postgres (порт закрыт, проверено `Test-NetConnection`),
воспроизводится независимо от tsconfig.

## Turbopack по умолчанию + Chakra/next-themes — риск гидратации (2026-08-04)

Аудит по мотивам находки в `apps/mandala` ([доки](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)):
Next.js 16 без явного `--webpack`/`--turbopack` выбирает Turbopack, что в связке с
`ChakraProvider`'s `<Global>` (emotion, SSR рендерит `<style>`, клиент — `null`) и
`next-themes`'ным `<script>` (`ColorModeProvider`, `apps/animatrona-tracker/src/app/_components/ui/color-mode.tsx`)
может триггерить hydration mismatch.

Подтверждено: `nx dev animatrona-tracker` (без флага) стартовал именно на Turbopack
(`▲ Next.js 16.3.0 (Turbopack)`), провайдер собран по тому же паттерну
(`ChakraProvider` → `ColorModeProvider`/`NextThemesProvider`), что и в mandala.
Точную click-race репродукцию (клик по ссылке сразу после навигации, как в mandala) через
Browser pane сделать не удалось — окружение показывало «ref map not initialized»/failed
screenshot из-за скрытой панели браузера (см. `reference_browser_pane_hidden_raf` в памяти),
а не из-за самого приложения.

Применён тот же фикс, что в mandala: явный `--webpack` в `dev`/`build`. `build` был уже
явным таргетом в `project.json` — добавлен флаг. `dev`-таргет раньше инферился Nx-плагином
`@nx/next` без флага — добавлен явный override с тем же executor'ом (`nx:run-commands`),
что и у инферированного. Проверено: `nx dev`/сервер поднимается на webpack
(`▲ Next.js 16.3.0 (webpack)`), страница рендерится без ошибок в консоли.

`nx e2e animatrona-tracker-e2e` не удалось прогнать — `webServer` конфиг playwright слушает
порт из `.env` (`PORT=3010`), который на машине уже занят посторонним процессом
(`EADDRINUSE`, не связано с этим фиксом — воспроизводилось и до правки).

## Фикс: CookieBanner вне ChakraProvider ронял первый визит (2026-08-04)

В `layout.tsx` `<CookieBanner appKey="animatrona-tracker" />` рендерился после закрывающего
`</Provider>` — вне дерева ChakraProvider. `CookieBanner` (`libs/ui/src/lib/cookie-banner.tsx`)
использует Chakra-компоненты и `useContext`, который требует `ChakraProvider` выше по дереву.

Баннер по умолчанию скрыт и раскрывается через `useEffect` только при первом посещении (когда в
localStorage ещё нет ключа cookie-согласия) — поэтому баг не ловился в обычной ручной проверке и
в e2e, где localStorage уже содержит согласие. Любой настоящий первый посетитель без сохранённого
согласия получал `ContextError` и пустой экран «This page couldn't load».

Исправление: перенёс `<CookieBanner>` внутрь `<Provider>`/`<QueryProvider>`, рядом с
`Header`/`children`/`Toaster`. Проверено вручную в браузере с очищенным `localStorage` —
баннер отображается, ошибок в консоли нет. `Script`/`UmamiScript` оставлены снаружи `Provider`
(не Chakra-компоненты, ChakraProvider им не нужен).

## 152-ФЗ: consent-инфраструктура с нуля (2026-07-28)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Приложение
собирает email (Better Auth, hub-client), но не имело ни одного элемента чек-листа 152-ФЗ. Добавлено:

- `ConsentLog` в `schema.zmodel` + миграция (`prisma/migrations/20260728041010_add_consent_log`)
- `POST /api/consent` — sha256-хэш IP, без email/точного IP
- `CookieBanner`/`CookieSettingsButton` из `@letar/ui` в layout/header
- Страница `/privacy`

Локальная dev-БД (свежий пустой контейнер) имела рассинхрон с историей миграций (`prisma migrate
deploy` падал `P3018` на уже существующих колонках) — устранён `prisma migrate reset --force` с
явного разрешения владельца в чате (2026-07-28), затем применена вся история миграций + новая
`add_consent_log`. `nx zenstack:generate`+lint+typecheck зелёные.

## Техдолг (2026-07-07)

Аудит после планового `bun update` — сравнение typecheck/lint до/после обновления зависимостей
выявил предсуществующие ошибки, не связанные с обновлением. Исправлены:

- **`admin-section.tsx`** — `isTruncated` (Chakra v2) → `truncate` (Chakra v3 API)
- **TS6305 dist-цепочка** — `libs/animatrona-ui` не имел вообще никаких Nx-таргетов, из-за чего
  `dist/*.d.ts` никогда не мог быть сгенерирован → падал `typecheck:tsgo` у `animatrona-tracker`
  через всю цепочку `animatrona-ui → animatrona-franchise-graph → video-player-react →
video-player-core`. Добавлен `typecheck`-таргет (зеркально `animatrona-franchise-graph`) +
  `oxlint`/`lint`. Попутно всплыл смежный баг — `animatrona-franchise-graph` не собирался из-за
  отсутствия `declare module '*.css'` (добавлен `css.d.ts` по образцу `libs/ui`, `driving-school`).
- **`EpisodeCardBase.tsx`** (libs/animatrona-ui) — `eqeqeq`, всплыло только после появления
  lint-таргета у библиотеки.
- **`header.tsx`** — `curly` (if без фигурных скобок) в `isActiveRoute` и `Header`.
- **`lib/ipfs-fetch.ts`** — `preserve-caught-error`, добавлен `cause: primaryError` в финальный throw.

Итог: `typecheck:tsgo` у `animatrona-tracker` — с 11 ошибок до 1 (осталась только заранее известная
и вне-скоуповая `libs/auth` OIDCOptions cast, не относится к animatrona-экосистеме).

## Версия 0.9.0 (2026-03-19)

### Redis для онлайн-статуса раздач

- Heartbeat от Desktop → Redis SET с TTL 1ч (без записи в PostgreSQL)
- Пир без heartbeat >1ч = офлайн (TTL истёк)
- Страница аниме показывает "N сидов онлайн"
- Admin seeds: "N онлайн / M всего", сводка с общим кол-вом онлайн
- `src/lib/redis-distributions.ts` — setOnline, isOnline, getOnlineForAnime, getOnlineCount

## Версия 0.8.0 (2026-03-19)

### Очистка старых IPFS пинов

- Модель CidHistory — отслеживание замен directoryCid
- Автоотмена QUEUED пинов при обновлении CID (PINNING не трогаем)
- API очистки пинов старше 30 дней с dry-run и safety checks
- Кнопка в админке (вкладка Pin Jobs)

### RSS фиды

- `/api/rss/feed.xml` — 50 последних релизов (RSS 2.0, кэш 15 мин)
- `/api/rss/genre/[slug]` — фид по жанру
- Мета-тег `<link rel="alternate">` + иконка RSS в каталоге

## Версия 0.7.0 (2026-03-18)

### Статистика и рейтинги

- viewCount, libraryCount, avgRating — денормализованные счётчики на аниме
- uploaderScore + uploaderRank — формула рейтинга загрузчиков
- Лидерборд `/leaderboard` с прогресс-барами
- API пересчёта `POST /api/admin/recalc-stats`

### Shikimori синхронизация

- OAuth провайдер для Shikimori
- Импорт user_rates в библиотеку трекера
- Маппинг статусов и оценок
- Секция «Привязанные аккаунты» в профиле

### Hover preview эпизодов

- Cycling скриншотов 500ms при наведении
- Индикаторы-точки, slideshow (LightboxViewer)
- Диалог технической информации (кодек, разрешение из IPFS)

### Redis кэширование

- Лидерборд 15 мин, профиль 5 мин, жанры 5 мин
- Инвалидация при мутациях

### Модерация

- ModerationLog — аудит-лог с cursor-пагинацией
- Таб "Лог" в админке

## Версия 0.6.x (2026-03-17)

### Комментарии

- Модель AnimeComment (ответы 1 уровень)
- API CRUD с cursor-пагинацией
- Вкладка на странице аниме

### UX Polish

- Рекомендации "Похожие аниме" по жанрам
- Breadcrumbs, debounced поиск
- Loading/error boundaries для всех маршрутов
- Мобильная навигация (drawer)
- "Продолжить просмотр" на главной
- Watch progress indicators в каталоге

## Версия 0.5.x (2026-03-16)

### Портирование из animatrona-web

- Manifest-loader (загрузка из IPFS)
- Полная страница аниме (hero, tabs, episodes, about)
- Франшизы (React Flow граф + список + таймлайн)
- Видеоплеер (Shaka + SubtitlesOctopus)
- Прогресс просмотра в БД
- Облачная библиотека (sync Desktop ↔ Tracker)

### Модерация

- Batch-модерация с debounce
- Дедупликация PENDING по shikimoriId
- Конкурирующие заявки, diff треков
- Автопиннинг при одобрении
- Pin-queue интеграция с прогрессом

## Версия 0.1.0 (2026-01-30)

### Инфраструктура

- Next.js 16, Chakra UI v3, ZenStack, Better Auth, Docker
- API публикации из Animatrona (API Key auth)
- Каталог, плеер, профиль, модерация

---

**Последнее обновление:** 2026-03-19
