# Выполненные задачи — Animatrona Tracker

> История старше ~2026-08-08 — в [PLAN_COMPLETED_2026_09_08.md](./PLAN_COMPLETED_2026_09_08.md).

## Сессия 2026-09-08 (3): DRY-консолидация словарей и утилит (каскад от координатора)

Каскадная задача от `animatrona-coordinator-dev` — 4 находки DRY, все перепроверены по реальному
коду перед правкой.

- **Словарь связей/типов аниме** — `related-section.tsx` (третья копия) и
  `libs/animatrona-franchise-graph/src/types.ts` (четвёртая) переведены на канонические
  `getRelationKindInfo`/`getAnimeKindInfo` из `@letar/animatrona-utils`. Расхождения были не
  косметические: граф франшизы и страница аниме показывали разные подписи для одной и той же
  связи, `adaptation`/`tv_special` отсутствовали. Из публичного API франшиз-графа удалены
  `RELATION_LABELS`/`KIND_LABELS`/`KIND_COLORS` — их никто не импортировал.
- **`formatTime` ×2 → `formatDuration`** (`continue-watching-section`, `continue-watching-button`).
  Канон дополнительно умеет часы — эпизод длиннее часа больше не рисуется как `95:12`.
- **Ручной debounce → `useDebounce`** из `@letar/hooks` (библиотека подключена к приложению
  впервые: `package.json` + `tsconfig.json` paths/include + `transpilePackages`).

⚠️ **Пункт про debounce выполнен частично, и это осознанно.** Координатор указал три файла, но
`admin-client.tsx` дебаунсит не значение, а флаш батч-очереди действий, лежащей в `ref`.
`useDebounce` из `@letar/hooks` — дебаунсер _значения_; чтобы натянуть его на этот случай,
пришлось бы завести фиктивный state-счётчик как триггер. Оставлен ручной `setTimeout` — это не
недоделка, а отказ от ухудшения кода ради формального единообразия. Координатору отписано.

⚠️ **Грабля инструмента, не кода:** пакетная правка импортов через `re.sub` с backreference в
Python-heredoc занесла в `anime-catalog-client.tsx` управляющий символ `0x01` и съела строку
`import ... from 'next/navigation'`. Ни typecheck, ни lint до этого не запускались — поймал
именно форматтер dprint (`Unexpected character`). Вывод: правки импортов делать точечным
`str.replace`, а не regex с группами, и диффать каждый файл сразу после записи.

Проверено: `format` / `lint` / `typecheck:tsgo` / `nx build` (прод-сборка обязательна — добавлен
импорт из новой для приложения библиотеки) + gate `transpile-packages` — всё зелёное. Живьём в
браузере не проверялось: dev-БД пуста, записи аниме приходят только реальной публикацией из
Desktop.

## Сессия 2026-09-08 (2): WatchStatus/RelationKind фрагменты, шеринг с тайм-кодом, персистентность дорожек

**Консолидация схемы с `animatrona` через `libs/zenstack-fragments`** (задачи от
`animatrona-coordinator-dev`, треды `watchstatus-fragment-consolidation` и
`relationkind-fragment-consolidation`):

- `enum WatchStatus` (`schema/library.zmodel`) заменён импортом из общего фрагмента —
  побайтово идентичные 6 значений, декларативный перенос, коммит `7cd28b31`.
- `AnimeRelation.relationKind` переведён со `String` на общий `enum RelationKind` — прод-данные
  (656 строк) нормализованы вручную (`UPDATE ... SET relationKind = UPPER(relationKind)`) перед
  миграцией; `ipfs-resolver.ts` теперь нормализует новые записи через `.toUpperCase()`; добавлен
  недостающий лейбл `character` в `related-section.tsx` (8 связей на проде рендерились как
  «Другое»). Автосгенерированный Prisma-план миграции (`DROP COLUMN` + `ADD COLUMN NOT NULL`) был
  небезопасен для непустой прод-таблицы — переписан вручную на `ALTER COLUMN ... TYPE ... USING`.
  Коммит `b986b2ca`.
- По пути пришлось дважды сбрасывать dev-БД (`prisma migrate reset --force`, с явным согласием
  пользователя — Prisma блокирует эту команду от ИИ-агента без подтверждения) — драйфт возник
  из-за более раннего `db:push` вместо `db:migrate` в этой же сессии.

**N.1: кнопка «Поделиться» с тайм-кодом и дорожками** (`067a64d1`) — ссылки формата
`?t=<секунды>&audio=<index>&sub=<index|off>` на `/watch/[animeId]/[episode]`, восстанавливающие
точный момент и выбранные дорожки. Кнопка в `headerRightSlot` плеера + `ShareAnimeButton` на
страницах аниме/франшизы (канонический URL без тайм-кода). Переиспользован готовый `useShare()`
из `@letar/ui` — не пришлось писать заново или выносить в libs, паттерн Web Share API +
copy-to-clipboard фоллбэк уже был.

**N.2: персистентность выбора дорожек** (`067a64d1`) — при сверке оказалось, что точная позиция и
`audioTrackIndex`/`subtitleTrackIndex` уже сохранялись в БД per-episode (`/api/watch-progress`
каждые 5с) и восстанавливались для залогиненных пользователей на уже начатом эпизоде. Реальный
пробел — переход на новый эпизод без прогресса (сбрасывался на дефолт манифеста) и анонимные
пользователи. Закрыто `localStorage` per-anime (`animatrona-tracks-<animeId>`), подставляется
только когда сервер отдал чистые дефолты (нет прогресса, нет явной ссылки).

⚠️ Не проверено живьём в браузере — dev-БД после сброса пуста (записи аниме приходят только через
реальную публикацию из Desktop по IPFS, локального фикстур-сида нет). typecheck/lint зелёные.

## Сессия 2026-09-08: theme:check, аудит pressScale, покадровая перемотка, дедуп хука

**Аватар-загрузка (закрыта задним числом, реализована 2026-09-07)** — чек-лист Фазы 2.5 отставал
от кода на день; фича закоммичена `9c7a9a7b`, пункты отмечены `9a91e5c1`.

**`theme:check` подключён** (`10b979a9`) — гейт сырых цветов/теней/transition (`@letar/theme-check`)
через `nx g @letar/generators:theme-check-integrate`. `themePrefix` указывает прямо на файл
`src/app/_components/ui/provider.tsx` (нет каталога `src/theme/`, как у `apps/kami`). Первый
прогон нашёл:

- 14 нарушений `_active: scale()` в теме — сверены со шкалой `pressScale` (`@letar/ui`) и
  приведены к её шагам; 3 легитимных исключения (мелкие поверхности control'ов
  чекбокса/радио/close-триггера тега, рост thumb слайдера при захвате) оставлены с комментарием
  и занесены в `allowedMatches`;
- 15 нарушений (сырые `transition="prop Ns"` + один `rgba()` в градиенте) в 9 файлах, никогда
  раньше не проверявшихся — разбиты на `transitionProperty`+`transitionDuration`, `rgba` заменён
  на `var(--chakra-colors-black-alpha-700)`.

**Покадровая перемотка на паузе** (`f361a923`) — `Shift+←`/`Shift+→` дают шаг 5 кадров, работают
только когда видео на паузе (без Shift — обычная перемотка на 10с). `stepFrame()` в
`use-shaka-player.ts` берёт `frameRate` активного видеотрека через
`player.getVariantTracks()`, дефолт 24fps.

**Дубль `use-keyboard-shortcuts.ts` vs общий `@letar/video-player-react`** (v0.11.16, задача
заведена этой сессией через `spawn_task`, выполнена отдельной фоновой сессией) — проверено, кто
ещё пользуется общим хуком (`animatrona`, `animatrona-folder-player`), реально одинаковые ветки
(play/pause, стрелки/время, громкость, mute, fullscreen) сведены в один хук библиотеки, а
специфичные для tracker вещи (переключение дорожек `T`, оверлей помощи `?`/`Escape`,
Shift+стрелки только на паузе) добавлены в общий хук опциональными параметрами — обратно
совместимо для двух других потребителей. Локальный дубль `_hooks/use-keyboard-shortcuts.ts`
удалён; `tracker-video-player.tsx` импортирует хук из `@letar/video-player-react`. Детали —
`CHANGELOG.md` v0.11.16.

**Дубль `getShakaFrameRate`/`FRAME_STEP_COUNT` vs `animatrona`** (v0.11.17) — найден при сведении
соседнего дубля `use-keyboard-shortcuts.ts` выше. Инлайновая логика определения fps активной
дорожки Shaka в `use-shaka-player.ts` дословно повторяла `frame-step-utils.ts` из
`apps/animatrona`. Вынесено в `@letar/video-player-core` (реэкспорт из `@letar/video-player-react`),
оба приложения переведены на общий импорт; `animatrona-folder-player` (третий потребитель) своей
копии не имел. Детали — `CHANGELOG.md` v0.11.17.

Всё запушено в `origin/main` (`73883d14`), запрошен деплой у `deploy-agent-dev`
(тред `deploy-animatrona-tracker-20260908`).

**Аудит `use-shaka-player.ts` vs `useShakaPlayer` (`@letar/video-player-react`) — не дубль**
(v0.11.18, `5ab218d3`, отдельная сессия) — проверен третий кандидат на дедуп после двух
предыдущих находок выше. Реально живых реализаций оказалось две (не три): lib-хук использует
только `animatrona-folder-player`, локальный `apps/animatrona/.../_hooks/useShakaPlayer.ts`
не вызывался нигде (мёртвый код, animatrona с персистентным видео давно инициализирует Shaka
инлайном в `GlobalVideoProvider.tsx`) — удалён вместе с экспортом. Оставшиеся два живых хука
расходятся по-настоящему: владение состоянием (снаружи хука + `usePlayerState` у lib-версии vs
внутри самого хука у tracker) и уникальные фичи tracker (детект первого декодированного кадра
для лоадера, детект блокировки autoplay, покадровая перемотка). Решение — не сводить, аналогично
`header-drawer-dedup-audit.md`. Разбор —
[shaka-player-hook-dedup-audit.md](/.claude/docs/shaka-player-hook-dedup-audit.md).
Не запушено — ждёт одобрения на push.

## Soft-404 на `notFound()` — принято как есть (2026-08-28)

Сквозной аудит монорепо нашёл: `notFound()` из кода страницы отдаёт HTTP 200, а не 404 — причина
корневой `src/app/loading.tsx` (Suspense-граница), оборачивающий всё приложение целиком (разбор —
[nextjs-streaming-soft-404-loading-boundary](/.claude/docs/nextjs-streaming-soft-404-loading-boundary.md)).
**Решение владельца:** принять как есть — тег `noindex` уже стоит на `/anime/[id]`, индексации
это не вредит, работа не требуется.

## Nx-кэш `db:*`/`zenstack:generate` отключён (2026-09-04)

В прошлой сессии (см. запись ниже про `Content.category`/`Content.quality`/`Report.reason`)
`nx zenstack:generate`/`nx db:push` дважды подряд отдавали закэшированный результат
(«already in sync», `Successfully ran target`) вместо реальной регенерации после правки
`schema.zmodel` — помогло только `--skip-nx-cache`. Причина — известный Windows+Nx Cloud баг
кэша (os error 87), задокументированный в `.claude/docs/database.md`, не проблема точности
`inputs`/`outputs`.

`apps/animatrona-tracker/project.json` приведён к эталонному паттерну `driving-school`:
`"cache": false` выставлен явно на всех `db:*`-таргетах (`db:generate`, `db:push`,
`db:push:data-loss`, `db:migrate`, `db:migrate:deploy`, `db:studio`, `db:seed`, `db:reset`,
`db:reset:data-loss`) и на `zenstack:generate` (было `cache: true` у обоих последних). Проверено
воспроизведением: два подряд прогона `nx zenstack:generate animatrona-tracker` без
`--skip-nx-cache` — оба реально выполнили генерацию (кэшируется только независимая задача
сборки `@letar/zenstack-form-plugin`, не сам таргет).

Коммит `244884a1`.

## `Content.category`/`Content.quality`/`Report.reason` → enum (2026-09-04)

Задача от координатора форм (`forms-coordinator-dev`) — последний блокер удаления legacy
comment-directive парсера директив форм (`libs/zenstack-form-plugin`, мажорный релиз v3.0.0,
Фаза 3 плана `libs/forms/PLAN.md`). Три поля `schema/content.zmodel` были единственным местом в
приложении, где ручной `@form.props({ options: [...] })` был не декоративным избытком, а
единственным способом задать опции `select` — потому что поля были `String`, а не `enum`.

Заведены `ContentCategory` (`ANIME`/`MOVIE`/`SERIES`/`OTHER`), `VideoQuality`
(`P480`/`P720`/`P1080`/`P4K`), `ReportReason` (`COPYRIGHT`/`SPAM`/`INAPPROPRIATE`/`OTHER`) с
`///`-doc-комментариями на значениях — options для select теперь генерируются автоматически из
enum, ручной `@form.props` убран у всех трёх полей.

Перед конвертацией проверено: обе таблицы (`Content`, `Report`) пустые в dev-БД, а модели нигде
не используются в коде приложения (грепом — только докстринг в `db.ts` и неродственный
`ORMError.reason`, не поле модели). Значения квалификации переименованы в валидные идентификаторы
(`480p`→`P480` и т.п.), без `@map` — раз данных нет, сохранять обратную совместимость строк не
требовалось.

`nx zenstack:generate`/`nx db:push` пришлось запускать с `--skip-nx-cache` — иначе Nx отдавал
закешированный результат («already in sync»), и БД физически не менялась, хотя команда
завершалась успешно. `nx db:migrate` не удалось прогнать штатно (drift: `db:push` уже применил
изменение раньше файла миграции) — файл миграции написан вручную с явным SQL-маппингом старых
lowercase-строк на новые enum-идентификаторы (`CASE ... WHEN 'anime' THEN 'ANIME'::"..."`, не
голый `::text::enum`-каст) на случай непустых данных на проде, проверен полным прогоном `prisma
migrate deploy` с нуля на временной БД, помечен applied в dev через `prisma migrate resolve
--applied`.

`typecheck:tsgo`/`lint` зелёные. Коммиты `2e9e387f` (схема+доки), `530ddc23` (миграция).
Уведомлены `forms-coordinator-dev`/`forms-dev` в треде `forms-native-migration` — со стороны
animatrona-tracker блокеров для удаления legacy-парсера больше нет.

## Чистка запрещённого Chakra `Icon as=` — 194 вхождения в 33 файлах (2026-08-26)

Кросс-приложенческая задача из корневого `PLAN.md` §61 (semgrep-правило
`letar-chakra-as-prop-forbidden`, `.semgrep/letar-rules.yml`). Все `<Icon as={IconComponent}
.../>` в `apps/animatrona-tracker/src/app/**` заменены на прямой рендер react-icons
компонентов — работа распределена на 4 параллельных фоновых агента по группам:

- `profile/*` (4 файла) — 46 замен, коммит `6626eb5a`
- `anime/[id]/*` (9 файлов) — 46 замен, коммит `e4e2c270`
- `admin/*` (12 файлов) — 50 замен, коммит `efae5cb3`
- главная/шапка/авторизация/каталог/лидерборд/pinned (8 файлов) — 51 замена, коммит `5adb7c34`

Правила замены: `boxSize`→`size` (×4px); статичный `color="токен"` без общего родителя по
цвету → `color="var(--chakra-colors-<kebab-token>)"` (там, где родитель уже задавал тот же цвет —
проп у иконки просто убран, react-icons использует `currentColor`); динамический
`as={cond ? A : B}`/`as={переменная}` → локальная capitalized-переменная перед JSX (иначе JSX
трактует lowercase-переменную как DOM-тег); spacing-пропы (`mr`/`mb` и т.п.) без гарантированного
`gap` у родителя → `style={{ marginRight: 'Npx' }}` по шкале Chakra spacing.

Один нестандартный случай вне общего правила — RSS-иконка в `anime/_components/
anime-catalog-client.tsx` использовала `_hover`, которого у react-icons нет: решено
оборачиванием ссылки в `<Box asChild color="orange.500" _hover={{ color: 'orange.400' }}>`,
иконка внутри наследует цвет через `currentColor`.

Проверка: `nx typecheck:tsgo animatrona-tracker` и `nx lint animatrona-tracker` — зелёные (только
предсуществующие `react-hooks/exhaustive-deps` warnings в видеоплеере, не связаны с правкой).
Dev-сервер поднят, каталог аниме и страница входа проверены через Browser pane (JS-инспекция DOM,
т.к. композитный скриншот в этой сессии был недоступен) — SVG-иконки рендерятся, ошибок в
консоли нет. Финальный `semgrep scan --config .semgrep/letar-rules.yml apps/animatrona-tracker` —
**0 срабатываний на `Icon as=`**; 28 оставшихся находок — другой класс (`Heading as="h1"`,
`Box as="button"` и т.п.), вне рамок этой задачи, severity правила не поднималась (задачей
запрещено, пока не почищен весь `apps/*`).

## Чистка конфига (2026-08-25)

Убраны дублирующиеся записи в `implicitDependencies` (`project.json`) — список из 6
зависимостей был продублирован дважды подряд (11 строк вместо 6), вероятно из-за неаккуратного
слияния правок. Не было багом (Nx нормально обрабатывает повторы), но замусоривало дифф. Убраны
повторы, порядок первого вхождения сохранён. Сверено `nx typecheck:tsgo` и
`nx show project --json` — состав рёбер графа зависимостей не изменился (8 уникальных: 6 из
`project.json` + `@letar/pg-url` и `@letar/env-load` из `package.json`, дублей в `package.json`
не было).

## Проверка ложного `react-hooks/rules-of-hooks` в e2e-фикстурах — не применимо (2026-08-25)

По образцу `PLAN-INFRA-4.md §109` (ложное срабатывание eslint-plugin-react-hooks на `use` в
Playwright `test.extend({ page: async ({ page }, use) => ... })`, уже пофикшено в
grandslamcup-e2e/mandala-e2e/driving-school-e2e) — проверено `apps/animatrona-tracker-e2e/src/fixtures/base-test.ts`.

Паттерн отсутствует: файл — заготовка с пустым `test.extend({})`, без параметра `use` вообще.
`nx run animatrona-tracker-e2e:lint` зелёный (1 не связанный warning про `console` в
`global-setup.ts`). Отключать `react-hooks/rules-of-hooks` в `eslint.config.mjs` не стал —
триггера для бага нет, отключение было бы неоправданным. Актуально пересмотреть, если в
`base-test.ts` появится реальная fixture с `use`.

## Разбиение `schema.zmodel` на 7 доменных файлов (2026-08-25)

`schema.zmodel` (1128 строк) разбит через ZModel `import` на `schema/enums.zmodel` (общие
`ContentStatus`/`UserRole`), `auth.zmodel` (User/ApiKey/Account/Session/Verification),
`content.zmodel` (Content/ConsentLog/Rating/Report/ReportStatus), `anime.zmodel`
(Anime/AnimeRelation/AnimeEpisode/AnimeComment/ModerationLog), `distribution.zmodel`
(DistributionStats/DistributionStatus/Distribution), `pinning.zmodel` (PinServer\*/PinJob\*/
CidHistory), `library.zmodel` (WatchStatus/UserLibraryItem/UserWatchProgress). Корневой
`schema.zmodel` — только 7 `import` + `datasource`/`generator`/`plugin`.

Граф импортов циклический (auth ↔ content ↔ anime ↔ distribution ↔ pinning ↔ library) — по
образцу уже протестированной на grandslamcup декомпозиции
([zenstack-multifile-schema-circular-imports.md](/.claude/docs/zenstack-multifile-schema-circular-imports.md)).
Сначала прогнано в изолированном git worktree (субагентом) — `zenstack generate` дал идентичный
оригиналу вывод. По ходу теста найдена и задокументирована новая ловушка: импорты ZModel не
транзитивны — файл, ссылающийся на голое значение enum (`auth().role == ADMIN`), должен
импортировать файл с этим enum напрямую, а не полагаться на импорт через промежуточный файл.

После применения к реальному файлу: `nx zenstack:generate` — 8 enum/21 model, сгенерированные
файлы не изменились (`git diff` по `src/generated/` пуст); `nx typecheck:tsgo` — зелёный;
`nx db:push` — «database is already in sync» (drift отсутствует). `nx lint` падал на отсутствующем
бинарнике `eslint` в `node_modules/.bin` — не связано с этой правкой (oxlint fast-fail прошёл
чисто), похоже на побочный эффект параллельной работы другого агента с зависимостями.

Два коммита: `b2133763` (сам сплит) и `da5ff0ea` (doc-находка). Не запушено.

## Тест на гонку публикации `POST /api/anime` (2026-08-21)

Закрывает открытый вопрос из предыдущей записи ниже: фикс каталога ошибок ZenStack v3 ORM
не имел теста, реально воспроизводящего конфликт уникальности. Добавлен
[route.spec.ts](/apps/animatrona-tracker/src/app/api/anime/route.spec.ts) — два параллельных
`POST` с одинаковым `directoryCid` бьются об реальный unique-констрейнт в dev-БД; проверяет
201+409 (не 500) и что в БД остаётся ровно одна запись. Понадобилось замокать `@/lib/ipfs` и
`@/lib/redis` — оба реэкспортируют workspace-пакеты (`@letar/animatrona-utils`,
`@letar/redis-client`), не забандленные в `node_modules` (резолвятся только через Next.js
`customConditions`, vitest их не видит без алиаса/мока). `nx test`/`typecheck:tsgo`/`lint`
зелёные. Commit `34227ec6`.

## Фикс: обработка ошибок `POST /api/anime` ловила Prisma-коды P2002/P2004 вместо ZenStack v3 (2026-08-21)

Аудит по мотивам находки в `domwellbes` (см. `.claude/docs/zenstack-v3-orm-error-codes.md`):
`route.ts` использует `getEnhancedPrisma`/`prisma` из ZenStack v3 ORM, но в `catch` проверял
`prismaError.code === 'P2004'` (отказ политики) и `=== 'P2002'` (unique-конфликт) — оба поля на
обёрнутом `ORMError` не установлены, обе ветки никогда не срабатывали, конфликт публикации
всегда падал как общая ошибка 500. Исправлено на `error.reason === 'rejected-by-policy'` и
`error.reason === 'db-query-error' && error.dbErrorCode === '23505'`. `typecheck:tsgo`/`lint`
зелёные (только пред-существующие warning'и `react-hooks/exhaustive-deps` в несвязанных файлах).

## Webpack-фикс `@tanstack/devtools-ui@0.7.0` — server-половина графа (2026-08-19)

Тот же баг, что уронил dev-сервер `driving-school` (500, `Attempted import error: 'use' is not
exported from 'solid-js/web'` через `@letar/query-provider`) — не имел вообще никакой защиты
(другие приложения хотя бы держали алиас для prod). Добавлен `webpack: (config, { dev, isServer
}) => { if (isServer || !dev) { config.resolve.alias['@tanstack/devtools-ui'] = false } ... }`.
Полный разбор — PLAN.md §51 и `apps/driving-school/PLAN_COMPLETED.md`.

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

---

**Последнее обновление:** 2026-09-08
