# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.55.69] - 2026-09-08

### Changed

- **Вынесен общий (SHARED, без Prisma) IPFS/Kubo-код в `libs/ipfs-kubo-core`.** Задача
  координатора экосистемы Animatrona — общая библиотека для `animatrona` и будущего
  `animatrona-ipfs-player`. Перенесены `main/services/kubo/*`, `tracker-client.ts`,
  `pin-manager.ts`/`kubo-concurrency.ts`/`peer-id-manager.ts`/`unixfs-service.ts`, утилиты
  (`logger`, `port-finder`, `concurrency-limiter`) и типы. `unified-ipfs-service.ts` разделён по
  экспортам: READ (`cat`/`stat`/`has`/`safeCat`/`probeCidAvailable`/`saveToFile`) ушёл в либу,
  WRITE (`addFile`/`addBytes`/`addDirectory`/`createDirectoryFromCids`/`repoGc`) остался в
  Animatrona. Поведение не изменилось — typecheck, обе сборки main (webpack + esbuild), тесты и
  lint зелёные.

## [0.55.68] - 2026-09-08

### Fixed

- **`prisma.config.ts` `datasource.url` резолвился мимо репозитория** — `file:../../../prisma/data/app.db`
  всплывал на три уровня выше cwd таргета (`apps/animatrona`) в `C:\web\prisma\data\app.db`, а не
  в `apps/animatrona/prisma/data/app.db`; `nx db:push`/`db:migrate` писали мимо реальной dev-БД.
  Найдено как копипаст того же бага из `animatrona-ipfs-player`. Фикс — `file:prisma/data/app.db`.

## [0.55.67] - 2026-09-08

### Changed

- **`Tracker` переведён на общий миксин `TrackerFields`** (`libs/zenstack-fragments/src/animatrona.zmodel`)
  — задача координатора экосистемы Animatrona, общая часть модели для `animatrona` и будущего
  `animatrona-ipfs-player`. Состав полей не изменился (`id`, `url`, `name`, `description`, `theme`,
  `language`, `lastCheckedAt`, `createdAt`, `updatedAt` теперь наследуются из миксина), `db:push`
  подтвердил отсутствие дрейфа.

## [0.55.66] - 2026-09-08

### Removed

- **Мёртвый код: локальный `_hooks/useAudioSync.ts`.** Побочная находка прошлого аудита
  (`useShakaPlayer.ts`, см. запись 0.55.65 ниже) — файл нигде не вызывался, только
  реэкспортировался. `GlobalVideoProvider.tsx` синхронизирует раздельные аудиодорожки инлайном
  (секция «Синхронизация отдельной аудиодорожки»), тот же паттерн, что и с Shaka Player. Хук и
  его экспорт из `_hooks/index.ts` и `player/index.ts` удалены.

## [0.55.65] - 2026-09-08

### Removed

- **Мёртвый код: локальный `_hooks/useShakaPlayer.ts`.** Аудит на предмет дублирования с
  `use-shaka-player.ts` (`animatrona-tracker`) и `useShakaPlayer.ts` (`@letar/video-player-react`)
  показал, что хук не вызывается ни одним компонентом — `VideoPlayer.tsx` инициализацию Shaka не
  делает вовсе, она инлайном живёт в `GlobalVideoProvider.tsx` (persistent video с момента
  перехода на архитектуру, которая не пересоздаёт `MediaSource` при навигации). Хук и его экспорт
  из `_hooks/index.ts` удалены. Разбор аудита и почему остальные два хука НЕ сведены в один —
  [shaka-player-hook-dedup-audit.md](/.claude/docs/shaka-player-hook-dedup-audit.md).

## [0.55.64] - 2026-09-08

### Changed

- **`getShakaFrameRate`/`FRAME_STEP_COUNT` вынесены в `@letar/video-player-core`.** Локальный
  `frame-step-utils.ts` дословно дублировался в `animatrona-tracker` (`use-shaka-player.ts`, без
  `try/catch`). Утилита теперь общая (реэкспортирована из `@letar/video-player-react`), оба
  приложения используют один источник истины. Поведение не изменилось.

## [0.55.63] - 2026-09-07

### Changed

- **Main-часть папочного плеера перенесена в `@letar/folder-scan`.** `external-audio-scanner`,
  `external-subtitle-scanner`, `font-matcher`, `subtitle-parser`, `fs-utils`, whitelist разрешённых
  путей и обработчик `media://` протокола (оба обобщены — параметризованы функцией
  `isPathAllowed`/seed-путями вместо завязки на `app.getPath`), а также новые `scanFolderForMedia`
  и интерфейс `MediaProber` (нормализованные `AudioTrack`/`SubtitleTrack`/`VideoTrack`/
  `MediaChapter`/`MediaInfo`) — теперь общий код, переиспользуемый будущим `animatrona-player`.
  `main/ffmpeg/probe.ts` экспортирует `ffprobeProber: MediaProber` как тонкую обёртку над
  существующим `probeFile`. `main/protocols/allowed-paths.ts` и `media.protocol.ts` остались
  тонкими адаптерами библиотеки под Animatrona (Electron-специфичная инициализация путей).
  `apps/animatrona/shared/types.ts` ре-экспортирует медиа-типы из библиотеки вместо локальных
  копий. Поведение не изменилось — рефакторинг без изменения контракта IPC-хендлеров.

## [0.55.62] - 2026-09-07

### Added

- **Папочный режим плеера — постер по имени папки при однозначном опознании в Shikimori.**
  Новый хук `useFolderShikimoriMatch` парсит имя папки, ищет в Shikimori и подставляет постер в
  `EpisodeSidebar` только при единственном точном совпадении названия — при неоднозначности или
  недоступности Shikimori молча остаётся без постера. `EpisodeSidebar` (`@letar/folder-player-react`)
  получил опциональный проп `posterUrl`.
- **`Episode.name` — best-effort английские названия серий из AniList `streamingEpisodes`.**
  Shikimori не хранит потитульные названия серий вообще (проверено по всем GraphQL-запросам) —
  источник переключён на AniList, тот же кэшированный запрос, что уже использовался для
  `descriptionEn`. Заголовки не канонические (площадки Crunchyroll/HIDIVE) — не распарсилось,
  просто не заполняется. 13 новых тестов (`episode-names.spec.ts`).

## [0.55.61] - 2026-09-06

### Fixed

- Три `@letar/*`-пакета (`electron-storage`, `hooks`, `query-provider`), реально импортируемые в
  `main/ipc/tracker.handlers.ts`, `main/services/distribution-service.ts`,
  `main/services/pinata-service.ts`, `main/services/regen-checkpoint.ts`, были подключены только
  через `nx.implicitDependencies`/tsconfig paths — без реальной `dependency` в `package.json` bun
  не создавал симлинк в `node_modules`. Тот же класс проблемы, что закрыт для
  `@letar/folder-scan` в 0.55.59 — текущие тесты не тянули эти файлы транзитивно, поэтому падение
  ещё не проявилось, но было бы неизбежным для следующего теста на них. Добавлены
  `"@letar/electron-storage"`, `"@letar/hooks"`, `"@letar/query-provider"` в `dependencies`.
  166 тестов зелёные.

## [0.55.60] - 2026-09-06

### Changed

- Консолидированы три независимых дубля Prisma `select` для аудио/субтитров эпизода
  (`import-db.ts`, `manifest.handlers.ts`, `episode-manifest-regen.ts`) в единые константы
  `AUDIO_TRACK_MANIFEST_SELECT`/`SUBTITLE_TRACK_MANIFEST_SELECT`. Сверка нашла реальное
  расхождение — `episode-manifest-regen.ts` не запрашивал `ipfsSize`, из-за чего фолбэк размера
  файла терялся бы при регенерации манифеста для новых CID.

## [0.55.59] - 2026-09-06

### Fixed

- `nx test animatrona` падал на сборе `anime-record-setup.spec.ts` (`Cannot find package
  '@letar/folder-scan'`) — пакет был подключён только через `nx.implicitDependencies`/tsconfig
  paths, без реальной `dependency` в `package.json` bun не создавал симлинк в `node_modules`.
  Добавлена `"@letar/folder-scan": "workspace:*"` в `dependencies`. 166 тестов зелёные.

## [0.55.58] - 2026-09-06

### Added

- `isForced` у `SubtitleTrack`/`AudioTrack` (библиотечный режим импорт + IPFS-раздача) — миграция
  `20260906203900_add_track_is_forced`, поле в `ManifestAudioTrack`/`ManifestSubtitleTrack`
  (`@letar/animatrona-types`). Значение читается из `disposition.forced` контейнера через
  ffprobe (`main/ffmpeg/demux.ts`, `isDispositionFlagSet` из `@letar/folder-scan` — тот же
  детектор, что уже использует папочный режим плеера) и прокидывается через весь конвейер
  импорта (`audio-track-creator.ts`/`subtitle-track-creator.ts` → `import-db.ts` →
  `manifest-generator.ts`). Внешние дорожки (drag&drop файлы, не встроенные в контейнер)
  флаг не несут — `isForced: false` по умолчанию. Закрывает PLAN.md §19.4 «Библиотечный режим»
  (задача была привязана к дедлайну «до массового перезаливa библиотеки», §15.3).

## [0.55.57] - 2026-09-06

### Fixed

- `main/services/manifest-generator.ts` держал приватный дубль title-only классификатора глав
  (`detectChapterType`/`isChapterSkippable`), разошедшийся с `shared/utils/chapters.ts` —
  главы для IPFS-манифеста при первичной генерации эпизода могли классифицироваться иначе, чем
  те же главы, дописываемые позже через `main/services/import/chapter-creator.ts`. Заменён на
  импорт из `shared/utils/chapters.ts`.

### Removed

- Мёртвый дубль позиционного классификатора `detectChapterTypes` (title + позиция/длительность)
  из `renderer/src/components/player/ChapterMarkers.tsx` — копипаста
  `@letar/video-player-react`/`utils/detect-chapter-types.ts`, нигде не вызывалась ни в одном
  файле репозитория. Версия в `libs/video-player-react` оставлена как задел на будущее.

## [0.55.56] - 2026-09-06

### Fixed

- `postinstall`/`postinstall:dev` пересобирали `classic-level` под ABI Electron `44.1.0`, хотя
  фактическая версия во всех 4 electron-приложениях монорепо уже `44.2.0` (обновление до 44.x
  произошло раньше без синхронной правки этих скриптов). Исходный пункт плана «42.8.0 → 43.2.0»
  оказался устаревшим — Electron уже обновлён и обгоняет цель, найдена и исправлена только эта
  мелкая нестыковка ABI.

## [0.55.55] - 2026-09-06

### Added

- **Автоопределение глав (OP/ED) в папочном режиме плеера (`/player`)** — раньше главы,
  вычисляемые тем же ffprobe-вызовом, что и аудио/субтитры, отбрасывались на уровне контракта
  (`MediaProbeInfo` в `@letar/folder-player-react` не имел поля `chapters`). Добавлено:
  `ProbedChapter` в хосте `useFolderPlayer`, поле `FolderPlayerState.chapters`, классификация
  OP/ED/RECAP/PREVIEW (`detectChapterType`/`isChapterSkippable`) вынесена из
  `main/services/import/helpers.ts` в `shared/utils/chapters.ts` (паттерн `shared/` — общий код
  для main и renderer), новый конвертер `probeChapterToPlayerChapter()` в
  `renderer/src/components/player/chapter-utils.ts`. Папочный режим теперь показывает маркеры
  глав на прогресс-баре и автоматически пропускает опенинг/эндинг по тем же настройкам
  `Settings.skipOpening`/`skipEnding`, что и библиотечный режим (`useChapterAutoSkip`
  переиспользован как есть).

## [0.55.54] - 2026-09-06

### Fixed

- **Main-процесс теперь типизируется** (PLAN.md — «Main-процесс не типизируется вообще ничем»).
  `main/tsconfig.json` переписан под реальную структуру исходников (`module`/`moduleResolution`
  → `ESNext`/`bundler`, снят фантомный `references`, снят `rootDir`/`outDir`, `include` расширен
  до `**/*.ts`). Разгребено 295 ошибок tsgo. Попутно найдены и починены давние функциональные
  баги, молчавшие только из-за отсутствия проверки типов: сохранение жанров/тем аниме при
  локальном torrent-импорте (несуществующие поля в Prisma-запросе, ошибка глушилась try/catch),
  `AnimeRelation.upsert` по несуществующему compound-ключу, весь `AchievementService` вызывался
  без `await`, watchdog зависших видео-задач в `video-pool.ts` читал поля не с того объекта и не
  срабатывал никогда, ретрай скачивания постера не срабатывал из-за неверной проверки результата,
  автостарт синхронизации трекеров терял `await` у конфига, `tracker.handlers.ts` упал бы при
  первом вызове `syncLibrary` (не импортированы `path`/`app`/`fs`), `resumeTask` в `base-pool.ts`
  не проверял `process` на `null` (в отличие от парного `pauseTask`), `web-export-manager.ts`
  звал несуществующий класс `UnixFSService.getInstance()` (гарантированный краш при публикации в
  IPFS), `manifest-generator.ts` писал несуществующее поле `path` вместо обязательного `cid`.
  Добавлен постоянный гейт — Nx-таргет `typecheck:main` (`tsgo --project main/tsconfig.json
  --noEmit`), подключён как `dependsOn` к `typecheck:tsgo`.
- **4 e2e-теста плеера, молча скипавшихся** (`04-player/folder-player.electron.spec.ts`) —
  `getByRole('link', { name: /плеер/i })` заменён на `getByRole('button', ...)` (пункты сайдбара
  — `Box asChild` вокруг `<button>`, не `<a>`), по образцу уже исправленного `video-click` спека;
  там же поправлен локатор «Библиотека» в четвёртом тесте той же причиной.

## [0.55.53] - 2026-09-06

### Fixed

- Закрыт устаревший пункт плана «Два форматтера с противоречащими конфигами» (PLAN.md §23.3) —
  перепроверка показала, что `.prettierrc` и `prettier-plugin-organize-imports` в приложении
  больше нет ни в файловой системе, ни в истории git; `dprint` остаётся единственным
  форматтером. Ответ координатору форм (`forms-coordinator-dev`) — `Settings.torrentBackend`
  давно сконвертирован в `enum TorrentBackend` (сделано 2026-09-04), последний блокер удаления
  legacy comment-directive парсера снят.

## [0.55.52] - 2026-09-06

### Changed

- Перенесена renderer-часть папочного плеера в `libs/folder-player-react`/`libs/folder-scan`
  (Фаза 1 плана «Animatrona Player», PLAN.md) — `FolderPlayerHost`/`FolderPlayerStorage` как
  абстракция над `window.electronAPI`/`localStorage`, хуки `useFolderPlayer`/`useWatchProgress`/
  `useFolderHistory`/`useExternalAudio`, компоненты `EpisodeSidebar`/`RecentFoldersCard`, парсер
  имён файлов и классификатор типа субтитров. `renderer/src/app/player/page.tsx` собирает хост из
  своего `electronAPI`; старые файлы в `app/player/{types,_hooks,_components}` удалены. Main-часть
  (`MediaProber`) и новое отдельное приложение — следующие шаги той же фазы.

## [0.55.51] - 2026-09-06

### Added

- Заведены `libs/folder-player-react` и `libs/folder-scan` — Фаза 1, шаг 1 плана «Animatrona
  Player» (отдельное лёгкое приложение для папочного просмотра, PLAN.md). Пока пустые каркасы
  генератора `new-lib`, перенос кода из `renderer/src/app/player`/main-сервисов и подключение к
  Animatrona — следующие шаги.

## [0.55.50] - 2026-09-06

### Fixed

- `Franchise.graphCid` никогда не обновлялся автоматически, хотя комментарий у
  `graphUpdatedAt` в `schema.zmodel` обещал «раз в неделю» — граф франшизы запрашивался у
  Shikimori один раз при первом попадании франшизы в библиотеку и переиспользовался бессрочно.
  Новый сиквел/фильм/OVA не попадал в `relations`/`franchise-graph.json` ни для одного аниме
  этой франшизы. `isFranchiseGraphStale()` теперь перезапрашивает граф, если `graphUpdatedAt`
  старше недели или графа не было вовсе.

## [0.55.49] - 2026-09-06

### Fixed

- **Блокер 1 (риск потери истории просмотра):** реимпорт уже существующего аниме не через
  страницу торрентов/«Добавить эпизоды» + падение импорта дальше по пайплайну удаляли аниме
  целиком вместе с `WatchProgress`/`watchStatus`/`userRating` — `createAnimeRecord` ставил
  `createdAnimeId` даже когда `upsertAnime` матчился на уже существующую запись по
  `shikimoriId`. Теперь `db.animeExistsByShikimoriId()` проверяется до upsert,
  `createAnimeRecord` возвращает `{ id, isNewlyCreated }`, и cleanup при ошибке удаляет только
  то, что этот запуск сам создал.
- `Anime.rating` не заполнялся при импорте, хотя `selectedAnime.score` уже был доступен —
  чистая плюмбинг-недостача, `createAnimeRecord` его просто не передавал в `upsertAnime`.

### Added

- `AnimeInfo.nameEn`/`.synonyms` — fallback на свежие данные Shikimori (`shikimoriData.english`/
  `.synonyms`) внутри `buildAnimeInfo()`, если в БД (`Anime.nameEn`/`.synonyms`) пусто. Импорт по
  клику на карточку поиска не сохраняет расширенные Shikimori-поля в БД вовсе — фикс закрывает
  IPFS-манифест не трогая эту часть пайплайна.

## [0.55.48] - 2026-09-06

### Added

- `AnimeInfo.descriptionEn` — англоязычный synopsis из AniList (`Media.description`), не
  перевод с Shikimori (у него только одно уже переводное поле `description`). Новый
  `main/services/anilist/` (GraphQL-клиент `graphql.anilist.co`, inline-throttle 2.1с,
  in-memory TTL-кэш), вызывается внутри `buildAnimeInfo()` — non-fatal, отсутствие AniList-данных
  не роняет генерацию `AnimeInfo`. Заодно обратное обогащение `externalIds.anilist` из ответа
  AniList, если Shikimori своей ссылки не дал.

## [0.55.47] - 2026-09-06

### Changed

- `PLAN.md`: разграничена автообрезка чёрных полос при импорте (необратимая, на этапе
  транскода) с плеерской идеей кропа/зума (§18.4, обратимая настройка просмотра) — код обеих
  не конфликтует, задача автообрезки полностью закрыта.

## [0.55.46] - 2026-09-06

### Added

- Автообрезка чёрных полос подключена к живому пайплайну импорта и получила обязательный
  предпоказ. Реальный batch-транскод идёт через собственный билдер FFmpeg-аргументов
  `services/pools/video-pool.ts` (не через `transcode.ts`/`EncoderStrategy`) — туда добавлен
  `options.cropFilter`, первым фильтром в цепочке `-vf`. Детекция запускается автоматически
  в `PreviewStep` после probe каждого файла (IPC `ffmpeg:detectCrop` — только детекция, ничего
  не применяет). `FileCard.tsx` показывает найденную рамку с чекбоксом «Обрезать чёрные полосы»,
  выключенным по умолчанию — обрезка применяется только к явно подтверждённым эпизодам.
  Подтверждение течёт как `ImportQueueFileAnalysis.cropFilter` (по номеру эпизода) через
  `episode-file-processor.ts` в `BatchImportItem.video.options` и записывается в
  `ManifestEncodingInfo` вместе с остальными параметрами кодирования (`post-process-runner.ts`).

## [0.55.45] - 2026-09-06

### Added

- Автоопределение чёрных полос (леттербокс/пилларбокс) через `ffmpeg cropdetect` —
  `main/ffmpeg/cropdetect.ts` (`detectCropFilter`: сэмплирование нескольких точек таймлайна,
  мода найденных рамок, пороги консенсуса и минимальной обрезки), покрыто unit-тестами.
  `EncoderStrategy.buildDebandFilter()` заменён на `buildVideoFilterChain({ deband, cropFilter })`
  в `encoder-strategies.ts` — композиция crop+deband для GPU (с hwdownload/hwupload) и CPU
  путей. `transcodeVideoWithProfile()` принимает опциональный `cropFilter`. Поле
  `ManifestEncodingInfo.cropFilter` — для записи применённого кропа.
  ⚠️ Только backend-инфраструктура: подключение к живому импорту и обязательный предпоказ
  рамки перед необратимой обрезкой — не реализованы, см. `PLAN.md`.

## [0.55.44] - 2026-09-06

### Changed

- Тема renderer'а сведена на общую шкалу глубины нажатия `pressScale` (`@letar/ui`):
  `recipes/button.ts` (все размеры), `recipes/link.ts`, `slotRecipes/menu.ts` — по образцу
  уже аудированного `driving-school`. `slotRecipes/checkbox.ts` — задокументированное
  исключение (control мельче нижнего шага шкалы), значение не менялось.

## [0.55.43] - 2026-09-06

### Added

- Покадровая перемотка на паузе — кнопки в контролах плеера (видны только на паузе) + горячие
  клавиши `,`/`.` (и `б`/`ю` для русской раскладки), шаг ±5 кадров. Fps берётся из реальной
  активной дорожки Shaka Player (`player.getVariantTracks()`), с фолбэком 24fps, если дорожка
  его не сообщает. Новый параметр `stepFrame` в общем `useKeyboardShortcuts`
  (`@letar/video-player-react`).

## [0.55.42] - 2026-09-06

### Changed

- Добита чистка `as=` на Chakra-компонентах: динамические/статические `Box as={Component}`/
  `Icon as={Component}` (иконки через ссылку на компонент, не строку) в `CommandPalette.tsx`,
  `EncodingStatusCard.tsx`, `EmptyLibraryState.tsx`, `QuickSearch.tsx`,
  `UpdateNotificationToast.tsx`, плюс `Box as="form"` в `ChatPanel.tsx` (найден отдельным
  прогоном, вне исходного списка). Итог: `grep -rn` по всему `apps/animatrona` (`renderer/src` +
  `mobile-ui/src`) на любой `as="строка"`/`as={Компонент}` — 0 срабатываний, техдолг закрыт
  полностью.

## [0.55.41] - 2026-09-06

### Changed

- Убран запрещённый семгрепом проп `as="строка-html-тега"` (`Box`/`Flex`/`Text` as
  `button`/`span`/`nav`/`header` и т.п.) на Chakra-компонентах — 27 файлов в `renderer/src` и
  `mobile-ui/src` (layout: `Header`/`Sidebar`/`TitleBar`, библиотека, плеер, транскод, импорт,
  настройки p2p). Везде заменено на `asChild` + нативный тег внутри, по рецепту
  [chakra-icon-as-prop-cleanup-pattern.md § 7](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md).
  Поведение и разметка не изменились, только механизм получения нативного DOM-узла.

## [0.55.40] - 2026-09-06

### Fixed

- Успешный ручной импорт (`import-service.ts`) не удалял исходный торрент — раздача сидировала
  в qBittorrent бессрочно, а скачанные файлы висели в `Downloads/Animatrona/<torrent>/` навсегда
  (`post-process-runner.ts` чистит только рабочую папку библиотеки, не папку торрента).
  `markTorrentImported(folderPath)` в `import-queue-torrent.ts` заменена на
  `removeTorrentSource(folderPath)` — то же сопоставление торрента с папкой импорта, но вместо
  пометки `importStatus: 'imported'` вызывает `getTorrentService().remove(infoHash, true)`, как
  при отмене загрузки. Drag&drop-импорт файлов без соответствующего торрента не затронут.

## [0.55.39] - 2026-09-06

### Fixed

- `ipfs:repoGc` (голый `client.repo.gc()` за IPC, единственный путь, реально подключённый к
  UI-кнопке GC) не имел гейта активного импорта — `repoGc()` (`unified-ipfs-service.ts`) теперь
  тоже проверяет `ImportQueueController.hasActiveImport()`, как и `normalizeAllPins()`. Без него
  ручной GC во время батч-импорта мог безвозвратно удалить суб-документы аниме, залитые с
  `pin:false` в ожидании будущей indirect-защиты через ещё не собранный `directoryCid`.

### Removed

- Удалён неиспользуемый `safeLocalGc()` (`pin-status-service.ts`) — дублировал ту же защиту
  (нормализация + GC), но не вызывался ни одним потребителем.

## [0.55.38] - 2026-09-06

### Fixed

- Подготовка к батч-импорту: `normalizeAllPins()` (`pin-normalizer.ts`) теперь бросает ошибку,
  если запущена во время активного импорта (`ImportQueueController.hasActiveImport()`) — во
  время `preparing`/`transcoding`/`postprocess` в Kubo есть суб-документы аниме, залитые с
  `pin:false` в расчёте на будущую indirect-защиту через `directoryCid`, который ещё не собран
  и не сохранён в БД. Аудит попутно нашёл, что `PinStatus`-трекинг (`markAsLocalOnly` и т.д.)
  нигде не вызывается в реальном пайплайне — рассчитан на ещё не реализованную batch-спеку.

## [0.55.37] - 2026-09-06

### Fixed

- Подготовка к батч-импорту: добавлен глобальный лимит конкурентности (`kuboLimiter`,
  concurrency=4) на все параллельные обращения к демону Kubo — `uploadToIpfs()`
  (`import-ipfs.ts`, единственный чокпоинт загрузки в IPFS) и `client.pin.add` в
  `PinManager.pin()`. Раньше `uploadManyToIpfs()`, дорожки субтитров/аудио, скриншоты, спрайты
  и постеры при батч-импорте могли одновременно слать в Kubo неограниченное число pin.add/add
  запросов.

## [0.55.36] - 2026-09-06

### Fixed

- Retranscode эпизода больше не оставляет устаревшие `spriteCid`/`vttCid`/`chaptersCid` в БД —
  они сбрасываются вместе с остальными CID-полями, и билдер `directoryCid` подхватывает свежее
  значение из манифеста вместо старого из колонки. Дополнительно постпроцесс импорта теперь сразу
  пишет свежие `spriteCid`/`vttCid` в БД (не только в манифест), как и задумано схемой — колонки
  переживают recovery (закрывает `animatrona-db-manifest-dual-source.md` и блокер 2 из PLAN.md).
- `buildAnimeDirectory()` теперь пробрасывает флаг `pinned` (успешность `pin.add` нового
  `directoryCid`). Все три вызывающих места (`anime-manifest-generator.ts` ×2,
  `episode-manifest-regen.ts`) больше не открепляют старый `directoryCid` и не пишут новый в БД,
  если pin не подтверждён — раньше при таймауте/сбое `pin.add` контент мог остаться вообще без
  защиты от GC, что и было источником части случаев, требовавших ручной регенерации манифеста.
- Подготовка к батч-импорту с Рутрекера: `PinManager.save()` (`ipfs/pin-manager.ts`) теперь
  сериализует запись `pins.json` через очередь — раньше при частых параллельных `pin()`/`unpin()`
  более старый снимок мог физически лечь на диск позже нового и стереть только что добавленную
  запись. `import-failure-cleanup.ts` больше не проверяет `pinManager.isPinned(cid)` перед
  `unpin()` — эта проверка почти всегда ложно возвращала `false` (видео пинится напрямую в Kubo,
  минуя `PinManager`), из-за чего откреплённые CID при провале импорта оставались висеть в Kubo
  навсегда.

### Removed

- Удалён неиспользуемый standalone-скрипт `scripts/regenerate-manifests.ts` (384 строки) —
  дублировал штатную логику `regenerateAll` через сырой SQL и прямые вызовы Kubo API в обход
  Prisma и сервисов приложения, нигде не импортировался.

## [0.55.35] - 2026-09-04

### Changed

- `Settings.torrentBackend` переведён с `String` + `@form.props({options:...})` (последнее живое
  использование legacy comment-directive синтаксиса форм в приложении) на настоящий
  `enum TorrentBackend { WEBTORRENT QBITTORRENT }` с `///`-лейблами — опции для `radioCard`
  теперь генерируются автоматически, без ручного directive. Разблокирует удаление legacy-парсера
  `@form.*`/`///` из `libs/zenstack-form-plugin` (задача от `forms-coordinator-dev`).
  Миграция `20260904203936_convert_torrent_backend_enum` включает `UPDATE ... UPPER(...)` для
  существующих строчных значений (`webtorrent`/`qbittorrent` → `WEBTORRENT`/`QBITTORRENT`) —
  без этого шага Prisma Client не смог бы распарсить старые строки как enum-значения у
  пользователей с уже существующей БД.

## [0.55.34] - 2026-09-03

### Fixed

- `createCreateHook`/`createUpdateHook`/`createDeleteHook` (`hooks-factory.ts`) — общие фабрики
  мутаций не защищали от того же класса бага, что и фикс delete-actions в 0.55.33: любой будущий
  server action, возвращающий `{ success: false, error }` вместо throw, подключённый через одну
  из этих фабрик, снова маскировался бы под успешную мутацию. Добавлен рантайм-guard
  `throwOnFailureResult` — оборачивает `mutationFn` каждой фабрики, распознаёт форму
  `{success:false}` и бросает `Error` до `onSuccess`/`invalidateQueries`. Actions, возвращающие
  сущность напрямую (без поля `success`), проходят не тронутыми — типизация не сужена.

## [0.55.33] - 2026-09-03

### Fixed

- `deleteAnimeRelation`/`deleteAudioTrack`/`deleteSubtitleTrack` (`_actions/*.action.ts`)
  глотали ошибку в try/catch и возвращали `{ success: false, error }` вместо throw — общая
  фабрика `createDeleteHook` (`hooks-factory.ts`) не проверяла `success` и безусловно
  инвалидировала кэш даже при неудачном удалении. Приведены к контракту соседних create/update
  в тех же файлах (throw). Найдено аудитом по всему монорепо на класс бага «`mutationFn` не
  бросает при `{ error }` от server action».

## [0.55.31] - 2026-08-26

### Fixed

- `animatrona-main:build` — 38 предсуществующих TS-ошибок в 12 файлах (`node16`-резолюция
  относительных импортов без `.js`, CJS↔ESM границы `@libp2p/*`/`multiformats`/`kubo-rpc-client`,
  несколько настоящих type-mismatch) плюс ещё один файл, найденный дополнительно
  (`peer-sync-service.ts` — удалён мёртвый код на списанный gateway-peer). После чистки
  type-check вскрылись два конфигурационных бага esbuild-таргета, ранее замаскированных
  TS-ошибками: несуществующий `main` entry в `main/project.json` и отсутствующий tsconfig
  path-alias для `@letar/electron-storage`. `nx run animatrona-main:build --skip-nx-cache`
  прогнан 3 раза подряд чисто, `nx lint animatrona`/`nx typecheck:tsgo animatrona` — зелёные.
  Подробности — `PLAN_COMPLETED.md`.

## [0.55.29] - 2026-08-26

### Fixed

- `tracker-client.ts`: 70 предсуществующих TS-ошибок (`TS18046`/`TS2322`) — все функции читали
  `response.json()` как `unknown` либо возвращали его напрямую как типизированный интерфейс.
  Добавлен generic-хелпер `readJson<T>(response)` и `TrackerErrorPayload` для веток ошибок,
  каждый вызов типизирован конкретным интерфейсом из `shared/types/tracker.ts`.
  `typecheck:tsgo`/`lint` — чисто. Побочная находка вне скоупа — открытый вопрос про
  нестабильные 38 TS-ошибок в 12 других файлах на `nx run animatrona-main:build`, см. PLAN.md.

## [0.55.28] - 2026-08-26

### Fixed

- `nx run animatrona-main:build` падал на 73 TS-ошибках в `tracker-sync.ts`: обращения к
  `Anime.trackerAnimeId`/`Anime.manifestCid`, которых нет в `schema.zmodel` (`typecheck:tsgo`
  был зелёным из-за устаревшего закешированного сгенерированного Prisma-клиента, `build`
  регенерирует клиент по актуальной схеме и ловит расхождение). `trackerAnimeId` — реальный
  пробел: добавлен в `Anime` (кэш id аниме на трекере для быстрого lookup при push прогресса),
  заполняется в `DistributionService.registerAllDistributions()`, где уже резолвился, но
  никуда не сохранялся. `manifestCid` на `Anime` — устаревшее legacy-поле, приложение мигрировало
  на `directoryCid` как основной идентификатор (v0.53+); все обращения к нему в
  `tracker-sync.ts` (select, фильтры, fallback-поиск в `applyServerItems`) удалены, на
  wire-протоколе с трекером (`TrackerSyncItem`/`TrackerServerItem`) поле осталось как было.

## [0.55.27] - 2026-08-25

### Fixed

- Turbopack+Emotion hydration-риск (PLAN.md §36, `nextjs16-turbopack-default-emotion-hydration.md`):
  `renderer` переведён на webpack (`--webpack` в `dev`/`build`, включая все 8 таргетов
  Electron-сборки `apps/animatrona/project.json` и e2e `webServer`). `next.config.js` дополнен
  `webpack()`-хуком, эквивалентным существующему `turbopack.resolveAlias`
  (`cross-fetch`/`node-fetch`/`@letar/animatrona-ui`).
- Попутно вскрыты и исправлены два независимых бага, не связанных с Emotion, но блокировавших
  сам переход на webpack: `libsql` (native N-API биндинг) резолвил свои опциональные
  `@libsql/*`-платформенные пакеты через `require.context`, который под webpack падал на
  README/LICENSE/`.node`-файлах — исправлено явным `config.externals` на абсолютный путь.
  `snowball-stemmers` (`src/lib/stemmer.ts`) резолвился в `undefined` через default-импорт —
  пакет собран без `exports.default`, только именованные экспорты; исправлено на
  `import { newStemmer } from 'snowball-stemmers'`.
- `@tanstack/devtools-ui@0.7.0+` под webpack (тот же паттерн, что в `driving-school`/`mandala`/
  `dashboard`/`animatrona-tracker`/`grandslamcup`, PLAN.md §51) — `config.resolve.alias =
  false` при `isServer || !dev`.

## [0.55.26] - 2026-08-25

### Changed

- `scripts/generate-icons.js` переведён на общую библиотеку `@letar/icon-generator` — прежний
  фикс `require('png-to-ico').default` был точечной заплаткой на симптом, теперь используется
  единая (протестированная) реализация вместе с `label-printer-desktop` и
  `poster-microtext-desktop`.

## [0.55.25] - 2026-08-25

### Fixed

- `scripts/generate-icons.js`: `png-to-ico@3.0.2` — чистый ESM-пакет, `require('png-to-ico')` в
  CommonJS-скрипте отдавал namespace-объект (`{ default: fn }`), а не саму функцию — вызов падал
  `TypeError`, но `catch` глушил ошибку фиксированным текстом «установите png-to-ico» вместо
  реальной причины. `icon.ico` не генерировался молча. Фикс — `require('png-to-ico').default`.

### Changed

- Убрана неиспользуемая зависимость `to-ico` из корневого `package.json`/`bun.lock` — устранена
  уязвимая транзитивная цепочка `request`→`form-data@2.3.3` (CVE-2025-7783).

## [0.55.24] - 2026-08-25

### Changed

- Electron `43.3.0` → `44.0.0` — приведён к версии из корневого `package.json`, устранён
  физический дубль в `bun.lock`. Обновлена захардкоженная версия в `postinstall`/
  `postinstall:dev` (`@electron/rebuild -v`).

## [0.55.23] - 2026-08-25

### Fixed

- Подсказки валидации форм (`z.string().min/max`) показывались на английском —
  `FormI18nProvider` из `@letar/forms` не был подключён. Добавлен `FormI18nProvider locale="ru"`
  в `renderer/src/components/ui/provider.tsx` (приложение русскоязычное, i18next не используется).
  Разбор класса бага —
  [.claude/docs/letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).

## [0.55.22] - 2026-08-25

### Changed

- **`schema.zmodel`** разбит на 9 доменных файлов в `schema/models/` (common, anime, media,
  import, watch, settings, federation, social, shikimori) — было 2024 строки в одном файле.
  Циклические cross-file импорты между доменами (каждый файл импортирует остальные 8) —
  подтверждённо рабочий паттерн ZenStack 3.x. Проверено в изолированном `git worktree`:
  сгенерированные `schema.prisma`/`form-schemas` идентичны до и после (только порядок объявлений
  отличается), `prisma db push` на dev-БД — без изменений.

## [0.55.20] - 2026-08-20

### Changed

- **`usePrefersReducedMotion`** (`renderer/src/hooks/usePrefersReducedMotion.ts`) удалён —
  дублировал `useMediaQuery(breakpoints.prefersReducedMotion)` из `@letar/hooks` (обнаружено
  при аудите дублей по монорепо). Оба потребителя (`ImportQueueItemExpanded.tsx`,
  `GpuWorkerCard.tsx`) переключены на общий хук. `mobile-ui` (отдельный Vite-пакет без
  зависимостей на `@letar/*` по архитектуре) не тронут — там свой похожий, но не идентичный
  инлайн-код.

## [0.55.19] - 2026-08-19

### Fixed

- **`nx lint animatrona` был красным на 6 ложных срабатываниях `no-restricted-syntax`** —
  корневой allow-list для `NODE_ENV === 'production'` в `main/**/*.ts` не дотягивался, потому что
  `apps/animatrona/main/eslint.config.mjs` — вложенный конфиг, и ESLint резолвит его `files`
  относительно каталога `main/` (без сегмента `main/` в пути), а не от корня репо. Тот же класс
  бага, что чинили в `label-printer-desktop` в этой же сессии. Фикс — локальный override третьим
  элементом в `main/eslint.config.mjs`. Подробности —
  `.claude/docs/node-env-not-production-signal.md` § Случай 5.

---

Продолжение в ./CHANGELOG_2026_09_07.md
