# Animatrona — Выполненные задачи (Часть 8)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: 2026-09-07 (перенос из PLAN.md при архивации).

## Animatrona — перенос из PLAN.md (2026-09-07)

> Блоки ниже перенесены из активного `PLAN.md` при архивации 2026-09-07 — все полностью
> закрыты (`[x]`), без открытых подпунктов.

- [x] Почистить оставшиеся `as="button"`/`as="span"` (Box/Text/Heading) на Chakra-компонентах в
      `apps/animatrona` — 27 файлов (`renderer/src` + `mobile-ui/src`), ~46 узлов, `asChild` +
      нативный тег по рецепту [chakra-icon-as-prop-cleanup-pattern.md § 7](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md)
      (2026-09-06). Полная проверка грепом по этим двум деревьям — 0 срабатываний. Остались
      непочищенные `Box as={Component}` (иконки, не строки) вне этого списка —
      `CommandPalette.tsx`/`EncodingStatusCard.tsx`/`EmptyLibraryState.tsx`/`QuickSearch.tsx`/
      `UpdateNotificationToast.tsx` — тот же класс правила, отдельная задача ниже.

- [x] Почистить `Box as={Component}`/`Icon as={Component}` (иконка через компонент, не строка) в
      `CommandPalette.tsx`/`EncodingStatusCard.tsx`/`EmptyLibraryState.tsx`/`QuickSearch.tsx`/
      `UpdateNotificationToast.tsx` (2026-09-06) — по пунктам 1-3
      [chakra-icon-as-prop-cleanup-pattern.md](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md).
      Статические/тернарные/динамические (`cmd.icon`) случаи — переменная `PascalCase` +
      прямой рендер react-icons-компонента, цвет — CSS-переменная `var(--chakra-colors-*)`.
      Полная проверка `grep -rn 'as={[A-Za-z]' renderer/src mobile-ui/src` по всему приложению —
      0 срабатываний. format/lint/typecheck зелёные.

- [x] **Аудит `_active: scale()` в теме renderer'а на `pressScale`** (`@letar/ui`, 2026-09-06) —
      задача описана в [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md).
      Найдено 4 места: `recipes/button.ts` (base + все 5 size-вариантов → `pressScale.md/xs/sm/
      md/lg/xl` по образцу уже аудированного `driving-school`), `recipes/link.ts` (нет своего
      размера → дефолтный `pressScale.md`), `slotRecipes/menu.ts` (`item` варианта `subtle` →
      `pressScale.lg`, числовое совпадение со старым `scale(0.98)`). Пятое место —
      `slotRecipes/checkbox.ts` (`control`, `scale(0.9)`) — исключение №1 из JSDoc `pressScale`
      (control мельче нижнего шага шкалы `2xs`=0.94), оставлено как есть с комментарием, не
      переведено. mobile-ui своей темы не имеет — второго места для аудита нет.
      lint/typecheck:tsgo animatrona — зелёные (0 ошибок, только преэкзистентные warnings).
      Визуально не проверялось — GUI Electron-приложения не тестируется в этой песочнице
      (см. `.claude/rules/electron.md`), правки — только числовые значения `transform` без
      изменения структуры JSX.

- [x] **AniList как источник английского описания (`descriptionEn`) в AnimeInfo/directoryCid**
      (план от 2026-08-08, реализовано 2026-09-06) — идея: раз в раздаче уже бывают английские
      аудиодорожки и субтитры, логично класть в `directoryCid` и английское описание — манифест
      должен быть самодостаточен для любого зрителя, не только русскоязычного.

  **Уточнение по ходу обсуждения:** у Shikimori GraphQL (`ShikimoriAnimeDetails`/`Extended` в
  [types.ts](main/services/shikimori/types.ts)) есть только одно поле `description`/
  `descriptionHtml` — оно уже переводное (русское или смешанное), отдельного английского
  synopsis там нет. `english`-поле у Shikimori — это только название, не описание. Источник
  реального английского synopsis — **AniList** (`Media.description`, англоязычный по своей
  природе, не перевод).

  **Матчинг с AniList — уже готов, ничего чинить не нужно.** Обсуждали переход с `shikimoriId`
  на `malId` как более «каноничный» ключ — решили **не переезжать**: `shikimoriId` зашит по всей
  архитектуре как первичный ключ (`Anime.shikimoriId @unique`, `AnimeRelation.targetShikimoriId`,
  `Genre/Theme.shikimoriId`, стабильный ключ графа франшизы, throttle/матчинг с Rutracker), а
  Shikimori — функциональный источник данных первого порядка (русские переводы — основная
  аудитория Rutracker русскоязычная; граф связей/франшиз; роли персонажей/стаффа через REST),
  чего у официального MAL API нет и не будет без отдельной OAuth-регистрации приложения.
  Вместо переезда — `extractExternalIds()` в
  [shikimori-mapper.ts:217-260](main/services/shikimori-mapper.ts) уже вытаскивает из внешних
  ссылок самого Shikimori **настоящие** `AnimeManifestExternalIds.mal` и `.anilist` (парсит
  `myanimelist.net/anime/{id}` и `anilist.co/anime/{id}` из `shikimoriData.externalLinks`, не
  предполагая равенство ID). Это уже точный мост к AniList — искать по `id: externalIds.anilist`
  когда есть прямая ссылка, иначе фоллбэк на `idMal: externalIds.mal`.

  **План реализации:**
  1. `libs/animatrona-types/src/anime-info.ts` — добавить `AnimeInfo.descriptionEn?: string`
     рядом с существующим `description` (секция «Описание»).
  2. Новый `main/services/anilist/` (по образцу `main/services/shikimori/`, но сильно проще —
     один REST/GraphQL-эндпоинт `https://graphql.anilist.co`, один запрос):
     - `types.ts` — `AniListMedia { id, idMal, description }`.
     - `client.ts` — `getAniListDescription({ anilistId?, malId? })`, GraphQL-запрос
       `Media(id: $id, idMal: $idMal, type: ANIME) { id idMal description(asHtml: false) }`,
       глобальный `fetch` (не `net.fetch` — та же причина TUN-VPN/TLS-отпечатка, что и у
       Shikimori, см. комментарий у `GRAPHQL_ENDPOINTS` в
       [shikimori/client.ts:47-61](main/services/shikimori/client.ts)), простой inline-throttle
       (AniList degraded rate limit ~30 req/min → минимум 2.1с между запросами, без отдельного
       `throttle.ts` — потребитель один, в отличие от Shikimori с тремя разными клиентами).
       In-memory кэш как у `getAnimeExtended` (TTL, не персистентный).
     - Ошибки — non-fatal (`try/catch` + `log.warn`), как источник Shikimori REST в
       `anime-info-generator.ts` — отсутствие AniList-данных не должно ронять генерацию
       AnimeInfo целиком.
  3. Вызов — **внутри `buildAnimeInfo()`** в
     [anime-info-generator.ts:32-121](main/services/anime-info-generator.ts), не в двух местах
     вызова (`generateAnimeInfo()` и `anime-manifest-generator.ts:299`) по отдельности —
     `buildAnimeInfo` уже получает готовый `externalIds` в параметрах, значит там единственная
     точка, где нужно дёрнуть AniList и положить `descriptionEn` в результат.
  4. `AnimeManifestExternalIds.anilist` (уже существует в
     [anime-manifest.ts:69](../../libs/animatrona-types/src/anime-manifest.ts)) — заодно
     заполнять из ответа AniList `id`, если Shikimori своей ссылки на AniList не дал, а AniList
     нашёлся по `idMal` (обратное обогащение).

  **Не путать с §14 (мультиязычность UI, ru+en через i18next)** — это отдельная, гораздо более
  крупная задача (перевод всего интерфейса Animatrona и Animatrona Player). Текущая идея —
  только про данные в манифесте, полностью независима и на порядок дешевле.

  **⚠️ Приземлить ДО массового перезалива (см. пункт ниже).** Перезаливка всей библиотеки —
  дорогой проход (ffmpeg/IPFS на каждое аниме). Если `descriptionEn` появится после — второй
  такой же дорогой проход только ради одного поля. Делать одним заходом.

  **Реализация (2026-09-06) — план выполнен буквально по всем 4 пунктам:**
  1. `AnimeInfo.descriptionEn?: string` добавлено в
     [anime-info.ts:87](../../libs/animatrona-types/src/anime-info.ts), сразу после
     `description`. Библиотека подключена в `animatrona` «смешанной моделью» (прямой glob
     `include` + `paths` на `src/index.ts`) — пересборка `dist/` не нужна, поле видно сразу.
  2. Создан `main/services/anilist/` — `types.ts` (`AniListMedia`, `GetAniListDescriptionParams`,
     `AniListMediaResponse`), `client.ts` (`getAniListDescription`, `clearAniListCache`),
     `index.ts`. Проще Shikimori-клиента, как и планировалось: один эндпоинт
     `https://graphql.anilist.co`, глобальный `fetch`, inline-throttle 2.1с
     (`MIN_REQUEST_INTERVAL_MS`) прямо в `client.ts` без отдельного `throttle.ts`, in-memory
     TTL-кэш (5 минут).
  3. Вызов — внутри `buildAnimeInfo()` в
     [anime-info-generator.ts:69-87](main/services/anime-info-generator.ts), единственная точка
     как и планировалось (используется и `generateAnimeInfo()`, и `anime-manifest-generator.ts`).
     Условие вызова — `externalIds.anilist || externalIds.mal` (хотя бы один идентификатор),
     ошибки — `try/catch` + `log.warn`, не роняют генерацию `AnimeInfo`.
  4. Обратное обогащение `externalIds.anilist` из ответа AniList (`media.id`) реализовано —
     мутирует объект `externalIds`, переданный по ссылке из `generateAnimeInfo()`.
  5. Тесты — `main/services/anilist/__tests__/client.spec.ts` (8 тестов): пустые параметры,
     запрос по `id`/`idMal`, попадание в кэш, `clearAniListCache()`, `Media: null`, HTTP-ошибка
     и GraphQL `errors` (обе — non-fatal на уровне клиента, перехватываются вызывающим кодом).
     Мокался глобальный `fetch` через `vi.stubGlobal` — прецедента такого мокинга в
     `main/services/` до этого не было, паттерн заведён этой задачей.
  6. `nx test/lint/typecheck:tsgo animatrona` — все зелёные (175/175 тестов, 0 ошибок lint,
     только преэкзистентные 40 warnings).

- [x] **Папочный режим плеера: постер по имени папки, если Shikimori опознаётся однозначно**
      (2026-09-07) — папочный режим (быстрое открытие папки без импорта, `app/player/`) полностью
      локален и не показывал вообще ничего похожего на постер. Реализовано через уже
      существующий парсинг `parseFolderName`/`generateSearchQueries` (тот же, что автозаполняет
      поиск в мастере импорта) — новый хук `useFolderShikimoriMatch`
      ([useFolderShikimoriMatch.ts](renderer/src/app/player/_hooks/useFolderShikimoriMatch.ts))
      ищет по Shikimori и подставляет постер в `EpisodeSidebar`, только если ровно один результат
      точно совпал по названию (`findConfidentAnimeMatch`,
      [folder-match.ts](renderer/src/lib/shikimori/folder-match.ts)) — при неоднозначности или
      недоступности Shikimori (нет сети, VPN) молча остаётся без постера, воспроизведение не
      блокируется. `EpisodeSidebar` (`@letar/folder-player-react`, используется и другими
      Animatrona-приложениями) получил новый опциональный проп `posterUrl`. Заодно вынесен общий
      `getShikimoriPosterUrl()` ([poster-url.ts](renderer/src/lib/shikimori/poster-url.ts)) —
      раньше был приватной функцией внутри `ShikimoriAnimeCard.tsx`, теперь общий с новым хуком.
      typecheck:tsgo/lint/test (179/179) — зелёные.

- [x] **Плеер: фуллскрин по двойному клику и Alt+Enter** (план от 2026-07-30, закрыто 2026-09-06) —
      двойной клик по видео уже переключал fullscreen (`handleVideoClick`/`handleVideoDoubleClick`
      в [VideoPlayer.tsx](renderer/src/components/player/VideoPlayer.tsx), реализовано раньше без
      отметки в плане). Не хватало только `Alt+Enter` — добавлен в общий
      `useKeyboardShortcuts` (`@letar/video-player-react`), поэтому работает сразу и в
      `renderer`, и в `mobile-ui` (оба используют хук напрямую). `animatrona-tracker` держит свой
      локальный `use-keyboard-shortcuts.ts` — не паритетен, вне скоупа этой задачи. Тесты
      (222/222, +2 новых на Alt+Enter), lint, typecheck:tsgo библиотеки — зелёные.

- [x] **Покадровая перемотка на паузе** (2026-09-06) — кнопки в контролах (видны только на
      паузе, иконки `LuStepBack`/`LuStepForward`) + горячие клавиши `,`/`.` (и `б`/`ю` для
      русской раскладки), шаг ±5 кадров (`FRAME_STEP_COUNT`). Формулировка задачи ссылалась на
      ExoPlayer/`SeekParameters.EXACT` — это Android API, неприменимо: этот плеер работает на
      Chromium+Shaka Player внутри Electron, не на Android. Реальный источник fps — сама Shaka
      Player: `player.getVariantTracks().find(t => t.active)?.frameRate` (метод самого шейка,
      не video-элемента) — точнее, чем ffmpeg-probe на этапе импорта (тот же файл может быть
      транскодирован в другой fps) и не требует изменения схемы БД/IPFS-манифеста. Фолбэк 24fps,
      если дорожка не сообщает `frameRate` (не все манифесты его содержат). Player-инстанс не был
      доступен вне `GlobalVideoProvider.tsx` — добавлено поле `shakaPlayer` в
      `global-video-store.ts` (тот же паттерн, что уже был у `videoElement`/`audioElement`).
      Новый параметр `stepFrame` — в общем `useKeyboardShortcuts` (`libs/video-player-react`,
      тесты 225/225, +3 новых), поэтому `mobile-ui` от него автоматически ничего не сломает
      (опциональный колбэк). `animatrona-tracker` — свой локальный
      `use-keyboard-shortcuts.ts`, не паритетен, вне скоупа задачи (см. пометку выше по
      Alt+Enter). Если видео играло — шаг сначала ставит на паузу. Новый файл
      `frame-step-utils.ts` рядом с `chapter-utils.ts` (та же плоская структура каталога
      `components/player/`). lint/typecheck:tsgo animatrona — зелёные (0 ошибок, только
      преэкзистентные warnings).

- [x] **Автоопределение и обрезка чёрных полос при импорте** — сейчас крадущий эти полосы кроп
      есть только как идея на стороне плеера (§18.4, «Кроп чёрных полос / зум», просмотр без
      изменения файла). Отдельная задача: **на этапе транскода** сам импорт прогоняет
      `ffmpeg cropdetect` по нескольким сэмплам видео (не по одному кадру — открывающая заставка
      может быть чёрной без полос) и, если нашёл устойчивую рамку, применяет `crop=` в фильтр-графе
      транскода — тогда обрезанные полосы не занимают место в готовом файле и не нужны на каждое
      воспроизведение.
      **2026-09-06: реализовано целиком, включая живой пайплайн и предпоказ.** Детекция —
      `main/ffmpeg/cropdetect.ts` (`detectCropFilter`, покрыт unit-тестами, 8/8 зелёных). IPC
      `ffmpeg:detectCrop` — только детекция, ничего не применяет
      (`ipc/ffmpeg.handlers.ts`+`preload/ffmpeg.preload.ts`). Реальный batch-импорт **не**
      использует `transcode.ts`/`EncoderStrategy` — у него отдельный, независимый билдер
      FFmpeg-аргументов в `services/pools/video-pool.ts` (`buildFFmpegArgs`); туда и добавлен
      `options.cropFilter`, первым в цепочке `-vf` (до деинтерлейса/денойза/Anime4K). Поле
      `VideoTranscodeOptions.cropFilter` (`shared/types.ts`) течёт по уже существующему пути
      конфигурации кодирования: `PreviewStep` → `ImportQueueFileAnalysis.cropFilter`
      (`shared/types/import-queue.ts`, подтверждённый пользователем кроп по номеру эпизода) →
      `episode-file-processor.ts` (`buildVideoOptions` + lookup по `fileAnalysis`) →
      `BatchImportItem.video.options` → `VideoPoolTask.options` → `video-pool.ts`. Тот же
      pipeline пишет `cropFilter` в `ManifestEncodingInfo` через `post-process-runner.ts`
      (`updateManifestEncoding`). Предпоказ и подтверждение — `FileCard.tsx`: чекбокс
      «Обрезать чёрные полосы» рядом с видео-инфо карточки эпизода, показывается только если
      `cropdetect` нашёл устойчивую рамку, по умолчанию **выключен** — обрезка не применяется,
      пока пользователь явно не подтвердит для конкретного эпизода. `main/ffmpeg/transcode.ts`
      (`transcodeVideoWithProfile`/`EncoderStrategy.buildVideoFilterChain`) — параллельный путь
      транскода вне batch-импорта (используется где-то ещё, не в основном пайплайне), тоже умеет
      принимать `cropFilter`, но живым импортом не вызывается — оставлено для единообразия API.
      lint/typecheck:tsgo/test (167/167) animatrona — зелёные.
  - [x] Сэмплировать несколько точек по таймлайну (не только первый кадр), взять пересечение/моду
        найденных рамок — устойчиво к чёрным заставкам, эффектам и переходам, которые не являются
        реальным леттербоксом. `buildSamplePoints` (5 точек, 10%–90% таймлайна) + `pickModeRect`
        (мода по частоте) в `cropdetect.ts`.
  - [x] Порог срабатывания и минимальный отступ (не обрезать при небольших/шумных полосах —
        ложное срабатывание хуже отсутствия кропа). `MIN_CONSENSUS_RATIO=0.5` (доля согласных
        сэмплов) + `MIN_CROP_RATIO=0.02` (минимальная обрезка хотя бы по одному измерению).
  - [x] **Необратимость:** как и 10-bit→8-bit решение в §21.4, обрезка при транскоде — решение
        «один раз», исходный кадр после этого не восстановить. Чекбокс в `FileCard.tsx`
        (по умолчанию выключен, показывает найденную рамку и «было WxH») — пользователь видит
        и подтверждает каждый эпизод отдельно перед стартом импорта, тихого применения нет.
  - [x] Подключить `detectCropFilter` к живому пайплайну импорта — детекция запускается в
        `use-preview-analysis.ts` сразу после probe каждого файла в PreviewStep; подтверждённое
        значение доезжает до `video-pool.ts` описанным выше путём через
        `ImportQueueFileAnalysis.cropFilter`.
  - [x] Записать применённый `crop=` в `ManifestEncodingInfo`/`ffmpegCommand` — как и остальные
        параметры профиля (§21.4), чтобы было видно, что и почему обрезано, а не гадать по факту.
        `post-process-runner.ts` пишет `videoOptions.cropFilter` в манифест вместе с остальными
        полями кодирования.
  - [x] Разграничить с существующей плеерской идеей (§18.4): плеерский кроп/зум остаётся полезен
        для контента, где авто-детект не сработал или обрезка нежелательна (например источник без
        реальных полос, но с логотипом каналом внизу) — это не замена, а два независимых слоя.
        Уточнено в §18.4: плеерский зум — обратимая настройка просмотра, автообрезка при
        импорте — необратимое решение при транскоде; код не конфликтует.

## Дедуп `getShakaFrameRate`/`FRAME_STEP_COUNT` (2026-09-08)

- Найден при аудите после сведения того же класса дубля в `animatrona-tracker`
  (`use-keyboard-shortcuts.ts`). Локальный `frame-step-utils.ts` дословно повторялся в
  `use-shaka-player.ts` трекера, только без `try/catch` на случай неготового плеера. Вынесено в
  `@letar/video-player-core` (реэкспорт из `@letar/video-player-react`, 6 новых тестов), оба
  приложения переведены на общий импорт, локальный файл `animatrona` удалён. Детали —
  `CHANGELOG.md` v0.55.64.
  Осталось документально развести в UI/доках плеера — код обеих фич не конфликтует.
