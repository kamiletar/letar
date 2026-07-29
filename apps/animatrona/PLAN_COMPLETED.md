# Выполненные задачи — Animatrona

Детальное описание всех реализованных фич.

> **Архив обновлён:** 2026-07-29

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

## v0.36.0 — Полноценный плеер для каталога

Плеер `/discover/watch` переписан из простого видеоплеера в полноценный с поддержкой:

- Аудиодорожки (выбор озвучки: AniDUB, оригинал и т.д.)
- Субтитры (ASS с шрифтами, SRT, VTT) с автовыбором
- Главы на прогресс-баре (OP/ED/recap маркеры) + автопропуск
- Sprite thumbnails (hover preview на таймлайне)
- Навигация prev/next по эпизодам + UpNextOverlay
- TrackSelector + кнопка импорта

Хук `useDiscoverEpisode` резолвит `EpisodeManifest` из IPFS без изменений трекера:
`directoryCid/manifest.json → episodesCid → episodes[N].manifestCid → EpisodeManifest`

---

## v0.35.0 — Просмотр аниме из каталога без импорта

Полный flow: каталог → карточка аниме → страница деталей → плеер.
Страница деталей `/discover/[id]` с постером, описанием, жанрами, списком эпизодов.
Карточки кликабельные, кнопки импорта сохранены.

---

## v0.34.0 — P2P инфраструктура

- Персистентность очереди кодирования в SQLite
- Раздачи по directoryCid с отправкой статистики на трекер
- P2P Statistics Dashboard — графики bandwidth
- Второй пин-сервер pinner2
- Тюнинг Kubo для высокой пропускной способности

---

## v0.33.0 — IPFS-директории

- Один CID на аниме вместо десятков отдельных pins
- Двухпроходная сборка — directoryBlocks/directorySize в manifest.json
- IPNS публикация как IPFS-директория
- IPFS size stats для всех медиафайлов

---

## v0.32.0 — Рефакторинг экосистемы

Декомпозиция god objects: preload, shared utils, удаление мёртвого кода.

---

## v0.31.0 — Cloud Library

Облачная библиотека: синхронизация с трекером, пакетная публикация, объединённая вкладка "Раздачи".

---

## v0.30.5 — Группировка по connected components

**Проблема:** Shikimori считает "франшизой" всю вселенную — Re:Zero включает основные сезоны, OVA, спешлы и кроссоверы (Isekai Quartet через CHARACTER). Группировка по `franchise.id` (renderer) или `rootShikimoriId` (web) объединяла все эти аниме в одну группу.

**Решение:** Группировка по связным компонентам (BFS) в графе "сильных" прямых связей.

**Сильные связи:** SEQUEL, PREQUEL, SIDE_STORY, PARENT_STORY, SUMMARY, FULL_STORY, SPIN_OFF, ADAPTATION

**Слабые (исключены):** CHARACTER, ALTERNATIVE_VERSION, ALTERNATIVE_SETTING, OTHER

**Изменённые файлы:**

| Файл                                                    | Изменение                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `renderer/.../library/_lib/types.ts`                    | `MissingAnimeRelation` → `AnimeRelationInfo` (+targetAnimeId) |
| `renderer/.../library/_lib/group-anime-by-franchise.ts` | Полная переработка: BFS connected components                  |
| `renderer/.../library/_lib/use-library-page.ts`         | Запрос sourceRelations: все связи (+targetAnimeId)            |
| `animatrona-web/src/lib/franchise-grouping.ts`          | Переработка: RelationsDocument + BFS по shikimoriId           |

---

## v0.29.0 — Аудит БД: принцип минимума (Phases A-E+G)

**Цель:** Убрать из SQLite display-only поля — перенести в AnimeManifest (IPFS).

**Реализовано:**

- Phase A: добавлены `nextEpisodeAt`, `id`/`slug` в AnimeManifest типы
- Phase B: генератор манифестов пишет shikimori IDs, nextEpisodeAt из API
- Phase C: `importAnimeFromManifest` больше не пишет display-only поля в БД; исправлен жанровый upsert
- Phase D: удалены из Anime schema: `description`, `source`, `ageRating`, `duration`, `licensor`, `nextEpisodeAt`; удалены enum'ы `AnimeSource`, `AgeRating`
- Phase E: удалены из Episode schema: `videoCodec`, `videoBitrate`, `encodingSettingsJson`, `sourceSize`, `transcodedSize`, `sourceMetadataJson`
- Phase G: миграция `20260223201638_remove_display_only_fields` создана и применена

**Отложено:** Phase F (Chapter → IPFS) — высокая сложность, затрагивает плеер, мобильный клиент, backup/restore, chapter-editor.

---

## v0.28.x — AnimeManifest IPFS раздача + минимизация БД (Фазы 1-6) ✅

**Цель:** Создать AnimeManifest в IPFS с полными метаданными, минимизировать БД.

- **Фаза 1-2 (Типы и интеграция):** `shared/types/anime-manifest.ts`, генератор манифестов, IPC handlers, автогенерация при импорте
- **Фаза 3 (Минимизация БД):** Удалены модели Studio, Person, Character, Fandubber, Fansubber, ExternalLink, Video и join-таблицы. Удалены enums PersonRole, ExternalLinkKind, VideoKind. Оставлены Genre, Theme для фильтрации.
- **Фаза 4 (UI):** `use-anime-manifest.ts` хук, TanStack Query кэширование, videos из манифеста вместо Prisma
- **Фаза 5 (Импорт по CID):** Страница `/import-cid`, preview манифеста, `importAnimeFromManifest()`
- **Фаза 6 (PublishedLibrary и backup):** `manifestCid` в PublishedAnime и AnimeMeta

---

## v0.28.21 — Исправления PubSub и мобильного прогресса

- **TypeError: terminated в FriendRequestsSync и WatchProgressSync:** `onError` PubSub callback очищал handler но не переподписывался. Добавлен автоматический retry через 5 сек.
- **Мобильный прогресс не обновлялся на десктопе:** `MobileProgressSync.tsx` инвалидировал `['Anime']` вместо `['animes']`. Добавлена инвалидация `['animes']`, `['anime', animeId]`, `['filterCounts']`.

---

## v0.28.16 — Просмотр библиотеки подписки + CID манифеста ✅

- IPC handler `subscription:fetchLibrary`
- Страница `/subscriptions/[id]` с карточками аниме
- Кнопка «Просмотреть» в карточках подписки
- Кнопка копирования PeerId в IpfsStatusSection
- Пункт «Скопировать CID манифеста» в ActionMenu
- Фикс хардкода порта 8765: `media-url.ts` → реальный `baseUrl` из `gatewayStatus()`

---

## v0.28.14 — IPFS Garbage Collection ✅

Кнопка "Очистить хранилище" в P2P Sharing → IPFS Нода. Вызывает `repo.gc()`, показывает количество удалённых блоков и освобождённый размер.

---

## v0.28.9 — Миграция FTS5 → Client-Side Search (Fuse.js) ✅

- `SearchProvider` + `useSearch()` / `useSearchIds()` — клиентский поиск
- `getSearchableAnime()` — Server Action с pre-computed стеммингом
- Все старые миграции удалены, создана чистая init миграция
- Преимущества: fuzzy matching, ~1ms отклик, offline, стандартные Prisma миграции

---

## v0.28.3 — Приватный Relay сервер ✅

Kubo (IPFS) relay на 193.37.68.73:41001 с отключённым DHT анонсированием. PeerId: `12D3KooWLUL6FhLPLhcyBMcNTXP65225G4H1Ai8HdyvBWi5MKxnh`. DataLimit без лимита, DurationLimit 2h.

---

## v0.28.x — Исправления багов

- **v0.28.20:** Дефолтный битрейт аудио 256→192 kbps, VMAF 94→95
- **v0.28.19:** Прогресс-бар зависал при постпроцессинге (диапазон 0–90% транскодинг, 90–100% постпроцессинг)
- **v0.28.18:** metadata.json в IPFS, гранулярный прогресс скриншотов, размер видеодорожки
- **v0.28.17:** Задержка кнопки "Пропустить эндинг" (DETECTION_LEAD_SEC=5), isFileMode для одиночных файлов, автоопределение OP/ED с обычными MKV-главами
- **v0.28.16:** Автоудаление локальных папок после IPFS-загрузки
- **v0.28.15:** Прогресс энкода, fpcalc в production, кнопка "Выбрать файл"
- **v0.28.14:** SQLite блокировка (WAL mode, busy_timeout, retry wrapper)
- **v0.28.13:** Тип субтитров (полные/надписи/песни), извлечение команды из имени папки, Prisma 7
- **v0.28.12:** Ползунок громкости, Portal в полноэкранном, навигация при видео, watchdog зависания
- **v0.28.11:** GPU кодирование после отключения (cpuFallbackReason)
- **v0.28.10:** TypeError: terminated при закрытии, HTTP клиенты

---

## v0.27.2 — Исправление метрик трафика ✅

`@libp2p/simple-metrics` перемещён из `services` в top-level `metrics`. Интеграция HeliaService → StatsTracker.

---

## v0.27.1 — Исправление блокировки UI при старте ✅

OrbitDB `classic-level` требовал native prebuilds. Решено через electron-rebuild (`@electron/rebuild`, `npmRebuild: true`, extraResources для classic-level и зависимостей).

---

## v0.27.0 — Рефакторинг кодовой базы ✅

**Декомпозиция монолитных файлов (~4900 → ~1200 строк):**

- `ExportSeriesDialog.tsx` (1293→64), `import-processor.ts` (~480→~100), `P2PSharingCard.tsx` (1018→120), `library/page.tsx` (811→274), `use-p2p-sharing.ts` (710→150)

**Централизованный Logger:** ~476 console вызовов → структурированный logger в 60+ файлах. `createModuleLogger('Name')`, уровни debug/info/warn/error.

---

## Версии v0.20.0 — v0.27.0 (IPFS, P2P, Federation, Social)

### v0.27.0 — IPFS-Only Architecture + IPC Refactoring

**Phase 7: IPFS-Only Architecture:**

- Удалены path поля из схемы (`transcodedPath`, `manifestPath`, etc.)
- Удалён enum `IpfsMigrationStatus` — миграция завершена
- Удалён UI миграции (`IpfsMigrationCard`)
- `media-url.ts` упрощён до работы только с CID
- Транскодирование теперь сразу загружает в IPFS (IPFS-First)

**IPC Handler Factory:**

- `ipc-handler-factory.ts` — устранение boilerplate
- `createHandler()` — автоматическая обработка ошибок
- Миграция всех 37 handler файлов
- Удалено ~4600 строк дублирующегося кода

### v0.26.0 — IPFS-Primary Storage Migration

Полный переход хранилища на IPFS:

- **Phase 1-5:** Schema changes, Migration Service, Player Integration, Export Integration, UI
- Episode model: `transcodedCid`, `manifestCid`, `thumbnailCids`, `screenshotCids`, `ipfsMigrationStatus`
- `IpfsMigrationCard.tsx` — UI для миграции в настройках P2P
- Воспроизведение через gateway, экспорт из гибридных источников

### v0.25.0 — Reputation & Gamification

- **Stats Tracker** — bytesUploaded, bytesDownloaded, seedingTime, peersHelped
- **Reputation System** — score (0-100), ranks (NEWCOMER → LEGEND)
- **Achievement System** — 13 достижений (Bronze → Platinum)
- **Bonus Points** — начисление за раздачу, rewards за достижения
- **UI** — страница `/reputation` с карточками статистики

### v0.21.42 — Federation Phase 2.6 Complete

ActivityPub-based протокол для синхронизации между инстансами:

- WebFinger discovery, RSA-2048 ключи
- Trust levels (5 уровней), блокировка трекеров
- `FederationCard.tsx` — UI в настройках P2P

### v0.21.41 — Remote Pinning (Pinata)

- `PinataService` — интеграция с Pinata API
- IPC handlers для pin/unpin/list/stats
- UI секция в настройках P2P

### v0.21.38-40 — P2P Sharing & IPNS

- **IPNS** — публикация библиотеки, resolve
- **Subscriptions** — подписки на библиотеки других пользователей
- **Scheduler** — автообновление подписок, уведомления
- `P2PSharingCard.tsx` — UI вкладки P2P

### v0.21.34-37 — IPFS Infrastructure

- **Helia Integration** — базовая инфраструктура IPFS
- **Content Operations** — addFile, cat, stat, saveToFile
- **HTTP Gateway** — локальный сервер для доступа к контенту
- **Pinning** — локальное закрепление контента

---

## Версия v0.28.0 — IPFS Web Player ✅

По CID сериала открывается готовый веб-плеер без приложения:

- `web-player/` — standalone плеер (Shaka + SubtitlesOctopus)
- `manifest-generator.ts` — генерация манифеста
- Export Queue — неблокирующая очередь экспорта

---

## Phase 9: OrbitDB — Social Layer ✅

Распределённая P2P база данных для социальных функций:

- **9.1 Watch Progress Sync** — синхронизация между устройствами
- **9.5.A Profile + Friend Code** — профили, генерация кодов
- **9.5.B Friend List** — система друзей и запросов
- **9.5.C Presence System** — онлайн-статусы через GossipSub
- **9.5.D Watch Party** — комнаты совместного просмотра
- **9.5.E Chat + Reactions** — чат и реакции в Watch Party
- **9.5.F Invites + Deep Links** — animatrona:// URL

---

## Версии v0.9.0 — v0.19.x (Core Features)

### v0.12.0 — FTS5 Quick Search

- FTS5 полнотекстовый поиск (SQLite)
- Quick Search UI (Ctrl+K)
- BM25 ранжирование

### v0.10.0 — Энкод через очередь

- Удалён ProcessingStep из ImportWizard
- Детальный прогресс (FPS, speed, размер)
- Сохранение настроек аудио/субтитров между эпизодами

### v0.9.x — Исправления и рефакторинг

- v0.9.9: Восстановление звуковой дорожки, таб "Смотрел"
- v0.9.7: Матчинг эпизодов для формата `- XX [Quality]`
- v0.9.6: React.memo для производительности, LRU кэш
- v0.9.5: Декомпозиция сервисов
- v0.9.0: Рефакторинг архитектуры

---

## Версия 0.8.9 — Импорт из папочного режима плеера

### Цель

Позволить пользователю импортировать сериал в библиотеку прямо из папочного режима плеера без повторного выбора папки.

### Решение

**Кнопка в сайдбаре:**

- Добавлена кнопка «Импорт» в `EpisodeSidebar` рядом с названием папки
- Пропс `onImportToLibrary` для вызова визарда импорта

**Упрощённый визард:**

- Новый пропс `initialData` в `ImportWizardDialog` с полями:
  - `folderPath` — путь к папке
  - `videoFiles` — список файлов
  - `skipFolderSelect` — пропуск первого шага
- При `skipFolderSelect=true` визард начинается с поиска в Shikimori (шаг 2)
- Данные папки и файлов передаются напрямую из `useFolderPlayer`

**Очистка прогресса:**

- Новый компонент `TransferProgressDialog` для предложения очистить localStorage
- После успешного импорта проверяется наличие прогресса в `animatrona-folder-player-progress`
- Если прогресс есть — показывается диалог с кнопками «Оставить» / «Очистить»
- Если прогресса нет — визард закрывается автоматически

**Изменённые файлы:**

```
renderer/src/app/player/
├── page.tsx                           # + ImportWizardDialog интеграция
└── _components/EpisodeSidebar.tsx     # + кнопка «Импорт»

renderer/src/components/import/
├── ImportWizardDialog.tsx             # + initialData пропс
└── TransferProgressDialog.tsx         # NEW: диалог очистки прогресса
```

---

## Версия 0.8.8 — Исправления внешнего аудио

### Проблемы

1. **Видео скакало назад** — при обновлении прогресса просмотра `resumeTime` пересчитывался и VideoPlayer перезагружался на старую позицию
2. **Внешняя аудиодорожка не включалась** — протокол `media://` не поддерживал `.mka` формат

### Исправления

**Скачки видео:**

- `resumeTime` теперь вычисляется только при смене видео через `useState` + `useEffect`
- Используется `prevVideoPathRef` для отслеживания смены файла
- Обновление storage в `useWatchProgress` больше не влияет на `startTime`

**Внешнее аудио:**

- Добавлен MIME-тип для `.mka` файлов (`audio/x-matroska`)
- Переписан `useExternalAudio` с polling для ожидания video элемента
- Стабильный `videoElementRef` вместо useMemo
- Максимум 50 попыток polling (5 секунд)

**Изменённые файлы:**

```
main/protocols/media.protocol.ts   # + .mka MIME type
renderer/src/app/player/
├── page.tsx                       # + initialResumeTime, стабильный videoElementRef
└── _hooks/useExternalAudio.ts     # Переписан с polling
```

---

## Версия 0.8.7 — Встроенные MKV дорожки и внешние аудио

### Цель

Расширить папочный режим плеера поддержкой:

1. Встроенных MKV дорожек (аудио/субтитры из контейнера)
2. Внешних аудиодорожек с синхронизацией

### Решение

**Встроенные дорожки:**

- FFprobe вызывается параллельно при сканировании папки
- Новые типы: `EmbeddedAudioTrack`, `EmbeddedSubtitleTrack`, `EmbeddedTracksInfo`
- Объединённый список в TrackSelector (`embedded:{index}` / `external:{index}`)
- PGS субтитры (bitmap) фильтруются — не поддерживаются

**Внешние аудиодорожки:**

- Новый хук `useExternalAudio` для синхронизации
- Создаётся отдельный `<audio>` элемент
- Видео mute при выборе внешнего аудио
- Синхронизация play/pause/seek/rate/volume событий
- Порог коррекции: 100мс

**Новые файлы:**

```
renderer/src/app/player/
├── types.ts                    # + EmbeddedAudioTrack, EmbeddedSubtitleTrack
├── _hooks/
│   ├── useFolderPlayer.ts     # + FFprobe, embeddedTracks
│   └── useExternalAudio.ts    # NEW: синхронизация внешнего аудио
└── page.tsx                   # + allAudioTracks, allSubtitleTracks, useExternalAudio

components/player/
└── VideoPlayer.tsx            # + getVideoElement()
```

---

## Версия 0.8.6 — Папочный режим плеера

### Цель

Добавить в автономный плеер (левое меню) возможность открывать папки с сериалами и автоматически подхватывать внешние аудио/субтитры — без импорта в библиотеку.

### Решение

Реализован режим «Folder Mode» на странице `/player`:

**Новые файлы:**

```
renderer/src/app/player/
├── types.ts                    # FolderEpisode, ExternalTracksInfo, FolderPlayerState
├── _hooks/
│   ├── useFolderPlayer.ts     # Логика сканирования папок и навигации
│   └── useWatchProgress.ts    # localStorage для сохранения позиции
└── _components/
    └── EpisodeSidebar.tsx     # UI сайдбара с эпизодами и бонусами
```

**Функциональность:**

- Кнопка «Выбрать папку» — открывает диалог выбора папки
- Автоматическое сканирование видеофайлов (mkv, mp4, webm, avi, mov)
- Сортировка эпизодов по номеру (parseEpisodeInfo)
- Определение бонусов (creditless OP/ED, PV, trailers) через паттерны
- Сайдбар 280px с двумя секциями: Эпизоды и Бонусы (collapsible)
- Прогресс-бары для каждого эпизода
- Бейджи OVA/SP/Movie
- Автоподхват внешних дорожек при переключении эпизода
- Сохранение позиции в localStorage (30 дней, debounced 5 сек)
- Автопереход на следующий эпизод по окончании видео

**Переиспользуемый код:**

- `window.electronAPI.fs.scanFolder` — сканирование видеофайлов
- `window.electronAPI.fs.scanExternalAudio` — поиск аудиодорожек
- `window.electronAPI.fs.scanExternalSubtitles` — поиск субтитров с шрифтами
- `parseEpisodeInfo()` — парсинг номера эпизода из имени файла

---

## Версия 0.8.5 — Исправление светлой темы (Часть 2) + Автоопределение фильмов

### Светлая тема

После исправления компонентов (v0.8.4), hardcoded gray цвета остались в **страницах** (`app/` директория).

Исправлено **9 файлов страниц**:

- `app/settings/page.tsx` — ~40 замен
- `app/library/[id]/page.tsx` — ~20 замен
- `app/test-encoding/page.tsx` — ~15 замен
- И другие...

### Автоопределение фильмов

Фильмы (аниме-муви) часто имеют названия файлов без номера эпизода. Добавлена логика:

- Если в папке **ровно 1 видеофайл** без распознанного номера эпизода
- Файл автоматически помечается как фильм (`episodeType: 'movie'`, `episodeNumber: 1`)

---

## Версия 0.8.4 — Исправление светлой темы

### Проблема

Светлая тема отображалась некорректно — многие компоненты использовали hardcoded цвета.

### Решение

Исправлено **42 файла** с заменой цветов на семантические токены:

- `bg="gray.900"` → `bg="bg.panel"`
- `color="gray.400"` → `color="fg.muted"`
- `borderColor="gray.700"` → `borderColor="border.subtle"`

---

## Версия 0.8.2 — Система миграций БД

### Проблема

При автообновлении схема БД может измениться, а `prisma migrate deploy` требует CLI.

### Решение

- **sql.js (WASM)** — SQLite без native модулей
- **PRAGMA user_version** — версионирование схемы
- **getMigrationSQL()** — SQL миграции для каждой версии
- **applyMigrations()** — автоматическое применение при запуске
- **Бэкап перед миграцией** — `app.db.backup.vN`

---

## Версия 0.8.0 — UI/UX улучшения

### Phase 1: Quick Wins

- Empty Library State — состояние пустой библиотеки
- Глобальные Keyboard Shortcuts — хук `useGlobalShortcuts`
- Shortcuts Cheatsheet (Ctrl+/) — модальное окно

### Phase 2: Core UX

- Command Palette (Ctrl+K) — командная палитра
- Quick Actions на карточках — hover меню
- Сортировка библиотеки — по названию, дате, прогрессу
- Playback Speed Control — 0.5x-2x, горячие клавиши

### Phase 3: Advanced

- Welcome Dialog (onboarding)
- Drag & Drop импорт
- Picture-in-Picture
- Video Info Overlay (I)

### Phase 4: Polish

- Page Transitions (Framer Motion)
- Light Theme — выбор темы

---

## Версия 0.7.0 — Полный цикл улучшений

### Баги (HIGH)

- Поиск субтитров/аудио в подпапках — рекурсивный сканер
- Прогресс по фреймам — FPS из probe
- Перегрузка SSD при генерации скриншотов — лимитер

### Просмотр (MEDIUM-HIGH)

- Продолжить с места — overlay 5 секунд
- Сохранение дорожек между эпизодами
- Предпочтения просмотра — 3 режима

### Библиотека (MEDIUM)

- Группировка по франшизам
- Кнопка "Смотреть" на скриншотах
- Редактор названий эпизодов
- Связи при импорте

---

## Версия 0.6.8 — Синхронизация донорских дорожек

### Проблема

При импорте аудио/субтитров с донора видеоряд может быть рассинхронизирован.

### Решение

**Шаг визарда — Sync Calibration:**

- Двойной видеоплеер: оригинал + донор (opacity 0.5)
- Поле ввода смещения в миллисекундах
- Горячие клавиши: ←/→ (±10ms), Shift+←/→ (±100ms)

**Применение смещения:**

- Аудиодорожки — FFmpeg adelay фильтр
- Субтитры — сдвиг таймкодов ASS/SRT

---

## Версия 0.6.2 — Параллельное транскодирование

**GPU:** RTX 5080 Laptop (Dual NVENC Encoders)

### Архитектура

```
ParallelTranscodeManager
├── VideoPool (GPU max=2)
└── AudioPool (CPU max=N)
```

### Результат

- 2x ускорение видео (оба NVENC параллельно)
- Nx ускорение аудио (все CPU ядра)
- GPU + CPU параллельно

---

## Версия 0.6.0 — Экспорт сериала в MKV

- Кнопка "Экспорт в MKV" на странице аниме
- ExportSeriesDialog — 3-шаговый wizard
- Выбор аудиодорожек и субтитров
- 4 паттерна именования файлов
- Встраивание глав, постера и шрифтов

---

## Версии 0.5.x — Библиотека и метаданные

### v0.5.4 — Редактор глав и умный плеер

- UI разметки глав (OP, ED, Recap, Preview)
- Горячие клавиши (O, E, R, P)
- Маркеры глав на прогресс-баре
- Кнопка "Пропустить"

### v0.5.3 — Настройки трея и трейлеры

- Сворачивать/закрывать в трей
- YouTube трейлеры/OP/ED из Shikimori

### v0.5.2 — Скриншоты эпизодов

- Автогенерация 5 скриншотов
- Grid карточки с hover preview
- LightboxViewer

### v0.5.1 — Расширенные метаданные Shikimori

- Студии, режиссёр, персонажи
- Команды озвучки/субтитров
- Внешние ссылки (MAL, AniDB)

---

## Версии 0.3-0.4 — Плеер и база данных

### v0.4 — База данных

- SQLite + Prisma
- Модели Anime, Episode, Genre
- UI библиотеки (/library)
- Форма добавления аниме

### v0.3 — UX и polish

- Splash screen
- Иконка приложения
- Системный трей
- Автообновления

---

## Версии 0.1-0.2 — Базовая структура

### v0.2 — Транскодирование

- Wizard импорта
- Демультиплексирование
- Транскодирование аудио/видео
- Настройки кодеков

### v0.1 — Структура

- Electron + Next.js
- FFmpeg интеграция
- IPC каналы
- Chakra UI

---

**Последнее обновление:** 2026-06-19 (v0.52.2)

---

## v0.52.2 — pinner4 (s3) в Bootstrap и Peering.Peers (2026-06-19)

- **PINNER4:** добавлены константы `PINNER4_PEER_ID` + `PINNER4_ADDR` в `kubo-config.ts`; pinner4 вошёл в Bootstrap[] и Peering.Peers[] Kubo
- **peer-sync-types.ts:** pinner4 добавлен в `KNOWN_PINNER_PEER_IDS`
- **peer-sync-service.ts:** pinner4 добавлен в `buildHardcodedFallback()` — s3 теперь hardcoded fallback пир
- **Мотивация:** s3 (новый сервер IPFS gateway/pinner) вступил в строй, нужно добавить его в swarm animatrona

---
