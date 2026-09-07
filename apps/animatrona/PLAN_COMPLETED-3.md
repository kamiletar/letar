# Animatrona — Выполненные задачи (Часть 3)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: 2026-07-29 — 2026-08-09.

## Electron 42.8.1 → 43.3.0 разом во всех Electron-приложениях монорепо (2026-08-09)

Затронуты animatrona, kami-key-the, label-printer-desktop, poster-microtext-desktop и корневой
`package.json` — единая сессия, один коммит на весь летар (submodule `poster-microtext-desktop`
закоммичен и запушен отдельно, per правила submodule).

**animatrona раньше не пиновала свою версию electron вовсе** — неявно наследовала из корневого
`package.json` (`^42.8.1`), в отличие от остальных трёх Electron-приложений, каждое из которых
уже пинило точную версию в собственном `devDependencies` (конвенция из
[electron.md](/.claude/rules/electron.md)). Заведён явный пин `"electron": "43.3.0"` в
`apps/animatrona/package.json`, приведено к общей конвенции.

Заодно найден и починен рассинхрон, существовавший ещё до этой сессии: `electron-builder.yml`
(`electronVersion`) и ABI-версия в `@electron/rebuild` для `classic-level`
(`postinstall`/`postinstall:dev` в `package.json`) были застрявшие на `41.0.0`, хотя root уже
был на `42.8.1` — то есть native-модуль пересобирался под версию на два мажора младше реально
используемой. Оба места синхронизированы с новой версией `43.3.0`.

**Проверка headless** (GUI в сендбоксе Claude Code недоступен, см. electron.md): пересборка
`classic-level` через `@electron/rebuild -v 43.3.0` — без ошибок. `nx typecheck:tsgo animatrona`
— зелёный. Реальный запуск GUI (окно, IPC, автообновление) не проверялся — на это закладывается
первый живой запуск у пользователя.

## Фикс `ntsuspend` — пауза транскодирования не работала вообще на Windows (2026-08-09)

Найден побочно при апдейте Electron (см. выше): `require('ntsuspend')` падал и в headless Node,
и под Electron 43.3.0 — `Cannot find module './win32-x64_lib.node'`. Баг предсуществующий, не
связан с версией Electron.

**Root cause:** `ntsuspend` — единственный native-модуль в animatrona, устанавливаемый не через
`@electron/rebuild` (как `classic-level`/`libsql`), а через собственный npm `install`-скрипт
(`install.cjs`), который при установке скачивает готовый `.node`-бинарник с GitHub Releases.
В репозитории **нет `trustedDependencies`** ни в корневом `package.json`, ни в `bunfig.toml`
(его тоже нет) — а bun по умолчанию не запускает lifecycle-скрипты (`install`/`postinstall`)
сторонних зависимостей, если они не в этом списке (доверяет только собственным
workspace-пакетам). Поэтому `install.cjs` никогда не отрабатывал — файл `win32-x64_lib.node`
просто не появлялся в `node_modules/.bun/ntsuspend@1.0.2/.../ntsuspend/`. Тот же класс проблемы,
что уже был решён для `classic-level` (ручной вызов `@electron/rebuild` в `postinstall`), просто
не был распространён на `ntsuspend`, у которого стратегия починки другая (скачивание, не
пересборка).

**Что было в проде:** `getNtsuspend()` в
[process-control.ts](main/utils/process-control.ts) ловит исключение и деградирует тихо —
`suspendProcess`/`resumeProcess` возвращают `false` без креша, `pauseItem`/`resumeItem` в
[transcode-manager.ts](main/services/transcode-manager.ts) просто не переводят элемент очереди в
статус `paused`/`transcoding`. То есть фича «пауза энкода» (заявленная в release notes
`electron-builder.yml`) была нерабочей молча — без видимой ошибки пользователю, только лог
`ntsuspend не загружен — пауза процессов недоступна`.

**Фикс:** в `postinstall`/`postinstall:dev` (`apps/animatrona/package.json`) добавлен явный вызов
`node ../../node_modules/ntsuspend/install.cjs` на Windows — тем же путём, что уже
используется в `electron-builder.yml` для `extraResources` (`../../node_modules/.bun/ntsuspend@1.0.2/...`
резолвится через симлинк `node_modules/ntsuspend`, два уровня вверх от `apps/animatrona`).
Проверено воспроизводимо: удалён скачанный `.node`-файл → `require('ntsuspend')` падает с той же
ошибкой → прогнан обновлённый `postinstall:dev`-шаг → `require('ntsuspend')` снова успешен headless
(`node -e "require('ntsuspend')"`, без Electron).

**Не сделано:** сама фича паузы (клик в UI → реальная приостановка GPU-энкода) не проверялась в
живом приложении — GUI в сендбоксе Claude Code недоступен (см. `electron.md`). Проверить при
следующем живом запуске: индикатор доступности паузы в UI, реальный suspend/resume процесса
ffmpeg через диспетчер задач.

## Декомпозиция `import-service.ts` по фазам пайплайна (2026-08-09)

Чистый рефакторинг, без изменения поведения. Повод: файл разросся до ~1650 строк и держал в
одном классе создание записи Anime/Season, demux+БД одного файла эпизода, оркестрацию
параллельного транскодирования, весь постпроцесс (скриншоты/спрайт/манифест/IPFS-загрузка),
финальные шаги (связи Shikimori/навигация/публикация AnimeManifest) и cleanup при ошибке —
именно поэтому три бага из аудита `directoryCid` (см. выше, «Аудит полноты `directoryCid`»)
остались незамеченными: рассинхрон полей между местом сброса и местом записи было трудно
увидеть в одном файле на 1600+ строк.

Выделено шесть модулей рядом с `import-service.ts`, каждый — одна фаза пайплайна:

- `anime-record-setup.ts` — профиль кодирования, постер, Anime/Season в БД, жанры, внешние
  субтитры (`loadEncodingProfile`, `downloadAndSavePoster`, `createAnimeRecord`,
  `createSeasonRecord`, `saveGenresIfAvailable`, `scanExternalSubs`). Не использовали `this` —
  перенесены как есть.
- `episode-file-processor.ts` — бывшее замыкание `processFile` внутри `process()`: demux,
  создание/обновление Episode (включая retranscode-ветку со сбросом CID — Блокер 2 аудита),
  аудио/субтитры/главы, сборка `BatchImportItem`. Опиралось на `this` (emitProgress/isCancelled)
  и на общий для всех параллельных файлов счётчик `completedFiles` — теперь то и другое
  передаётся явным контекстом (`EpisodeFileProcessingContext`), включая мутируемый
  `fileCounter: { completed }` вместо замыкания над `let`.
- `transcode-runner.ts` — `runParallelTranscode`: запуск батча через
  `ParallelTranscodeManager`, отслеживание прогресса и stalled-таймаута. Один неиспользуемый
  параметр (`postProcessDataMap`, не читался в теле функции) убран при переносе — это не влияет
  на поведение, просто была мёртвая часть сигнатуры.
- `post-process-runner.ts` — `runPostProcess`: скриншоты, превью-спрайт, манифест эпизода,
  загрузка видео/манифеста в IPFS, финальный `updateEpisode` (та самая точка, где `spriteCid`/
  `vttCid` не записываются в БД — Блокер 2).
- `relations-and-manifest.ts` — `syncRelations`, `updateEpisodeNavigation`,
  `generateAndPublishAnimeManifest` (публикация `directoryCid`). Не использовали `this`.
- `import-failure-cleanup.ts` — двухуровневый cleanup при ошибке/отмене (открепление CID из БД
  и tracked-CID, удаление аниме и папки). Та самая точка, где `createdAnimeId` может указывать
  на чужое аниме — Блокер 1 аудита.

`import-service.ts` сократился с ~1650 до 566 строк — остался класс с состоянием
(`createdAnimeId`/`createdAnimeFolder`/`_isCancelled`/`videoEncodingMeta`), прогресс-хелперы
(`emitProgress`/`setStage`/`setFileProgress`) и `process()`/`cancel()`, которые оркестрируют
вызовы выделенных модулей.

**Три бага из аудита `directoryCid` не исправлены** — задача была явно про чистый рефакторинг.
После декомпозиции все три живут в куда более узком контексте: Блокер 1 — целиком в
`import-failure-cleanup.ts` (90 строк), Блокер 2 — на стыке `episode-file-processor.ts` (сброс)
и `post-process-runner.ts` (запись), Блокер 3 — целиком в `anime-record-setup.ts` (199 строк).
Строчные ссылки в `PLAN.md` на находки аудита обновлены на новые файлы/строки.

Проверено: `nx typecheck:tsgo animatrona` зелёный, `nx lint animatrona` — единственная ошибка в
`import-service.ts` (`preserve-caught-error` в pre-encode-блоке) существовала в файле и до
рефакторинга (код перенесён без изменений), не относится к декомпозиции; `nx build animatrona`
собирается без новых предупреждений/ошибок (webpack + Next.js production build).

## Документирован паттерн dual-source CID-полей (2026-08-09)

Формализовал находку из Блокера 2 аудита `directoryCid` (см. ниже) как отдельный кросс-репо
документ — [.claude/docs/animatrona-db-manifest-dual-source.md](/.claude/docs/animatrona-db-manifest-dual-source.md):
какие поля эпизода (`spriteCid`/`vttCid`/`chaptersCid`) дублируются между колонками БД и
опубликованным IPFS-манифестом, в каком порядке их читает `anime-directory-builder.ts`, в каком
порядке (и почему неполно) их пишут `import-service.ts`/recovery-путь билдера, и правило для
новых dual-source-полей — либо сбрасывать оба места разом при инвалидации источника, либо явно
фиксировать, какое из двух является source of truth. Ссылка добавлена в `CLAUDE.md` (корень),
`.claude/rules/animatrona.md` и `apps/animatrona/CLAUDE.md`.

Отдельно — в [.claude/docs/verification-pitfalls.md](/.claude/docs/verification-pitfalls.md)
добавлен абзац: сам аудит изначально проверил только сторону «билдер/потребитель» и дал
ложно-чистый результат, все реальные баги (Блокеры 1-3 ниже) нашлись на стороне
«импорт/производитель» — общий урок про проверку обеих сторон контракта чтения/записи, а не
только одной.

Сам фикс (Блокер 2 — добавить `spriteCid`/`vttCid`/`chaptersCid` в сброс retranscode) **не
сделан** в рамках этой сессии — только зафиксирован паттерн, чтобы при следующем добавлении
похожего поля не повторить ту же ошибку.

## Видимость молчаливых catch-блоков на пути импорта (2026-08-09)

Второй случай того же класса проблемы, что и аудит `buildAnimeDirectory` v0.52.3 (см. ниже) —
там SQL-фильтр терял записи ещё до contentHealth, здесь данные генерируются (спрайт, encoding
info, media CID, дорожки из БД, metadataCid), но при сбое записи в манифест пропадают без следа:
`import-service.ts` глотал ошибку пустым `catch {}` без единого лога.

Прошли по всем ~18 catch-блокам файла (`runPostProcess`, error-cleanup ветка `process()`,
`downloadAndSavePoster`). Часть — намеренная тихая очистка temp-файлов **после** того, как
данные уже сохранены (CID уже в манифесте/БД, файл на диске просто больше не нужен) — такие
оставлены без изменений. Остальные — реальная потеря данных, добавлен `log.warn` с
`episodeId`/`episodeNumber` и текстом ошибки (не `log.error` — импорт продолжается, это
некритичная потеря):

- `getFFmpegVersion()` перед стартом импорта — версия FFmpeg не попадёт в encoding info манифеста.
- `updateManifestThumbnails` — превью-спрайт уже в IPFS, но манифест может остаться без ссылки.
- `fs.statSync` на транскодированном видео — `compressionRatio` не посчитается.
- `updateManifestEncoding` — вся секция encoding info манифеста эпизода теряется.
- `updateManifestMediaCids` (видео/аудио/субтитры) — самый дорогой случай: манифест эпизода
  остаётся без CID медиаконтента, хотя контент уже залит в IPFS.
- `rebuildManifestTracksFromFile` — список дорожек в манифесте может разойтись с БД.
- `updateManifestMediaCids({ metadataCid })` — ссылка на JSON с метаданными теряется.

**Отдельно — `generateAndPublishAnimeManifest` (публикация `directoryCid` аниме).** Цена ошибки
здесь выше остальных: импорт мог молча вернуть `success: true` при `directoryCid: null` —
ровно тот класс бага, что уже ловили в аудите v0.52.3. Одного лога недостаточно: метод теперь
возвращает `{ success, error }`, и при провале `process()` добавляет предупреждение в уже
существующий канал `ImportResult.warning` (тот же, что используется для «N видео не
транскодированы») — UI показывает его на completed-элементе очереди без новых полей/компонентов.

## Аудит полноты `directoryCid` перед массовым реимпортом библиотеки (2026-08-08)

Кода не меняли — сессия исследовательская. Повод: вся библиотека помечена `needsReupload`
(v0.52.2), предстоит полный реимпорт, и цена пропущенного поля — второй такой же дорогой проход
по всей библиотеке. Полный разбор с чек-листом — в `PLAN.md`, здесь только итог.

**Проверено две половины пути, а не одна.**

1. **Билдер → директория.** Прошли по каждому `*Cid`-полю `schema.zmodel` против
   `anime-directory-builder.ts`. Пропусков нет. Отдельно выписаны четыре `*Cid`-поля, которые
   намеренно не участвуют (`trackerPublishedCid`, `DiscoverWatchProgress.*`,
   `Subscription.lastKnownCid`, `TorrentDownload.torrentFileCid`) — чтобы не перепроверять их в
   следующий раз. Подозрение на коллизию папок `episodes/NN/` у многосезонных аниме снято:
   `Episode @@unique([animeId, number])` физически не даёт двум эпизодам одного аниме совпасть.

2. **Импорт → БД.** Эту половину добавили после уточнения, что перезаливка идёт полным
   реимпортом, а не `regenerateAll`. Разница принципиальная: `regenerateAll` пересобирает из
   того, что уже в БД (там работают probe/recovery), а реимпорт пишет БД заново — значит билдер
   положит в `directoryCid` только то, что импорт успел записать. Здесь нашлись три блокера:
   потеря истории просмотра при импорте не через страницу торрентов (`upsertAnime` по
   `shikimoriId` возвращает id существующего аниме → `createdAnimeId` → `deleteAnime` в cleanup),
   старый спрайт вместо нового (`spriteCid`/`vttCid`/`chaptersCid` не сбрасываются при
   retranscode, а билдер читает БД раньше манифеста), и несохраняемые `nameEn`/`synonyms`/
   `rating`/`Episode.name`, хотя Shikimori их отдаёт.

**Метод, который сработал:** проверять обе стороны контракта. Первый проход смотрел только на
потребителя (билдер) и дал чистый результат — все три блокера сидели у производителя (импорт).

**Заодно найдено:** `Franchise.graphCid` никогда не обновляется — `graphUpdatedAt` только
пишется и нигде не читается, cache-hit безусловный, хотя комментарий в схеме обещает
автообновление раз в неделю.

## `tsconfig.json`: убраны `references` на библиотеки — TS6305/TS6059/TS6307 (2026-08-07)

Тот же баг и фикс, что в `dashboard-agent` (0.11.1, `.claude/rules/libs.md` § «Тот же редирект
под обычным `tsc`»): `references` на `../../libs/animatrona-utils`, `animatrona-types`,
`electron-storage`, `hooks` вели на solution-конфиг библиотек и редиректили на
`tsconfig.spec.json`, давая вечный `TS6305`. Оставлена только `./tsconfig.spec.json`.

Два побочных эффекта:

1. `@letar/hooks` резолвился только через снятый project reference, а не через `include` (в
   отличие от остальных библиотек, уже подключённых по «смешанной модели» через
   `../../libs/X/src/**/*.ts`) — без reference давал `TS6307: File is not listed within the file
   list`. Фикс — добавлен `../../libs/hooks/src/**/*.ts` в `include`, тем же паттерном.
2. `TS6059: not under rootDir` не потребовал отдельного фикса — `rootDir` в этом файле не задан.

Проверено: `nx typecheck:tsgo animatrona --skip-nx-cache` — было 24 ошибки (TS6305 + TS7006),
стало 0.

## v0.55.16 — Infinite scroll: надёжный триггер подгрузки (sentinel + IntersectionObserver) (2026-07-29)

**Как обнаружено:** пользователь проверил v0.55.15 и сообщил, что дальше первой страницы список
аниме в библиотеке не грузится при скролле.

**Причина:** триггер подгрузки следующей страницы в `AnimeGrid.tsx` был завязан на индекс последней
виртуализированной строки (`rowVirtualizer.getVirtualItems()`) с overscan 3 — срабатывал только
когда пользователь долистывал практически до самого конца уже загруженных 60 записей (15 строк
при 4 колонках), и зависел от деталей внутреннего поведения `useWindowVirtualizer`, которые не
проверялись вживую (Electron-десктоп, нет browser-превью для этого приложения).

**Реализовано:** [AnimeGrid.tsx](apps/animatrona/renderer/src/components/library/AnimeGrid.tsx) —
триггер заменён на стандартный паттерн infinite scroll: пустой `sentinel`-`Box` (`h="1px"`)
сразу под сеткой + `IntersectionObserver` с `rootMargin: '800px'`. Подгрузка начинается заранее,
за 800px до фактического появления сентинела в вьюпорте, и полностью не зависит от внутренностей
виртуализатора — устраняет весь класс потенциальных багов интеграции с overscan/индексами строк.

**Верификация:** `nx typecheck:tsgo animatrona`, `nx lint animatrona`, `nx build:win animatrona`.
Живая проверка пользователем (скролл до конца библиотеки, подгрузка страниц 2+) — ожидает
подтверждения в следующем запуске.

---

## v0.55.15 — Фикс сетки библиотеки, infinite scroll, автопродолжение папочного плеера (2026-07-29)

**Как обнаружено:** пользователь сообщил «Мне сейчас по одному огромному постеру на строку
выводит» в библиотеке, плюс отдельно — папочный плеер «в конце серии останавливается и не
запускает следующую».

### Фикс сетки библиотеки

**Причина:** `useVirtualizedGrid` (`renderer/src/lib/hooks/use-virtualized-grid.ts`) подключал
`ResizeObserver` через `useLayoutEffect(() => {...containerRef.current...}, [])` — пустые deps,
эффект отрабатывает один раз при первом маунте. `AnimeGrid.tsx`/`FranchiseView.tsx` при
`isLoading === true` рендерят скелетон — дерево без элемента с `ref={containerRef}`. Эффект успевал
отработать именно на этом первом рендере, когда `containerRef.current` был `null` — наблюдатель не
создавался и больше никогда не пересоздавался, когда данные подгружались и реальный контейнер
монтировался. `containerWidth` навсегда оставался `0` → `columns = Math.max(1, ...) = 1` → CSS
grid `repeat(1, 1fr)` — один растянутый на всю ширину постер в строке.

**Реализовано:** [use-virtualized-grid.ts](apps/animatrona/renderer/src/lib/hooks/use-virtualized-grid.ts) —
`containerRef` переведён на callback-ref (`useState<HTMLDivElement | null>` + `useCallback`
вместо `useRef` + `useLayoutEffect([])`). Callback-ref вызывается заново при каждом реальном
монтировании DOM-узла — корректно подхватывает контейнер, появившийся уже после первого рендера.

### Infinite scroll для библиотеки (режим «По отдельности»)

**Проблема:** [use-library-page.ts](apps/animatrona/renderer/src/app/library/_lib/use-library-page.ts)
грузил все тайтлы одним `findMany` без пагинации — растёт вместе с библиотекой (300+ записей с
полным `select` — жанры, франшиза, sourceRelations).

**Реализовано:**

- [hooks-factory.ts](apps/animatrona/renderer/src/lib/hooks-factory.ts) — новая фабрика
  `createInfiniteFindManyHook` поверх `@tanstack/react-query` `useInfiniteQuery`: `take`/`skip`
  управляются хуком (страница = `pageParam`), `getNextPageParam` определяет конец по длине
  последней страницы < `pageSize`.
- [hooks.ts](apps/animatrona/renderer/src/lib/hooks.ts) — `useInfiniteFindManyAnime` (pageSize 60)
  и `useCountAnime` (обёртка над уже существующим server action `countAnime` — считает количество
  под фильтром без загрузки записей, нужен для шапки «N тайтлов» и мобильного счётчика фильтров,
  которые с пагинацией больше не могут полагаться на `animes.length`).
- `use-library-page.ts` — `where`/`select`/`orderBy` вынесены в общие `useMemo`, используются и
  пагинированным, и полным запросом. **`needsFullData` определяет, когда нужен весь набор без
  пагинации:** режим «По франшизам» (группировка по connected components в
  `groupAnimeByFranchise()` требует ВСЕХ тайтлов сразу — франшиза может включать тайтлы за
  пределами любой отдельной «страницы», курсорная пагинация без редизайна группировки сломала бы
  франшизный режим — задокументированное ограничение, см. PLAN.md), активный режим множественного
  выбора (чтобы «Выбрать всё» реально выбирало всё, а не только подгруженное), открытый диалог
  пакетной публикации на трекер (публикует весь отфильтрованный набор). Иначе — только
  пагинированный запрос.
- [AnimeGrid.tsx](apps/animatrona/renderer/src/components/library/AnimeGrid.tsx) — подгружает
  следующую страницу через уже существующий `useWindowVirtualizer`: `useEffect` следит за индексом
  последней отрендеренной строки, при приближении к концу уже загруженных строк вызывает
  `onLoadMore` (если `hasNextPage && !isFetchingNextPage`). Внизу сетки — спиннер во время подгрузки.

**Верификация:** `nx typecheck:tsgo animatrona`, `nx lint animatrona` (без новых ошибок/варнингов
относительно бейзлайна), `nx build:win animatrona`.

### Фикс автопродолжения папочного плеера

**Причина:** [VideoPlayer.tsx](apps/animatrona/renderer/src/components/player/VideoPlayer.tsx)
вызывал `video.play()` для автовоспроизведения в эффекте с зависимостями `[globalVideoElement,
autoPlay, setDuration]`. `globalVideoElement` — персистентный video-элемент из
`GlobalVideoProvider`, создаётся один раз на весь жизненный цикл приложения и никогда не меняется
(перемещается между контейнерами через `appendChild`, не пересоздаётся) — эффект с этой
зависимостью реально срабатывает только один раз, при первом монтировании `VideoPlayer`.

На `/watch` (библиотечный режим) это маскировалось: переход к следующей серии — навигация на
другой route (`/watch/[episodeId]`), которая полностью ремонтит компонент `VideoPlayer`,
случайно ретриггеря автоплей-эффект. В папочном режиме (`/player`) переход между сериями —
смена `state` (`goNext()` → новый `currentVideoPath` → `loadRawSrc()`) на ТОЙ ЖЕ смонтированной
странице, без ремаунта `VideoPlayer` — эффект с автоплеем не перезапускался. Следующая серия
исправно грузилась (Shaka Player), но оставалась на паузе — визуально «плеер останавливается».

**Реализовано:** подписка на `loadeddata` персистентного video-элемента вынесена в отдельный
`useEffect` с теми же стабильными deps `[globalVideoElement]`, но БЕЗ `{once: true}` —
`addEventListener` остаётся навешанным на весь жизненный цикл компонента и корректно срабатывает
на КАЖДУЮ последующую смену `src`, вызывая `video.play()` при каждом переходе к новой серии, а не
только при первой. `autoPlay` проброшен через `autoPlayRef` (стабилизирует замыкание обработчика).

**Верификация:** `nx typecheck:tsgo animatrona`, `nx lint animatrona`, `nx build:win animatrona`.

### Добавлено в PLAN.md (не реализовано в этой сессии)

- **Автоопределение глав (OP/ED) для папочного режима плеера** — данные уже вычисляются
  существующим ffprobe-вызовом (`getChaptersAndAttachments`, тот же вызов что для аудио/видео/
  субтитров), но отбрасываются в `useFolderPlayer.ts`. План реализации — в PLAN.md, раздел
  «Открытые задачи».

---

## v0.55.14 — Фикс: папочный плеер приписывал субтитры/аудио чужих серий текущему эпизоду (2026-07-29)

**Как обнаружено:** пользователь открыл сериал (25 серий) в папочном режиме плеера, эпизод 17 —
в меню субтитров показались десятки дублирующихся строк вида «Неопределённый — Bakuman [BD]
[1080p]» и «Русский — RUS Subs [Inu Nora & Hajime]» вместо нормального короткого списка дорожек
этой конкретной серии.

**Причина:** [useFolderPlayer.ts](apps/animatrona/renderer/src/app/player/_hooks/useFolderPlayer.ts)
в `scanTracksForEpisodeInternal` передавала в IPC-вызовы `scanExternalSubtitles`/
`scanExternalAudio` массив `videoFiles` только с ОДНИМ текущим видеофайлом. На стороне main
([external-subtitle-scanner.ts](apps/animatrona/main/services/external-subtitle-scanner.ts)
`fuzzyMatchToVideo`) есть правило: «если передан один видеофайл — считаем его фильмом, все
найденные субтитры относятся к нему». Это верно для single-file режима (фильм без разбивки на
серии), но в папочном режиме сериала матчер получал всего 1 «видео» на каждый запрос (текущий
эпизод) — и приписывал ему ВСЕ субтитры/аудио, найденные рекурсивным сканом папки, включая файлы
других серий. Нижестоящий фильтр `t.episodeNumber === episodeNum` не спасал, потому что все
найденные файлы уже получали `episodeNumber` текущего эпизода (правило «один файл = фильм»
перезаписывает матчинг по номеру).

**Реализовано:**

- `scanTracksForEpisodeInternal` теперь принимает третий параметр `allVideos: FolderEpisode[]` —
  полный список видео папки (эпизоды + бонусы), а не только текущий эпизод.
- `videoFiles` для IPC строится из `allVideos.map(...)`, а не из одного `episode`.
- Обновлены три места вызова: `scanFolderInternal` (первый эпизод при открытии папки),
  `goToEpisode`, `goToBonus` — все передают `[...episodes, ...bonusVideos]`.
- Поведение single-file/фильм режима не изменилось: если в папке реально один видеофайл,
  `allVideos.length === 1` и матчер по-прежнему работает как раньше.

**Верификация:** `nx typecheck:tsgo animatrona`, `nx lint animatrona` (файл чист), `nx build:win
animatrona` (успешно, `Animatrona Setup 0.55.14.exe`).

---

## v0.55.13 — Фикс: /player не воспроизводил видео (не подключён к GlobalVideoProvider) (2026-07-29)

**Как обнаружено:** пользователь сообщил, что открыл файл через «Плеер» — вместо воспроизведения
бесконечно крутился спиннер. Скрин DevTools Network показал: ни одного запроса к видеофайлу,
только повторяющиеся RSC-фетчи `/player` — то есть видео вообще не пыталось грузиться.

**Причина:** `/player` (папочный/single-file режим, без привязки к библиотеке БД) рендерит
`<VideoPlayer src={currentVideoPath}>` напрямую. После перехода на архитектуру
`GlobalVideoProvider` (persistent video/audio элементы на уровне layout, живут вне страниц) `src`
проп `VideoPlayer` используется только для инфо-оверлея — реальная загрузка в persistent
video-элемент запускается исключительно через `useGlobalVideoStore.getState().initVideo(src,
metadata)`, а этот вызов существует только в `useGlobalVideo` хуке на странице `/watch`, завязанном
на DB-эпизод (`episodeId`, `animeId`, `animeName`, `returnPath` — обязательные поля
`PlaybackMetadata`). `/player` этот хук не использует (у локального файла вне библиотеки этих
полей просто нет) — video-элемент никогда не получал src, `isLoading` в `VideoPlayer` не снимался
(снимается только по событию `loadeddata` от video, которое без src никогда не наступит).

**Реализовано:**

- [global-video-store.ts](apps/animatrona/renderer/src/components/global-video/global-video-store.ts) —
  новое действие `loadRawSrc(src: string | null, startTime?: number)`: устанавливает `src`/`mode:
'embedded'`/`currentTime` напрямую, без обязательных библиотечных `PlaybackMetadata` (`metadata:
null`). `src === null` переводит в `mode: 'hidden'`.
- [player/page.tsx](apps/animatrona/renderer/src/app/player/page.tsx) — вызывает `loadRawSrc(currentVideoPath,
time)` в том же эффекте, что уже вычисляет `initialResumeTime` при смене видео; отдельный
  cleanup-эффект вызывает `loadRawSrc(null)` при размонтировании страницы — иначе локальный файл
  продолжил бы «играть» в video-элементе, отсоединённом от какого-либо UI (в /player нет
  mini-player minimize-логики, в отличие от `/watch`).

`toPlayableUrl({ path: src })` внутри `GlobalVideoProvider` уже идемпотентен для `http://`/`media://`
и корректно конвертирует сырой Windows-путь (`C:\...\file.mkv` → `media://C:/.../file.mkv`) — правка
на уровне конвертации URL не потребовалась, только сама передача src в store.

Верифицировано `nx typecheck:tsgo animatrona`, `nx lint animatrona` (оба изменённых файла — 0
замечаний), `nx build:win animatrona` (успешно, `Animatrona Setup 0.55.13.exe`).

## v0.55.12 — useEffect-аудит: убрана churn-подписка на window.keydown в useGlobalShortcuts (2026-07-29)

**Задача:** продолжение ветки «Аудит производительности» из PLAN.md — конкретно «Остаток
useEffect-аудита» для четырёх кандидатов, отмеченных после v0.55.10: `AppShell.tsx`,
`GlobalVideoProvider.tsx`, `TitleBar.tsx`, `PageTransition.tsx`.

### Находка

`AppShell` — always-mounted layout, ре-рендерится при каждой навигации (`usePathname`) и смене
`isShortcutsOpen`/`isQuickSearchOpen`. Он вызывает `useGlobalShortcuts({ onShowShortcuts: () =>
..., onCommandPalette: () => ..., onImport: handleOpenImport, onEscape: closeSimpleModals })` —
инлайн-объект с новыми стрелочными функциями на каждый рендер. Внутри `useGlobalShortcuts`
`handleKeyDown` был обёрнут в `useCallback` с зависимостью `[callbacks, router]` — новый объект
`callbacks` каждый рендер пересоздавал `handleKeyDown`, а `useEffect` с зависимостью `[handleKeyDown]`
дёргал `window.removeEventListener`/`addEventListener('keydown', ...)` на каждый такой рендер
вместо одного раза на весь жизненный цикл приложения.

**Реализовано:** [use-global-shortcuts.ts](apps/animatrona/renderer/src/lib/shortcuts/use-global-shortcuts.ts) —
latest-ref паттерн: `callbacksRef` хранит актуальные колбэки (обновляется на каждый рендер без
побочных эффектов), `handleKeyDown` читает их через `callbacksRef.current` и зависит только от
`router` (стабильная ссылка next/navigation). Подписка на `keydown` теперь создаётся один раз.

**Проверка остальных трёх файлов:** `TitleBar.tsx` — mount-once эффект с пустыми deps (инициализация

- подписка на maximize/unmaximize), доработок не требует. `PageTransition.tsx` — эффектов вообще
  нет. `GlobalVideoProvider.tsx` — три эффекта: создание persistent video/audio элементов (пустые
  deps, один раз), загрузка видео при смене `src`, синхронизация audio-дорожки при смене `audioSrc` —
  `timeupdate` уже throttled до 250ms, лишних ре-рендеров не создаёт, доработок не требует.

**Не проверено:** остальные ~120 файлов с `useEffect` в приложении — компонентные/страничные,
монтируются один раз на страницу, риск ниже, низкий приоритет.

Верифицировано `nx typecheck:tsgo animatrona`, `nx lint animatrona` (изменённый файл — 0 замечаний),
`nx build:win animatrona` (успешно, `Animatrona Setup 0.55.12.exe`).

## v0.55.11 — Хук usePolledData: устранение дублирования в Sidebar-карточках (2026-07-29)

**Задача:** `ContinueWatchingCard` и `WatchNextCard` почти дословно повторяли один и тот же каркас
опроса данных — `useState<T | null>` + `useState<boolean>` загрузки, mount-fetch в `useEffect`,
`setInterval` рефетч (30 сек / 60 сек), `focus`-листенер, cleanup через `clearInterval` +
`removeEventListener`.

**Реализовано:** общий паттерн вынесен в хук `usePolledData<T>(fetchFn, { intervalMs,
refetchOnFocus?, enabled? })` → `{ data, loading, refetch }` в `libs/hooks/src/lib/query/
use-polled-data.ts`, экспортирован из `@letar/hooks` (пакет уже существовал на момент задачи —
хук универсален, не завязан на Sidebar, поэтому положен туда, а не локально в приложение). Оба
компонента переведены на хук:

- `ContinueWatchingCard`: `intervalMs: 30000, refetchOnFocus: true, enabled: !isOnWatchPage` —
  условие скрытия на странице `/watch` транслировано в `enabled`.
- `WatchNextCard`: `intervalMs: 60000, refetchOnFocus: true`.

Поведение обоих компонентов не изменилось. Верифицировано `nx typecheck:tsgo animatrona`.

## v0.55.10 — Аудит производительности: React.memo для Sidebar-карточек (2026-07-29)

**Задача:** продолжение ветки «Аудит производительности» из PLAN.md — конкретно пункт
«Профилировать через React DevTools Profiler / проверить лишние useEffect».

### Находка

`Sidebar` присутствует на каждом non-fullscreen роуте всё время работы приложения и держит два
`setInterval`-опроса: диск (30 сек) и состояние блокировки сна (5 сек). Три дочерние карточки
(`ContinueWatchingCard`, `WatchNextCard`, `EncodingStatusCard`) не были обёрнуты в `React.memo`,
хотя не принимают пропсов — каждый тик таймера в `Sidebar` перерисовывал всё поддерево, включая
их, хотя их собственное состояние (последний просмотр, рекомендация сиквела, статус кодирования)
от этих таймеров не зависит.

**Реализовано:** все три компонента обёрнуты в `React.memo` (`export const X = memo(function X()`).
Компонент без пропсов при `memo` гарантированно не ре-рендерится по вине родителя, но продолжает
реагировать на собственные хуки (`usePathname`, внутренние `useEffect`) как раньше.

⚠️ Не профилировано через React DevTools Profiler напрямую (нужен запущенный desktop-клиент,
не web-превью) — правка обоснована чтением кода по аналогии с находкой v0.55.9 (`AnimeCard`),
верифицирована только `nx typecheck:tsgo`.

### Что не удалось довести до конца

- **Анализ бандла через `@next/bundle-analyzer`** — несовместим с Turbopack (дефолтный билдер
  этого приложения); нужен `next build --webpack` внутри полного `nx build animatrona`, а не
  прямой `next build` в `renderer/` (не резолвит workspace-пакет `@letar/hooks` в обход Nx).
- Остальные ~120 файлов с `useEffect` (из 222 найденных) не проверены — сделан только точечный
  проход по `Sidebar`.
- Аудит main process на предмет блокирующих renderer синхронных операций — не начат.

Конкретные шаги для продолжения — в PLAN.md, раздел «Аудит производительности» → «Задел на
следующую сессию».

### Побочное наблюдение

На момент сессии параллельно работали другие агенты (`RoseRobin`, `AmberOwl`, `TealGorge`) над
выносом хуков в отдельный пакет `@letar/hooks` — незакоммиченная работа временно ломала прямой
`next build` (`Module not found: Can't resolve '@letar/hooks'`). Не трогал их файлы.

---
