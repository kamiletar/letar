# Animatrona — Выполненные задачи (Часть 2)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: 2026-08-09 — 2026-09-03.

## Фабрики мутаций (`hooks-factory.ts`) защищены от `{ success: false }`-результатов (2026-09-03)

Продолжение фикса ниже (delete-actions animatrona) на уровень общей инфраструктуры. Сам фикс
делает конкретные action'ы правильными, но `createCreateHook`/`createUpdateHook`/
`createDeleteHook` ([hooks-factory.ts](renderer/src/lib/hooks-factory.ts)) оставались уязвимы
по конструкции — их `onSuccess` безусловно вызывал `invalidateQueries` без проверки формы
результата. Новый action по паттерну `{success:false, error}` (не throw), подключённый через
любую из трёх фабрик, воспроизвёл бы баг молча — ни typecheck, ни lint такое не ловят.

Добавлен generic runtime-guard `throwOnFailureResult<TResult>` — узкий type guard
(`typeof result === 'object' && result !== null && 'success' in result && result.success ===
false`), которым обёрнут `mutationFn` во всех трёх фабриках (`async (...) =>
throwOnFailureResult(await config.mutationFn(...))`). При совпадении формы бросает `Error` с
текстом `result.error` (если строка) до того, как `onSuccess`/`invalidateQueries` вообще
выполнится — мутация уходит в `error`-статус, а не притворяется успешной. Guard размещён в
обёртке `mutationFn`, а не в теле `onSuccess`: `onSuccess`, бросающий исключение в TanStack
Query v5, не переводит статус наблюдателя мутации в `error` (баг совпадает с классом, описанным
в [tanstack-query-client-recreated-per-render.md](/.claude/docs/tanstack-query-client-recreated-per-render.md)
— мутация обязана бросать в `mutationFn`, не полагаться на throw из колбэков). Actions,
возвращающие сущность напрямую (Prisma-модель, без поля `success`), проходят через guard не
тронутыми — сигнатуры `TResult` фабрик не сужены.

`typecheck:tsgo`/`lint animatrona` — зелёные (0 ошибок, только предсуществующие
`react-hooks/exhaustive-deps`-предупреждения в несвязанных файлах).

## Delete-actions бросают исключение вместо `{ success: false }` (2026-09-03)

Аудит по всему монорепо на класс бага «`mutationFn` резолвит server action, возвращающий
`{ error }`/`{ success: false }`, вместо throw — TanStack Query считает мутацию успешной,
`onError` не срабатывает, откат оптимистичного обновления не происходит» (эталон фикса —
`apps/studio` time-entries). В `animatrona` три delete-экшена — `deleteAnimeRelation`,
`deleteAudioTrack`, `deleteSubtitleTrack` — глотали ошибку в try/catch и возвращали
`{ success: false, error }`, в отличие от соседних create/update в тех же файлах (дают Prisma
бросить исключение естественно). Они идут через общую фабрику `createDeleteHook`
([hooks-factory.ts](renderer/src/lib/hooks-factory.ts)), чей `onSuccess` безусловно
инвалидирует кэш без проверки `success` — при неудачном delete UI вёл себя так, будто запись
реально удалена.

Фикс — привёл все три экшена к контракту соседей (throw вместо swallow), саму фабрику не
трогали (она универсальная, разные `mutationFn` возвращают разные формы). На момент фикса
`useDeleteAnimeRelation` нигде не вызывается (мёртвый экспорт), `useDeleteAudioTrack`/
`useDeleteSubtitleTrack` используются в `use-track-processing.ts` (rollback-путь при отмене
добавления дорожек) и `use-player-tracks.ts` (fire-and-forget без UI-фидбэка) — в обоих
местах поведение строго улучшилось (ошибка теперь видна хотя бы как rejected promise, а не
маскируется под успех). `typecheck:tsgo`/`lint` зелёные. Коммит `cfd2e63e`.

## `/_not-found` prerender InvariantError — не баг кода, гонка за node_modules (2026-09-01)

Найденный попутно в сессии §75 (`PLAN.md` §23.3) пункт «`next build` renderer'а падает на
пререндере `/_not-found`» проверен причинно отдельной сессией. Осмотр `layout.tsx` и обоих Route
Handler'ов (`api/model/[...path]/route.ts`, `api/image/route.ts`) не выявил вызовов dynamic API
(`headers()`/`cookies()`) на уровне модуля или вне request-scope. Известная ловушка
[nextjs-root-notfound-no-root-layout.md](/.claude/docs/nextjs-root-notfound-no-root-layout.md) не
подошла — корневой `layout.tsx` присутствует.

Два чистых прогона подряд (`rm -rf .next` + `next.exe build --webpack`, без единой правки кода)
прошли зелёными — `/_not-found` собрался как `○ (Static)`. В момент, когда ошибка проявлялась,
`node_modules/.bun/` одновременно держал три версии `next` (16.3.2/16.3.3/16.3.4) — след
параллельной пересборки isolated-стора bun другой сессией. Тот же класс гонки, что уже
задокументирован для `Module not found '@ark-ui/react/*'` в том же файле — просто с другим
симптомом (там `Module not found`, здесь рантайм-инвариант Next, вероятно из-за частично
подменённого `next/dist/server/*` в момент запуска build-воркеров).

`lint`/`typecheck:tsgo` зелёные, код не менялся. Разбор и диагностический критерий (не
воспроизводится вторым чистым прогоном подряд → гонка, не баг) —
[nextron-renderer-transpile-packages-required.md § Дополнение 2026-09-01](/.claude/docs/nextron-renderer-transpile-packages-required.md#дополнение-2026-09-01-транзиентный-invarianterror-на-_not-found--тоже-гонка-за-node_modules).

## Аудит `transpilePackages` в nextron-рендерере — фикс уже был внесён, задокументирован (2026-09-01)

Делегированная проверка от сессии §75 (`PLAN.md` корня): почему `renderer/next.config.js` не
имел ни одной записи `@letar/*` в `transpilePackages`, хотя `@letar/video-player-core`/
`@letar/video-player-react` активно импортируются в `src/components/player/` — притом что билд
якобы проходил зелёным. Оказалось: фикс уже был внесён параллельной сессией минутами раньше
(коммит `c302242c`), но не задокументирован отдельным файлом.

**Причинно подтверждено экспериментом:** убрал `@letar/*` из `transpilePackages` →
`next build --webpack` падает `Module not found`; вернул → компилируется чисто (`lint`/
`typecheck:tsgo animatrona` зелёные). Резолв пути через `tsconfig paths` — не то же самое, что
транспиляция TS-синтаксиса; `.next/cache` от сборок до регрессии (`0693e342`, массовый снос
`transpilePackages` при миграции с `withNx`) маскировал баг до аудита §75.

Отдельно поймана и задокументирована ловушка воспроизведения: параллельный `bun install` другой
сессии на этом же общем чекауте на несколько секунд убирает `@ark-ui/react` из `node_modules` —
даёт текст ошибки `Module not found`, неотличимый на вид от настоящей проблемы конфигурации.

Документация — [nextron-renderer-transpile-packages-required.md](/.claude/docs/nextron-renderer-transpile-packages-required.md),
ссылка в индексе корневого `CLAUDE.md`. Коммит `da7e36c0` (только `CLAUDE.md` + новый doc-файл,
без изменений кода animatrona — фикс `next.config.js` был в предыдущем коммите).

## Чистка `Icon as=` в `renderer/src/app/**` — codemod + ручная доработка (2026-08-26, доп.)

42 файла, 17 из них с оставшимся `Icon as=` доведены вручную (codemod `chakra-icon-as-cleanup.mjs`
дал 0 автоконверсий — все 56 узлов без `boxSize=`, что не редкость — codemod сознательно не
угадывает размер). Типовые случаи: инлайн-иконка перед текстом кнопки → `size={16}` по контексту,
`mr`/`ml` → `style={{ marginRight/marginLeft }}`, тернарник `as={cond ? A : B}` → JSX-тернарник с
двумя иконками, локальная переменная через capitalized alias (`const IconComponent = ...`).
Отдельный паттерн — три карточки статистики в `reputation/_components/`
(`StatsCard`/`ReputationCard`/`BonusPointsCard`) с пропом `icon: React.ElementType` — фикс
`{ icon: IconComponent }` в деструктуризации + `color` через
`` `var(--chakra-colors-${color.replaceAll('.', '-')})` `` вместо буквального токена.

Работа была изначально делегирована фоновому агенту, убитому лимитом сессии API — один файл
(`TrackerPublishingCard.tsx`) остался в буквально неконсистентном состоянии (импорт `Icon` убран,
использование — нет, `TS2304`), починен первым же делом. Коммит `3d927090`.
`typecheck:tsgo`+`lint` зелёные. Подробности рецепта — `.claude/docs/chakra-icon-as-prop-cleanup-pattern.md`.

## Стабилизация `animatrona-main:build` — 38 TS-ошибок + флаки (2026-08-26)

Закрыт открытый вопрос из `PLAN.md` (после фикса `tracker-client.ts` в предыдущей сессии).
`nx run animatrona-main:build --skip-nx-cache` прогнан **3 раза подряд без изменений в коде между
запусками — все три чисто**, `nx lint animatrona` и `nx typecheck:tsgo animatrona` тоже зелёные.

**38 TS-ошибок в 12 файлах** (полный список — см. предыдущую версию этой записи в git-истории
`PLAN.md`) закрыты по трём классам:

1. **`TS2835`** (относительный импорт без `.js` под `moduleResolution: node16`) — добавлено
   `.js`-расширение к динамическим `import(...)` в `export-queue-service.ts`, `kubo-service.ts`,
   `mobile-server/{server,routes/media}.ts`, `shikimori/client.ts`. Побочный эффект — это сломало
   **реальную** production-сборку через webpack/`ts-loader` (тот не понимает `.js`-суффикс,
   указывающий на `.ts`-файл); фикс — `resolve.extensionAlias: { '.js': ['.ts', '.js'] }` в
   `main/webpack.config.js`.
2. **`TS1479`/`TS1541`/`TS1542`** (CJS-файл ↔ ESM-only пакет: `@libp2p/crypto/keys`,
   `@libp2p/peer-id`, `multiformats/cid`, `kubo-rpc-client`) — статические импорты переведены в
   динамические `import()` внутри уже-`async` функций (`peer-id-manager.ts`) либо в ленивый
   `cidModulePromise`-геттер (`pin-manager.ts`, `unified-ipfs-service.ts`); `import type` —
   добавлен `with { 'resolution-mode': 'import' }` (`kubo-health.ts`, `kubo-stats.ts`,
   `kubo-service.ts`, `unified-ipfs-service.ts`); для `typeof import(...)` в позиции типа —
   отдельный синтаксис `typeof import('module', { with: { 'resolution-mode': 'import' } })`.
3. **Настоящие type-ошибки:**
   - `library-migration.ts` — `Awaited<ReturnType<typeof fs.readdir>>` резолвился не в тот
     оверлоад (`Dirent<NonSharedBuffer>[]` вместо нужного); явный тип `Dirent[]`/`string[]`.
   - `torrent-service-interface.ts` — `getShikimoriMeta()` не объявлял `torrentFileCid?: string`,
     хотя реализация в `qbittorrent-service.ts` его уже возвращала — интерфейс расширен.
   - `qbittorrent-service.ts:393` — `getTorrentFiles()` не делал `ensureClient()`+`!` как соседний
     `getTorrentComment()` — приведено к тому же паттерну.
   - `rutracker-download-orchestrator.ts` — `airedOn: shikimoriData.airedOn?.date` (поля `.date` у
     `ShikimoriDate` нет, только `{year,month,day}`) и `score: parseFloat(shikimoriData.score)`
     (уже `number | null`, не строка) — оба переписаны корректно; `ImportQueueSelectedAnime`
     (`shared/types/import-queue.ts` + `.d.ts`) расширен опциональными `episodesAired`/`score`/
     `genres`.
   - `rutracker-parser.ts` — `cheerio.Element` больше не реэкспортируется cheerio 1.2.0, тип
     импортирован из `domhandler` напрямую.
   - `peer-sync-service.ts` (**не входил в исходный список 12 файлов** — найден дополнительно) —
     `KUBO_CONFIG.Peering.Peers.find(p => p.ID === GATEWAY_PEER_ID)` структурно не мог совпасть:
     `GATEWAY_PEER_ID` намеренно исключён из `Peering` (gateway s2 списан с июня 2026, см.
     комментарий в `kubo-config.ts`) — мёртвый код удалён целиком, а не просто типизирован.
   - `TS2307 Cannot find module '@libp2p/interface'` / cheerio→`domhandler` — обе транзитивные
     зависимости не хостились в root `node_modules` под bun isolated linker; добавлены явно в
     корневой `package.json` (`@libp2p/interface`, `domhandler`), `bun install`.

**Причина исходной нестабильности (0 vs 38 ошибок на идентичной команде)** — НЕ гонка внутри
`animatrona:build`, как предполагалось изначально. Один из диагностических прогонов (`build4.log`)
не дошёл до реальной сборки вообще — лог на 5931 строк целиком состоял из повторяющегося Nx
"Creating project graph nodes", процесс пришлось убить; `tasklist` в этот момент показал десятки
параллельных `node.exe`/`bunx.exe` — это общий монорепо с множеством одновременных агентских
сессий (см. `.claude/rules/agent-mail.md`). Нестабильность — конкуренция за Nx daemon/project
graph между агентами, не баг в конфигурации `animatrona-main`.

**Отдельно найдено и починено (не входило в исходный отчёт про 38 ошибок):** после того как
type-check стал чистым, esbuild-бандлинг самого таргета `animatrona-main:build` упал на двух
конфигурационных проблемах, ранее замаскированных TS-ошибками:

- `main/project.json` → `targets.build.options.main` указывал на несуществующий
  `apps/animatrona/main/src/index.ts` (папка `src/` содержит только `ffmpeg/`, реальная точка
  входа — `apps/animatrona/main/main.ts`) — путь исправлен.
- `main/tsconfig.json` → `paths` не содержал `@letar/electron-storage` (два других `@letar/*`-либы
  уже были там), хотя `webpack.config.js` резолвит все три через `alias`. Esbuild-executor читает
  `tsconfig.json` `paths` для бандлинга — добавлена третья запись, по аналогии с двумя
  существующими. Общая причина класса — два независимых механизма резолва алиасов в `main/`, оба
  нужно обновлять при новом `@letar/*`-импорте: разбор и чеклист —
  [animatrona-dual-build-alias-drift.md](/.claude/docs/animatrona-dual-build-alias-drift.md).

**Файлы:** 15 файлов под `main/services/**`+`main/ipc/**` (перечислены выше), `shared/types/
import-queue.{ts,d.ts}`, `main/webpack.config.js`, `main/project.json`, `main/tsconfig.json`,
корневой `package.json`.

## Чистка `<Icon as={IconComponent}>` — semgrep `letar-chakra-as-prop-forbidden` (2026-08-26)

Часть кросс-приложенческой инициативы §61 корневого `PLAN.md` (после `libs/video-player-react`,
`libs/ui`, `animatrona-landing`, `animatrona-tracker`). Все 475 вхождений
`<Icon as={IconComponent}>` в 114 файлах `renderer/src/components/**` заменены на прямой рендер
react-icons-компонента — работа разбита на 5 параллельных фоновых агентов по директориям
(`transcode/*`, `library/*` верхний уровень, `library/{anime-detail,AnimeFilters,batch-publish,
reencode,export}/*`, `import*/add-tracks/restore-tracks`, `player/layout/discover/misc`), один
из них (`transcode/*`) сам дополнительно разбился на 4 подгруппы.

Тот же рецепт, что и в трёх предыдущих сессиях (см.
[chakra-icon-as-prop-cleanup-pattern.md](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md)):
`boxSize={N}` → `size={N×4}`, статичный `color="токен"` → `color="var(--chakra-colors-<kebab-
token>)"` (иконка сама наследует `currentColor`, где цвет уже задан на обёртке — проп просто
убран), динамический `as={cond ? A : B}`/`as={var}` → локальная capitalized-переменная перед JSX
(`const IconComponent = var`), spacing-пропы (`mr=`/`ml=`) без гарантированного `gap`-родителя →
`style={{ marginRight: 'Npx' }}`.

Один довесок вне исходного грепа — невалидный `animation=` проп на голом react-icons компоненте в
`VmafProgressCard.tsx` (react-icons не принимает `animation` как атрибут так, как принимал
обёрнутый `Icon`) — перенесён в `style={{ animation: ... }}`.

Проверено: `nx typecheck:tsgo animatrona` и `nx lint animatrona` — зелёные на каждую группу и на
финальный прогон (0 ошибок, только 56 pre-existing warnings). Electron-приложение — визуальная
проверка через dev-сервер не проводилась (не веб-страница, `preview_start` не применим к
Electron-окну), ограничились typecheck+lint+построчным ревью диффов.

⚠️ Приложение НЕ очищено от `as=` полностью — остаются 284 срабатывания другой формы того же
паттерна (`Box as="span"`, `Text as="span"` и т.п.), см. открытую задачу в `PLAN.md`. Severity
правила не поднималась (осталась WARNING).

## Фикс `animation`-пропа у react-icons в renderer (2026-08-26)

`nx typecheck:tsgo animatrona` падал тремя `TS2322` — `IconBaseProps` из `react-icons` не имеет
пропа `animation`, а он передавался напрямую в `<LuRefreshCw animation={...} />` (и аналогично
`LuChevronUp`/`StageIcon`) для CSS-анимации спиннера при загрузке. Фикс — перенос `animation` в
`style={{ ...остальное, animation }}`: [AnimeMetadataSection.tsx:400](/apps/animatrona/renderer/src/components/library/AnimeMetadataSection.tsx),
[EditAnimeDialog.tsx:69](/apps/animatrona/renderer/src/components/library/EditAnimeDialog.tsx),
[VmafProgressCard.tsx:122](/apps/animatrona/renderer/src/components/transcode/VmafProgressCard.tsx).

Восьмая ошибка, изначально описанная в задаче (`<Icon as={X}>` без импорта `Icon` в
`EncodingInfoDialog.tsx`), на момент фикса уже отсутствовала — файл использует прямой рендер
иконок без `Icon`/`as=`; похоже, устранена параллельной сессией до начала этой работы.

Проверено: `nx typecheck:tsgo animatrona` — 0 ошибок, `nx lint animatrona` — 0 errors
(56 pre-existing warnings не в скоупе). Изменения **не закоммичены** — в момент правки в тех же
двух файлах (`AnimeMetadataSection.tsx`, `EditAnimeDialog.tsx`) шла параллельная сессия
(`animatrona-dev`, активна с 2026-08-24T20:42 согласно cross-session памяти), выполняющая
bulk-миграцию `<Icon as={X}>` → прямой рендер иконки — те же файлы правились одновременно двумя
сессиями. Коммитить пришлось бы чужую незавершённую работу вместе со своей, поэтому изменения
оставлены в рабочем дереве для владельца/параллельной сессии.

## Типизация `response.json()` в `tracker-client.ts` (2026-08-26)

Продолжение предыдущей записи («Фикс `animatrona-main:build`»): после фикса схемы `Anime`
build дошёл до 70 предсуществующих `TS18046`/`TS2322`-ошибок в
[tracker-client.ts](/apps/animatrona/main/services/tracker-client.ts) — каждая функция
(`fetchTrackerCatalog`, `syncLibraryToTracker`, `fetchWatchProgressSince`, `fetchProfile`,
`updateProfile`, `addToLibraryViaTracker` и т.д.) делала `await response.json()` без типа и
либо читала поле результата как `unknown`, либо возвращала его напрямую как типизированный
интерфейс.

Добавлен generic-хелпер `readJson<T>(response): Promise<T>` и типизированное
`TrackerErrorPayload = { error?: string }` для веток ошибок. Каждый вызов `response.json()`
заменён на `readJson<КонкретныйТип>(response)` — используются уже существующие интерфейсы из
[tracker.ts](/apps/animatrona/shared/types/tracker.ts) (`TrackerSyncResult`,
`TrackerAddToLibraryResult`, `TrackerCatalogResult` и т.п.) либо инлайн-тип обёртки
(`{ data?: T }`, `{ items?: T[] }`) там, где сервер отдаёт не готовый интерфейс целиком, а
поле внутри объекта.

Проверено: `nx typecheck:tsgo animatrona` — 0 ошибок (все 70 исчезли), `nx lint animatrona` —
0 errors (39 pre-existing warnings в других файлах не задеты). `tracker-client.ts` не
встречается ни в одном прогоне `nx run animatrona-main:build`.

⚠️ **Побочная находка, не в скоупе этой задачи:** `animatrona-main:build`/`nx run
animatrona:build` при этом всё ещё нестабилен — из трёх прогонов один прошёл чисто, два дали
одни и те же **38 TS-ошибок в 12 других файлах** (`rutracker-parser.ts`, `shikimori/client.ts`,
`qbittorrent-service.ts`, `kubo-service.ts`, `kubo-health.ts`, `kubo-stats.ts`,
`unified-ipfs-service.ts`, `library-migration.ts`, `export-queue-service.ts`,
`mobile-server/{server,routes/media}.ts`, `rutracker-download-orchestrator.ts`,
`peer-id-manager.ts`, `pin-manager.ts`). Ошибки двух родов: (1) большинство — `TS2835`/`TS1479`/
`TS1541`, все про `moduleResolution: node16/nodenext` (относительные импорты без `.js`,
CJS↔ESM), таргет `main:build` собирается tsc с этой настройкой, а `typecheck:tsgo` — нет,
поэтому там чисто; (2) несколько настоящих type-mismatch (`library-migration.ts` — `Dirent<string>`
vs `Dirent<NonSharedBuffer>`, `rutracker-download-orchestrator.ts` — обращения к
несуществующим полям, `qbittorrent-service.ts:393` — `Object is possibly 'null'`). Плюс сама
нестабильность прогона (0 vs 38 ошибок на идентичной команде без изменений в коде между
запусками) — отдельная проблема, похоже на гонку в кеше/генерируемых файлах внутри таргета
`animatrona:build`. Задача занесена в `PLAN.md` как открытый вопрос.

## Фикс `animatrona-main:build`: расхождение схемы и `tracker-sync.ts` (2026-08-26)

`nx run animatrona-main:build` падал на 73 TS-ошибках — код обращался к
`Anime.trackerAnimeId`/`Anime.manifestCid`, которых нет в `schema.zmodel`.
`nx run animatrona-main:typecheck:tsgo` при этом был зелёным — таргет использует закешированный
сгенерированный Prisma-клиент, а `build` зависит от `animatrona:db:template`, который
регенерирует клиент по актуальной схеме и сразу ловит расхождение. Разбор двух полей —
разные причины:

- **`trackerAnimeId`** — реальный пробел, не опечатка. Комментарии в `tracker.handlers.ts` и
  логика `resolveAndPushWatchProgress()`/`pushWatchProgressImmediate()` в `tracker-sync.ts`
  явно рассчитывали на кэш-поле «id аниме на трекере» у `Anime` (для lookup без похода за
  всем каталогом трекера при push прогресса), но поля в схеме не было и заполнять его было
  некому. Добавлено `trackerAnimeId String?` в `schema/models/anime.zmodel`. Подключено
  заполнение: `DistributionService.registerAllDistributions()` уже резолвит
  `directoryCid → trackerAnimeId` через `buildTrackerAnimeMap()`, но раньше не сохранял
  результат обратно в БД — добавлен `prisma.anime.update({ trackerAnimeId })` в этом месте.
  Без этого поле оставалось бы вечно `null`, а push прогресса — тихим no-op.
- **`manifestCid`** — устаревший код, не пробел. Поле раньше было у `Anime`, но приложение
  мигрировало на `directoryCid` как основной идентификатор (v0.53+, см. запись
  «`directoryCid` как primary идентификатор для sync» выше по файлу). `tracker-sync.ts` держал
  legacy-fallback с явными TODO-комментариями «удалить после миграции клиентов на
  directoryCid» — миграция уже случилась, код не почистили. Удалены все обращения к
  локальному `Anime.manifestCid`: select в `doPushLibraryItem`/`doFullSync`, `OR`-фильтр по
  нему в выборке библиотеки, fallback-поиск `prisma.anime.findFirst({ where: { manifestCid }
  })` в `applyServerItems`. На wire-протоколе с трекером (`TrackerSyncItem`/`TrackerServerItem`
  в `shared/types/tracker.ts`) поле осталось нетронутым — оно deprecated-опциональное для
  входящих/исходящих данных API, не для локального хранения.

Проверено: `nx zenstack:generate animatrona` → `nx db:push animatrona` →
`nx run animatrona-main:build` проходит чисто (остаются только 70 предсуществующих
`TS18046`-ошибок в `tracker-client.ts` — `response.json()` возвращает `unknown`, файл не
трогался, не связан со схемой `Anime`, вне скоупа этой задачи). `nx lint animatrona` — чисто
(только старые warnings по React hooks, не по этой правке).

## Turbopack+Emotion hydration-риск renderer: переход на webpack (2026-08-25)

PLAN.md §36: `renderer` держит ту же связку `ChakraProvider` + `next-themes`'ный
`ColorModeProvider` (прямой потомок), что вызывала подтверждённые hydration-баги (потерянные
клики, `ContextError`) в mandala/aira-web/auth-hub/dashboard/driving-school/animatrona-tracker
и трёх лендингах. Риск для animatrona оценён как выше среднего — полноценное multi-route SPA
(`library`/`watch`/`discover`/`settings`/`party`), soft-навигация происходит постоянно.

Фикс не был тривиальным `--webpack` в двух командах (как у лендингов): `next.config.js` держал
непустой `turbopack.resolveAlias` (замена `node-fetch`/`cross-fetch` на fetch-шим, алиас
`@letar/animatrona-ui`) без автоматического webpack-эквивалента. Написан `webpack()`-хук с тем
же поведением через `config.resolve.alias` + `path.resolve(__dirname, ...)`. `--webpack`
добавлен в `dev`/`build` `renderer/project.json`, и отдельно — во все 8 таргетов
`apps/animatrona/project.json` (реальная Electron-сборка `electron-builder` запускает
`cd renderer && next build` напрямую, минуя nx-таргет renderer), и в e2e `webServer`
(`apps/animatrona-e2e/playwright.config.ts`).

Переход на webpack вскрыл два независимых, не связанных с Emotion бага, оба исправлены в том
же `next.config.js`/коде:

- **`libsql`** (native N-API биндинг): резолвит опциональные `@libsql/*`-платформенные пакеты
  через `require.context` (relative require внутри самого пакета) — Turbopack не-JS файлы
  (README/LICENSE/`.node`) внутри контекста молча игнорировал, webpack падал на парсинге.
  Обычный `serverExternalPackages` не спасает (матчится по спецификатору `require()`, а не по
  факту прохождения через транспилируемый `@libsql/client`). Фикс — явный `config.externals`
  для `'libsql'`, причём не bare-спецификатором (bun isolated-инсталл не хостит `libsql` в
  корневом `node_modules`), а абсолютным путём: `require.resolve('libsql', { paths:
  [path.dirname(require.resolve('@libsql/client'))] })`.
- **`snowball-stemmers`** (`src/lib/stemmer.ts`, русский стеммер для поиска): `import
  snowballFactory from 'snowball-stemmers'` резолвился в `undefined` под webpack — пакет собран
  Babel в CJS с `__esModule: true`, но без `exports.default` (только именованные
  `newStemmer`/`algorithms`), и Turbopack при этой комбинации фолбэчился на весь module object,
  а webpack — строго на `undefined`. Настоящий бандлер-агностичный фикс (не воркэраунд-алиас,
  правка source) — `import { newStemmer } from 'snowball-stemmers'`; `.d.ts` переписан на
  именованные экспорты.

Отдельно применён уже установленный паттерн — `@tanstack/devtools-ui@0.7.0+` под webpack
(PLAN.md §51, тот же баг что в `driving-school`/`mandala`/`dashboard`/`animatrona-tracker`/
`grandslamcup`): `config.resolve.alias['@tanstack/devtools-ui'] = false` при `isServer || !dev`.

Проверено: `nx build animatrona-renderer` зелёный (22/22 страниц), `nx dev
animatrona-renderer` — dev-сервер отдаёт полный рендер библиотеки без hydration-ошибок в
консоли (проверено через Browser pane).

**Остаточный пробел, задокументирован, не закрыт в этой сессии:** `nx dev animatrona`
(интерактивный запуск Electron-оболочки через `nextron` CLI) хардкодит `next dev -p <port>
<rendererSrcDir>` без опции передать `--webpack` (`nextron@10.3.0`, команда `dev` не имеет
флага-passthrough). Это дев-only путь — то, что паковается пользователю, идёт через
`apps/animatrona:build`, уже переведённый на `--webpack`. GUI-уровень самого Electron-окна не
проверяем в сендбоксе Claude Code в принципе (`.claude/rules/electron.md`).

Детали — [nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)
§ «Electron-рендерер `animatrona`».

## Вынос generate-icons в общую библиотеку @letar/icon-generator (2026-08-25)

Точечный фикс `require('png-to-ico').default` ниже устранял симптом, но не причину: три
Electron-приложения (`animatrona`, `label-printer-desktop`, `poster-microtext-desktop`) держали
независимые копии одного и того же скрипта генерации PNG+ICO из SVG, разошедшиеся по движку
рендера (`sharp` / `@resvg/resvg-js`) и по формату модуля (CJS/ESM) — отсюда и класс багов вроде
этого. Вынесено в `libs/icon-generator` (`@letar/icon-generator`) — plain-JS ESM-библиотека по
паттерну `@letar/theme-check` (запускается голым `node` без бандлера, резолв через
`nx.implicitDependencies` + `dependencies: "workspace:*"` в `package.json` приложения). Движок
унифицирован на `sharp` (уже был у 2 из 3 приложений и в шаблоне генератора
`electron-app`). `scripts/generate-icons.js` теперь — тонкая обёртка с
`await import('@letar/icon-generator')` (CommonJS-файл не может делать top-level `import`, но
динамический `import()` внутри `async function` работает). Прогнан на всех трёх приложениях,
иконки визуально сверены, `nx test/lint/typecheck:tsgo` зелёные.

## Миграция generate-icons.js: to-ico → png-to-ico, фикс молчаливо неработающего icon.ico (2026-08-25)

Задача пришла как «перевести три Electron-приложения с `to-ico` на `png-to-ico`» — по факту
`generate-icons.js` уже импортировал `png-to-ico`, задача свелась к вычистке неиспользуемой
зависимости `to-ico` из корневого `package.json`/`bun.lock` (устраняет уязвимую цепочку
`request`→`form-data@2.3.3`, CVE-2025-7783).

При верификации прогоном скрипта найден реальный баг: `png-to-ico@3.0.2` — чистый ESM-пакет
(`"type": "module"`, `export default`), `require('png-to-ico')` в CommonJS-скрипте отдавал
namespace-объект `{ default: fn }`, а не саму функцию — вызов `pngToIco(pngBuffers)` падал
`TypeError: pngToIco is not a function`. `catch`-блок глушил ошибку фиксированным текстом
«установите png-to-ico: npm install png-to-ico», хотя пакет был установлен и проблема была
не в этом — `icon.ico` не генерировался программно уже давно, но никто не заметил (файл в
`resources/` остался от какого-то более раннего ручного прогона). Фикс —
`require('png-to-ico').default`, `catch` теперь печатает `e.message`. Прогнан скрипт локально,
иконки визуально сверены.

## Обновление Electron 43.3.0 → 44.0.0 (2026-08-25)

Локальный пин `electron` расходился с корневым `package.json` (`^43.4.1`) — `bun.lock` держал
физический дубль версии (`electron@43.4.1`/`43.3.0` резолвились параллельно рядом с корневым).
Первым шагом приведён к точной версии `43.4.1` (совпадала с корневой на тот момент). По просьбе
владельца сразу следом поднят до **мажорной** `44.0.0` (актуальный стабильный релиз на 2026-08-25)
— решение бампнуть заодно и корневой `package.json`, и все четыре Electron-приложения монорепо
разом, а не только animatrona. electron-builder требует точную версию в `devDependencies`, не
диапазон — заодно обновлена захардкоженная версия в `postinstall`/`postinstall:dev`
(`@electron/rebuild -v` для native-модуля `classic-level`).

После `bun install` дубль в `bun.lock` исчез — все четыре приложения делят один
`electron@44.0.0` с корнем. `@electron/rebuild -v 44.0.0` прошёл (`No native modules found` —
`classic-level` не тянет нативный биндинг под текущую конфигурацию, шаг успешен и без
пересборки). `nx typecheck:tsgo` и `nx lint` зелёные на всех четырёх приложениях
(`animatrona`, `label-printer-desktop`, `poster-microtext-desktop`, `kami-key-the`) — warning'и
в lint все давние и не связаны с апдейтом.

⚠️ Мажорный бамп electron (43→44) не проверен живым запуском — сборка (`nx build`) и ручной
смоук каждого приложения на реальном GUI не входили в объём этой задачи (сендбокс Claude Code не
поднимает Chromium даже headless). Проверять на первом реальном запуске каждого приложения.

## Фикс: FormI18nProvider отсутствовал — подсказки валидации на английском (2026-08-25)

Тот же класс бага, что нашли и починили в `domwellbes`: `@letar/forms` переводит constraint
hints (`z.string().min/max`) на русский только внутри `FormI18nProvider` — без обёртки локаль по
умолчанию `'en'`. Renderer не использует i18next (приложение русскоязычное), поэтому обёртка —
`FormI18nProvider locale="ru"` в `renderer/src/components/ui/provider.tsx`. Разбор класса бага —
[.claude/docs/letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).
`nx typecheck:tsgo animatrona-renderer` зелёный.

---

## Разбиение schema.zmodel на 9 доменных файлов (2026-08-25)

`schema.zmodel` разросся до 2024 строк (17 enum + 39 моделей) — редактирование одной модели
требовало скроллить сотни несвязанных строк. Разбит на `schema/models/{common,anime,media,
import,watch,settings,federation,social,shikimori}.zmodel` по домену модели (common — File/
PinStatus, anime — Franchise/Anime/Genre/Season/Episode и т.д., media — AudioTrack/
SubtitleTrack/EncodingProfile, federation — Subscription/Tracker/FederatedContent, social —
геймификация/друзья, shikimori — кэш внешних метаданных). Корневой `schema.zmodel` теперь —
только 9 `import`-строк + `datasource`/`generator`/`plugin`.

Модели интенсивно ссылаются друг на друга через границы доменов (`Anime` → `File`, `Episode` →
`AudioTrack`/`Settings`, и т.д.) — импорта только в корне оказалось недостаточно: `zenstack
generate` падал с `Could not resolve reference to TypeDeclaration`. Рабочий паттерн — **каждый
доменный файл импортирует все остальные 8** (циклические cross-file импорты между `.zmodel`
подтверждённо рабочие, см.
[zenstack-multifile-schema-circular-imports.md](/.claude/docs/zenstack-multifile-schema-circular-imports.md)).

**Проверено в изолированном `git worktree`** (без риска для общего чекаута, см.
[git.md § Работа рядом с другими агентами](/.claude/rules/git.md)) — прогнан `zenstack generate`
до и после разбиения напрямую через бинарник (`node_modules/.bin/zenstack`, минуя `nx`),
сравнены `schema.prisma` и `form-schemas/index.ts`: набор моделей/enum'ов идентичен, различался
только порядок объявлений (следствие порядка merge файлов, не потеря данных). После применения к
реальному репо — `prisma db push` на dev-БД: «database is already in sync», `tsgo` — 0 ошибок.

⚠️ Nx daemon/project-graph в момент сессии был нестабилен (падал на чужом орфан-worktree
`driving-school-wt-split-a41c` от параллельной сессии, затем на таймауте спавна плагин-воркеров)
— `zenstack:generate`/`db:push`/`typecheck:tsgo` прогнаны напрямую через бинарники в обход `nx`,
не через сам таргет. Дубль worktree исчез сам к следующей проверке (владелец убрал).

## Аудит дублей по монорепо: renderer/usePrefersReducedMotion → @letar/hooks (2026-08-20)

`renderer/src/hooks/usePrefersReducedMotion.ts` дублировал
`useMediaQuery(breakpoints.prefersReducedMotion)` из `@letar/hooks` (уже implicit dependency
animatrona, просто не был использован для этого хука). Удалён, оба потребителя
(`ImportQueueItemExpanded.tsx`, `GpuWorkerCard.tsx`) переключены на общий хук. `mobile-ui` (свой
изолированный Vite-пакет без единой `@letar/*` зависимости) намеренно не тронут — см. открытый
вопрос ниже. v0.55.20.

## Фикс ложных `no-restricted-syntax` (NODE_ENV) во вложенном main/eslint.config.mjs (2026-08-19)

`nx lint animatrona` падал на 6 ошибках `no-restricted-syntax` в `main/main.ts`,
`main/services/database.ts`, `main/services/next-server.ts`, `main/services/window-manager.ts`,
`main/utils/db.ts`, `main/utils/logger.ts` — хотя весь код уже использует легитимный allow-list
паттерн `app.isPackaged || process.env.NODE_ENV === 'production'` (только `logger.ts:188` — голая
проверка без `app.isPackaged`, но это тоже покрыто allow-list по пути файла, не по паттерну кода).

Причина — та же, что нашли в `label-printer-desktop` в этой же сессии:
`apps/animatrona/main/eslint.config.mjs` — вложенный конфиг (спредит корневой `baseConfig`).
ESLint резолвит его `files`-паттерны относительно каталога `main/`, а не корня репо, поэтому
корневой allow-list `files: ['main/**/*.ts', 'apps/*/main/**/*.ts']` не матчится — путь приходит
уже без сегмента `main/` (`background.ts`, не `main/background.ts`).

Фикс — override третьим элементом массива в `apps/animatrona/main/eslint.config.mjs`:

```js
{
  files: ['**/*.ts'],
  rules: { 'no-restricted-syntax': 'off' },
}
```

Безопасно — файл управляет только поддеревом `main/`. `nx lint animatrona` → 0 ошибок (39
предэкзистентных warnings — `react-hooks/exhaustive-deps`, `no-console` — не в рамках задачи).
`nx typecheck:tsgo animatrona` — зелёный, не затронут. Разбор класса бага —
`.claude/docs/node-env-not-production-signal.md` § Случай 5.

---

## Дедупликация extraResources в electron-builder.yml через YAML-якоря (2026-08-09)

Найдено побочно предыдущей сессией (апдейт Electron, см. §67 в `PLAN-INFRA.md`): `win:` и
`linux:` блоки `electron-builder.yml` дублировали ~65 строк списка `extraResources` — 11
native-модулей OrbitDB/Prisma (`libsql`, `@neon-rs/load`, `detect-libc`, `fts5-sql-bundle`,
`classic-level` и 5 его зависимостей). Платформо-специфичные записи (`ntsuspend` — только win,
`@libsql/win32-x64-msvc` vs `@libsql/linux-x64-gnu`) остались без изменений.

Дедуплицировано через стандартные YAML-якоря/алиасы (`&anchor` на элементе списка в `win:`,
`*anchor` в `linux:`) — не electron-builder-специфичный механизм, а обычная возможность YAML,
которую `js-yaml` (парсер конфига в `app-builder-lib`) поддерживает из коробки. 338 строк → 316.

**Проверка без полной сборки** (`nx build:win`/`build:linux` дорого для сессии):

- резолвленный JSON конфига до и после правки сверен напрямую через `js-yaml@4.1.1` (версия из
  реально используемого в монорепо `app-builder-lib@26.15.2`) — побайтово идентичен;
- реальный загрузчик конфига electron-builder (`getConfig()` + `validateConfiguration()` из
  `app-builder-lib`) на новом файле проходит без ошибок схемы.

**Нюанс на будущее:** `js-yaml` резолвит алиас в тот же объект-референс, не клон — проверено
явно (`win.extraResources[i] === linux.extraResources[j]` → `true`). В данном случае это
безопасно, потому что `getFileMatchers()` в `app-builder-lib` только читает поля `from`/`to`/
`filter` и не мутирует объект. Если в будущей версии electron-builder появится код, мутирующий
элементы `extraResources` после парсинга — эта техника дедупликации перестанет быть безопасной
без явного клонирования (`... в JS/YAML нет generic deep-clone для алиасов`).

---
