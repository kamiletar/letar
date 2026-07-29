# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.55.11] - 2026-07-29

### Changed

- **Устранено дублирование poll-паттерна в `Sidebar`-карточках** — `ContinueWatchingCard` и
  `WatchNextCard` почти дословно повторяли один и тот же каркас (`useState` данных + `useState`
  загрузки, mount-fetch в `useEffect`, `setInterval` рефетч, `focus`-листенер, cleanup). Вынесено
  в переиспользуемый хук `usePolledData<T>(fetchFn, { intervalMs, refetchOnFocus?, enabled? })` в
  `@letar/hooks` (универсальный паттерн, полезный за пределами Sidebar). Оба компонента переведены
  на хук с сохранением текущего поведения, включая `enabled: !isOnWatchPage` у
  `ContinueWatchingCard`. Верифицировано `nx typecheck:tsgo`.

## [0.55.10] - 2026-07-29

### Changed

- **`Sidebar`-карточки без пропсов обёрнуты в `React.memo`** (продолжение аудита производительности
  из v0.55.9) — `ContinueWatchingCard`, `WatchNextCard`, `EncodingStatusCard` рендерятся постоянно
  в `Sidebar`, который присутствует на каждом non-fullscreen роуте всё время работы приложения.
  `Sidebar` держит два `setInterval`-опроса (диск — 30 сек, power-save состояние — 5 сек), каждый
  тик которых до этого перерисовывал всё поддерево, включая три карточки — хотя у них нет пропсов
  и их собственное состояние (последний просмотр, рекомендация сиквела, статус кодирования) от
  этих таймеров не зависит. `React.memo` без пропсов гарантированно блокирует такой чужой ререндер,
  не затрагивая внутреннюю реактивность карточек (свои `useEffect`/`usePathname` продолжают
  работать как раньше). ⚠️ Не профилировано напрямую (React DevTools Profiler требует запущенного
  десктоп-приложения) — правка обоснована чтением кода по аналогии с найденным в v0.55.9 паттерном
  `AnimeCard`, верифицирована `nx typecheck:tsgo`.

### Investigated

- **Аудит бандла через `@next/bundle-analyzer`** — не удалось: Turbopack (дефолтный билдер Next.js
  16 в этом приложении) не поддерживает `@next/bundle-analyzer`, нужен `next build --webpack`, а
  прямой `next build` внутри `renderer/` (в обход `nx build animatrona`) не резолвит workspace-пакет
  `@letar/hooks` — путь резолвится только через полный Nx-таргет с корректным `transpilePackages`/
  трейсингом. Полноценный анализ бандла остаётся открытым пунктом: нужен либо прогон через
  `nx build animatrona` с `ANALYZE=true` и `--webpack` (дольше, полная электрон-сборка), либо
  `next experimental-analyze` (turbopack-нативный аналог, не пробовался).

## [0.55.9] - 2026-07-29

### Changed

- **Размеры библиотеки считаются агрегацией в БД, а не выгрузкой всех дорожек** — запрос списка
  аниме в `use-library-page.ts` тянул для каждого тайтла все `episodes` → `audioTracks` →
  `subtitleTracks` → `fonts` исключительно ради четырёх сумм `ipfsSize` на карточку. На реальной
  библиотеке (338 аниме) это **25 824 объекта**, проходящих через гидрацию Prisma, сериализацию
  Server Action и `JSON.parse` в renderer'е. Заменено новым Server Action `getAnimeIpfsSizes()`
  (`anime.action.ts`) — один `$queryRaw` с `UNION ALL` + `GROUP BY animeId, kind`, возвращающий
  1 057 строк, и хуком `useAnimeIpfsSizes()` с 5-минутным `staleTime`.

  Замеры на копии рабочей БД (21 МБ, 338 аниме / 3 752 эпизода / 11 336 аудио / 7 992 суб /
  2 744 шрифта): payload **757 КБ → 32 КБ** (в 23.6 раза), плюс уходят ~4.3 мс JS-суммирования
  по 25к объектов на каждом пересчёте `useMemo` и ~3.1 мс `JSON.parse`. ⚠️ Само время SQL при
  этом **выросло** — 7.6 → 12.9 мс (агрегация делает JOIN'ы вместо плоских выборок); выигрыш не
  в базе, а в том, что 25к вложенных объектов больше не пересекают границу процесса.

### Fixed

- **`React.memo` у `AnimeCard` не работал** — `AnimeGrid.tsx` и `FranchiseView.tsx` вычисляли
  `genres={anime.genres?.map((g) => g.genre.name)}` прямо в разметке, создавая новый массив на
  каждом рендере. Так как виртуализатор перерисовывает сетку на каждый тик скролла, мемоизация
  карточек обнулялась полностью и все видимые `AnimeCard` рендерились заново каждый кадр.
  `genreNames` теперь считается один раз в `useMemo` внутри `use-library-page.ts` и передаётся
  готовым массивом. Тем же изменением стабилизировался `ipfsSizeBreakdown` — раньше он тоже
  пересоздавался как новый объект на каждом пересчёте, теперь это ссылка в кэше TanStack Query.
  ⚠️ Проверено рассуждением о ссылочной стабильности пропсов и типами, не профайлером: остальные
  пропсы карточки — примитивы (включая `posterPath`: строка сравнивается по значению) или
  `useCallback`-колбэки. Визуальная проверка скролла по большой библиотеке — на следующем запуске
  десктопного приложения.

## [0.55.8] - 2026-07-29

### Changed

- **Рефакторинг: общий хук `useVirtualizedGrid`** — `AnimeGrid.tsx` (режим «По отдельности») и
  `FranchiseView.tsx` (режим «По франшизам») дублировали идентичную логику виртуализации сетки
  (`containerRef` + `ResizeObserver`, замер `scrollMargin`, расчёт `columns`/`cardWidth` по ширине
  контейнера, `useWindowVirtualizer`, разметка абсолютно позиционированной строки). Вынесено в
  `renderer/src/lib/hooks/use-virtualized-grid.ts` — принимает `itemCount` и `estimateSize(cardWidth)`
  (высота строки отличается между режимами: `+170` для `AnimeCard`, `+190` для `FranchiseCard` со
  стопкой постеров), возвращает `containerRef`/`columns`/`cardWidth`/`rowVirtualizer`. Рендер строки
  и конкретной карточки остался в компонентах без изменений.
  ⚠️ Импортировать хук нужно точечно — `@/lib/hooks/use-virtualized-grid`, а не барабанный
  `@/lib/hooks`: в `lib/` рядом с папкой `hooks/` есть файл `hooks.ts` (ZenStack CRUD-хуки), и при
  `moduleResolution: "bundler"` TS резолвит `@/lib/hooks` в файл `hooks.ts`, а не в
  `hooks/index.ts` — экспорт из барреля молча не виден. Не запускался в браузере — визуальная
  проверка виртуализированной сетки в обоих режимах библиотеки на следующем запуске десктопного
  приложения.

## [0.55.7] - 2026-07-29

### Added

- **Сохранение позиции скролла в библиотеке при возврате назад** — новый хук
  `use-scroll-restoration.ts`: сохраняет `window.scrollY` в sessionStorage (throttled через
  `requestAnimationFrame`), ключ включает URL-фильтры и режим отображения (individual/franchise —
  разная высота строк). Восстановление — несколько попыток `scrollTo` через
  `requestAnimationFrame`, т.к. виртуализированная сетка (`useWindowVirtualizer`) уточняет
  итоговую высоту после первых кадров рендера через `measureElement`.

## [0.55.6] - 2026-07-29

### Fixed

- **Прогресс с мобильного/TV не push'ился на трекер сразу** — `handleSaveProgress` в
  `mobile-server/routes/progress.ts` сохранял прогресс локально и слал IPC-событие в renderer,
  но не вызывал `TrackerSyncService.pushWatchProgressImmediate`. Прогресс, сохранённый через
  мобильный или TV-клиент, улетал на трекер только с 5-минутным полным sync — или не улетал
  вовсе, если Desktop выключали раньше. Добавлен push сразу после upsert'а прогресса.
- **Общий debounce-таймер push'а прогресса на весь `TrackerSyncService`** — одно поле
  `pushDebounceTimer` вместо ключа по аниме+серии. Переход на следующий эпизод отменял ещё не
  отправленный push предыдущего безвозвратно (offline-очередь не подхватывала — отмена таймера
  происходила раньше постановки в очередь). Заменено на `Map` с ключом
  `` `${trackerAnimeId}:${episodeNumber}` ``.

## [0.55.5] - 2026-07-29

### Changed

- **Виртуализация каталога аниме (режим «По франшизам»)** — `FranchiseView` теперь строит
  единый список элементов (франшизы + одиночные аниме, в том же порядке, что и раньше) и
  рендерит через `useWindowVirtualizer` по тому же паттерну, что `AnimeGrid` в v0.55.3:
  число колонок по ширине контейнера (`ResizeObserver`), динамическая высота строки
  (`measureElement` — важно, т.к. `FranchiseCard` со стопкой постеров выше обычной `AnimeCard`).

## [0.55.4] - 2026-07-29

### Fixed

- **Инвалидация кеша страницы деталей аниме при фоновой синхронизации с трекером** —
  `TrackerSyncListener.tsx` не инвалидировал `['anime']` (queryKey `useFindUniqueAnime`),
  только список `['animes']`. Страница деталей конкретного аниме не обновлялась после
  фонового sync, пока пользователь не уходил и не возвращался.

## [0.55.3] - 2026-07-29

### Changed

- **Виртуализация каталога аниме (режим «По отдельности»)** — `AnimeGrid` теперь рендерит
  только видимые строки через `useWindowVirtualizer` (`@tanstack/react-virtual`), а не все
  карточки библиотеки разом. Число колонок пересчитывается по ширине контейнера
  (`ResizeObserver`), высота строки — динамический `measureElement`. Данные всё ещё
  загружаются одним запросом без cursor-пагинации (нужна для корректной группировки по
  франшизам — см. PLAN.md); режим «По франшизам» не виртуализирован.

## [0.55.2] - 2026-07-29

### Changed

- **Единая функция `resolveTrackKey()` в `shared/types/track-key.ts`** — ключ группировки
  аудио/субтитров (`language:title`) был продублирован в 4 местах (`play-folder-builder.ts`,
  `manifest-generator.ts`, `asset-bundler.ts`, `track-utils.ts`) с расходящейся логикой
  фолбэка (не везде учитывался `dubGroup`). Теперь одна реализация с фолбэком
  `title → dubGroup → 'default'`.

## [0.55.1] - 2026-07-29

### Fixed

- **Дотипизация rutracker/torrent IPC в `electron.d.ts`** — `torrents/page.tsx` и
  `import-rutracker/page.tsx` больше не живут под `@ts-nocheck`. По пути исправлены баги,
  которые он скрывал: прогресс скачивания терял `totalSize` на первом же обновлении, импорт
  файлов из папки торрента всегда находил 0 видео (обращение к несуществующему полю ответа
  `fs.scanFolder`), а найденный источник для торрента без ссылки терял TS-сужение внутри
  вложенного колбэка обновления состояния.

## [0.55.0] - 2026-07-29

### Added

- **Кнопка «Найти источник» для торрентов, добавленных вручную** — на вкладке «Остальное»
  (`/import?tab=torrents`) для торрентов без привязанной ссылки Rutracker: вытаскивает
  `comment` раздачи через `/api/v2/torrents/properties`, ищет в нём ссылку на Rutracker,
  прогоняет парсинг+матчинг и привязывает результат к уже существующему торренту — без
  повторного скачивания. IPC `rutracker:findSourceForTorrent`.

## [0.54.0] - 2026-07-29

### Added

- **`play/` — standalone Web Player встроен в directoryCid** — `main/services/ipfs/play-folder-builder.ts`
  переиспользует существующий Web Player (`web-export/asset-bundler.ts` + `manifest-generator.ts`,
  режим `referenced`) и встраивает его как папку `play/` прямо в основной `directoryCid` каждого
  аниме. Для просмотра теперь достаточно `<gateway>/ipfs/<directoryCid>/play/` — без Animatrona,
  без отдельного шага экспорта. CID видео/аудио/субтитров переиспользуются из основного дерева
  (IPFS не дублирует блоки). Главы (OP/ED) читаются из уже пропинненного `chapters.json` каждого
  эпизода (`chaptersByEp` из pre-pass'а `buildAnimeDirectory()`) и попадают в манифест плеера —
  ничего из того, что нужно для просмотра, не остаётся снаружи `directoryCid`.

## [0.53.0] - 2026-07-29

### Added

- **Сохранение исходного .torrent файла в directoryCid** — `QBittorrentService` экспортирует
  `.torrent` файл раздачи через `/api/v2/torrents/export` (qBittorrent 4.5+) как только получены
  метаданные, заливает в IPFS (`pin: false`) и сохраняет CID (`TorrentDownload.torrentFileCid` →
  `Anime.sourceTorrentCid`). `anime-directory-builder.ts` добавляет папку `source/` в
  `directoryCid`: `source.json` (`{ source: { type, url }, torrentFileCid }`, расширяемо под
  другие источники без изменения схемы манифеста) + сам `source.torrent`.
- **Категория qBittorrent для торрентов Animatrona** — торренты, добавленные через приложение,
  помечаются категорией `animatrona`. Вкладка «Animatrona» / «Остальное» в `torrents/page.tsx`
  отделяет их от торрентов, добавленных вручную напрямую в qBittorrent.

## [0.52.5] - 2026-07-28

### Fixed

- **Shikimori-запросы падали `net::ERR_FAILED` под TUN-VPN (Clash и т.п.)** — `net.fetch`
  (сеть Electron/Chromium) режется TUN-клиентом по TLS-отпечатку, хотя тот же запрос через
  обычный Node-сокет проходит успешно (`session.setProxy`/`proxyBypassRules` тут не помогают —
  `resolveProxy()` в TUN-режиме честно возвращает `DIRECT`, блокировка происходит ниже уровня
  прокси-настроек Chromium). `main/services/shikimori/{client,anime-api,franchise-api}.ts`
  переведены с `net.fetch` на глобальный `fetch` (Node.js/undici).
- **SSR-краш `shaka-player` блокировал любую сборку** (`self is not defined` при пререндере
  `/discover` и `/_not-found`) — статический `import shaka from 'shaka-player'` в
  `GlobalVideoProvider.tsx`/`useShakaPlayer.ts` заменён на динамический `import()` внутри
  `useEffect`, выполняется только в браузере.

## [0.52.4] - 2026-07-28

### Added

- **Реимпорт с Рутрекера сливается в существующее аниме вместо дубликата** — при вставке
  ссылки на Рутрекер и нажатии «В очередь» на скачанном торренте, если `shikimoriId` уже есть
  в библиотеке, реимпорт теперь идёт в режиме retranscode (`existingAnimeId`/`isRetranscode`,
  тот же механизм что у «Добавить эпизоды» на странице аниме) — не создаёт вторую карточку.
  При расхождении числа серий между старой карточкой и новой раздачей — подтверждение
  (`window.confirm`), раз это может быть другой релиз/качество, а не 1:1 копия. После чистого
  успешного реимпорта (`ImportService.process`) — метка `needsReupload` автоматически снимается;
  при частичных ошибках остаётся, чтобы contentHealth/missingCids подсветили что доделать.

## [0.52.3] - 2026-07-28

### Fixed

- **Аудит `buildAnimeDirectory`: молчаливые потери аудио/субтитров/видео не попадали в
  contentHealth** — SQL-запрос фильтровал `audioTracks`/`subtitleTracks` по
  `transcodedCid`/`fileCid` not null ещё до того, как builder успевал их увидеть, поэтому
  дорожки без загруженного в IPFS контента (транскодировано, но не залито) исчезали из
  `directoryCid` бесследно — `missingCids` их не фиксировал, `contentHealth` ложно оставался
  `'complete'`. Аналогично эпизод без `transcodedCid` просто `continue`'ился без записи в
  `missingCids`. Убран where-фильтр у audioTracks/subtitleTracks (fonts — оставлен, это
  некритичная потеря с отдельным ручным восстановлением), добавлены записи `missingCids`
  (`kind: 'video' | 'audio' | 'sub'`) для всех трёх случаев — теперь они дают `contentHealth:
'broken'` как и положено. Актуально перед полной перезаливкой библиотеки на новый
  pinner-сервер — regenerateAll теперь honestly репортит, что не хватает.

## [0.52.2] - 2026-07-28

### Added

- **Метка «Требует перезаливки»** — поле `Anime.needsReupload`. Вся текущая библиотека
  раздавалась через утраченный pinner-сервер (миграция `20260728044106_add_needs_reupload_flag`
  проставила `true` всем существующим записям как backfill). Бейдж на карточке в каталоге,
  фильтр «Перезаливка» (все / требует / перезалито). Снимается вручную после реимпорта/republish
  на новую схему раздачи.

## [0.52.1] - 2026-05-21

### Fixed

- **PeerSync: индикатор «Last sync» врал** — `getStatus().lastSyncAt` возвращал `response.updatedAt` из последнего ответа API, но это поле — таймстемп последней правки списка серверов **на трекере**, а не момент успешного pull-а из desktop. При длительной недоступности API индикатор молчал и показывал stale ISO из cache. Теперь `lastSyncAt` — Unix ms реального успеха `fetchPinServers`, а оригинальный `updatedAt` отдаётся отдельным полем `lastResponseUpdatedAt` для UI «данные обновлены: X».
- **PeerSync: затяжная недоступность API стала видимой в логах** — при провалах > 1 часа от последнего успеха пишется `log.error` вместо `log.warn` (с `sinceLastSuccessMs` / `firstFailureAt` в payload), чтобы инцидент попадал в трейс.

### Changed

- `publishToTracker(config, directoryCid)` — удалён 3-й параметр `manifestCid` (мёртвая ветка после миграции `20260514194607_remove_anime_manifest_cid`). Все вызовы и до этого передавали только 2 аргумента.

## [0.52.0] - 2026-05-14

### Removed

- **BREAKING: удалено поле `Anime.manifestCid`** — рудимент дисковой модели хранения. `manifest.json` всегда лежит внутри `directoryCid` как файл; для получения его CID использовать `stat(${directoryCid}/manifest.json)`. Создана миграция `20260514194607_remove_anime_manifest_cid`.
- Удалён IPC handler `ipfs:migrateToDirectories` (UI-кнопка «Мигрировать на IPFS-директории»).
- Удалён скрипт `scripts/regenerate-anime-manifests.ts`.

### Changed

- `tracker.handlers.ts` — публикация на трекер больше не передаёт `manifestCid`.
- `pin-normalizer.ts`, `orphan-audit.ts`, `content-deletion.ts` — убраны legacy-ветки для `manifestCid`.
- `subscriptions/[id]/page.tsx` — импорт аниме из подписки теперь использует `directoryCid`.
- Добавлен сервис `legacy-directory-migration.ts` — при старте приложения автоматически строит `directoryCid` для аниме, у которых он отсутствует.

## [0.47.17] - 2026-04-04

### Changed

- **Perf: lazy-load IPC handlers** — 40 из 47 модулей загружаются через dynamic import после первого рендера (setTimeout(0)), только 6 core handlers блокируют startup (app, dialog, ffmpeg, fs, library, window)
- **Perf: in-memory кэш в achievements-store и bonus-store** — файл читается один раз, дальше работа с RAM. Все функции стали async
- **Perf: @next/bundle-analyzer** — `ANALYZE=true nx build animatrona` для анализа бандла

## [0.47.16] - 2026-04-04

### Changed

- **Perf: throttle timeupdate в GlobalVideoProvider** — store обновляется не чаще 250ms вместо ~4 раз/сек, снижает ререндеры MiniPlayer и VideoPlayer
- **Perf: async FS в media.protocol** — `statSync` заменён на `fs.promises.stat`, не блокирует main thread при стриминге видео
- **Perf: async config-store** — `load()`/`save()`/`update()` стали async, добавлен `loadSync()` для startup. Обновлены потребители: tracker.handlers, distribution-service, pinata-service, remote-pin.handlers
- **Perf: findFirst → findUnique** — `findEpisodeByNumber()` и `findAnimeByShikimoriId()` используют unique index напрямую

### Fixed

- **Memory leak: torrent-service remove()** — очистка `persistTimers` и `watchdogPaused` при удалении торрента (раньше только `meta` чистился)
- **Memory leak: GlobalVideoProvider** — все event listeners (error, timeupdate, play, pause, durationchange) теперь корректно удаляются при cleanup

## [0.47.15] - 2026-04-04

### Fixed

- **Немедленный аудит после импорта** — `auditSingleItem()` вызывается сразу после завершения, пользователь видит проблемы без перезапуска
- **postProcess ошибки не маскируются** — если загрузка в IPFS упала, `process()` возвращает warning с номерами эпизодов
- **Нативное уведомление при partial success** — `notifyImportWarning()` вместо generic "Импорт завершён"

## [0.47.9] - 2026-04-02

### Added

- **Franchise данные в Mobile Server API** — `handleListAnime()` теперь включает `shikimoriId`, `franchiseKey`, `franchiseName` в ответ. Мобильное приложение может группировать аниме по франшизам

## [0.47.0] - 2026-03-29

### Added

- **Интерактивный seekbar в MiniPlayer** — замена readonly прогресс-бара на Chakra Slider с перемоткой. Автоматическая синхронизация отдельной аудиодорожки при seek через event listeners GlobalVideoProvider
- **Сохранение прогресса в mini mode** — `useMiniPlayerProgress` сохраняет позицию каждые 5 сек при воспроизведении в mini-player. Автоотметка серии просмотренной при ≤120 сек до конца. Финальная позиция сохраняется при закрытии mini-player

### Fixed

- **Фазы 4, 6, 8 MiniPlayer** — подтверждено, что audioSrc синхронизация, audio sync в mini mode и autoResume при expand уже работают корректно через архитектуру persistent event listeners и isResuming проверку

## [0.46.7] - 2026-03-26

### Fixed

- **Загрузка аудиодорожек в IPFS при основном импорте** — после переноса ImportProcessor в main (v0.44) обработчик `audioTrackCompleted` в renderer был удалён, но загрузка аудио в IPFS не была добавлена в main. Аудио транскодировалось, но `transcodedCid` и `ipfsSize` оставались null. Теперь `handleAudioCompleted` загружает файл в IPFS, обновляет БД и удаляет temp

### Added

- **Размер дорожек в IPFS** — вкладка "Дорожки" показывает суммарный размер каждой группы дорожек и общий размер секций (аудио/субтитры)
- **Удаление групп дорожек** — кнопка удаления с подтверждением для удаления ненужных дорожек
- **Размер аниме на карточке** — общий IPFS размер в оверлее карточки, tooltip с детализацией по категориям (видео/аудио/субтитры/шрифты)
- **Размер аниме на детальной странице** — в мета-строке рядом с количеством эпизодов, tooltip с детализацией

## [0.46.6] - 2026-03-25

### Added

- **Размер дорожек в IPFS** — вкладка "Дорожки" показывает суммарный размер каждой группы дорожек и общий размер секций (аудио/субтитры)
- **Удаление групп дорожек** — кнопка удаления с подтверждением для удаления ненужных дорожек (например, бесполезных 5.1)
- Batch delete server actions: `batchDeleteAudioTracks`, `batchDeleteSubtitleTracks`

## [0.46.0] - 2026-03-25

### Changed

- **SOLID — OCP: Encoder Strategy Pattern** — GPU/CPU кодирование в `transcode.ts` извлечено в `encoder-strategies.ts` с интерфейсом `EncoderStrategy` и реализациями `NvencEncoderStrategy` / `CpuEncoderStrategy`. Добавление AMD/Intel = новый класс без модификации существующего кода
- **SOLID — SRP: ImportQueue split** — из ImportQueueController (1238 строк) извлечены notifications (3 функции) в `import-queue-notifications.ts` и torrent tracking (2 функции) в `import-queue-torrent.ts`

## [0.45.2] - 2026-03-25

### Changed

- **DRY: preload event subscriptions** — 101 подписка на IPC события в 14 preload файлах заменена на хелпер `on()` из `ipc-helper.ts`. Сокращение ~500 строк boilerplate. Каждая 4-строчная подписка стала 1 строкой

## [0.45.1] - 2026-03-25

### Changed

- **DRY: getIpfsUrl()** — извлечён в `utils/ipfs-url.ts`, заменяет 6 дублей паттерна gateway URL в export-manager, mobile-server routes, web-export
- **DRY: broadcastToWindows()** — консолидирован в `utils/ipc-handler-factory.ts`, удалён дубликат из `src/utils/broadcast.ts`, добавлена проверка `isDestroyed()`
- **Fix: @ts-nocheck** удалён из 3 файлов (rutracker-parser, download-orchestrator, torrent-service) — файлы теперь проходят typecheck
- **Fix: lint** — все ошибки исправлены (curly, no-explicit-any, no-unused-vars, ban-ts-comment)
- **Fix: тесты** — обновлены моки для torrent-service и download-orchestrator (154/154 passed)

## [0.45.0] - 2026-03-25

### Removed

- **Фаза 5 завершена:** удалён мёртвый код renderer/src/lib/import/ (~3000 строк) — ImportProcessor, use-import-flow, use-import-state, use-import-events, use-import-mutations, дубликаты audio-track-creator, subtitle-track-creator, chapter-creator, video-options-builder, processors/. Вся логика импорта теперь только в main process (ImportService + ImportQueueController)
- Deprecated `isPssuspendAvailable` alias из process-control.ts
- Deprecated поля из EpisodeExportData: `videoPath`, `transcodedPath`, `inputPath`, `filePath`, `fonts` (IPFS-only с v0.39)

## [0.44.8] - 2026-03-24

### Changed

- **Оптимизация IPFS has():** замена O(N) перебора refs.local() на O(1) block.stat() — проверка наличия контента ускорена ~100x
- **Параллельная инициализация sync-сервисов:** 6 независимых сервисов (WatchProgressSync, UserProfileSync, FriendRequestsSync, PresenceSync, WatchPartySync, DistributionService) запускаются через Promise.allSettled() вместо последовательной цепочки .then()
- **Параллельное скачивание temp-файлов:** downloadMany() использует Promise.all() вместо последовательного цикла
- **TorrentService debounce DB записей:** некритичные persistToDb() вызовы (pause, resume, metadata) группируются через debounce 5с, progress interval увеличен до 2с
- **BasePubSubSync exponential backoff:** добавлен лимит 10 попыток переподписки с экспоненциальной задержкой (5с → 60с max) вместо бесконечных retry
- **AchievementService debounce:** checkAllAchievements() вызывается с debounce 2с вместо на каждое stats:updated событие

### Fixed

- **Утечка event listeners в StatsTracker:** подписки на PinManager (pinned/unpinned) теперь корректно отписываются в shutdown()

## [0.44.5] - 2026-03-23

### Fixed

- **Замерзание прогресса в UI очереди импорта:** IPC подписка на `onAggregatedProgress` переподписывалась при каждом завершении аудиодорожки из-за нестабильной ссылки `updateAudioTrack` в зависимостях `useEffect`. При быстром кодировании 26+ аудиотреков подписка постоянно ломалась, теряя события прогресса → UI показывал устаревшие данные (первые эпизоды вместо текущих). Фикс: `useRef` для мутации + прямое вычисление `detailProgress` в main process без renderer round-trip

## [0.44.2] - 2026-03-23

### Added

- **Fast resume торрентов:** сохранение bitfield + fileModtimes в DB — после перезапуска торренты стартуют мгновенно без повторного хэширования файлов

## [0.43.4] - 2026-03-21

### Added

- **Настройки торрент-клиента (Фаза 8):** карточка `TorrentSettingsCard` в P2P → Торренты — целевой ratio (авто-стоп сидирования), папка скачивания, последовательная загрузка. Настройки в localStorage
- **Завершён полный pipeline Rutracker Import** (Фазы 1-8): парсинг → Shikimori match → скачивание → прогресс → очередь импорта → управление торрентами → настройки

## [0.43.3] - 2026-03-21

### Added

- **Страница управления торрентами (Фаза 7):** `/torrents` — список активных торрентов с real-time прогрессом, статусами (скачивание/сидирование/пауза/завершён), ratio, скоростями
- **Действия:** пауза/возобновление, удаление (с файлами или без), суммарная статистика скоростей
- **Навигация:** пункт «Торренты» в боковой панели с иконкой

## [0.43.2] - 2026-03-21

### Added

- **UI скачивания торрента (Фаза 6):** кнопка «Скачать и импортировать» в превью, шаг downloading с прогресс-баром (скорость, пиры, размер), шаг done с переходом в очередь, кнопка отмены скачивания
- **Интеграция:** подписка на `torrent:progress` и `torrent:done` для real-time обновления UI, автоматическое подтверждение Shikimori match перед скачиванием

## [0.43.1] - 2026-03-21

### Added

- **Оркестратор скачивания (Фаза 5):** `RutrackerDownloadOrchestrator` — связывает Rutracker import → Torrent → ImportQueue. По завершении скачивания автоматически фильтрует видеофайлы, извлекает номера эпизодов и добавляет в очередь импорта
- **IPC хэндлеры:** `rutracker:startDownload`, `rutracker:getActiveDownloads`, `rutracker:cancelDownload`
- **Preload API:** `rutrackerPreload.startDownload()`, `.getActiveDownloads()`, `.cancelDownload()`
- **Тесты:** 13 unit-тестов для оркестратора (startDownload, onTorrentDone → ImportQueue, extractEpisodeNumber, cancelDownload, getActiveDownloads)

## [0.43.0] - 2026-03-21

### Added

- **Встроенный торрент-клиент (Фаза 3):** `TorrentService` на базе webtorrent — скачивание по магнет-ссылке, пауза/возобновление, авто-остановка сидирования при достижении target ratio (по умолчанию 2.0), последовательная загрузка для стриминга
- **IPC хэндлеры:** `torrent:init`, `torrent:add`, `torrent:pause`, `torrent:resume`, `torrent:remove`, `torrent:get`, `torrent:getAll`, `torrent:destroy`
- **Preload API:** `torrentPreload` с подписками на события (`onProgress`, `onAdded`, `onDone`, `onError`, `onRemoved`)
- **Тесты:** 16 unit-тестов для TorrentService (add, pause/resume, remove, auto-ratio, sequential download)

## [0.42.2] - 2026-03-21

### Added

- **UI импорта из Рутрекера (Фаза 4):** страница `/import-rutracker` — 4-шаговый флоу: ввод HTML + URL → загрузка → превью (заголовок, Shikimori match, технические данные, озвучки/субтитры, магнет) → ошибка
- **IPC хэндлеры:** `rutracker:parse`, `rutracker:import`, `rutracker:confirmMatch`
- **Preload API:** `rutrackerPreload.parse()`, `.import()`, `.confirmMatch()`
- **Навигация:** пункт «Rutracker» в боковой панели

## [0.42.1] - 2026-03-21

### Added

- **Shikimori auto-match (Фаза 2):** `rutracker-matcher.ts` — ранжирование кандидатов по названию (bigram/Dice), году, типу, эпизодам. Стратегии: прямая ссылка (confidence 1.0), MAL ID (0.9), поиск + ранжирование
- **Оркестратор импорта:** `rutracker-import.ts` — пайплайн URL → парсинг → матчинг → auto-accept/confirmation
- **Тесты:** 27 unit-тестов для матчера (normalizeTitle, titleSimilarity, rankCandidates, isAutoMatchConfident, matchFrom\*)

## [0.42.0] - 2026-03-21

### Added

- **Парсер Рутрекера (Фаза 1):** `rutracker-parser.ts` — полный парсинг HTML страницы раздачи (cheerio): заголовок, поля поста, озвучки/субтитры, MediaInfo, внешние ссылки (Shikimori, MAL, AniDB), магнет-ссылка, постер, список файлов
- **Типы:** `RutrackerTorrentInfo`, `RutrackerMediaInfo`, `RutrackerDubGroup`, `RutrackerExternalLinks`
- **Тесты:** 100 unit-тестов для парсера (parseTitle, parseMediaInfoText, parsePostFields, parseRutrackerPage с двумя HTML-фикстурами)
- **Vitest конфигурация:** добавлен `vitest.config.ts` и target `test` в project.json

## [0.41.7] - 2026-03-20

### Fixed

- **Диалог обновления:** releaseNotes теперь корректно сериализуются (массив ReleaseNoteInfo → строка), кнопка «Установить сейчас» отображается всегда когда обновление скачано
- **Пауза энкода реально останавливает FFmpeg:** исправлен баг, из-за которого NtSuspendProcess не вызывался (TypeError при null process прерывал цикл). Теперь GPU замораживается мгновенно
- **Возобновление после паузы:** если процесс не удалось возобновить, задача корректно завершается с ошибкой и слот освобождается для следующих задач
- **Логирование паузы/возобновления:** результат ntsuspend.suspend()/resume() теперь логируется для диагностики

## [0.39.3] - 2026-03-19

### Added

- **Восстановление аудиодорожек из исходников:** диалог «Восстановить дорожки» в меню аниме — диагностика эпизодов без аудио, очистка битых записей, матчинг с MKV, авто-транскод всех аудиодорожек, регенерация манифестов
- **Модель ImportError:** фиксация ошибок транскодирования дорожек в БД (trackType, streamIndex, language, stage, sourcePath)
- **UI секция ошибок импорта:** показ неразрешённых ImportError между hero и табами в деталях аниме, dismiss отдельных ошибок
- **Запись ошибок при транскодировании:** автоматическое создание ImportError при ошибках аудио/субтитров в add-tracks/restore-tracks
- **Прерывание VMAF при неэффективном сжатии:** если оценочный размер >= исходника, VMAF поиск прерывается с ошибкой

## [0.39.2] - 2026-03-19

### Changed

- **DRY рефакторинг:** вынос дублирования между animatrona и animatrona-tracker в shared-библиотеки `@letar/animatrona-utils`, `@letar/animatrona-ui`, `@letar/animatrona-franchise-graph`
- **Декомпозиция EncodingInfoDialog** на модульные компоненты

## [0.39.1] - 2026-03-18

### Added

- **Обогащение discover-страницы:** все вкладки из IPFS (О сериале, Дорожки, Связанные, Франшиза, Видео)
- **Скриншоты и превью в карточках эпизодов каталога**
- **Скриншоты в IPFS-директорию и эпизодные манифесты**
- **Кнопка ℹ️ и видео-бейджи на карточках discover**
- **metadataCid в EpisodeManifest + медиаинфо в Discover**

## [0.39.0] - 2026-03-18

### Changed

- **directoryCid как primary идентификатор** для синхронизации Desktop ↔ Tracker

### Added

- **Сравнение CID версий в каталоге** + кнопки синхронизации

### Fixed

- Циклический перезапуск видео в каталоге + кнопка Импорт
- Сброс stale directoryCid при регенерации манифестов

## [0.38.0] - 2026-03-18

### Added

- **Полная двусторонняя синхронизация Desktop ↔ Tracker:** автоматическое обнаружение изменений, batch publish, sync service
- **Бейдж «Обновить»** + логирование крашей в файл

### Fixed

- Регенерация манифестов перестраивает дорожки эпизодов
- Сброс trackerPublishedAt при обновлении directoryCid
- Инвалидация кэша аниме после регенерации манифестов
- Batch publish читает актуальный directoryCid из БД

## [0.37.4] - 2026-03-17

### Added

- **Сохранение прогресса discover в БД** вместо localStorage
- **Отправка manifestCid** при публикации на трекер
- **График скорости** — выбор периода + средняя скорость

### Fixed

- Каталог — матчинг по directoryCid + shikimoriId вместо manifestCid
- Передача subtitleRecommendations через очередь импорта
- Дубликаты названий дорожек в IPFS манифесте

## [0.37.0] - 2026-03-17

### Added

- **Каскад trackMode:** Settings дефолт + per-anime override в localStorage
- **Discover/watch плеер** подтянут до уровня library watch
- **Редизайн discover/[id]** под вид library/[id]
- **Статус «В библиотеке»** в каталоге трекера

### Changed

- **Увеличены лимиты Kubo** для максимальной скорости раздачи
- **Убран template.db** — БД создаётся из миграций

### Fixed

- use(params) вместо params.then() в discover/[id]
- Постеры каталога — убрать ipfs:// префикс из coverUrl

## [0.36.0] - 2026-03-16

### Added

- **Полноценный плеер для каталога:** просмотр аниме из каталога трекера с полной поддержкой аудиодорожек (выбор озвучки), субтитров (ASS с шрифтами, SRT, VTT), глав на прогресс-баре (OP/ED/recap маркеры), автопропуска OP/ED, sprite thumbnails (hover preview), навигации prev/next и UpNext overlay
- **Резолв EpisodeManifest из IPFS:** хук `useDiscoverEpisode` загружает манифест через цепочку `directoryCid/manifest.json → episodesCid → manifestCid` — без изменений трекера или БД

## [0.35.0] - 2026-03-16

### Added

- **Просмотр аниме из каталога без импорта:** клик по карточке → страница с описанием и эпизодами → клик по эпизоду → плеер. Видео стримится через локальный Kubo gateway
- **Страница деталей `/discover/[id]`:** постер, описание, жанры, год, студия, список эпизодов, кнопка импорта
- **Кликабельные карточки в каталоге:** навигация по клику с сохранением кнопок импорта

### Fixed

- Постеры каталога через локальный Kubo gateway + CORS bypass
- Placeholder для постеров пока грузятся
- Каталог трекера показывал 0 аниме

---

Продолжение в [CHANGELOG_2026_03_14.md](./CHANGELOG_2026_03_14.md) (версии 0.28.0 — 0.34.0)

**Архивы:**

- [CHANGELOG_2026_01_26.md](./CHANGELOG_2026_01_26.md) — v0.20.0 — v0.27.2
- [CHANGELOG-v0.md](./CHANGELOG-v0.md) — v0.1.0 — v0.19.x
