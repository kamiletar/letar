# Animatrona — Выполненные задачи (Часть 1)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: 2026-09-04 — 2026-09-07.

## Main-часть папочного плеера перенесена в @letar/folder-scan (2026-09-07)

**Контекст:** последний открытый пункт плана «Animatrona Player» из блока «что уже готово» —
main-процесс папочного режима (внешние сканеры аудио/субтитров, whitelist путей для `media://`,
сам обработчик протокола, сканирование папки на медиафайлы) ещё жил внутри `apps/animatrona/main/`
и не был переиспользуем будущим `animatrona-player`.

**Реализация:** `external-audio-scanner.ts`, `external-subtitle-scanner.ts`, `font-matcher.ts`,
`subtitle-parser.ts`, `fs-utils.ts` перенесены в `libs/folder-scan/src/lib/` без изменения логики
(только импорты). `allowed-paths.ts` (whitelist) и `media.protocol.ts` (обработчик `media://`)
обобщены — вместо жёсткой привязки к `app.getPath()` теперь принимают seed-пути/колбэк
`isPathAllowed` параметром, а в `apps/animatrona/main/protocols/` остались тонкие адаптеры,
подставляющие Electron-специфичные пути (`getDefaultLibraryPath()`, `app.getPath('temp')`,
`app.getPath('userData')`). Новый `scanFolderForMedia` вынесен из `fs.handlers.ts`. Добавлен
интерфейс `MediaProber` с нормализованными `AudioTrack`/`SubtitleTrack`/`VideoTrack`/
`MediaChapter`/`MediaInfo` — `apps/animatrona/shared/types.ts` теперь ре-экспортирует их вместо
локальных копий, а `main/ffmpeg/probe.ts` экспортирует `ffprobeProber: MediaProber` как тонкую
обёртку над существующим `probeFile` (логика ffprobe не тронута — это чисто типовой адаптер).
`main/src/ffmpeg/` (esbuild-сборка, `vmaf.handlers.ts`/`import-queue-controller.ts`) оставлен как
есть — это архитектурно отдельная, ранее задокументированная развилка
([animatrona-dual-build-alias-drift.md](/.claude/docs/animatrona-dual-build-alias-drift.md)),
трогать не требовалось.

`nx lint`/`typecheck:tsgo`/`build`/`test` animatrona и `nx test`/`lint` folder-scan — все зелёные.
Коммит `61ba1d00`.

## Постер в папочном режиме + Episode.name из AniList (2026-09-07)

**Контекст:** аудит `directoryCid` (PLAN.md, Блокер 3) оставлял `Episode.name` открытым с
ошибочной формулировкой «прокинуть от Shikimori» — проверка всех GraphQL-запросов
([queries.ts](main/services/shikimori/queries.ts)) показала, что у Shikimori вообще нет
потитульных названий отдельных серий (только `episodes`/`episodesAired` как числа).

**Реализация:**

1. **Постер в папочном режиме плеера.** Быстрое открытие папки (`app/player/`, без импорта в
   библиотеку) было полностью локальным и не показывало ничего похожего на обложку. Новый хук
   `useFolderShikimoriMatch` ([useFolderShikimoriMatch.ts](renderer/src/app/player/_hooks/useFolderShikimoriMatch.ts))
   переиспользует существующий `parseFolderName`/`generateSearchQueries` (тот же парсер, что уже
   автозаполняет поиск в мастере импорта), ищет в Shikimori и подставляет постер только при
   **однозначном** совпадении (`findConfidentAnimeMatch`,
   [folder-match.ts](renderer/src/lib/shikimori/folder-match.ts) — ровно один результат точно
   совпал по `name`/`russian`, иначе `null`). Гонки между последовательными открытиями папок
   защищены токеном запроса. `EpisodeSidebar` (`@letar/folder-player-react`) получил опциональный
   проп `posterUrl`. Заодно вынесен общий `getShikimoriPosterUrl()`
   ([poster-url.ts](renderer/src/lib/shikimori/poster-url.ts)) — раньше был приватной функцией
   внутри `ShikimoriAnimeCard.tsx`.
2. **`Episode.name` — best-effort из AniList `streamingEpisodes`.** Список эпизодов со
   стриминговых площадок (Crunchyroll/HIDIVE/...) — не канонично, формат заголовка задаёт
   площадка. Запрос `streamingEpisodes { title }` добавлен в уже существующий AniList-запрос
   ([client.ts](main/services/anilist/client.ts)), переиспользует тот же TTL-кэш по ключу
   `anilistId/malId`, что и `descriptionEn` — второй сетевой запрос не нужен. Чистая функция
   `buildAniListEpisodeNameMap()` ([episode-names.ts](main/services/anilist/episode-names.ts))
   парсит `"Episode N - Title"`/`"Ep. N: Title"`/`"N - Title"` (включая `—`/`–`) в карту «номер →
   название»; заголовок без текста после разделителя названия не даёт. При дубле номера с разных
   площадок — первое найденное. Подключено в
   [anime-manifest-generator.ts](main/services/anime-manifest-generator.ts): только при свежей
   генерации `AnimeInfo` (не при переиспользовании `animeInfoCid` из кеша БД), пишет `Episode.name`
   в БД для эпизодов без имени и сразу отражает в собираемом манифесте. Non-fatal — ошибка
   AniList/записи в БД не роняет генерацию манифеста.

**Не сделано:** парсинг названия серии из имени файла (альтернативный источник) — не исследован,
большинство аниме-релизов не включают тайтл серии в имя файла, только номер.

**Тесты:** 13 новых (`episode-names.spec.ts`), typecheck:tsgo/lint/test (179/179) — зелёные.
Визуально постер в папочном режиме не проверялся — GUI Electron-приложения не тестируется в этой
песочнице (`.claude/rules/electron.md`).

## isForced у SubtitleTrack/AudioTrack — библиотечный режим (2026-09-06)

**Проблема:** флаг `disposition.forced` контейнера (форсированные субтитры/аудио — например
надписи на неродном языке, которые плеер должен показывать даже при выключенных субтитрах) уже
читался и учитывался в папочном режиме плеера (`main/ffmpeg/probe.ts`, `isForced` в
`MediaInfo`/`TrackSelector`), но полностью терялся в библиотечном режиме (импорт в БД →
транскод → раздача по IPFS) — там хранить его было негде: ни в схеме, ни в манифесте.

**Реализация:**

1. `schema/models/media.zmodel` — поле `isForced Boolean @default(false)` у `SubtitleTrack` и
   `AudioTrack`. Миграция `prisma/migrations/20260906203900_add_track_is_forced/`.
2. `libs/animatrona-types/src/episode-manifest.ts` — `isForced?: boolean` в
   `ManifestAudioTrack`/`ManifestSubtitleTrack`.
3. `apps/animatrona/shared/types.ts` — `isForced?: boolean` в `DemuxedAudio`/`DemuxedSubtitle`.
4. `main/ffmpeg/demux.ts` — раньше ffprobe вызывался без запроса `disposition` вообще (в отличие
   от `probe.ts`, где это уже было). Добавлено поле `disposition?: StreamDisposition` в тип
   потока и заполнение `isForced` через `isDispositionFlagSet` (`@letar/folder-scan`, тот же
   детектор, что уже использует папочный режим) при пуше в `audioTracks`/`subtitles`.
5. Прокинуто по всему конвейеру: `audio-track-creator.ts`/`subtitle-track-creator.ts` (создание
   БД-записей из демукс-результата) → `import-db.ts` (`createAudioTrack`/`createSubtitleTrack` +
   оба `findXForManifest`) → `manifest-generator.ts` (`rebuildManifestTracks`, включая сравнение
   в `serializeAudio`/`serializeSub`, чтобы регенерация манифеста реагировала на изменение
   флага). Дополнительно исправлены три места, где Prisma `select` дублируется отдельно от
   `import-db.ts` (`manifest.handlers.ts`, `episode-manifest-regen.ts`
   `EPISODE_TRACKS_SELECT`) — иначе поле осело бы в БД, но не доехало бы до манифеста.
6. Внешние дорожки (drag&drop файлы, не встроенные в контейнер) флага не несут —
   `isForced: false` по умолчанию.

Закрывает PLAN.md §19.4 «Библиотечный режим» — задача была привязана к дедлайну «до массовой
перезаливки библиотеки» (§15.3, из-за дороговизны повторного прохода по всей библиотеке).

lint/typecheck:tsgo animatrona — зелёные (0 ошибок, только преэкзистентные warnings).

## Консолидация Prisma select для треков манифеста (2026-09-06)

**Проблема:** пункт 5 выше («три места дублирования select») был исправлен точечно — поля
добавлены в три места по отдельности, но сама структура select оставалась продублирована
построчно в `import-db.ts` (`findAudioTracksForManifest`/`findSubtitleTracksForManifest`),
`manifest.handlers.ts` (`manifest:rebuildTracksFromDb`) и `episode-manifest-regen.ts`
(`EPISODE_TRACKS_SELECT`). Сверка поле-в-поле нашла реальное расхождение: `EPISODE_TRACKS_SELECT`
не запрашивал `ipfsSize` ни у аудиодорожек, ни у субтитров/шрифтов — `rebuildManifestTracks`
использует его как fallback для `size`, когда старый манифест ещё не содержит запись с этим CID
(`manifest-generator.ts:382,423,431`), то есть при регенерации размер файла в такой ситуации
терялся бы (оставался `undefined`), хотя в БД он есть. Второе расхождение (`subtitleType` был
только в `EPISODE_TRACKS_SELECT`) не функциональное — поле нигде не читается
`rebuildManifestTracks`/`DbSubtitleTrackData`, просто лишнее в select.

**Реализация:** вынесены `AUDIO_TRACK_MANIFEST_SELECT`/`SUBTITLE_TRACK_MANIFEST_SELECT` (as const
satisfies `Prisma.AudioTrackSelect`/`Prisma.SubtitleTrackSelect`) в `import-db.ts` как единый
источник истины (объединение полей всех трёх мест, включая `ipfsSize` и `subtitleType`) —
`manifest.handlers.ts` и `episode-manifest-regen.ts` теперь импортируют константы вместо
собственных копий select. lint/typecheck:tsgo/test animatrona — зелёные (166 тестов).

⚠️ **Побочная находка, не пофикшена в рамках этой задачи:** `nx test animatrona` не собирает
`main/services/import/__tests__/anime-record-setup.spec.ts` — цепочка импортов до
`external-subtitle-scanner.ts` → `@letar/folder-scan` падает под vitest
(`Cannot find package '@letar/folder-scan'`), хотя `typecheck:tsgo` и продовая сборка (через
webpack/esbuild-алиасы `main/`) резолвят пакет нормально. Причина — пакет только в
`nx.implicitDependencies`/`tsconfig.json` `paths`, не в настоящих `dependencies`
`apps/animatrona/package.json`, симлинка в `node_modules` нет. Существовало до этой сессии.
Остальные 162 теста в собравшихся файлах прошли. Заведена отдельная задача (см. ниже).

Коммиты: `3d778376` (`@letar/animatrona-types`), `a6ce1057` (`animatrona`).

## Автоопределение глав (OP/ED) в папочном режиме плеера (2026-09-06)

**Проблема:** при импорте в библиотеку главы из контейнера классифицируются
(`detectChapterType`/`isChapterSkippable`, `main/services/import/helpers.ts`) и попадают в
IPFS-манифест → плеер показывает маркеры и пропускает опенинг/эндинг. В папочном режиме
(`/player`, файлы с диска без импорта в БД) те же данные уже вычислялись тем же ffprobe-вызовом
(`main/ffmpeg/probe.ts` `getChaptersAndAttachments()`), но отбрасывались на уровне контракта:
`MediaProbeInfo` в `@letar/folder-player-react` вообще не имел поля `chapters`.

**Реализация:**

1. `libs/folder-player-react/src/lib/host.ts` — новый тип `ProbedChapter {start, end, title}`,
   поле `chapters?: ProbedChapter[]` в `MediaProbeInfo`.
2. `libs/folder-player-react/src/lib/types.ts` — поле `chapters: ProbedChapter[] | null` в
   `FolderPlayerState`.
3. `libs/folder-player-react/src/lib/useFolderPlayer.ts` — `scanTracksForEpisodeInternal`
   заполняет `chapters` из результата пробы параллельно с `embeddedTracks`, сбрасывает в `null`
   при старте нового скана и при ошибке.
4. `apps/animatrona/shared/utils/chapters.ts` (новый файл) — `detectChapterType`/
   `isChapterSkippable` перенесены сюда из `main/services/import/helpers.ts` (паттерн `shared/`
   — общий рантайм-код для main и renderer, см. `.claude/rules/electron.md`). В
   `main/services/import/helpers.ts` оставлен реэкспорт — вызывающее место `chapter-creator.ts`
   не тронуто, `manifest-generator.ts` на тот момент оставлен со своим приватным дублем (см. ниже
   — консолидировано отдельной сессией 2026-09-06).
5. `apps/animatrona/renderer/src/components/player/chapter-utils.ts` — новый конвертер
   `probeChapterToPlayerChapter()` (секунды → секунды, классификация по заголовку через
   `detectChapterType`), рядом с существующим `manifestChapterToPlayerChapter()` (мс → секунды,
   уже классифицированный тип из манифеста).
6. `apps/animatrona/renderer/src/app/player/page.tsx` — `folderPlayerHost.probe()` пробрасывает
   `chapters` из `window.electronAPI.ffmpeg.probe()`; `playerChapters` (useMemo);
   `useChapterAutoSkip` (переиспользован как есть из `@/app/watch/_hooks`, ранее использовался
   только в библиотечном режиме — общий, не завязан на манифест/эпизод из БД) подключает
   автопропуск по `Settings.skipOpening`/`skipEnding`; `chapters`/`onChapterSeek` переданы в
   `<VideoPlayer>` для маркеров на прогресс-баре.

**Не сделано намеренно:** ручная кнопка override автопропуска (как в `watch/[episodeId]/page.tsx`)
— не входила в исходную формулировку задачи, автопропуск работает по глобальным настройкам.
Консолидация с более продвинутым классификатором `@letar/video-player-react`
(`utils/detect-chapter-types.ts`, title + позиция/длительность) — открытый пункт, см. пометку в
PLAN.md, не блокирует эту задачу.

**Верификация:** `nx typecheck:tsgo animatrona` и `nx lint animatrona` — зелёные (0 ошибок).
GUI-уровень (реальное воспроизведение файла с главами в папочном режиме) не проверялся в
песочнице Claude Code — недоступно по правилам `.claude/rules/electron.md`.

## Консолидация классификаторов типа главы OP/ED (2026-09-06)

**Проблема:** ревью открытого пункта из задачи выше показало, что независимых реализаций
классификации глав на деле четыре, не две:

1. `shared/utils/chapters.ts` (title-only) — активный, `chapter-creator.ts` + папочный режим.
2. `main/services/manifest-generator.ts` — **приватный дубль** той же title-only логики
   (`detectChapterType`/`isChapterSkippable`, не импортировал `shared/utils/chapters.ts`) —
   разошёлся с №1: главы для IPFS-манифеста при первичной генерации эпизода
   (`generateManifestFromDemux`, пайплайн `import/post-process-runner.ts`) классифицировались
   иначе, чем те же главы, дописываемые позже через `chapter-creator.ts`.
3. `libs/video-player-react/src/utils/detect-chapter-types.ts` (title + позиция/длительность,
   `Chapter[] → Chapter[]`) — по грепу всего репозитория нигде не используется, только в
   собственном spec-файле.
4. `renderer/src/components/player/ChapterMarkers.tsx` — буквальная копипаста №3, экспортирована
   через `player/index.ts`, тоже без единого вызова.

**Решение (по итогам обсуждения с владельцем):**

- №2 заменён на импорт из `shared/utils/chapters.ts` (`isChapterSkippable(chapter.title)` вместо
  `isChapterSkippable(type)` — сигнатуры разные, но семантически эквивалентно: тип и так
  выводится из title). Неиспользуемый после этого импорт `ManifestChapterType` убран.
- №4 удалён как мёртвый код (вместе с реэкспортом из `player/index.ts`), №3 в `libs` оставлен —
  не мёртв концептуально, просто пока ничем не потреблён.
- Позиционный фоллбэк (опенинг в первые ~180с длиной 60-150с) сознательно не подключается никуда:
  в animatrona уже есть `main/services/intro-detector.ts` — рабочий аудио-фингерпринт
  (Chromaprint, попарное сравнение эпизодов), заведомо точнее догадки по типовой длине опенинга.
  `MediaProber` (Фаза 3 плана Animatrona Player) по-прежнему не существует.

**Верификация:** `nx typecheck:tsgo animatrona` и `nx lint animatrona` — зелёные (0 ошибок).
Коммит `5d0fb5cd`.

## Типизация main-процесса (tsgo) + починка 4 e2e-тестов плеера (2026-09-06)

Main-процесс не проверялся типами вообще: `main/tsconfig.json` имел `include`, не покрывающий
реальную структуру исходников (`main/ffmpeg`, `main/services`, `main/ipc`), корневой
`tsconfig.json` приложения `main` исключал, а webpack собирал через `ts-loader` с
`transpileOnly: true`.

**Фикс конфига:** `module`/`moduleResolution` → `ESNext`/`bundler` (было `Node16`), снят
фантомный `references` на `tsconfig.spec.json`, снят `rootDir`/`outDir`, `include` расширен до
`**/*.ts`.

**Разгребено 295 ошибок tsgo.** Часть — типовые пробелы (виджет `unknown` из-за инференса
дефолтных параметров внутри generic `createHandler<TArgs, TResult>`, потеря const-narrowing
через вложенные `function`-объявления, конфликт `declare module 'electron'` с типами самого
electron — TS2300). Часть — настоящие давние функциональные баги, молчавшие только из-за
отсутствия проверки:

- жанры/темы аниме не сохранялись при локальном torrent-импорте (`Genre`/`Theme` писались с
  несуществующими полями, ошибка Prisma глушилась try/catch) — добавлено поле `Genre.nameRu` в
  `schema.zmodel` + миграция `20260906185655_genre_add_name_ru`
- `AnimeRelation.upsert` бил по несуществующему compound-ключу
- весь `AchievementService` вызывался без `await` (методы `achievements-store.ts` асинхронны)
- watchdog зависших видео-задач (`video-pool.ts`) читал поля не с того объекта и никогда не
  срабатывал
- ретрай скачивания постера не срабатывал из-за неверной проверки результата
- автостарт синхронизации трекеров терял `await` у конфига
- `tracker.handlers.ts` упал бы при первом вызове `syncLibrary` (не были импортированы
  `path`/`app`/`fs`)
- `resumeTask` в `base-pool.ts` не проверял `process` на `null` (в отличие от парного
  `pauseTask`)
- `web-export-manager.ts` звал несуществующий класс `UnixFSService.getInstance()` — гарантированный
  краш при публикации в IPFS
- `manifest-generator.ts` писал несуществующее поле `path` вместо обязательного `cid`
- `content-migration.ts` записывал в БД весь объект `IpfsAddResult` вместо строки CID
- `episode-manifest-regen.ts` фильтровал `Anime` по несуществующему полю `manifestCid` (нужно
  `animeInfoCid`)
- `relations-and-manifest.ts`/`post-process-runner.ts` писали relation FK напрямую скаляром
  вместо Prisma `connect`/`disconnect`

Добавлен постоянный гейт — Nx-таргет `typecheck:main` (`tsgo --project main/tsconfig.json
--noEmit`), подключён как `dependsOn` к `typecheck:tsgo`.

**E2E:** все 4 теста `04-player/folder-player.electron.spec.ts` молча скипались —
`getByRole('link', { name: /плеер/i })` не находился, потому что пункты сайдбара — `Box asChild`
вокруг `<button>` ([Sidebar.tsx:160](renderer/src/components/layout/Sidebar.tsx)), не `<a>`.
Заменено на `getByRole('button', ...)` по образцу уже исправленного `video-click` спека; та же
правка для локатора «Библиотека» в четвёртом тесте. Прогнать вживую не удалось — нужен
production-билд Electron и GUI, недоступные в песочнице агента.

Коммит: `1e4f892d`.

### Дополнение: чище фикс tsgo-инференса вместо eslint-disable (2026-09-06)

Отдельная сессия проверила, есть ли способ починить инференс `TArgs` в `createHandler`/
`createHandlerWithEvent` (8 сайтов) без `eslint-disable-next-line
@typescript-eslint/no-inferrable-types` на каждом. Нашлось: первопричина — именно
default-значение параметра (`x = default`) в generic-контексте, а не отсутствие аннотации
типа само по себе. Убрано `= default` из сигнатуры, параметр аннотирован `T | undefined`
(или `?:`, если он идёт после уже опционального параметра — `TS1016` иначе), дефолт
подставлен через `?? default` в теле. tsgo выводит `TArgs` корректно, конфликта с
`no-inferrable-types` больше нет — все 8 `eslint-disable`-комментариев удалены.

Задокументировано: [tsgo-generic-default-param-inference](/.claude/docs/tsgo-generic-default-param-inference.md).
`nx typecheck:main`/`typecheck:tsgo`/`lint animatrona` — зелёные. Коммит `45ab1798`.

## Перенос renderer-части папочного плеера в libs (Фаза 1, шаг 2) (2026-09-06)

Продолжение задачи из плана «Animatrona Player» (§5 «Фаза 1 — вынос в библиотеки»): каркасы
`libs/folder-player-react` и `libs/folder-scan` были заведены генератором в предыдущей сессии
(2026-09-06), эта сессия перенесла в них реальный код renderer-стороны.

**`libs/folder-scan`** получил `subtitle-type.ts` — классификатор типа субтитров (полные/надписи/
песни), framework-free, без Node-зависимостей.

**`libs/folder-player-react`** получил:

- `host.ts` — контракты `FolderPlayerHost` (абстракция над `window.electronAPI`: `selectFolder`,
  `selectFile`, `scanFolder`, `scanExternalAudio`, `scanExternalSubtitles`, `probe`, `toMediaUrl`)
  и `FolderPlayerStorage` (минимальный синхронный `{getItem, setItem}`, которому структурно
  удовлетворяет сам `window.localStorage`);
- `types.ts`, `parse-filename.ts`, `probe-cache.ts` — перенесены с изменением сигнатур на приём
  `host`/`storage` параметром;
- хуки `useFolderPlayer`/`useWatchProgress`/`useFolderHistory`/`useExternalAudio` — та же замена
  прямых обращений к `window.electronAPI`/`localStorage` на инжектируемые `host`/`storage`;
- компоненты `EpisodeSidebar`, `RecentFoldersCard` — перенесены практически без изменений (не
  имели electron/next-зависимостей).

`apps/animatrona/renderer/src/app/player/page.tsx` теперь собирает `folderPlayerHost:
FolderPlayerHost` из `window.electronAPI` и передаёт его в хуки; `useWatchProgress(localStorage)`/
`useFolderHistory(localStorage)` получают `window.localStorage` напрямую. Старые файлы в
`app/player/{types,_hooks,_components}` и `renderer/src/lib/{parse-filename,cache/}` удалены, не
оставлены копией/реэкспортом.

**Осознанное исключение:** `useFolderModeUI.tsx` НЕ перенесён в либу — импортирует `TrackInfo`/
`TrackSelector`/`VideoPlayerRef` из `@/components/player`, которые app-local (не входят в
`@letar/video-player-react`). Вынос потребовал бы либо тащить видео-плеер компоненты следом (вне
скоупа), либо параметризовать хук инжектируемыми типами/компонентами (оверинжиниринг для этого
шага). Хук остался в приложении, но принимает `host: FolderPlayerHost` и использует
`useExternalAudio`/`UseFolderPlayerReturn` из новой либы — частичная миграция.

**Найденные и исправленные проблемы (не были очевидны из `typecheck:tsgo`):**

1. Сиблинг-зависимость либы на другую workspace-либу (`folder-player-react` → `folder-scan`)
   требует `paths`/`rootDir`/`include` в **собственных** `tsconfig.lib.json`/`tsconfig.spec.json`
   зависимой либы, а не только в приложении-потребителе — зеркалирован существующий паттерн
   `libs/video-player-react` → `@letar/video-player-core`.
2. `oxlint-disable-next-line` не подавляет ESLint-правило `react-hooks/exhaustive-deps` — разные
   линтеры, разные неймспейсы правил. Нужен `eslint-disable-next-line`.
3. **Главная находка:** `apps/animatrona/renderer/tsconfig.json` — у renderer СВОЙ набор `paths`,
   отдельный от `apps/animatrona/tsconfig.json` (который читает только `typecheck:tsgo`). Добавив
   новые либы только в корневой tsconfig приложения, получили зелёный `typecheck:tsgo`, но
   `next build --webpack` падал `Module not found` — прод-сборка резолвит модули через
   `renderer/tsconfig.json`. Тот же класс ловушки, что и `SortablePhotoGrid` (2026-07-21):
   typecheck зелёный не доказывает, что соберётся прод-билд.
4. Реэкспорт `export { X as Y } from '@letar/pkg'` (через границу `transpilePackages`) давал
   предупреждение webpack «not exported» при живом успешном экспорте — заменено на
   `import { X } from '@letar/pkg'; export const Y = X`.

**Проверено:** `nx typecheck:tsgo animatrona`, `nx lint animatrona` (0 новых warnings), `nx
run-many -t format --projects=animatrona,folder-player-react,folder-scan`, `nx build animatrona`
(webpack renderer + esbuild/webpack main) — все зелёные. Изолированный `nx test`/`typecheck:tsgo`/
`lint` на обеих новых либах — зелёный. E2E (`04-player` в electron-режиме) и ручная проверка
внешних ASS/аудио — не выполнялись в этой сессии, следующий шаг.

Main-часть (`MediaProber`/`FfprobeProber`) и само отдельное приложение `animatrona-player` —
следующие шаги той же Фазы 1/2, не начаты.

## Удаление исходного торрента после успешного ручного импорта (2026-09-06)

Закрывает пробел, найденный при доработке плана «Дисковая гигиена батча» (§ про
`rutracker-batch-import.ts`): успешный ручной импорт через `import-service.ts` не вызывал
`getTorrentService().remove(infoHash, true)` ни на одном пути — только
`import-failure-cleanup.ts` трогал файлы, и то при ошибке/отмене. Скачанный торрент оставался
сидировать в qBittorrent бессрочно, а его файлы — висеть в `Downloads/Animatrona/<torrent>/`
навсегда. `post-process-runner.ts` удаляет только рабочую папку библиотеки
(`createdAnimeFolder`) — это не то же самое, что папка скачанного торрента.

Фикс не потребовал новой функции в `import-service.ts` — переиспользован уже существовавший в
`import-queue-controller.ts` механизм: `markTorrentImported(folderPath)`
([import-queue-torrent.ts](main/services/import-queue-torrent.ts)) сопоставлял торрент с папкой
импорта (`folderPath.startsWith(t.path)`) и только ставил `importStatus: 'imported'` для бейджа
на странице `/torrents` — реального авто-удаления по ratio в приложении не было, удаление
оставалось ручным UI-шагом пользователя. Функция заменена на `removeTorrentSource(folderPath)`:
то же сопоставление, но вместо `updateMeta` — `await getTorrentService().remove(infoHash, true)`
(тот же вызов, что `cancelDownload()` делает при отмене в
[rutracker-download-orchestrator.ts](main/services/rutracker/rutracker-download-orchestrator.ts)).
Вызывается из той же точки в `import-queue-controller.ts` (`updateItemStatus`, ветка
`status === 'completed'`) — общая для одиночного ручного импорта и будущего батча, поэтому
отдельная `finalizeSuccessfulDownload(infoHash)`, упомянутая в PLAN.md как возможный вариант,
не понадобилась.

Безопасность: обычный drag&drop-импорт файлов не имеет соответствующего торрента — совпадения
по `folderPath` не найдётся, `removeTorrentSource` тихо ничего не делает (та же гарантия, что
была у `markTorrentImported`). Ошибка удаления (торрент уже не существует, TorrentService не
инициализирован) — логируется и не прерывает завершение импорта.

`nx typecheck:tsgo animatrona`/`nx lint animatrona` — зелёные (0 ошибок, только заранее
существовавшие warnings). Изменены `import-queue-torrent.ts`, `import-queue-controller.ts`.

## Гейт активного импорта перед `ipfs:repoGc()`, удалён мёртвый `safeLocalGc()` (2026-09-06)

Закрывает открытый вопрос предыдущей сессии (гейт нормализации pins, коммит `c8c82bfd`): тогда
защиту получил только `normalizeAllPins()`, а голый `repo.gc()` за IPC-хендлером `ipfs:repoGc`
([ipfs.handlers.ts](main/ipc/ipfs.handlers.ts), реализация в
[unified-ipfs-service.ts](main/services/ipfs/unified-ipfs-service.ts)) оставался незащищённым —
единственный путь, реально подключённый к UI. Во время батч-импорта суб-документы аниме
заливаются в Kubo с `pin:false` в расчёте на будущую indirect-защиту через `directoryCid`,
который ещё не собран и не сохранён в БД — в этом окне такой контент не имеет никакого пина,
и нажатие кнопки GC в UI удалило бы его безвозвратно.

Фикс — тот же гейт `ImportQueueController.getInstance().hasActiveImport()`, что уже стоит в
`normalizeAllPins()`, добавлен в начало `repoGc()`.

Заодно решён параллельный вопрос: `safeLocalGc()` ([pin-status-service.ts](main/services/ipfs/pin-status-service.ts))
реализовывал ту же защиту (нормализация + GC) полнее, но не вызывался ни одним потребителем —
удалён как мёртвый код вместе с типами `SafeGcResult`/`SafeGcProgress` и осиротевшим импортом
`normalizeAllPins`. Подключать его вместо голого `repoGc()` не стали: это поменяло бы форму
ответа IPC-хендлера (`SafeGcResult` вместо `{blocksRemoved}`), потребовав правок
preload/`electron.d.ts`/renderer — за рамками точечного security-фикса.

`nx typecheck:tsgo animatrona`/`nx lint animatrona` — зелёные. Коммит `12f13082`.

## Глобальный лимит конкурентности на IPFS pin/upload перед батч-импортом (2026-09-06)

Закрывает пункт, оставленный «не тронуто намеренно» в предыдущей сессии (см. ниже) — фоновый
аудит риска батч-импорта нашёл, что нигде в пайплайне импорта нет лимита конкурентности на
операции с Kubo (`pin.add`/`add`): `uploadManyToIpfs()` ([import-ipfs.ts](main/services/import/import-ipfs.ts))
и `PinManager.pin()` ([pin-manager.ts](main/services/ipfs/pin-manager.ts)) могли уйти в Kubo
неограниченным числом параллельных запросов при десятках файлов на эпизод × десятках эпизодов
в батче.

Решение — **два чокпоинта, а не патч в каждом месте вызова**: `uploadToIpfs()` в
[import-ipfs.ts](main/services/import/import-ipfs.ts) — единственная точка загрузки в IPFS (через
неё идут `uploadManyToIpfs`, дорожки субтитров, постеры, скриншоты, спрайты, манифест — проверено
грепом по вызывающим местам), и `client.pin.add` внутри `PinManager.pin()`. Оба обёрнуты общим
`kuboLimiter` (concurrency=4) из нового [kubo-concurrency.ts](main/services/ipfs/kubo-concurrency.ts) —
значение выбрано по аналогии с `createConcurrencyLimiter(2)` для демукса (CPU/IO-тяжелее) и
батчами по 3 в `cid-recovery.ts`; сам лимитер — обобщённый `createConcurrencyLimiter`, вынесенный
из `services/import/helpers.ts` в [utils/concurrency-limiter.ts](main/utils/concurrency-limiter.ts)
(IPFS-слой не должен зависеть от import-домена).

`anime-directory-builder.ts` (уже имеет свою retry-логику на `pin.add` — таймаут 90с, 3 попытки)
намеренно не тронут — задача касалась лимита на число ОДНОВРЕМЕННЫХ запросов, не ретраев одного.

`nx typecheck:tsgo animatrona`/`nx lint animatrona` — зелёные (в lint только предсуществующие
несвязанные warnings). Коммит `7d9397ff`.

## Три фикса, устраняющие необходимость ручной регенерации манифеста (2026-09-06)

Подготовка к предстоящему батч-импорту с Рутрекера: пользователь спросил, что делает
`regenerateAll` "устаревшим", а затем — что сделать, чтобы она не понадобилась вовсе. Найдено и
исправлено три независимых бага, все три реально приводили к необходимости регенерации:

1. **Dual-source рассинхрон БД↔манифест при retranscode.** `updateEpisode()` в
   [episode-file-processor.ts](main/services/import/episode-file-processor.ts) сбрасывал
   `transcodedCid`/`manifestCid`/etc, но не `spriteCid`/`vttCid`/`chaptersCid` — билдер
   `directoryCid` читает БД в приоритете и подхватывал устаревшее значение. Фикс двухчастный:
   сброс этих трёх полей при retranscode **и** запись свежих `spriteCid`/`vttCid` в БД сразу в
   постпроцессе импорта ([post-process-runner.ts](main/services/import/post-process-runner.ts)),
   не только в манифест — закрывает блокер 2 из PLAN.md и
   [animatrona-db-manifest-dual-source.md](/.claude/docs/animatrona-db-manifest-dual-source.md).

2. **Гонка pin/unpin, теряющая пин `directoryCid`.**
   `buildAnimeDirectory()` ([anime-directory-builder.ts](main/services/ipfs/anime-directory-builder.ts))
   вычислял успешность `pin.add` (таймаут 90с/сбой), но не возвращал флаг наружу. Все три
   вызывающих места (`anime-manifest-generator.ts` ×2, `episode-manifest-regen.ts`) слепо считали
   директорию закреплённой — при неудачном `pin.add` либо открепляли старый (рабочий)
   `directoryCid`, либо писали непроверенный новый CID в БД, оставляя контент без единой защиты
   от GC. Добавлено поле `pinned` в результат, вызывающий код действует только когда
   `pinned === true`.

3. **Подготовка к нагрузке батча** (аудит двумя фоновыми субагентами специально под сценарий
   "много раздач подряд"):
   - `PinManager.save()` ([pin-manager.ts](main/services/ipfs/pin-manager.ts)) перезаписывал
     `pins.json` снимком `Map`, взятым синхронно, но запись на диск асинхронна — при частых
     `pin()`/`unpin()` более старый снимок мог физически лечь на диск позже нового и стереть
     запись. Добавлена очередь (`saveQueue`), сериализующая запись.
   - `import-failure-cleanup.ts` проверял `pinManager.isPinned(cid)` перед `unpin()` — но видео
     пинится напрямую в Kubo, минуя `PinManager`, поэтому проверка почти всегда ложно возвращала
     `false`, и `unpin()` не вызывался вовсе. При батче с неизбежными частичными сбоями это
     копило orphan-пины на диске. Убрана лишняя проверка.

**Не тронуто намеренно** (заведён отдельный чип `spawn_task` на конец сессии, закрыт следующей
сессией — см. «Глобальный лимит конкурентности на IPFS pin/upload» выше): отсутствие глобального
лимита конкурентности на IPFS pin/upload-операции. Остаётся открытым: `isSafeToUnpinLocally()`
(`pin-status-service.ts:98`) считает CID без записи `PinStatus` безопасным для снятия пина —
теоретическая гонка со свежезалитым во время активного импорта контентом.

`nx typecheck:tsgo`/`lint animatrona` — зелёные на каждом шаге (0 ошибок, только
предсуществующие несвязанные warnings). Один коммит пришлось повторить: параллельная сессия
на общем чекауте выполнила `git pull`, откативший rebase/merge временно откатил рабочее дерево
до применения последнего фикса — переприменён и подтверждён после разрешения merge.

## `Settings.torrentBackend`: `String` + legacy-directive → `enum TorrentBackend` (2026-09-04)

По запросу `forms-coordinator-dev` (координация мажорного релиза `@letar/forms`, удаление legacy
comment-directive парсера `@form.*`/`///` из `libs/zenstack-form-plugin`) — `torrentBackend`
([settings.zmodel:75](schema/models/settings.zmodel)) было последним полем во всём приложении,
державшим `/// @form.props({options:[...]})` вместо `@meta`, потому что объектный литерал не
проходит в `@meta`-атрибут (упирается в `ObjectExpr` в upstream-генераторе ZenStack, см.
[zmodel-comment-directives-vs-ast.md](/.claude/docs/zmodel-comment-directives-vs-ast.md)).
Решение владельца — не искать эквивалент для объектного литерала, а признать `String` вместо
`enum` архитектурным антипаттерном и завести настоящий `enum TorrentBackend { WEBTORRENT
QBITTORRENT }` с `///`-лейблами на значениях (та же конвенция, что `VideoCodec`/`TrackPreference`
в `media.zmodel`) — опции `radioCard` теперь генерируются автоматически, `@form.props` не нужен
вовсе.

**Данные:** локальная dev-БД пуста (таблица `Settings` — 0 строк), но поле хранило дефолт
`'webtorrent'` в нижнем регистре у реальных пользователей. Копия строки в сгенерированной
prisma-миграции (`RedefineTables`, table rebuild — стандартный способ ALTER COLUMN в SQLite)
переносит значение как есть, поэтому в `migration.sql` вручную добавлен шаг `UPDATE
"new_Settings" SET "torrentBackend" = UPPER("torrentBackend") WHERE ... IN ('webtorrent',
'qbittorrent')` **между** `INSERT INTO new_Settings` и `DROP TABLE Settings` — без него у
пользователей с уже существующей БД Prisma Client не смог бы распарсить старую строку как
enum-значение при следующем запуске приложения (значение не входит в допустимый набор).

**Побочное:** dev-БД имела нетронутый drift (`Anime.trackerAnimeId` — колонка, добавленная в
`schema.zmodel` ранее без соответствующей миграции). `prisma migrate reset --force` (с явным
согласием пользователя — dev-БД была полностью пустой) потребовался, чтобы `migrate dev` вообще
смог сгенерировать новую миграцию; `trackerAnimeId` заодно попал в ту же миграцию как часть diff —
ретроактивно задокументировал предсуществующее расхождение, а не добавил новый функционал.

`nx zenstack:generate`/`typecheck:tsgo`/`lint animatrona` — зелёные (lint: 0 ошибок, только
предсуществующие несвязанные warnings).
