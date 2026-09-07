# Animatrona — Выполненные задачи (Часть 4)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: версии до v0.36.0 — 2026-07-29 (без дат в старых записях).

## v0.55.9 — Аудит производительности библиотеки: payload и мемоизация (2026-07-29)

**Задача:** из открытой в PLAN.md ветки «Аудит производительности — молниеносный рендер».
Виртуализация сетки была сделана раньше (v0.55.3–0.55.8), но она лечила только DOM. Аудит
оставшихся пунктов чек-листа нашёл два узких места выше по стеку.

### 1. Запрос списка выгружал всю фонотеку ради четырёх чисел

`use-library-page.ts` в `select` тянул для каждого аниме все `episodes`, у каждого эпизода все
`audioTracks` и `subtitleTracks`, у каждой дорожки субтитров все `fonts` — и всё это только
чтобы просуммировать `ipfsSize` в подпись на карточке.

Замер на копии рабочей БД (`app.db.backup.20260514224238_add_pin_status`, 21 МБ):

| Показатель                          | Было    | Стало   |
| ----------------------------------- | ------- | ------- |
| Объектов через границу процесса     | 25 824  | 1 057   |
| JSON payload                        | 757 КБ  | 32 КБ   |
| JS-суммирование на пересчёт useMemo | ~4.3 мс | 0       |
| `JSON.parse`                        | ~3.1 мс | ~0.1 мс |
| Время самого SQL                    | 7.6 мс  | 12.9 мс |

Библиотека на замере: 338 аниме / 3 752 эпизода / 11 336 аудиодорожек / 7 992 дорожки субтитров /
2 744 шрифта.

**Реализовано:** Server Action `getAnimeIpfsSizes()` в `_actions/anime.action.ts` — один
`$queryRaw` с `UNION ALL` по четырём категориям и `GROUP BY animeId, kind`, отдаёт
`Record<animeId, {video, audio, subtitles, fonts}>`. Хук `useAnimeIpfsSizes()` в `lib/hooks.ts`
(`staleTime` 5 мин). Из `select` запроса библиотеки убрана вся ветка `episodes`.

⚠️ **Время SQL при этом выросло** — агрегация делает JOIN'ы вместо плоских выборок. Это
ожидаемый размен: 5 мс в базе против 725 КБ, не пересекающих границу процесса, и снятой
гидрации 25к вложенных объектов в Prisma. Записываю явно, чтобы позже никто не «оптимизировал»
обратно, глядя только на время запроса.

### 2. `React.memo` у `AnimeCard` стоял, но не работал

`memo` был на карточке с самого начала, однако `AnimeGrid.tsx` и `FranchiseView.tsx` считали
`genres={anime.genres?.map((g) => g.genre.name)}` прямо в JSX — новый массив на каждом рендере,
то есть проп никогда не проходил сравнение по ссылке. Виртуализатор перерисовывает сетку на
каждый тик скролла, поэтому все видимые карточки рендерились заново буквально каждый кадр.

**Реализовано:** `genreNames: string[]` считается один раз в `useMemo` внутри
`use-library-page.ts` (добавлено в тип `AnimeWithFranchise`), обе вьюхи передают готовый массив.
Тем же изменением стабилизировался `ipfsSizeBreakdown`: раньше объект пересоздавался в цикле
подсчёта, теперь это ссылка на запись в кэше TanStack Query.

Остальные пропсы карточки проверены на ссылочную стабильность: примитивы (`posterPath` — строка,
сравнивается по значению) либо `useCallback`-колбэки. `selectionMode ? undefined : onPlay` тоже
стабилен — тернарник возвращает ту же ссылку.

### Что проверено и признано не требующим правок

- **Индексы БД** — `status`, `year`, `watchStatus`, `name`, `shikimoriId`, `franchiseId` покрыты.
  `pinnedLocally`/`needsReupload`/`ageRating` намеренно оставлены без индексов: низкоселективные
  булевы/enum на таблице в сотни строк.
- **Кэш TanStack Query при навигации назад** — `@letar/query-provider` preset `standard`
  (`staleTime` 5 мин, `refetchOnWindowFocus: false`), возврат в библиотеку читает кэш.
- **Debounce поиска** — `useDebounce(searchInput, 250)` уже стоял.

⚠️ **Как проверялось.** Корректность агрегации — сверкой с независимым расчётом через
подзапросы на реальной БД (совпало до байта). Payload и тайминги — прямыми замерами
(`better-sqlite3`, readonly, на бэкапе). Renderer поднимался как обычный `next dev -p 3007` и
страница библиотеки открывалась без ошибок в консоли и серверном логе — но dev-БД пустая, так
что рендер с данными и плавность скролла проверяются только на следующем запуске десктопного
приложения. Эффект от фикса `memo` профайлером не измерялся — вывод строится на ссылочной
стабильности пропсов.

---

## v0.55.7 — Восстановление позиции скролла в библиотеке (2026-07-29)

**Задача:** из открытой в PLAN.md ветки «Infinite scroll / пагинация» — единственный пункт,
не заблокированный отложенным переходом на cursor pagination (та привязана к
`groupAnimeByFranchise`, которой нужен весь набор аниме разом).

**Реализовано:** новый хук `app/library/_lib/use-scroll-restoration.ts`:

- Сохраняет `window.scrollY` в sessionStorage через throttled (`requestAnimationFrame`)
  scroll-listener. Ключ — `pathname?searchParams#viewMode` (аналогия с `FILTERS_STORAGE_KEY`
  в `useFilterParams.ts`, но отдельный ключ + режим отображения, т.к. individual/franchise
  дают разную высоту строк).
- Восстановление — до 5 попыток `scrollTo` через `requestAnimationFrame`: виртуализированная
  сетка (`useWindowVirtualizer`) уточняет итоговую высоту контента только после первых кадров
  рендера через `measureElement`, однократный вызов сразу после монтирования промахивается.
- Подключено в `library/page.tsx`: `useScrollRestoration(!isLoading, viewMode)`.

⚠️ Не проверено вживую в браузере (Electron-desktop) — ручная проверка (уйти в детали аниме,
проскроллить назад) на пользователе при следующем запуске.

---

## v0.55.6 — Кросс-устройственная синхронизация: два бага + карта разрывов (2026-07-29)

**Задача:** пользовательский сценарий — начал смотреть на компьютере → продолжил на телефоне
в дороге → досмотрел на телевизоре → пауза на кухне (Алиса/колонка). Переход должен быть
бесшовным, минимум ручных действий. Запрошено исследование, что этому мешает.

**Исследование:** прошёл по цепочке Desktop (`tracker-sync.ts`) → mobile-server →
`animatrona-mobile` (адаптеры `desktop`/`tracker`, `progressSync.ts`, `store/servers.ts`) →
`animatrona-tv` (`api/client.ts`) → `animatrona-tracker` (`/api/watch-progress*`,
`/api/user/watch-progress`). Вывод: частота синхронизации (push ~7с debounce, pull 30с) не была
узким местом — бесшовность ломала топология связей. Найдено 4 структурных разрыва + 3 попутных
бага. Полная карта — в `PLAN.md` (раздел «Синхронизация прогресса с трекером»).

**Исправлено в этой сессии (мой скоуп — `apps/animatrona`):**

1. `mobile-server/routes/progress.ts` → `handleSaveProgress` сохранял прогресс в SQLite и слал
   IPC-событие в renderer, но не вызывал `TrackerSyncService.pushWatchProgressImmediate` —
   прогресс с телефона/TV (оба ходят через mobile-server) улетал на трекер только с 5-минутным
   полным sync, а если Desktop выключали раньше — не улетал вовсе. Добавлен push сразу после
   upsert'а, с `episode.number` и `durationMs → duration` в секундах.
2. `TrackerSyncService.pushWatchProgressImmediate` (`tracker-sync.ts`) использовал одно общее
   поле `pushDebounceTimer` на весь сервис. Досмотрел серию → сразу открыл следующую →
   `clearTimeout` отменял ещё не отправленный push предыдущей серии безвозвратно (offline-очередь
   не подхватывала — отмена происходила до постановки в неё). Заменено на
   `Map<string, Timer>` с ключом `` `${trackerAnimeId}:${episodeNumber}` ``.

**Задокументировано, но не в моём скоупе** (записано в `PLAN.md` для `animatrona-mobile`/
`animatrona-tv`):

- TV не имеет tracker-адаптера вообще (`animatrona-tv/src/api/client.ts` — только Desktop).
- `getLastWatched()` в `animatrona-mobile` tracker-адаптере всегда возвращает `null` — хотя
  `GET /api/watch-progress/continue` существует, он принимает только сессию, не API Key.
- Переключение Desktop↔Tracker в `animatrona-mobile/src/store/servers.ts` только ручное.
- `SyncQueueItem` в `animatrona-mobile/src/services/progressSync.ts` не хранит `serverId` —
  очередь, накопленная для одного сервера, при переключении уйдёт на другой с чужими ID.

**Сознательно исключено:** WebSocket/SSE вместо pull (задержка не была причиной проблемы,
`AppState`-triggered pull дешевле закрывает то же ощущение) и интеграция с Алисой/умными
колонками (отдельный проект — навык в Яндекс.Диалогах, публичный HTTPS-эндпоинт, отдельный
аудиопоток, не расширение существующих клиентов).

---

## v0.55.5 — Виртуализация FranchiseView (2026-07-29)

**Задача:** продолжение v0.55.3 — режим каталога «По франшизам» рендерил все карточки
(`FranchiseCard` + `AnimeCard`) разом, не виртуализирован в отличие от режима «По отдельности».

**Реализация:** `FranchiseView.tsx` строит единый список элементов (`franchiseGroups` +
`standAloneAnimes`, порядок как в исходном рендере) и виртуализирует его тем же паттерном, что
`AnimeGrid` — `useWindowVirtualizer`, колонки по ширине контейнера через `ResizeObserver`,
динамическая высота строки через `measureElement` (важно: `FranchiseCard` со стопкой постеров
выше одиночной `AnimeCard`, статичная оценка размера не подошла бы).

---

## v0.55.4 — Инвалидация деталей аниме при фоновой синхронизации с трекером (2026-07-29)

**Задача:** пункт PLAN.md «Инвалидация кеша при фоновой синхронизации с трекером» описывал
проблему как полностью нерешённую (нет listener'а на `tracker:syncCompleted`). При проверке
оказалось, что `TrackerSyncListener.tsx` уже существовал и был подключён в `layout.tsx` с
момента initial commit — но с реальным, не задокументированным пробелом.

**Найдено:** listener инвалидировал `['animes']` (список, `useFindManyAnime`), `['watchProgress']`,
`['filterCounts']` — но не `['anime']` (детали конкретного аниме, `useFindUniqueAnime`,
страница `library/[id]/page.tsx`). Если фоновый sync с трекером менял `watchStatus`/`userRating`,
пока пользователь смотрел страницу деталей этого же аниме — она не обновлялась до перехода
в другое место и обратно. Аналогичный компонент `MobileProgressSync.tsx` эту инвалидацию уже
делал правильно (`['anime', data.animeId]`) — расхождение между двумя похожими listener'ами.

**Реализация:** добавлена `queryClient.invalidateQueries({ queryKey: ['anime'] })` в
`TrackerSyncListener.tsx` рядом с существующими инвалидациями.

**Урок:** запись в PLAN.md, описывающая проблему, не гарантирует, что фикса совсем нет —
стоит сверяться с текущим кодом, а не только с текстом задачи.

---

## v0.55.3 — Виртуализация каталога аниме (2026-07-29)

**Задача:** список аниме в `AnimeGrid` (режим «По отдельности») рендерил все карточки
библиотеки разом — при большой коллекции 300+ DOM-узлов тормозили скролл и начальный рендер
(пункт «Infinite scroll / пагинация для списка аниме» в `PLAN.md`).

**Реализация:**

- `AnimeGrid.tsx` переведён на `useWindowVirtualizer` (`@tanstack/react-virtual`, уже был в
  корневых deps монорепо — hoisting, отдельно в `apps/animatrona/package.json` добавлять не
  пришлось) — рендерятся только видимые строки.
- Число колонок пересчитывается по ширине контейнера через `ResizeObserver`, повторяя
  поведение прежнего CSS `repeat(auto-fill, minmax(200px, 1fr))`.
- Высота строки — динамическая через `measureElement` (ResizeObserver внутри
  `@tanstack/react-virtual`), не статичная оценка — карточка меняет высоту вместе с шириной
  колонки (постер 2:3 + текстовый блок переменной длины).
- `scrollMargin` берётся один раз при монтировании через `offsetTop` контейнера (страница
  скроллится сама, не отдельный контейнер) — стандартный паттерн `useWindowVirtualizer` из
  документации tanstack-virtual.

**Осознанно не сделано:**

- `FranchiseView` (режим «По франшизам») не виртуализирован — другая структура рендера
  (группы вместо плоского списка), нужен отдельный проход.
- Cursor-пагинация (`skip`/`take` вместо полного `findMany`) не внедрена: `groupAnimeByFranchise()`
  группирует аниме по connected components на основе `sourceRelations` и ей нужен весь набор
  данных сразу — франшиза может включать тайтлы за пределами «текущей страницы». Пагинация
  данных без редизайна группировки сломает франшизный режим. Данные по-прежнему грузятся одним
  запросом — виртуализация решает только проблему DOM, не проблему объёма запроса.

**Не проверено визуально:** animatrona — desktop Electron-приложение, не превьюшится как
обычный веб-дев-сервер (`nextron`, не отдельный `next dev` порт). `typecheck:tsgo`/`lint`
чистые, ручная проверка (скролл по большой библиотеке, ресайз окна) — на пользователе при
следующем запуске.

## v0.55.2 — Унификация ключа дорожки resolveTrackKey (2026-07-29)

**Задача:** ключ группировки аудио/субтитров (`language:title`) был продублирован в 4 местах
(`play-folder-builder.ts`, `manifest-generator.ts`, `asset-bundler.ts`, `track-utils.ts`) с
расходящейся логикой фолбэка — часть мест не учитывала `dubGroup` при отсутствии `title`.
Незакоммиченный файл `shared/types/track-key.ts` от предыдущей сессии остался невостребованным
(нигде не импортировался) — рефакторинг был начат, но не доведён до конца.

**Реализация:** все 4 дубликата заменены на импорт `resolveTrackKey()` из
`shared/types/track-key.ts`. Единый фолбэк: `title → dubGroup → 'default'`.

## v0.55.1 — Дотипизация rutracker/torrent IPC в electron.d.ts (2026-07-29)

**Задача:** `torrents/page.tsx` и `import-rutracker/page.tsx` жили под `// @ts-nocheck` — типы
IPC-каналов `rutracker:*`/`torrent:*` были объявлены только в preload-файлах, но никогда не
добавлялись в `renderer/src/types/electron.d.ts`. Каждый новый канал наследовал этот пробел
вместо ошибки типов.

**Реализация:**

- В `electron.d.ts` описаны секции `rutracker`/`torrent` интерфейса `ElectronAPI` (по образцу
  уже типизированных секций вроде `library`/`app`) + канонические типы, зеркалящие реальные
  main-side типы: `RutrackerTorrentInfo`, `RutrackerDubGroup`, `RutrackerAudioTrack`,
  `RutrackerMediaInfo`, `RutrackerExternalLinks`, `RutrackerMatchResult`,
  `RutrackerCandidateScore`, `RutrackerImportResult`, `TorrentStatus`, `TorrentFileInfo`,
  `TorrentInfo`, `TorrentProgress`, `AddTorrentOptions`, `StartDownloadParams`,
  `StartDownloadResult`.
- `@ts-nocheck` убран из обоих файлов. Локальные дублирующиеся интерфейсы (`TorrentInfo`,
  `MatchResult`, `CandidateScore` в обоих файлах) заменены на канонические импорты из
  `@/types/electron` — устраняет источник будущего дрейфа типов между preload и renderer.
  `import-rutracker/page.tsx` сохранил узкий локальный тип `PreviewShikimoriData` для
  превью-состояния (до `confirmMatch` доступен только усечённый набор полей Shikimori, а не
  полный `ShikimoriAnimeExtended`) — при запуске скачивания подставляется полный объект из
  `confirmMatch`.

**Найденные и починенные баги (были скрыты `@ts-nocheck`):**

- Прогресс скачивания терял `totalSize`: `TorrentProgress` — компактный формат IPC-события без
  этого поля, а код перезаписывал состояние им напрямую, обнуляя `totalSize` на первом же tick.
  Исправлено функциональным `setState`, сохраняющим `totalSize` из предыдущего состояния.
- `handleImport` в `torrents/page.tsx` при импорте из папки (не одиночный файл) всегда находил
  0 видеофайлов — код читал `scanResult.data.files`, но `fs.scanFolder` возвращает
  `{success, files}` без обёртки `data`.
- `handleFindSource` терял TS-сужение по дискриминанту `res.data.found`/`res.data.linked`
  внутри вложенного колбэка `setTorrents((prev) => prev.map(...))` — property-access narrowing
  не переживает границу closure. Исправлено алиасингом в `const found = res.data` перед
  ветвлением (narrowing простого identifier'а сохраняется в замыканиях).
- `Box as="img"` в обоих файлах не типизировал `src` (полиморфный `as` Chakra Box) — заменено
  на компонент `Image` из `@chakra-ui/react`, уже используемый в остальной кодовой базе
  (`ShikimoriAnimeCard.tsx`).

## v0.55.0 — Авто-импорт по ссылке из комментария .torrent файла (2026-07-29)

**Задача:** торренты, добавленные вручную в qBittorrent (не через Animatrona, вкладка
«Остальное»), часто содержат прямую ссылку на страницу-источник в `comment` раздачи —
но у Animatrona нет способа её оттуда достать и связать с уже скачанным контентом без
повторного скачивания.

**Реализация:**

- `QBittorrentClient.getProperties(hash)` — новый метод, `GET /api/v2/torrents/properties`,
  возвращает `comment` раздачи (`qbittorrent-types.ts`: `QBTorrentProperties`).
- `QBittorrentService.getTorrentComment(infoHash)` — тонкая обёртка над клиентом.
- IPC `rutracker:findSourceForTorrent` (`rutracker.handlers.ts`) — вытаскивает `comment`,
  ищет в нём ссылку на Rutracker регуляркой, если найдена — прогоняет обычный пайплайн
  `processRutrackerImport` (парсинг + матчинг с Shikimori). При уверенном автоматическом
  матче сразу вызывает `QBittorrentService.updateMeta()` (`shikimoriId`/`animeName`/
  `rutrackerUrl`), связывая торрент с найденным аниме без повторного скачивания файлов.
  При неуверенном матче — просто возвращает ссылку, чтобы пользователь подтвердил вручную.
- UI: кнопка «Найти источник» на карточке торрента (`torrents/page.tsx`) — видна для
  торрентов без `rutrackerUrl`. При успешной привязке обновляет локальный стейт и
  показывает toast с найденным именем аниме; при неуверенном матче открывает ссылку во
  внешнем браузере.
- Побочный фикс: `handleImport` в `torrents/page.tsx` раньше брал `shikimoriId`/`animeName`/
  `rutrackerUrl` только из оркестратора загрузок Rutracker (`getDownloadMeta`) — для торрентов
  без записи в оркестраторе (добавленных вручную, включая только что привязанные через «Найти
  источник») эти поля оставались `undefined`, даже если уже были в мете самого торрента.
  Теперь `handleImport` берёт их из меты торрента как базу, оркестратор — только переопределяет.
- `sourceTorrentCid` для таких торрентов отдельно делать не нужно — существующий экспорт
  `.torrent` файла в IPFS (`QBittorrentService.exportAndUploadTorrentFile`) уже срабатывает
  для любого торрента в qBittorrent независимо от категории.

---

## v0.53.0–0.54.0 — .torrent-источник + категория qBittorrent + Web Player в directoryCid (2026-07-29)

**Задача:** сделать раздачу аниме по CID по-настоящему самодостаточной — источник (ссылка +
сам `.torrent` файл) и плеер должны физически лежать внутри `directoryCid` и пиниться вместе с
ним. Принцип сессии: если контент нужен для полноценного восстановления/просмотра — он либо в
`directoryCid`, либо его при потере пиннера не восстановить даже с реплики. IPFS не дублирует
блоки по CID, так что включить «всё» не стоит ничего лишнего.

**Реализовано:**

- **`source/` в directoryCid** — `QBittorrentService` экспортирует `.torrent` файл раздачи через
  `/api/v2/torrents/export` (qBittorrent 4.5+, как только получены метаданные раздачи), заливает
  байты в IPFS (`pin: false`) и сохраняет CID в `TorrentDownload.torrentFileCid` →
  `Anime.sourceTorrentCid`. CID пробрасывается по всему пути импорта: `getDownloadMeta` →
  `ImportWizardDialog` → `ImportQueueParsedInfo.sourceTorrentCid` → `Anime.sourceTorrentCid`.
  `anime-directory-builder.ts` добавляет папку `source/` — `source.json`
  (`{ source: { type, url }, torrentFileCid }`, поле `type` открытое под будущие источники —
  nyaa, anidex, прямые ссылки — без изменения схемы) + сам `source.torrent` (родовое имя, не
  `rutracker.torrent`). На qBittorrent <4.5 экспорт получает 404 — источник (ссылка) всё равно
  сохраняется, в лог идёт явное предупреждение с просьбой обновить qBittorrent.
- **Категория qBittorrent `animatrona`** — торренты, добавленные через приложение, помечаются
  категорией (`ANIMATRONA_TORRENT_CATEGORY`, авто-создаётся при `init()`). Вкладка «Animatrona» /
  «Остальное» в `torrents/page.tsx` отделяет их от добавленных вручную напрямую в qBittorrent (или
  другим приложением) — раньше они смешивались в одном списке.
- **`play/` — standalone Web Player встроен прямо в directoryCid** — новый
  `main/services/ipfs/play-folder-builder.ts` переиспользует уже существующий Web Player
  (`web-export/asset-bundler.ts` + `manifest-generator.ts`, режим `referenced` — src в манифесте
  это голые CID, плеер резолвит их через gateway независимо от глубины папки в дереве). Строит
  `QueueExportConfig` из уже загруженных Prisma-данных аниме, но включает ВСЕ эпизоды и ВСЕ
  аудио/суб-дорожки — в отличие от ручного экспорта, где пользователь выбирает подмножество. Для
  просмотра теперь достаточно `<gateway>/ipfs/<directoryCid>/play/` — без Animatrona, без
  animatrona-web, без отдельного шага «Экспорт для Web Player».
  - `anime-directory-builder.ts` строит `play/` **после** основного цикла по эпизодам —
    переиспользует итоговый `chaptersByEp` (episodeId → живой/восстановленный chaptersCid из
    pre-pass'а), чтобы главы (OP/ED) тоже попали в манифест плеера. `chapters.json` каждого
    эпизода и так уже был частью `directoryCid` (`episodes/NN/meta/chapters.json`) — здесь только
    читается его содержимое через `safeCat()`, никакой новый контент не пинится.
  - Prisma-запрос в `buildAnimeDirectory()` расширен: `season.number`, `title`/`streamIndex`/
    `isDefault` у audio/subtitle треков (раньше выбирались только `language`/`dubGroup` — этого
    было достаточно для основного дерева, но не для полноценного `WebPlayerManifest`).
- **Миграция БД** (`Anime.sourceTorrentCid`, `TorrentDownload.torrentFileCid`) применена вручную
  через `prisma db execute` + `migrate resolve --applied` вместо `db:migrate` — обычный воркфлоу
  упирался в рассинхронизацию чек-суммы более старой миграции
  (`20260728044106_add_needs_reupload_flag`) в локальной БД, а `migrate reset` уничтожил бы
  реальную библиотеку (это рабочий `app.db` десктоп-приложения, не тестовые данные).

**Изменённые места:** `main/services/torrent/{qbittorrent-client,qbittorrent-service,types}.ts`,
`main/services/ipfs/{anime-directory-builder,play-folder-builder}.ts`,
`main/services/import/{import-service,import-db}.ts`,
`main/services/rutracker/rutracker-download-orchestrator.ts`,
`renderer/src/app/torrents/page.tsx`, `renderer/src/components/import/ImportWizardDialog.tsx`,
`shared/types/import-queue.ts`, `schema.zmodel` + миграция `20260729010000_add_source_torrent_cid`.

**Отложено:** авто-импорт по ссылке из комментария `.torrent` файла (для торрентов, добавленных
не через Animatrona — у них в `/api/v2/torrents/properties` часто уже лежит прямая ссылка на
раздачу) — см. открытую задачу в `PLAN.md`.

---

## v0.52.5 — E2E импорта из Рутрекера + Shikimori под TUN-VPN (2026-07-28)

**Задача:** написать e2e-тест на процесс импорта аниме из Рутрекера
(`ImportRutrackerContent`, `apps/animatrona/renderer/src/app/import-rutracker/page.tsx`).

**Реализовано** (`apps/animatrona-e2e/src/03-import/rutracker-import.electron.spec.ts` +
`apps/animatrona-e2e/pages/rutracker-import.page.ts`):

- Навигация на вкладку "Rutracker" страницы "Импорт" через sidebar (`getByRole('button')`, не
  `'link'` — пункты навигации в этом приложении рендерятся как кнопки).
- Disabled-состояние кнопки "Парсить и найти на Shikimori" без ввода.
- Детерминированный экран ошибки при обрыве сети к Shikimori:
  `session.webRequest.onBeforeRequest` через `app.evaluate()` — единственный доступный seam,
  т.к. `page.route()` (см. `shikimori.mock.ts`) перехватывает только рендерер, а Shikimori-запросы
  идут из main-процесса.
- Happy-path на РЕАЛЬНОЙ сети: прямой матч по `shikimoriId=9253` (Steins;Gate, ссылка в HTML
  фикстуре) → шаг preview с корректным названием и активной кнопкой "Скачать и импортировать".

**Найденный при первом прогоне баг:** `net.fetch` (Electron/Chromium network stack) падал
`net::ERR_FAILED` на POST-запросе к `shikimori.io/api/graphql`, хотя `describeNetErrorWithDiagnostics`
(`main/utils/net-error.ts`) повторил тот же запрос (метод/путь/заголовки/тело) через обычный
Node `https`-сокет — и получил `200 OK`. Диагностика по шагам:

1. Первая гипотеза (неверная) — системный прокси/VPN (Clash) перехватывает трафик к
   `shikimori.io`, `session.setProxy({ mode: 'system', proxyBypassRules })` должен помочь.
   Эмпирически подтверждено, что НЕ помогает — Chromium в `system`-режиме просто делегирует
   `ProxyConfigService` ОС, полностью игнорируя `proxyBypassRules` (работает только для
   `fixed_servers`/`pac_script`).
2. Вторая попытка — читать реальный системный прокси через `session.resolveProxy()` и
   пересобирать как `fixed_servers` + `proxyBypassRules`. Тоже не сработало —
   `resolveProxy('https://rutracker.org')` вернул `DIRECT`: с точки зрения Chromium прокси
   вообще не настроен (Clash работает в TUN-режиме — перехват на уровне сетевого адаптера ОС,
   ниже уровня прокси-настроек приложения).
3. **Настоящая причина:** TUN-клиент различает Chromium-сетевой-стек (`net.fetch`) и
   Node-стек (`fetch`/undici) по TLS-отпечатку (ClientHello) и режет только первый. Это
   означает, что `session.setProxy`/`proxyBypassRules` в принципе не могли помочь — блокировка
   происходит не на уровне прокси-конфигурации.

**Итоговый фикс:** `main/services/shikimori/client.ts`, `anime-api.ts`, `franchise-api.ts`
переведены с `net.fetch` на глобальный `fetch` (Node.js/undici) — включая GraphQL-клиент,
REST-клиент ролей/франшизы и скачивание постеров (`downloadPoster`). Неудачная первая попытка
фикса (`session.setProxy`/`resolveProxy` в `main.ts`) удалена как бесполезный код.

**Побочный фикс (блокировал верификацию):** `nx build:win animatrona` не собирался с 3 июля —
`shaka-player` при статическом импорте (`import shaka from 'shaka-player'`) ссылается на `self`
в топ-левел коде, что валит Next.js SSR-пререндер (`self is not defined` на `/discover` и
`/_not-found`). Исправлено переводом `GlobalVideoProvider.tsx` и `useShakaPlayer.ts` на
динамический `import('shaka-player')` внутри `useEffect` (типы — через `import type Shaka`).

**Инфраструктурная находка:** таргет `db:template` отсутствует в `apps/animatrona/project.json`
(остался только как мёртвая `dependsOn`-ссылка в 7 таргетах — `build`, `build:linux`,
`release:linux`, `build:mac`, `release:mac`, `release:win-linux`). Скрипт
`scripts/db-template-safe.ts` на месте и рабочий — просто отвязан от Nx-таргета. Обходной путь:
`npx tsx scripts/db-template-safe.ts` напрямую. Требует восстановления таргета отдельной задачей.

## v0.52.2–0.52.4 — Перезаливка библиотеки на новый pinner-сервер (2026-07-28)

**Контекст:** старый раздающий (pinner) сервер утрачен. Серия прошлых фиксов регенерации
манифеста (гонки pin/unpin, мёртвые CID, зависшая `regenerateAll`) была латанием симптомов
этой архитектуры. Решение: не чинить/аудировать старые CID, а перезалить всю библиотеку заново
на новый сервер через реимпорт с Рутрекера.

- **v0.52.2 — метка «Требует перезаливки»:** поле `Anime.needsReupload` (`schema.zmodel`),
  миграция `20260728044106_add_needs_reupload_flag` backfill'ит `true` всей библиотеке на
  момент перехода (новые импорты — `false`). UI: оранжевый бейдж на карточке
  ([AnimeCard.tsx](main/../renderer/src/components/library/AnimeCard.tsx)) + фильтр
  «Перезаливка» (Все / Требует / Перезалито) в каталоге.

- **v0.52.3 — аудит `buildAnimeDirectory`:** найдено, что `audioTracks`/`subtitleTracks`
  фильтровались по `transcodedCid`/`fileCid` not null на уровне SQL-запроса
  ([anime-directory-builder.ts](main/services/ipfs/anime-directory-builder.ts)) — дорожки без
  загруженного в IPFS контента никогда не попадали в `missingCids`, `contentHealth` ложно
  показывал `'complete'`. То же с эпизодом без `transcodedCid`. Убран where-фильтр (fonts —
  оставлен намеренно, некритичная потеря с ручным восстановлением), добавлены записи
  `missingCids` (`kind: 'video' | 'audio' | 'sub'`) — теперь честно триггерят `'broken'`.

- **v0.52.4 — реимпорт с Рутрекера сливается в существующее аниме:** финальное решение по
  автоматизации — вставка ссылки на Рутрекер (существующий парсер уже подхватывает максимум из
  описания раздачи), матчинг строго по тому же `shikimoriId`, слияние в существующую карточку
  через `existingAnimeId`/`isRetranscode` (переиспользован механизм «Добавить эпизоды», см.
  [ImportWizardDialog.tsx](renderer/src/components/import/ImportWizardDialog.tsx)) вместо
  создания дубликата. При расхождении числа серий — `window.confirm` (может быть другой
  релиз/качество). После чистого успеха `needsReupload` снимается автоматически в
  [import-service.ts](main/services/import/import-service.ts) `process()`.
  Изменено: [library.handlers.ts](main/ipc/library.handlers.ts) `checkAnimeExists` возвращает
  `episodeCount`/`needsReupload`; [torrents/page.tsx](renderer/src/app/torrents/page.tsx)
  `handleImport` — проверка + confirm + прокидка `existingAnimeId`.

---

## v0.44.8 — Файловый логгер

- Запись логов в `%APPDATA%/logs/main.log`, ротация 3×5MB, уровень info+

---

## v0.41.6 — Фикс паузы/возобновления энкода

- `resumeAll()` падала при `null` process — процессы FFmpeg не приостанавливались реально

---

## v0.39.3 — Восстановление аудиодорожек + ImportError + VMAF проверка сжатия

- **Фича «Восстановить дорожки»:** диалог в меню аниме (4 стадии: диагностика → папка+матчинг → обработка → готово). Сканирует эпизоды без аудио, чистит битые записи, матчит с MKV, авто-выбор всех аудиодорожек, транскод, IPFS upload, регенерация манифестов
- **Модель ImportError:** фиксация ошибок транскодирования дорожек (trackType, streamIndex, language, stage, sourcePath). Записывается автоматически при ошибках в add-tracks/restore-tracks
- **UI секция ошибок:** `ImportErrorsSection` показывает неразрешённые ошибки между hero и табами, dismiss отдельных ошибок и «Скрыть все»
- **Прерывание VMAF при неэффективном сжатии:** если estimatedSavings <= 0 после подбора CQ — поиск прерывается с ошибкой

---

## v0.39.0-0.39.2 — DRY рефакторинг + обогащение каталога

- **Shared-библиотеки:** `@letar/animatrona-utils`, `@letar/animatrona-ui`, `@letar/animatrona-franchise-graph`
- **Discover-страница:** все вкладки из IPFS, скриншоты в карточках, видео-бейджи, metadataCid
- **directoryCid как primary идентификатор** для sync + сравнение CID версий

---

## v0.38.0 — Двусторонняя синхронизация Desktop ↔ Tracker

- Sync service: автоматическое обнаружение изменений, batch publish
- Бейдж «Обновить», логирование крашей в файл
- Фиксы: регенерация дорожек, инвалидация кэша, актуальный directoryCid

---

## v0.37.0-0.37.4 — Каталог и discover плеер

- Каскад trackMode: Settings дефолт + per-anime override
- Discover/watch плеер подтянут до уровня library watch
- Сохранение прогресса discover в БД
- Graph скорости с выбором периода
- Убран template.db — БД из миграций

---

## Сохранение прогресса просмотра из каталога (v0.36.0)

Реализовано полноценное сохранение прогресса для discover-плеера:

- **Модель `DiscoverWatchProgress`** — SQLite таблица без FK на Anime/Episode, ключ `shikimoriId + episodeNumber`
- **Server Actions** — `upsertDiscoverWatchProgress`, `findDiscoverWatchProgress`, `findLastDiscoverWatched`
- **Хук `useDiscoverProgress`** — throttled сохранение (5 сек), ResumeOverlay, миграция из localStorage
- **Интеграция в плеер** — `discover/watch/page.tsx` сохраняет прогресс на каждый timeUpdate
- **Глобальная история** — `findGlobalLastWatched()` сравнивает WatchProgress и DiscoverWatchProgress

### Режим дорожек для каталога

Реализован каскадный выбор озвучка/оригинал:

- Per-anime override в localStorage (`discover-track-mode:{shikimoriId}`)
- Глобальный дефолт из `Settings.trackPreference` (RUSSIAN_DUB / ORIGINAL_SUB)
- Кнопка переключения в headerRight плеера

---
