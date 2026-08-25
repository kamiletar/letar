# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

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

## [0.55.18] - 2026-08-09

### Changed

- **Electron 42.8.1 → 43.3.0** — вместе с этим animatrona получила собственный точный пин
  `electron` в `devDependencies` вместо неявного наследования версии из корневого
  `package.json` (как у остальных Electron-приложений монорепо). Обновлены `electron-builder.yml`
  (`electronVersion`) и ABI-версия в `@electron/rebuild` для `classic-level` (была застрявшая
  `41.0.0`, хотя root уже был на 42.8.1 — рассинхрон существовал ещё до этого апдейта).

## [0.55.16] - 2026-07-29

### Fixed

- **Infinite scroll в библиотеке подгружал следующую страницу слишком поздно/ненадёжно** —
  пользователь сообщил, что дальше первой страницы список не грузится. Старый триггер в
  `AnimeGrid.tsx` был завязан на индекс последней виртуализированной строки
  (`rowVirtualizer.getVirtualItems()`) с overscan 3 — срабатывал только когда пользователь
  долистывал практически до самого конца уже загруженных 60 записей, и зависел от деталей
  поведения `useWindowVirtualizer`, которые не проверялись вживую (Electron-десктоп, нет
  browser-превью). Заменено на стандартный паттерн: sentinel-элемент сразу под сеткой +
  `IntersectionObserver` с `rootMargin: '800px'` — подгрузка начинается заранее, до фактического
  появления сентинела в вьюпорте, не зависит от внутренностей виртуализатора.

## [0.55.15] - 2026-07-29

### Fixed

- **Сетка библиотеки рисовала один растянутый на всю ширину постер в строке** —
  `useVirtualizedGrid` (`renderer/src/lib/hooks/use-virtualized-grid.ts`) подключал
  `ResizeObserver` через `useLayoutEffect(() => {...containerRef.current...}, [])` с пустыми
  зависимостями. `AnimeGrid`/`FranchiseView` при `isLoading === true` рендерят скелетон —
  совсем другое дерево без элемента с `ref={containerRef}`. Эффект срабатывал один раз на этом
  первом рендере, когда `containerRef.current` был `null`, наблюдатель не создавался — и больше
  никогда не пересоздавался, когда данные подгружались и реальный контейнер наконец монтировался.
  `containerWidth` навсегда оставался `0` → `columns = 1` → CSS grid `repeat(1, 1fr)`. Исправлено
  переводом на callback-ref (`useState<HTMLDivElement | null>` + `useCallback`) — он вызывается
  заново при каждом реальном монтировании DOM-узла, а не один раз при первом рендере компонента.

- **Папочный режим плеера не запускал следующую серию по окончании текущей** — `VideoPlayer.tsx`
  вызывал `video.play()` для автовоспроизведения только в эффекте с зависимостями
  `[globalVideoElement, autoPlay, setDuration]`. `globalVideoElement` — персистентный video-элемент
  из `GlobalVideoProvider`, создаётся один раз на весь жизненный цикл приложения и никогда не
  меняется, поэтому эффект реально срабатывал только один раз при первом монтировании компонента.
  На `/watch` это маскировалось: переход к следующей серии там — навигация на другой route
  (`/watch/[episodeId]`), которая полностью ремонтит `VideoPlayer`, случайно ретриггеря автоплей.
  В папочном режиме (`/player`) переход между сериями — это смена state (`goNext()`) на ТОЙ ЖЕ
  смонтированной странице, без ремаунта `VideoPlayer` — эффект не перезапускался, следующая серия
  молча грузилась и оставалась на паузе. Исправлено: подписка на `loadeddata` персистентного
  video-элемента вынесена в отдельный эффект с теми же стабильными deps `[globalVideoElement]`,
  но слушатель `addEventListener` (без `{once: true}`) остаётся навешанным на весь жизненный цикл
  и корректно срабатывает на каждую последующую смену `src`, а не только на первую.

### Changed

- **Infinite scroll для библиотеки (режим «По отдельности»)** — `use-library-page.ts` вместо
  одного `findMany` без пагинации, тянущего сразу все 300+ тайтлов, использует новый
  `useInfiniteFindManyAnime` (постраничная подгрузка по 60 штук, `hooks-factory.ts`
  `createInfiniteFindManyHook` поверх `useInfiniteQuery`). `AnimeGrid` дозапрашивает следующую
  страницу через существующий `useWindowVirtualizer`, когда виртуализатор приближается к концу
  уже загруженных строк. Режим «По франшизам» **сознательно оставлен на полном `findMany`** —
  группировка по connected components (`groupAnimeByFranchise`) требует всего набора сразу,
  курсорная пагинация без редизайна группировки будет ломать франшизы (см. PLAN.md). Полный
  запрос также используется в режиме «По отдельности», если активен режим множественного выбора
  (чтобы «Выбрать всё» реально выбирало всё) или открыт диалог пакетной публикации на трекер
  (публикует весь отфильтрованный набор, не только подгруженную часть). Добавлен `countAnime`-хук
  (`useCountAnime`) для счётчика «N тайтлов в коллекции» и мобильного счётчика фильтров — с
  пагинацией `animes.length` перестал отражать реальное количество под фильтром.
  Верифицировано `nx typecheck:tsgo animatrona`, `nx lint animatrona`, `nx build:win animatrona`.

### Fixed

- **Папочный режим плеера приписывал субтитры/аудио чужих серий текущему эпизоду** —
  `scanTracksForEpisodeInternal` (`useFolderPlayer.ts`) передавала в
  `scanExternalSubtitles`/`scanExternalAudio` (main-процесс) массив `videoFiles` только с ОДНИМ
  текущим видео. `fuzzyMatchToVideo` (`external-subtitle-scanner.ts`) при `videoFiles.length === 1`
  считает это фильмом и матчит на него **вообще все** найденные в папке субтитры/аудио — включая
  файлы, реально относящиеся к другим сериям. Итог: в меню субтитров эпизода 17 показывались
  дорожки от всех 25 серий сериала (дубли одинаковых строк «Неопределённый — <имя папки>» и
  «Русский — <имя папки субтитров>»). Фикс — передавать полный список видео папки
  (`[...episodes, ...bonusVideos]`), чтобы matcher видел все файлы и матчил по номеру эпизода;
  существующий фильтр `t.episodeNumber === episodeNum` ниже по коду теперь реально работает.
  Верифицировано `nx typecheck:tsgo animatrona`, `nx lint animatrona`.

## [0.55.13] - 2026-07-29

### Changed

- **Lazy load для второстепенных изображений в library-компонентах** (продолжение аудита
  производительности) — `AnimeCard` (главная сетка каталога) уже использовал `next/image` с
  встроенным lazy-loading; добавлены `loading="lazy"` + `decoding="async"` к оставшимся местам,
  использующим обычный Chakra `Image` (`<img>` без lazy по умолчанию): постеры в
  `RelatedAnimeRow.tsx`, `FranchiseTimeline.tsx` (timeline франшизы), превью в `EpisodeCard.tsx` и
  `VideoSection.tsx`, аватары студий/персонала/персонажей в `AnimeMetadataSection.tsx` — все эти
  списки не виртуализированы (в отличие от главной сетки) и могут содержать десятки
  внеэкранных элементов на странице деталей аниме.

### Fixed

- **`/player` (папочный/single-file режим) не воспроизводил видео — бесконечный спиннер** —
  регрессия после перехода на `GlobalVideoProvider` (persistent video element на уровне layout).
  `<VideoPlayer src={currentVideoPath}>` использовал `src` только для инфо-оверлея
  (`VideoPlayer.tsx` `videoInfo.filePath`), а фактическую загрузку в persistent video-элемент
  запускает только `store.initVideo()`, вызываемый исключительно из `useGlobalVideo` на странице
  `/watch` (DB-эпизоды с `episodeId`/`animeId`). У `/player` такого вызова не было — video-элемент
  никогда не получал src, `isLoading` в `VideoPlayer` не снимался (ждёт `loadeddata`), в Network
  не было ни одного запроса к файлу. Добавлено облегчённое действие `loadRawSrc(src, startTime?)`
  в `global-video-store.ts` — грузит src напрямую, без обязательных библиотечных полей
  `PlaybackMetadata` (episodeId/animeId/animeName/returnPath), которые для локального файла вне
  библиотеки взять неоткуда. `/player/page.tsx` вызывает его при смене `currentVideoPath` и сбрасывает
  (`loadRawSrc(null)`) при уходе со страницы — иначе локальный файл продолжил бы «играть» в
  отсоединённом от UI video-элементе. Верифицировано `nx typecheck:tsgo animatrona`,
  `nx lint animatrona` (оба файла чисты), `nx build:win animatrona`.

## [0.55.12] - 2026-07-29

### Changed

- **Продолжение useEffect-аудита (после v0.55.10): `useGlobalShortcuts` больше не пересоздаёт
  `window`-листенер `keydown` на каждый рендер `AppShell`** — `handleKeyDown` зависел от объекта
  `callbacks`, а `AppShell` (always-mounted layout) передавал в `useGlobalShortcuts` инлайн-объект
  с новыми стрелочными функциями на каждый рендер (навигация, `isShortcutsOpen`/`isQuickSearchOpen`).
  Каждый такой рендер дёргал `removeEventListener`/`addEventListener` на `window`. Колбэки теперь
  читаются через `callbacksRef` (latest-ref паттерн), `handleKeyDown` зависит только от `router` —
  подписка на `keydown` создаётся один раз на весь жизненный цикл приложения. Точечная проверка
  `TitleBar.tsx`, `PageTransition.tsx`, `GlobalVideoProvider.tsx` (следующие кандидаты из плана) —
  уже в порядке: mount-once эффекты с пустыми deps либо throttled (video timeupdate — 250ms),
  доработки не требуют. Верифицировано `nx typecheck:tsgo animatrona` + `nx lint animatrona`
  (файл чист).

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

---

Продолжение в [CHANGELOG_2026_07_28.md](./CHANGELOG_2026_07_28.md) (версии 0.35.0 — 0.52.3)

**Архивы:**

- [CHANGELOG_2026_03_14.md](./CHANGELOG_2026_03_14.md) — v0.28.0 — v0.34.0
- [CHANGELOG_2026_01_26.md](./CHANGELOG_2026_01_26.md) — v0.20.0 — v0.27.2
- [CHANGELOG-v0.md](./CHANGELOG-v0.md) — v0.1.0 — v0.19.x
