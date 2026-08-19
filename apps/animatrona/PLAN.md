# Animatrona — План развития

## Текущая версия: 0.55.18

## Черновик (новые идеи)

- [ ] **⚠️ Локальный пин `electron: 43.3.0` расходится с корневым `^43.4.0`** (аудит
      2026-08-20) — привести к корневой версии. `bun.lock` подтверждает физический дубль:
      резолвится и `electron@43.4.0` (корень), и `electron@43.3.0` (этот пакет, вместе с
      `kami-key-the`, `label-printer-desktop`, `poster-microtext-desktop`). Версия `43.3.0`
      также захардкожена в `postinstall`/`postinstall:dev` (`@electron/rebuild -v 43.3.0`
      для native-модуля `classic-level`) — при бампе обновить и её, иначе rebuild
      пересоберёт модуль под версию electron, которая фактически не установится.

- [ ] **Аудит `_active: scale()` в теме renderer'а на `pressScale`** (`@letar/ui`) — задача
      описана в [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md).

- [ ] **AniList как источник английского описания (`descriptionEn`) в AnimeInfo/directoryCid**
      (план от 2026-08-08) — идея: раз в раздаче уже бывают английские аудиодорожки и субтитры,
      логично класть в `directoryCid` и английское описание — манифест должен быть
      самодостаточен для любого зрителя, не только русскоязычного.

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

- [ ] **Аудит содержимого `directoryCid` перед массовым перезаливом библиотеки** (план от
      2026-08-08) — вся текущая библиотека помечена `needsReupload` (v0.52.2, раздача через
      утраченный pinner-сервер), и на неё предстоит настоящий массовый реимпорт/republish.
      Это дорого и по времени, и по нагрузке на Shikimori/AniList/IPFS — вернуться и доклеить
      забытое поле для каждого аниме второй раз **не должно случиться**. Прошёлся по каждому
      `*Cid`-полю в `schema.zmodel` и сверил с тем, что реально попадает в
      [anime-directory-builder.ts](main/services/ipfs/anime-directory-builder.ts).

  **Подтверждено — всё уже кладётся корректно:**
  - `Anime.posterCid`/`poster.cid` → `poster.webp` (строки 285-292)
  - `Anime.animeInfoCid` → `meta/info.json` (300-301)
  - Под-документы `AnimeManifest` (`episodesCid`/`franchiseGraphCid`/`relationsCid`/
    `episodePreviewsCid`) → `meta/*.json`, с probe и пропуском мёртвых (304-320)
  - `Anime.sourceTorrentCid` → `source/source.torrent` + `source.json` (328-351)
  - `ShikimoriStudio/Person/Character.imageCid` → `images/{studios,persons,characters}/`, с
    восстановлением через повторную загрузку с Shikimori (353-370)
  - `Episode.transcodedCid` → `video.webm` — обязателен, отсутствие = жёсткий пропуск эпизода +
    запись в `missingCids` (не молча, см. фикс v0.52.3)
  - `AudioTrack.transcodedCid`, `SubtitleTrack.fileCid`, `SubtitleFont.fileCid` → `audio/`,
    `subs/`, `fonts/` — все потери фиксируются в `missingCids`/`missingFonts` после фикса
    v0.52.3 (раньше терялись молча из-за SQL-фильтра)
  - Под-документы эпизода (`encodingCid`/`chaptersCid`/`thumbnailsCid`/`metadataCid`) +
    `Episode.spriteCid`/`vttCid` → `meta/` и `thumbnails/` эпизода, с регенерацией из
    `video.webm` при потере
  - `Episode.screenshotCids`/`thumbnailCids` (JSON-массивы) → `screenshots/`,
    `thumbnails-img/`, тоже с регенерацией из видео

  **Проверено — НЕ пропуски, намеренно не участвуют в `directoryCid`** (чтобы не перепроверять
  это заново в следующий раз):
  - `Anime.trackerPublishedCid` — снимок `directoryCid` на момент последней публикации на
    трекер, для сравнения «изменилось / не изменилось»; не контент, а бухгалтерия
  - `DiscoverWatchProgress.posterCid`/`.directoryCid` — денормализованный кэш для истории
    просмотра из каталога; читает `directoryCid`, не производит его
  - `Subscription.lastKnownCid` — CID библиотеки **чужого** пира (P2P-подписки), не наш контент
  - `TorrentDownload.torrentFileCid` — запись очереди скачивания; в `directoryCid` попадает
    `Anime.sourceTorrentCid` (уже учтён выше), а не это поле

  **⚠️ Новая находка, не пропажа контента — а его незаметное устаревание:**
  `Franchise.graphCid` никогда не обновляется автоматически. Комментарий у
  `Franchise.graphUpdatedAt` в `schema.zmodel` обещает «для автообновления раз в неделю», но
  по факту `graphUpdatedAt` во всём `main/` только **записывается** — в
  [anime-manifest-generator.ts:418](main/services/anime-manifest-generator.ts) и
  [anime-importer.ts:444](main/services/anime-importer.ts) — и нигде не **читается** для
  принятия решения «пора перезапросить». Ветка кеша в
  [anime-manifest-generator.ts:377-380](main/services/anime-manifest-generator.ts) при наличии
  `franchise.graphCid` использует его как есть, без проверки возраста. Итог: граф франшизы
  запрашивается у Shikimori ровно один раз — когда в библиотеку попадает первое аниме этой
  франшизы — и дальше переиспользуется бессрочно. Если у франшизы с тех пор вышел новый
  сиквел/фильм/OVA — `relations`/`franchise-graph.json`, который перезаливка вморозит в новый
  `directoryCid`, будет устаревшим для **всех** аниме этой франшизы, не только для одного.
  Раз перезаливка и так трогает каждое аниме — дешёвый момент заодно форсировать обновление:
  сделать `regenerateAll` (или сам билдер) перезапрашивать граф франшизы, если
  `graphUpdatedAt` старше недели, вместо безусловного cache-hit.

  **⚠️ Уточнение (2026-08-08): перезаливка идёт полным реимпортом, не `regenerateAll`.** Это
  меняет картину. `regenerateAll` пересобирает директорию из того, что **уже** в БД — там
  работают probe/recovery. Полный реимпорт пишет БД заново, поэтому действует правило:
  **билдер положит в `directoryCid` только то, что импорт записал в БД.** Аудит выше проверял
  «билдер → директория». Ниже — вторая половина: «импорт → БД». Там нашлись три блокера.

  ### 🚫 Блокер 1 — путь импорта решает, потеряется ли история просмотра

  Только два входа прокидывают `existingAnimeId` (режим слияния из v0.52.4):
  страница торрентов (`renderer/src/app/torrents/page.tsx` `handleImport`) и «Добавить эпизоды»
  на карточке аниме. Там `this.createdAnimeId = null`
  ([import-service.ts:171](main/services/import/import-service.ts)) — при ошибке аниме не трогают,
  `Episode.id` переиспользуются, `WatchProgress`/`watchStatus`/`userRating` целы.

  Все остальные входы (`/import`, drag&drop в библиотеку, плеер, `BundleGroupingDialog`) идут
  как «новый импорт». Но `createAnimeRecord` → `upsertAnime` матчится **по `shikimoriId`**
  ([import-db.ts:33](main/services/import/import-db.ts)) и возвращает id **существующей** записи,
  который тут же попадает в `this.createdAnimeId`
  ([import-service.ts:185](main/services/import/import-service.ts)). Дальше при любой ошибке или
  отмене cleanup вызывает `db.deleteAnime(createdAnimeId)`
  ([import-failure-cleanup.ts:76](main/services/import/import-failure-cleanup.ts)) — это `prisma.anime.delete`
  с полным каскадом: `WatchProgress` (обе связи), `Episode`, `AudioTrack`, `SubtitleTrack`,
  `SubtitleFont`, `Season`, `GenreOnAnime`, `ThemeOnAnime`, `AnimeRelation`, плюс поля самой
  строки — `watchStatus`, `userRating`, `watchedAt`.

  То есть: реимпорт уже существующего аниме не через торрент-страницу + падение ffmpeg = **аниме
  исчезает из библиотеки вместе со всей историей просмотра**. Восстановить неоткуда — в IPFS
  пользовательские данные принципиально не пишутся (`CLAUDE.md`, «Принцип минимума БД»).

  Что делать:
  - [ ] **Бэкап `%APPDATA%/@letar/animatrona/data/app.db` (+ `-wal`) до первого импорта.**
        Это единственная страховка.
  - [ ] Заливать только через страницу торрентов / «Добавить эпизоды».
  - [ ] Фикс: не ставить `createdAnimeId`, если `upsertAnime` вернул уже существующее аниме
        (сравнить `createdAt`, либо проверять существование до вызова). Cleanup должен удалять
        только то, что этот запуск сам и создал.

  ### 🚫 Блокер 2 — старый спрайт перебивает новый (то самое «положили не то»)

  Сброс CID в retranscode-ветке
  ([episode-file-processor.ts:122-135](main/services/import/episode-file-processor.ts)) обнуляет
  `transcodedCid`, `manifestCid`, `ipfsSize`, `thumbnailCids`, `screenshotCids`, `metadataCid` —
  но **не** `spriteCid`, `vttCid`, `chaptersCid`.

  А билдер читает БД **раньше** манифеста:
  `if (ep.spriteCid || ep.vttCid)` — [anime-directory-builder.ts:758-762](main/services/ipfs/anime-directory-builder.ts).
  Свежий спрайт импорт кладёт только в манифест эпизода (в `updateEpisode` полей
  `spriteCid`/`vttCid` нет вовсе —
  [post-process-runner.ts:357-368](main/services/import/post-process-runner.ts)).

  Итог для аниме, где эти поля когда-то заполнил recovery: в новый `directoryCid` уедет **старый
  спрайт со старой раздачи**, а свежесгенерированный — не уедет никуда. Если старый CID мёртв,
  билдер полезет скачивать `video.webm` и пересобирать спрайт заново — впустую, при том что
  готовый уже лежит в IPFS.

  - [ ] Фикс: добавить `spriteCid`/`vttCid`/`chaptersCid` в сброс retranscode **и** писать
        `spriteCid`/`vttCid` в `updateEpisode` постпроцесса.

  Паттерн формализован отдельным кросс-репо документом —
  [animatrona-db-manifest-dual-source.md](/.claude/docs/animatrona-db-manifest-dual-source.md)
  (2026-08-09) — таблица порядка чтения/записи по всем трём полям + правило для новых
  dual-source-полей. Сам фикс из чеклиста выше документ не закрывает.

  ### 🚫 Блокер 3 — поля, которые Shikimori отдаёт, а импорт не сохраняет

  `createAnimeRecord` ([anime-record-setup.ts:106](main/services/import/anime-record-setup.ts)) шлёт
  `nameEn: null` жёстко, а `synonyms` и `rating` не передаёт вовсе — хотя `upsertAnime` их
  принимает, а Shikimori отдаёт (`english`, `synonyms`, `score` в `ShikimoriAnimeDetails`).
  `Episode.name` не заполняется никогда.

  `buildAnimeInfo` берёт эти поля **из БД**, а не из `shikimoriData`
  ([anime-info-generator.ts:72-97](main/services/anime-info-generator.ts)), поэтому в
  `meta/info.json` они уедут пустыми, а `meta/episodes.json` — без названий серий. Это ровно тот
  случай, которого квест и должен избежать: данные были доступны в момент импорта и не попали в
  раздачу.

  - [ ] Фикс: передавать `nameEn`/`synonyms`/`rating` из `selectedAnime` в `createAnimeRecord`;
        заполнять `Episode.name`. Дешевле — fallback в `buildAnimeInfo` на `shikimoriData`,
        но тогда данные останутся только в IPFS, не в БД.

  ### ⚠️ Важное, но не блокирующее

  - **`detectIntros` при импорте работает вхолостую.** Шаг
    [import-service.ts:326-379](main/services/import/import-service.ts) честно считает главы, но
    сохраняет их через `updateChaptersInManifest`, а та первым делом читает `Episode.manifestCid`
    ([chapter-creator.ts:63-72](main/services/chapter-creator.ts)) — которого на этой фазе ещё
    нет. Ранний `return`, потеря без ошибки. Спасает pre-pass в билдере
    ([anime-directory-builder.ts:381-521](main/services/ipfs/anime-directory-builder.ts)), но у
    него два условия: нужно **≥2 эпизода** с живым аудио (фильмы и одиночные серии остаются без
    глав навсегда) и **ни у одного** эпизода не должно быть живых глав (смешанная раздача, где
    часть серий имеет главы в контейнере, оставит остальные без них).
  - **`needsReupload` может сняться, когда не должен.** Условие снятия —
    [import-service.ts:511-518](main/services/import/import-service.ts), считает `failedCount` от
    файлов **текущего** entry. Долив 2 серий из 12 через `retryMissingEpisodes` снимет флаг со
    всего аниме, хотя 10 серий остались на старой раздаче. То же при подтверждении `window.confirm`
    о расхождении числа серий.
  - **Осиротевшие эпизоды.** Если в новой раздаче серий меньше, старые `Episode` остаются в БД со
    старыми мёртвыми CID, их никто не чистит — утянут `contentHealth` в `broken`.
  - **`updateAnimeManifest` целиком под `log.warn`**
    ([relations-and-manifest.ts:96-108](main/services/import/relations-and-manifest.ts)) — импорт вернёт
    `success: true` у аниме **без `directoryCid`**. После прогона проверять отдельно.
  - **`rutrackerUrl`/`sourceTorrentCid` заполняются только при импорте со страницы торрентов** —
    совпадает с Блокером 1 и усиливает его: при заливке «по папкам» папка `source/` не появится
    вообще ([anime-directory-builder.ts:328](main/services/ipfs/anime-directory-builder.ts)).
  - **`Franchise.graphCid` не обновляется** (находка предыдущего прохода, см. выше). При реимпорте
    в существующую БД записи `Franchise` остаются, cache-hit сработает — устаревший граф
    вморозится в новый `directoryCid`. Актуально и для реимпорта, не только для `regenerateAll`.

  ### ✅ Как проверять результат (иначе проверка соврёт)

  - [ ] Доступность `directoryCid` проверять **через внешний публичный IPFS-гейтвей или второй
        узел**, а не локальным Kubo. Локально блоки лежат на своей же машине — проверка покажет
        «всё доступно» при любом состоянии раздачи. Принцип из
        [verification-pitfalls](/.claude/docs/verification-pitfalls.md): проверять тем же путём,
        которым ходит настоящий потребитель, и всегда с положительным контролем.
  - [ ] После прогона — свести по всей библиотеке: `directoryCid IS NOT NULL`, `contentHealth`,
        `needsReupload`. Не полагаться на «импорт вернул success».
  - [ ] Открыть `<gateway>/ipfs/<directoryCid>/play/` хотя бы для одного аниме — это и есть
        проверка, что раздача самодостаточна.
  - [ ] После массового импорта — «Нормализовать pins» в настройках.

  ### Порядок

  1. Бэкап `app.db`.
  2. Блокеры 1-3 + `descriptionEn` (пункт выше) + staleness графа франшизы.
  3. Пробный прогон на **одном** аниме, проверка через внешний гейтвей.
  4. Только потом — массовый реимпорт.

  Все фиксы дешёвые. Дорога сама перезаливка — экономим её, а не код.

- [ ] **Плеер: фуллскрин по двойному клику и Alt+Enter** (план от 2026-07-30) — сейчас в плеере
      нет быстрого способа развернуть видео на весь экран. Добавить: двойной клик по видео
      переключает fullscreen, сочетание Alt+Enter делает то же самое из любого места плеера.

- [ ] **Animatrona Player — отдельное приложение для папочного просмотра** (план от 2026-07-30) —
      раздел «Плеер» выделяется в самостоятельный лёгкий продукт (~130 МБ против 282 МБ), общий код
      уезжает в `libs/folder-player-react` + `libs/folder-scan`, Animatrona переходит на них.
      Подробный план — раздел «Animatrona Player — отдельное приложение для папочного просмотра» ниже.

- [ ] **Покадровая перемотка на паузе** — при паузе кнопки/горячие клавиши +/- 5 кадров. Нужно: `ffmpeg` seek по кадрам или ExoPlayer `seekToNextMediaItem`/frame-level seek через `Player.seekTo()` с `SeekParameters.EXACT`

- [ ] **Автоопределение и обрезка чёрных полос при импорте** — сейчас крадущий эти полосы кроп
      есть только как идея на стороне плеера (§18.4, «Кроп чёрных полос / зум», просмотр без
      изменения файла). Отдельная задача: **на этапе транскода** сам импорт прогоняет
      `ffmpeg cropdetect` по нескольким сэмплам видео (не по одному кадру — открывающая заставка
      может быть чёрной без полос) и, если нашёл устойчивую рамку, применяет `crop=` в фильтр-графе
      транскода — тогда обрезанные полосы не занимают место в готовом файле и не нужны на каждое
      воспроизведение.
  - [ ] Сэмплировать несколько точек по таймлайну (не только первый кадр), взять пересечение/моду
        найденных рамок — устойчиво к чёрным заставкам, эффектам и переходам, которые не являются
        реальным леттербоксом.
  - [ ] Порог срабатывания и минимальный отступ (не обрезать при небольших/шумных полосах —
        ложное срабатывание хуже отсутствия кропа).
  - [ ] **Необратимость:** как и 10-bit→8-bit решение в §21.4, обрезка при транскоде — решение
        «один раз», исходный кадр после этого не восстановить. Нужен предпоказ найденной рамки
        пользователю (или хотя бы лог со значениями `crop=`) до массового прогона, не только тихое
        применение.
  - [ ] Записать применённый `crop=` в `ManifestEncodingInfo`/`ffmpegCommand` — как и остальные
        параметры профиля (§21.4), чтобы было видно, что и почему обрезано, а не гадать по факту.
  - [ ] Разграничить с существующей плеерской идеей (§18.4): плеерский кроп/зум остаётся полезен
        для контента, где авто-детект не сработал или обрезка нежелательна (например источник без
        реальных полос, но с логотипом каналом внизу) — это не замена, а два независимых слоя.

## Animatrona Player — отдельное приложение для папочного просмотра

**Статус:** план (2026-07-30), к реализации не приступали.
**Идея:** раздел «Плеер» (`/player`) — самодостаточный продукт. Человек хочет посмотреть аниме,
которое уже скачал папкой: серии + внешние ASS-субтитры + внешние аудиодорожки + шрифты.
Ему не нужны IPFS, торренты, транскод, библиотека и Shikimori. Сейчас всё это он обязан
установить (инсталлятор **282 МБ**), чтобы получить доступ к плееру.
Второе приложение переиспользует папочный плеер через общие библиотеки — из одного кода
получаются два продукта.

### 0. Решения (принято 2026-07-30)

| Вопрос                     | Решение                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Имя nx-проекта             | `apps/animatrona-player` (короткое; `folder`/`web-player` в имени путались бы с `libs/video-player-*`)                                  |
| productName (для человека) | «Animatrona Player», подзаголовок на сайте — «плеер аниме из папки» (SEO делает контент страницы, не имя exe)                           |
| appId                      | `com.letar.animatrona-player` — менять потом нельзя (ломает автообновление и путь userData), поэтому берём нейтральный внутри семейства |
| Публикация                 | Релизы **из монорепо** `kamiletar/letar`, тег `animatrona-player-v*`. Отдельные репо-зеркала (`kamiletar/animatrona`) — рудимент        |
| Кодеки                     | Докачка ffmpeg по требованию (Фаза 6), в v1 — честная детекция + «открыть в системном плеере»                                           |
| Общий код                  | Выносим в `libs/` **сразу для обоих**: Animatrona переходит на либы в той же работе (иначе две копии разъедутся)                        |
| Локализация                | ru + en **с первого дня** — и в новом приложении, и в самой Animatrona. Подробно — §14                                                  |

### 1. Что уже готово (не переписывать)

- **`@letar/video-player-core`** — vanilla-ядро: `ShakaPlayerManager`, `AudioSyncManager`,
  `SubtitleManager`, `KeyboardHandler`, `ControlsAutoHide`, `srt-to-vtt`, `media-url`, `format-time`.
- **`@letar/video-player-react`** — React-обвязка: `SharedPlayerControls`, `SubtitleOverlay`,
  `PlayerLoadingOverlay`, `ResumeOverlay`, `UpNextOverlay`, `ChapterSkipButton`, `ChapterList`,
  `TimelinePreview`, `SpeedSelector` + хуки `useShakaPlayer`/`useAudioSync`/`usePlayerState`/
  `usePlayerControls`/`useKeyboardShortcuts`/`useAutoHideControls`/`useSubtitles` +
  `detect-chapter-types`.
  **Уже доказано, что либа не привязана к Next.js** — её потребляют три разных сборщика:
  Next.js standalone (`animatrona/renderer`), Vite (`animatrona/mobile-ui`), Next.js web
  (`animatrona-tracker`).
- **Папочный режим не использует БД** — прогресс и история лежат в `localStorage`
  ([useWatchProgress.ts](renderer/src/app/player/_hooks/useWatchProgress.ts),
  [useFolderHistory.ts](renderer/src/app/player/_hooks/useFolderHistory.ts)). Значит новому
  приложению **не нужны** Prisma/ZenStack/libsql/sql.js/миграции/`template.db`.
- **Поверхность main-процесса у папочного режима крошечная — 6 IPC-каналов:**
  `dialog.selectFolder`, `dialog.selectFile`, `fs.scanFolder`, `fs.scanExternalAudio`,
  `fs.scanExternalSubtitles`, `ffmpeg.probe`. Сам `VideoPlayer` не обращается к `electronAPI`
  вообще — работает по URL.
- **`@letar/electron-storage`** (`createJsonStore`) — JSON-хранилище в userData, атомарная запись.
  Лучше `localStorage` для истории папок: переживает очистку кэша renderer.
- **Генератор каркаса:** `nx g @letar/generators:electron-app <name>` — минимальный Nextron со
  статическим экспортом, `assetPrefix: './'`, `publish: null`, точной версией electron.
- **Образец готового лёгкого приложения:** `apps/poster-microtext-desktop` — Nextron +
  `output: 'export'`, без БД и сервера, инсталлятор **108 МБ**. Это ориентир по весу.

### 2. Почему новое приложение будет лёгким (числа)

| Что                               | Animatrona                         | Animatrona Player                  |
| --------------------------------- | ---------------------------------- | ---------------------------------- |
| `ffmpeg.exe`                      | 202 МБ                             | нет (докачка по требованию)        |
| `ffprobe.exe`                     | 193 МБ                             | нет → `mediainfo.js` (2.4 МБ WASM) |
| `kubo.exe` (IPFS)                 | 84 МБ                              | нет                                |
| Next.js standalone + node_modules | есть (server через utilityProcess) | нет (`output: 'export'`, file://)  |
| SQLite (libsql, sql.js, миграции) | есть                               | нет                                |
| **Инсталлятор**                   | **282 МБ**                         | **цель ≤ 130 МБ**                  |

Замена ffprobe — ключевая экономия. Папочному плееру от probe нужны только метаданные:
аудио/суб-дорожки (индекс, язык, название, кодек, каналы, битрейт) и главы.
[mediainfo.js](https://mediainfo.js.org/) (WASM ~2.4 МБ) читает MKV/MP4/WebM и отдаёт дорожки,
языки, флаги default/forced, формат субтитров и **список глав** — этого достаточно.

### 3. Архитектура: две новые библиотеки

Границу режем по процессам Electron, как уже сделано в `video-player-core`/`video-player-react`.

**`libs/folder-player-react` (`@letar/folder-player-react`)** — renderer, React + Chakra:

- `useFolderPlayer` (из [useFolderPlayer.ts](renderer/src/app/player/_hooks/useFolderPlayer.ts), 469 стр.)
- `useFolderModeUI` (318), `useExternalAudio` (196), `useWatchProgress` (241), `useFolderHistory` (135)
- `EpisodeSidebar` (446), `RecentFoldersCard` (147), `types.ts` (178), `parse-filename`, LRU-кэш probe
- ⛔ **Никаких `next/*` импортов** (`next/dynamic`, `next/navigation`) и никакого прямого
  `window.electronAPI` — иначе либа не соберётся под Vite/web.

Развязка через порт — приложение отдаёт реализацию:

```ts
/** Всё, что папочному плееру нужно от хоста (Electron IPC / HTTP / mock в тестах) */
export interface FolderPlayerHost {
  selectFolder(): Promise<string | null>
  selectFile(): Promise<string | null>
  scanFolder(path: string): Promise<VideoFileEntry[]>
  scanExternalAudio(folder: string, videos: VideoRef[]): Promise<ExternalAudioScanResult>
  scanExternalSubtitles(folder: string, videos: VideoRef[]): Promise<ExternalSubtitleScanResult>
  probe(path: string): Promise<MediaProbeResult>
  /** путь на диске → URL для <video> (media:// в Electron, /api/file в web) */
  toMediaUrl(path: string): string
}
/** Хранилище прогресса/истории: localStorage в web, electron-storage в Electron */
export interface FolderPlayerStorage { … }
```

Точки расширения вместо жёстких зависимостей: сейчас `page.tsx` тянет `ImportWizardDialog`
(импорт в библиотеку) и `Header` — в либе это слоты (`episodeActions`, `headerRight`), Animatrona
передаёт свой мастер импорта, новое приложение — ничего.

**`libs/folder-scan` (`@letar/folder-scan`)** — main-процесс, Node-only, без Electron-зависимостей
там, где возможно:

- `scanFolder` (рекурсивный обход, фильтр видео)
- [external-audio-scanner.ts](main/services/external-audio-scanner.ts) (409),
  [external-subtitle-scanner.ts](main/services/external-subtitle-scanner.ts) (585),
  [font-matcher.ts](main/services/font-matcher.ts) (125) — фаззи-матчинг дорожек к сериям
- [media.protocol.ts](main/protocols/media.protocol.ts) (258) + [allowed-paths.ts](main/protocols/allowed-paths.ts) (90)
  — протокол `media://` с Range-запросами и белым списком путей
- **`MediaProber` — интерфейс с двумя реализациями:**
  `FfprobeProber` (Animatrona, бинарь уже есть) и `MediaInfoWasmProber` (новое приложение).
  Оба обязаны отдавать одинаковый нормализованный результат.

⚠️ **Главный технический риск выноса:** совпадение **индексов дорожек**. Выбор аудио в UI устроен
как `embedded:{index}`, и index сейчас — это `ffprobe` stream index. MediaInfo нумерует потоки
иначе (`StreamOrder`/`ID`). Если не свести к одной нумерации, пользователь выберет «русскую
озвучку», а получит японскую. Приёмка — тест на одном и том же файле: выходы обоих проберов
совпадают по индексам, языкам, названиям и порядку (Фаза 2).

### 4. Матрица кодеков — главный продуктовый риск

Chromium играет не всё, а папочный плеер играет файлы **как есть**, без транскода:

| Формат                                         | Chromium в Electron                  |
| ---------------------------------------------- | ------------------------------------ |
| AV1, VP9, H.264 8-bit + AAC/Opus/Vorbis/FLAC   | играет                               |
| MKV-контейнер с этими кодеками                 | обычно играет                        |
| **H.264 10-bit (Hi10P)** — много старого аниме | **не играет**                        |
| **AC3 / E-AC3 / DTS / TrueHD**                 | **не играет**                        |
| HEVC                                           | только аппаратно, зависит от системы |
| ASS-субтитры **внутри** MKV                    | не рендерит (нужно извлечь)          |

Сейчас в коде **нет обработки этой ситуации** — ни `canPlayType`, ни сообщения об ошибке:
пользователь видит чёрный экран. Это баг и в текущей Animatrona.

Решение поэтапное (выбран путь «докачка ffmpeg»):

- **Фаза 2 (v1):** проверяем поддержку по данным probe до старта, при несовместимости — понятный
  текст («звук в формате AC3, Chromium его не проигрывает») + кнопки «Открыть в системном плеере»
  и «Включить расширенную поддержку форматов» (ведёт в Фазу 6).
- **Фаза 6:** докачка ffmpeg в userData + воспроизведение через локальный конвейер.

Альтернативу с патченным `libffmpeg.dll` ([electron-chromium-codecs](https://github.com/ThaUnknown/electron-chromium-codecs),
так делает Miru) в v1 не берём: патч весит мало, но привязан к версии Electron и ломается на
каждом обновлении. Записано как резервный вариант.

### 5. Фаза 1 — вынос в библиотеки, Animatrona переходит на них

- [ ] `nx g @letar/generators:new-lib folder-player-react` и `… new-lib folder-scan`
- [ ] Перенести renderer-часть, заменить `window.electronAPI` на `FolderPlayerHost`,
      `localStorage` — на `FolderPlayerStorage`, убрать `next/*`
- [ ] Перенести main-часть, ввести `MediaProber`, `FfprobeProber` оставить в Animatrona как адаптер
- [ ] Animatrona: `renderer/src/app/player/page.tsx` собирает хост из своего `electronAPI` и
      передаёт слоты (мастер импорта, Header); старые файлы удалить, не оставлять копию
- [ ] `main/webpack.config.js` — alias на `libs/folder-scan/src` (по образцу существующих
      `@letar/animatrona-utils`/`@letar/animatrona-types`)
- [ ] `renderer/next.config.js` — `@letar/folder-player-react` в `transpilePackages`
      (и в `turbopack.resolveAlias`, как сделано для `@letar/animatrona-ui`)
- [ ] **Приёмка:** `nx lint animatrona && nx typecheck:tsgo animatrona && nx build animatrona`,
      затем e2e `04-player` в electron-режиме + ручная проверка папки с внешними ASS и аудио.
      ⚠️ `typecheck:tsgo` зелёный не доказывает, что прод-билд соберётся — прецедент
      `SortablePhotoGrid` (2026-07-21), поэтому `nx build` обязателен

### 6. Фаза 2 — каркас нового приложения

**Каркас заводить только генератором, не руками.** Процесс (шаги, порты, приватность, обязательные
файлы документации, что проверить после генерации) описан в скилле
[`/create:new-app`](/.claude/commands/create/new-app.md) — его и держаться. ⚠️ Но сам каркас этот
скилл раскладывает под **Next.js веб-приложение**; для Electron он же отправляет к отдельному
генератору:

```bash
nx g @letar/generators:electron-app animatrona-player --displayName="Animatrona Player"
```

Отдельного скилла `/create:new-electron-app` нет — в `/create:new-app` про Electron есть только
предупреждение-заглушка. Раз Electron-приложений в монорепо становится четыре
(`animatrona`, `label-printer-desktop`, `poster-microtext-desktop`, `animatrona-player`) — завести
такой скилл стоит, задача записана в §13.

- [ ] Подключить `@letar/folder-player-react`, `@letar/folder-scan`, `@letar/video-player-react`,
      `@letar/video-player-core`, `@letar/electron-storage`
- [ ] `MediaInfoWasmProber` на `mediainfo.js`; тест-сравнение с `FfprobeProber` (см. риск в §3)
- [ ] Встроенные ASS-субтитры и шрифты — без ffmpeg, через
      [matroska-subtitles](https://github.com/mathiasvr/matroska-subtitles) (стримовый JS-парсер,
      отдаёт ASS/SRT-дорожки **и вложенные шрифты** из attachments) + SubtitlesOctopus (`libass-wasm`,
      уже в зависимостях Animatrona)
- [ ] Детекция неподдерживаемых кодеков + сообщение + «открыть в системном плеере» (`shell.openPath`).
      Проверять через `navigator.mediaCapabilities.decodingInfo()` — точнее, чем `canPlayType()`
- [ ] Приёмка: папка на 24 серии + внешние ASS + внешняя озвучка → играет, дорожки
      переключаются, «продолжить с места» работает, холодный старт ≤ 3 с

#### 6.1 ⚠️ Renderer грузить через свою схему `app://`, а не `file://`

Это решение нужно принять **до** написания кода, потом переделывать больно.

`poster-microtext-desktop` грузит renderer как `loadFile(...out/index.html)` → origin `file://`.
Для него это работает, потому что там нет ни Worker, ни WASM в renderer. **Нашему плееру они нужны:**
SubtitlesOctopus рендерит ASS в Web Worker и тянет `.wasm`, а под `file://` origin равен `null` —
Chromium блокирует и Worker, и `fetch` к соседним файлам. Animatrona с этим не сталкивалась, потому
что её renderer отдаётся по HTTP (Next.js standalone внутри `utilityProcess`), а сюда мы этот
тяжёлый сервер тащить не хотим.

Решение — привилегированная схема:

```ts
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
])
// затем protocol.handle('app', …) → отдаём файлы из out/, и window.loadURL('app://local/index.html')
```

Побочные выигрыши: не нужен хак `assetPrefix: './'`, и снимается ограничение «только одна страница
на корне» — вложенные роуты начинают работать, потому что абсолютные пути `/_next/...` резолвятся
от корня схемы. Грабля про `assetPrefix` из
[.claude/rules/electron.md](/.claude/rules/electron.md) остаётся актуальной только для варианта
`file://` — если по каким-то причинам вернёмся к нему.

#### 6.2 UX-минимум плеера (без этого продукт не продукт)

Для плеера главный способ запуска — **двойной щелчок по файлу**, а не иконка на рабочем столе.
В Animatrona этого нет вовсе (она запускается как приложение-библиотека), поэтому это чистая
новая работа:

- [ ] `fileAssociations` в `electron-builder.yml` — `.mkv`, `.mp4`, `.webm`, `.avi`, `.mov`, `.m4v`
      («Открыть с помощью» и опционально «сделать плеером по умолчанию»)
- [ ] Открытие переданного файла: `process.argv` (Windows/Linux) и событие `open-file` (macOS)
- [ ] `app.requestSingleInstanceLock()` + `second-instance` — второй двойной щелчок открывает файл
      **в уже запущенном окне**, а не поднимает вторую копию Electron
- [ ] Drag&drop файла и папки в окно — ⚠️ через `webUtils.getPathForFile(file)`; `File.path` в
      Electron ≥32 удалён, и это выглядит как «перетаскивание молча не работает»
- [ ] `powerSaveBlocker` (`prevent-display-sleep`) на время воспроизведения — иначе экран гаснет
      посреди серии; снимать на паузе и при выходе
- [ ] `backgroundThrottling: false` у `webPreferences` — иначе при неактивном окне таймеры
      прогресса/автоскрытия контролов начинают врать
- [ ] Запоминать размер, позицию и полноэкранность окна между запусками (`@letar/electron-storage`)
- [ ] Кэш probe на диске, а не только LRU в памяти: ключ `путь + mtime + размер`. Повторное
      открытие той же папки не должно снова пробивать все серии
- [ ] Проверить, что 1080p/4K декодируются на GPU, а не на CPU (`chrome://gpu` в devtools окна;
      на Linux может понадобиться флаг VAAPI)

### 7. Фаза 3 — главы OP/ED (закрывает открытую задачу ниже, теперь для обоих приложений)

`MediaProber` отдаёт главы у обеих реализаций, поэтому кнопка «Пропустить опенинг» появляется
и в Animatrona, и в новом приложении одним изменением. Классификацию (`detectChapterType`/
`isChapterSkippable`) переиспользуем — она уже лежит в `@letar/video-player-react`
(`utils/detect-chapter-types.ts`), в `main/services/import/helpers.ts` дублировать не нужно.

### 8. Фаза 4 — сборка и публикация

- [ ] `project.json`: `dev`, `build`, `build:win`, `build:linux`, `release:win`, `lint`,
      `typecheck:tsgo`, `format`, `test`. Никаких `db:*`/`zenstack:*`
- [ ] `electron-builder.yml`: `appId com.letar.animatrona-player`, NSIS (`oneClick: false`),
      `publish: { provider: github, owner: kamiletar, repo: letar }`
- [ ] ⚠️ **Точная** версия electron в `devDependencies` (`"42.6.1"`, не `"^42.6.1"`) — иначе
      electron-builder не определит бинарник
- [ ] ⚠️ electron-builder ищет `node_modules` от `projectDir`, а не `appDir` — в Nx-монорепо это
      известная поломка ([electron-builder#9445](https://github.com/electron-userland/electron-builder/issues/9445)).
      Версию `electron-builder` фиксировать и не поднимать вслепую
- [ ] `.github/workflows/release-animatrona-player.yml` по тегу `animatrona-player-v*`:
      build win/linux/mac → релиз **в `kamiletar/letar`**. Без шага зеркалирования исходников
      (в отличие от `release-animatrona.yml`) — исходники уже в публичном letar
- [ ] ⚠️ В `kamiletar/letar` **сейчас нет ни одного релиза**, а npm-пакеты тегаются `forms-v*`/
      `form-mcp-v*` — проверить, что новый тег не ломает [publish-npm.yml](/.github/workflows/publish-npm.yml)
- [ ] Автообновление (`electron-updater`) — включать только после того, как первый релиз в letar
      реально появился и `latest.yml` отдаётся
- [ ] **Портативная сборка** вторым target'ом (`portable` для Windows, обычный `.AppImage` для Linux
      уже портативен). Плеер часто хотят запустить без установки — с флешки, на чужой машине
- [ ] **Шаг проверки веса в CI**: падать, если установщик > 130 МБ. Без автоматической проверки
      «лёгкость» тихо уплывёт через пару фич — как уплыла до 282 МБ у Animatrona

**Побочная находка, отдельная задача:** релизный контур Animatrona рассинхронизирован —
`electron-builder.yml` публикует в `repo: letar` (где релизов нет), а workflow загружает ассеты в
`kamiletar/animatrona`, где последний релиз **v0.50.1** при текущей версии **0.55.16**. То есть
автообновление у пользователей Animatrona, скорее всего, не работает с апреля 2026. Проверить и
починить до того, как заводить второй продукт на том же механизме.

### 9. Фаза 5 — сайт

- [ ] `apps/animatrona-landing/src/lib/github.ts` — параметризовать `owner`/`repo`/`tagPrefix`
      (сейчас репо зашит в env `GITHUB_OWNER`/`GITHUB_REPO`, а `findAssetForPlatform` берёт
      **первый** `.exe` в релизе — при двух продуктах в одном релизе отдаст не тот файл)
- [ ] Фильтр релизов по префиксу тега: `animatrona-v*` против `animatrona-player-v*`
- [ ] Раздел/страница «Плеер»: чем отличается от полной Animatrona, вес, поддерживаемые форматы,
      честная таблица «что играет из коробки», кнопки загрузки под платформы
- [ ] SEO — фразы вида «плеер для аниме из папки», «внешние аудиодорожки и ASS-субтитры» в
      заголовках и описании страницы, а не в названии приложения
- [ ] В позиционировании прямо сказать: приложение **ничего не скачивает и не ищет контент** — ни
      торрентов, ни IPFS, ни каталога. Это просто плеер файлов, которые уже лежат на диске. Помимо
      честности это снимает правовые вопросы, которые к полной Animatrona задать можно, а к плееру нет

### 10. Фаза 6 — докачка ffmpeg и воспроизведение «неудобных» форматов

- [ ] Скачивание по требованию в `userData` (не в инсталлятор): UI с прогрессом, проверка
      контрольной суммы, возможность удалить. Скрипт [download-ffmpeg.ts](scripts/download-ffmpeg.ts)
      переиспользовать как основу, но качать **только `ffmpeg`** (без ffprobe — метаданные уже
      читает mediainfo). Найти сборку легче BtbN-gpl (202 МБ на бинарь) — задача-исследование
- [ ] Эскалация по стоимости, а не «всегда транскод»: 1. **ремукс** (`-c copy`) — когда проблема в контейнере; 2. **только звук** (AC3/DTS → AAC/Opus, видео `copy`) — самый частый случай в аниме; 3. **видео** (Hi10P/HEVC-software → H.264 8-bit) — последний вариант, нужен GPU
- [ ] Отдача потока: локальный HTTP на `127.0.0.1` + HLS-сегменты (перезапуск ffmpeg на seek, как
      у Jellyfin). Прогрессивный fMP4 проще, но ломает перемотку — проверить оба
- [ ] Кэш готовых сегментов + автоочистка, чтобы не забить диск
- [ ] Приёмка: файл Hi10P + AC3 играет со звуком и перемоткой; чистая установка без ffmpeg играет
      обычный AV1/H.264 без единого лишнего запроса
- [ ] ⚖️ **Лицензионная заметка:** сборки BtbN — GPL. Когда ffmpeg **не входит в дистрибутив**, а
      скачивается пользователем в userData и вызывается как отдельный процесс через CLI, вопрос
      «производного произведения» не встаёт. Это дополнительный плюс выбранного пути. Заодно
      отметить: Animatrona ffmpeg-gpl **поставляет внутри инсталлятора** — там как минимум нужен
      текст лицензии и ссылка на исходники в «О программе». Проверить, есть ли (отдельная задача)

### 11. Тесты

- [ ] Unit (vitest): `parse-filename`, матчинг внешних дорожек, `detect-chapter-types`,
      **сравнение `FfprobeProber` vs `MediaInfoWasmProber`** на одинаковых файлах
- [ ] `nx g @letar/generators:e2e-suite animatrona-player` — smoke + папочный сценарий
- [ ] Animatrona: существующий сьют `04-player` — регрессионный гейт для Фазы 1
- [ ] ⚠️ GUI-уровень (нативные диалоги, drag&drop) в песочнице не проверяется — main-процесс
      гонять headless: `npx electron scripts/verify-*.cjs` (паттерн из
      [.claude/rules/electron.md](/.claude/rules/electron.md))
- [ ] Тесты писать через агентов (`e2e-test-writer` / `/workflow:test-write`), не руками

### 12. Риски

| Риск                                                                  | Что делаем                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Кодеки: половина аниме — Hi10P/AC3, без Фазы 6 продукт слабее mpv/VLC | v1 честно сообщает и отдаёт файл системному плееру; Фаза 6 закрывает         |
| Регрессии в рабочей Animatrona при выносе в либы                      | e2e `04-player` + `nx build` + ручной прогон реальной папки                  |
| Индексы дорожек у mediainfo ≠ ffprobe → не та озвучка                 | тест-сравнение проберов как условие приёмки Фазы 2                           |
| Два инсталлятора = двойная поддержка и два канала обновлений          | общий код в libs, единый workflow-шаблон; сначала починить релизы Animatrona |
| ASS внутри MKV + шрифты                                               | `matroska-subtitles` + SubtitlesOctopus, проверить на реальных раздачах      |
| Ожидание «собралось = работает» для GUI Electron                      | первый живой запуск руками, до релиза                                        |
| Worker/WASM под `file://` молча не запускаются → ASS не рендерится    | схема `app://` вместо `file://`, решение принимать до кода (§6.1)            |
| «Лёгкость» уплывает по мере роста фич                                 | шаг проверки веса установщика в CI (§8), а не обещание в README              |

### 13. Открытые вопросы и задачи вокруг

- **Anime4K-апскейл** в лёгком приложении нужен? Шейдеры уже лежат в `resources/anime4k` (144 КБ).
  Через libplacebo он требует ffmpeg → уходит в Фазу 6. Через WebGL в renderer — отдельная работа,
  зато без ffmpeg и работает в обычном воспроизведении.
- **Синхронный совместный просмотр** (в Animatrona есть watch-party) — оставляем полной версии или
  делаем приманкой лёгкой?
- Как лёгкое приложение предлагает перейти на полную Animatrona (баннер? раздел «Ещё»?).
- **Телеметрия — в v1 нет и по умолчанию не будет.** Плеер, который отправляет наружу, что человек
  смотрит, — это не то, что мы делаем, даже через свой Umami. Если понадобится статистика — только
  явно включаемая пользователем и без названий файлов. Записано, чтобы не завелось «по инерции»
  вместе с общим layout'ом.
- **Группировка по сезонам** (`Season 1`/`Season 2` внутри одной папки) и плейлист из нескольких
  папок — фича v2, но структуру данных `FolderEpisode[]` заложить с оглядкой на неё.
- **Завести скилл `/create:new-electron-app`** — сейчас в `/create:new-app` про Electron только
  предупреждение-заглушка, а Electron-приложений становится четыре. Скилл должен покрывать:
  генератор `electron-app`, выбор `app://` против `file://`, ассоциации файлов, single instance,
  грабли из [.claude/rules/electron.md](/.claude/rules/electron.md), headless-проверку main-процесса.
- **Документация:** после Фазы 2 добавить в `.claude/docs/` заметку про `app://` вместо `file://`
  (Worker/WASM в статическом экспорте) и дополнить `.claude/rules/electron.md` — это находка уровня
  «ловится только на живом запуске».

### 14. Локализация (ru + en) — сквозная задача для всей экосистемы

**Решение 2026-07-30:** ru + en с первого дня. Не только в новом приложении — **в Animatrona тоже**.

#### 14.1 Стек: i18next, а не next-intl

Переводы нужны в шести разных окружениях: renderer Animatrona (Next standalone), renderer нового
приложения (static export), общие либы (`folder-player-react`, `video-player-react`), `mobile-ui`
(Vite), `main`-процессы (Node), и потенциально `web-player` (esbuild, standalone внутри IPFS).

`next-intl` завязан на Next.js — RSC, middleware, роутинг по локали. В либах, в Vite и в
main-процессе он не работает. Поэтому для Electron-стека берём **i18next** (+`react-i18next` для
компонентов): один и тот же рантайм живёт в Next, Vite, Node и React Native, умеет namespaces
(грузим только нужное), плюрализацию для русского и подмену локали без перезагрузки.

⚠️ Скилл [`i18n-multilingual`](/.claude/skills/i18n-multilingual/SKILL.md) описывает **next-intl** —
он остаётся верным для веб-приложений монорепо (лендинги, driving-school и прочие). Их не
переписываем. Расхождение стеков осознанное: у веба есть локаль в URL и SEO, у Electron нет ни
того, ни другого. Записать это в скилл, чтобы следующий агент не «унифицировал» вслепую.

#### 14.2 Либы несут свои переводы сами

Либа не должна требовать от приложения знать все её ключи — иначе вставить её в новое приложение
нельзя без переписывания словаря.

```
libs/folder-player-react/
  messages/ru.json   ← дефолтные строки либы
  messages/en.json
  src/i18n.ts        ← createFolderPlayerMessages(locale), опциональный override `t` от приложения
```

То есть либа самодостаточна и переведена «из коробки», а приложение может перекрыть отдельные
формулировки (Animatrona говорит «серия», лёгкий плеер может говорить «файл»).

#### 14.3 Как определяется язык

- Первый запуск: `app.getLocale()` из Electron → сопоставление с поддерживаемыми → иначе `en`
- Выбор пользователя сохраняется через `@letar/electron-storage` и переживает обновление
- Переключатель языка в настройках, применение **без перезапуска** приложения
- Никакой локали в URL — в Electron она не нужна

#### 14.4 Объём работ (замер 2026-07-30)

| Где                                                                       | Сколько                                      | Переводим?                                  |
| ------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| `renderer/src` (Animatrona)                                               | ~2 600 строковых литералов с русским текстом | да, это основная работа                     |
| `main` — видимое пользователю (меню, tray, нативные диалоги, уведомления) | ~83 строки                                   | да, дёшево                                  |
| `main` — логи (`log.info/warn/error`)                                     | ~944 строки                                  | **нет**, логи остаются русскими             |
| Комментарии и JSDoc                                                       | везде                                        | **нет**, по правилам монорепо они по-русски |
| Данные из Shikimori (жанры, статусы, описания)                            | приходят готовыми                            | **нет**, это данные, а не интерфейс         |

Вывод: работа большая, но не бесконечная — 2.6к строк в renderer и меньше сотни в main.
Ключевое, чтобы она вообще закончилась, — не делать её вторым проходом по тем же файлам.

#### 14.5 Порядок (важно: строки становятся ключами сразу при выносе в либу)

1. **Вместе с Фазой 1** — файлы папочного плеера всё равно переезжают в либу, и трогать их
   второй раз только ради строк — двойная работа. Значит при переносе строки сразу идут в ключи
2. **animatrona-player целиком** — UI новый и небольшой, заодно проверка стека на живом продукте
3. **Animatrona по экранам:** плеер/`watch` → библиотека и каталог → импорт → настройки → остальное
4. **main-процесс:** меню, tray, нативные диалоги, уведомления, тексты ошибок, уходящие в UI
5. **Обвязка:** `resources/splash.html`, мультиязычный NSIS-инсталлятор, описания `fileAssociations`

#### 14.6 Гейты и грабли

- [ ] **ESLint-правило на литералы в JSX** (`eslint-plugin-i18next` / `no-literal-string`), включать
      **по папкам** по мере перевода. Без гейта новые русские строки просачиваются быстрее, чем
      переводятся старые — и задача не закончится никогда
- [ ] **Плюрализация обязательна.** Русский требует три формы («1 серия / 2 серии / 5 серий»),
      английский — две. Конкатенация вида `` `${n} серии` `` при переводе ломается
- [ ] **Числа, даты, длительность — через `Intl.*`**, не руками. Проверить
      `video-player-core/src/utils/format-time.ts` и `libs/format-utils` на захардкоженные
      «мин»/«сек»/«ч» — они в общем коде и всплывут во всех приложениях сразу
- [ ] **Глоссарий аниме-терминов** (опенинг, эндинг, дубляж, сабы, равки, сид, пиннинг) — один файл
      на монорепо. Без него en-переводы разойдутся между экранами и будут выглядеть машинными
- [ ] En-черновик можно сделать машинно, но **вычитать обязательно** — англоязычная аниме-аудитория
      к формулировкам чувствительна, кривой перевод читается как «китайская программа»
- [ ] Проверить длину строк в вёрстке: немецкий не берём, но en-строки местами короче русских, а
      местами длиннее — кнопки и бейджи в `EpisodeSidebar` поедут

#### 14.7 ⚠️ Жанры и темы — не «просто данные», как записано выше

Ранее в §14.4 жанры и статусы из Shikimori отнесены к данным, которые не переводятся. Это верно
только пока приложение одноязычное. С появлением en это ломается: аниме, импортированное через
Shikimori, принесёт русские жанры, и англоязычный интерфейс покажет «Сёнэн» вперемешку с
английскими подписями.

Хорошая новость — фундамент уже есть, просто он несогласованный:

| Где                         | Сейчас                          | Нужно                                        |
| --------------------------- | ------------------------------- | -------------------------------------------- |
| `Genre` в `schema.zmodel`   | `name` + `slug`                 | `slug` — канон, `name`/`nameRu` — подписи    |
| `Theme` в `schema.zmodel`   | `name` + `nameRu`, **без slug** | добавить `slug`, унифицировать с Genre       |
| `AnimeManifestGenre` (IPFS) | `{ name, nameRu?, id?, slug? }` | уже двуязычно — оставить, заполнять оба поля |

Правило: **канон — `slug`**, отображаемая подпись выбирается по локали с fallback. UI никогда не
берёт `name` от провайдера напрямую.

### 15. Провайдер метаданных: Shikimori для ru, AniList/MAL для en

**Решение 2026-07-30:** для англоязычной версии источник метаданных — не Shikimori, а
англоязычный сервис. Shikimori остаётся для ru.

#### 15.1 Что уже готово (приятная неожиданность)

- **IPFS-манифест уже мультипровайдерный:** `AnimeManifestExternalIds` в
  [anime-manifest.ts](/libs/animatrona-types/src/anime-manifest.ts) несёт `mal`, `anilist`,
  `shikimori`, `anidb`, `worldArt`, `kinopoisk`. Формат раздачи ломать не придётся
- **`AnimeManifestGenre` уже двуязычный** — `{ name, nameRu?, id?, slug? }`
- **`Anime` уже имеет** `nameEn` и `originalName` помимо `name`
- **В федерации дедупликация уже по внешним ID** — модель контента трекера хранит
  `malId`/`anilistId`/`shikimoriId`/`anidbId` с индексами по каждому

То есть архитектура это предвидела. Не сделано главное — **абстракция самого провайдера**:
`main/services/shikimori/{client,anime-api,franchise-api}.ts` вызывается напрямую, а
`Anime.shikimoriId` в БД — единственный внешний ключ (`@unique`).

#### 15.2 Абстракция (тот же паттерн, что `MediaProber` в §3)

```ts
export interface MetadataProvider {
  readonly id: 'shikimori' | 'anilist' | 'mal'
  search(query: string): Promise<MetadataMatch[]>
  getAnime(id: number): Promise<ProviderAnime>
  getFranchise(id: number): Promise<ProviderFranchise>
  /** какие внешние ID знает про эту запись — для дедупликации и маппинга */
  externalIds(a: ProviderAnime): AnimeManifestExternalIds
}
```

- Выбор провайдера по локали интерфейса, но с **ручным переключением** в настройках: русскоязычный
  пользователь может хотеть en-метаданные, и наоборот
- Кэш метаданных ключевать парой `(provider, id)`, иначе записи от разных провайдеров перемешаются
- ⚠️ **`Anime.shikimoriId` придётся расширить** до набора внешних ID (`malId`, `anilistId`,
  `anidbId`) с уникальностью по каждому — иначе аниме, найденное через AniList, не сматчится с уже
  импортированным через Shikimori. Это миграция БД, и делать её надо **до** массовой перезаливки
- Маппинг ID между сервисами не изобретать: есть готовый оффлайн-датасет соответствий
  ([anime-offline-database](https://github.com/manami-project/anime-offline-database) от
  manami-project — MAL/AniList/Kitsu/AniDB/Shikimori в одном файле). Дешевле и надёжнее, чем
  ходить в API за каждым соответствием

#### 15.3 ⏰ Почему это надо решить сейчас, а не потом

В плане уже стоит **перезаливка всей библиотеки** (`Anime.needsReupload` выставлен всем записям,
v0.52.2). Метаданные пишутся в IPFS-манифест при импорте. Если перезалить библиотеку **до** того,
как манифест начнёт наполняться двуязычными полями и полным набором внешних ID, — придётся
перезаливать второй раз. Значит §15 встаёт **перед** массовым реимпортом, а не после.

#### 15.4 Открытые вопросы по провайдеру

- **AniList или MyAnimeList?** Рекомендую AniList: GraphQL, без OAuth и регистрации приложения,
  лимит ~90 запросов/мин, богатые метаданные, есть синонимы на других языках. MAL API v2 требует
  регистрации `client_id` и OAuth; неофициальный Jikan даёт REST без ключа, но со своими лимитами
  и задержкой обновления данных. Если для аудитории важнее «привычный MAL» — берём MAL, абстракция
  из §15.2 позволяет обоих
- Постеры: у AniList своя CDN, у Shikimori своя. Постеры мы всё равно заливаем в IPFS при импорте,
  так что для раздачи это неважно, но лицензионные условия на изображения у сервисов разные —
  проверить перед тем, как показывать их в вебе (`animatrona-tracker`, лендинг)
- Названия эпизодов: Shikimori даёт их редко, AniList — тоже неполно. Возможно, понадобится третий
  источник (AniDB) или ручной ввод. Не блокирует, но UX «Эпизод 7» вместо названия заметен

### 16. Мультиязычный лендинг (`animatrona-landing`)

**Решение 2026-07-30:** лендинг тоже двуязычный (ru + en). Закрывает открытый вопрос из §14.6.

Здесь, в отличие от приложений, **уместен `next-intl`** — это обычный веб: есть SEO, есть локаль в
URL, есть RSC. То самое расхождение стеков из §14.1, и оно осознанное: приложения на i18next,
веб на next-intl.

- [ ] Локаль в URL (`/` — ru, `/en/...`), `next-intl` с роутингом; проверить, что это не конфликтует
      с Docker-деплоем лендинга (`Dockerfile.production`, `docker-compose.production.yml`)
- [ ] SEO-обвязка per-locale: `hreflang` на всех страницах, `canonical` для каждой локали,
      альтернативы в существующем `sitemap.ts`, локализованные `opengraph-image.tsx` и `<title>`
- [ ] Приоритет перевода: главная (hero + downloads + features) → страница «Плеер» из §9 →
      `privacy` → `docs/*` (quick-start, troubleshooting, encoding-profiles, keyboard-shortcuts) →
      серия статей про трекер из §17
- [ ] ⚖️ **Политика конфиденциальности на en — это не перевод русской.** Текущая написана под
      152-ФЗ. Англоязычная аудитория означает посетителей из ЕС, а там действует GDPR: другие
      основания обработки, права субъекта, требования к cookie-согласию. Сверить с
      [.claude/docs/personal-data.md](/.claude/docs/personal-data.md) и решить, нужен ли отдельный
      GDPR-раздел. Проверить попутно, ставит ли наш Umami cookies (если нет — задача сильно проще)
- [ ] Переключатель языка в navbar + определение по `Accept-Language` при первом заходе, но с
      запоминанием ручного выбора (авто-редирект без возможности отмены раздражает и вредит SEO)
- [ ] Тексты писать сразу с оглядкой на глоссарий из §14.6 — иначе сайт и приложение будут называть
      одни и те же вещи по-разному

### 17. Серия статей «Подними свой трекер» (для школьников и старше)

**Зачем это в плане, а не «когда-нибудь».** Федеративная сеть трекеров имеет смысл только если
трекеры кто-то поднимает. Статьи — это и есть механизм роста сети, а не просто документация.
Плюс образовательная ценность: подросток проходит путь «свой сервер → домен → HTTPS → федерация»
на понятном ему предмете.

**Аудитория:** школьник примерно с 12 лет, без опыта администрирования. Значит: минимум терминов
(каждый вводится один раз и по-русски), команды копируются без правок, скриншоты обязательны,
в каждой статье блок «не получилось — смотри сюда».

**Где публикуем:** раздел docs на `animatrona-landing` — там уже лежат `quick-start`,
`troubleshooting`, `encoding-profiles`, `keyboard-shortcuts` (MDX). Новая ветка `docs/tracker/`.

**Предпосылка (проверить до начала писательства):** у `animatrona-tracker` есть
`docker-compose.dev.yml`, `docker-compose.production.yml` и `.env.example`, но они писались под нашу
инфраструктуру. Нужен отдельный **self-host compose «для человека»**: одна команда, SQLite или
локальный Postgres в том же compose, без нашего секрет-менеджера и без предположений про s2/s3.
Пока его нет — статьи писать не о чем.

Черновик серии:

1. **Что такое трекер и зачем свой** — без жаргона, на аналогиях. Чем это отличается от «сайта с аниме»
2. **Что понадобится** — свой компьютер или VPS, нужен ли домен, сколько это стоит в месяц (честные цифры)
3. **Первый запуск** — `docker compose up`, трекер работает на своём компьютере, видно в браузере
4. **Открыть друзьям** — домен, HTTPS, проброс портов, nginx-proxy-manager, «почему не надо светить 80-й порт наружу»
5. **Наполнение** — как добавить своё аниме через Animatrona, что такое CID и почему ссылка не ломается
6. **Федерация** — подключиться к другим трекерам, что синхронизируется, а что остаётся локальным
7. **Правила и ответственность** — что можно раздавать, а что нельзя, и почему это касается лично тебя.
   ⚠️ Для этой аудитории статья обязательна и должна быть не отпиской. Не даём инструкций про обход
   блокировок и не подсказываем, где брать пиратские раздачи — пишем про технологию и свой/легальный контент
8. **Обслуживание** — бэкапы, обновления, что делать если всё сломалось и как не потерять данные

**Требование к качеству:** каждая статья проверяется прогоном с нуля на чистой машине (или в
чистом контейнере) человеком, который её не писал. Версии в командах зафиксированы, а не `latest`.
Иначе получится обычная документация, по которой у новичка ничего не запускается.

**Язык:** сначала русский. En-версия — вместе с решением по en-лендингу (§14.6).

### 18. UI/UX плеера — ревизия по коду (2026-07-30)

Всё ниже живёт в общей либе из §3 → делается один раз, появляется сразу в двух приложениях.

#### 18.2 Без этого папочный плеер неполон (v1)

- [ ] **Ручная задержка субтитров** (`±`, шаг 50–100 мс, горячие клавиши + индикация на экране).
      Сейчас нет вообще — ни в `video-player-core`, ни в `video-player-react`. Внешние ASS почти
      всегда чуть разъезжаются с конкретным рипом, и без подстройки фича «нашли внешние сабы»
      наполовину бесполезна
- [ ] **Ручная задержка внешней аудиодорожки.** `useAudioSync` синхронизирует video↔audio, но
      постоянного офсета не даёт. Для внешних озвучек это норма жизни — рассинхрон 0.2–2 с
- [ ] **Запоминать выбор озвучки и субтитров между сериями.** Сейчас не запоминается ничего
      (`preferredAudio`/`preferredSub` в коде отсутствуют): выбрал русскую озвучку на первой серии
      — на второй снова дефолт. ⚠️ Запоминать надо **не индекс дорожки** (у серий они разные), а
      признак: язык + название группы/файла. Хранить на папку.
      → Это часть §19: готовая схема ключа `language:title` уже работает в IPFS-плеере, поднимаем её,
      а не пишем заново
- [ ] **Колесо мыши = громкость** (и `Shift`+колесо = перемотка). Обработчика `onWheel` нет нигде

#### 18.3 Горячие клавиши — чего не хватает

Сейчас забиндены `space`/`k`, стрелки, `m`, `f`, `[`/`]`, `i` — и, что приятно, **с русской
раскладкой** (`л`, `ь`, `а`, `ш`). Не хватает привычного из mpv/YouTube:

- [ ] `j`/`l` — ±10 с (стрелки обычно ±5)
- [ ] `0`–`9` — переход к 0–90 % длительности
- [ ] `c` — субтитры вкл/выкл одной клавишей (самое частое действие при плохом переводе)
- [ ] `n` — следующая серия, `p` — предыдущая
- [ ] `,`/`.` — покадрово (пересекается с задачей «Покадровая перемотка на паузе» в черновике)
- [ ] `s` — сохранить кадр в PNG (для аниме востребовано; два варианта — с субтитрами и без)
- [ ] Русские аналоги для каждой новой клавиши, как уже сделано для существующих

#### 18.4 Приятное, но не в v1

- [ ] **Экранный индикатор действия** (громкость, seek, скорость). В `mobile-ui` уже есть
      `GestureIndicator` и `DoubleTapRipple` — поднять в общую либу, а не писать заново
- [ ] **Нормализация громкости.** Аниме часто тихое, а разброс между сериями большой. Без ffmpeg
      это делается на WebAudio (`GainNode` + `DynamicsCompressorNode`) — дёшево и работает в
      обычном воспроизведении
- [ ] **Кроп чёрных полос / зум** — для 4:3-равок и энкодов с «вшитыми» полосами
- [ ] **Размер и отступ субтитров** — для SRT/VTT свободно; для ASS стили менять нельзя, но масштаб
      и вертикальный сдвиг допустимы (SubtitlesOctopus умеет)
- [ ] **Поиск/фильтр в списке серий** — когда в папке 100+ файлов, скролл перестаёт работать
- [ ] **«Пометить просмотренным» вручную** и «пометить все до этой». Прогресс в сайдбаре уже есть
      (`progressPercent`, зелёный при ≥90 %) — не хватает ручного управления
- [ ] **Выбор «продолжить / сначала»** вместо молчаливого старта с сохранённой позиции. В либе уже
      лежит `ResumeOverlay` — в папочном режиме не используется

#### 18.5 Доступность и мелочи качества

- [ ] ARIA-роли и метки на контролы, полное управление с клавиатуры без мыши, видимый фокус
- [ ] `prefers-reduced-motion` — гасить анимации появления контролов
- [ ] `Esc` из полного экрана, `space` не скроллит страницу (проверить, что `preventDefault` стоит)
- [ ] После Фазы 2 прогнать `/audit:ui-ux-audit` по новому приложению — дешевле, чем ловить это
      отзывами

⚠️ Отдельно про метод: клик-баг из §18.1 показывает, что **наличие обработчика в коде не равно
работающему взаимодействию**. GUI-слой в песочнице не проверяется (см. §11), поэтому по каждому
пункту этого раздела нужен либо e2e-клик, либо живая проверка руками — «код на месте» здесь ничего
не доказывает.

### 19. Режим просмотра «озвучка / субтитры» — единый механизм предпочтений

Идея владельца (2026-07-30): в IPFS-версии плеера переключение между озвучкой и субтитрами уже
работает — надо поднять это в настройки плеера, рядом с языком интерфейса.

#### 19.1 Ирония: самый простой плеер умеет больше главного

В сгенерированном standalone-плеере
([asset-bundler.ts:690–740](main/services/web-export/asset-bundler.ts)) уже сделано:

```js
// Выбираем аудиодорожку: сохранённая > дефолтная > первая
var audioKey = savedAudio || manifest.defaults.audioTrack
// Выбираем субтитры: сохранённые > дефолтные > выключены
var subKey = savedSub !== undefined ? savedSub : manifest.defaults.subtitleTrack
```

Ключ дорожки — `language + ':' + title`, **не индекс**. Это ровно то решение, которое нужно
проблеме из §18.2 («у разных серий индексы разные»), и оно уже написано и работает. Плюс выбор
сохраняется вместе с прогрессом, а дефолты едут в IPFS-манифесте (`manifest.defaults`).

То есть экспортный плеер на ванильном JS умеет то, чего **нет** в главном desktop-плеере. Значит
§18.2 сводится не к «придумать», а к «поднять готовую схему в общий код».

#### 19.2 Модель настройки — три независимых уровня

- **Режим:** «Озвучка» / «Субтитры» / «Как выбрал руками»
- **Предпочитаемый язык — отдельно для аудио и для субтитров.** Их нельзя объединять в одну
  настройку: реальные комбинации — `ru`-аудио без сабов, `ja`-аудио + `ru`-сабы, `ja`-аудио +
  `en`-сабы (а это ещё и разные аудитории после §14)
- **Предпочитаемая группа** дубляжа или фансаба (в БД поле `dubGroup` уже есть)

Переопределение — двухуровневое: глобально в настройках, плюс на конкретную папку или аниме
(«обычно смотрю с сабами, но это — в озвучке такой-то студии»).

#### 19.3 Разрешение дорожек — чистая функция, а не логика в компоненте

```ts
resolveTracks({ mode, preferredAudioLang, preferredSubLang, preferredGroup, available })
  → { audioKey, subKey, fallbackReason?: 'no-dub-in-language' | 'no-subs-in-language' | … }
```

`fallbackReason` обязателен: если предпочтения не выполнимы, UI должен честно сказать «озвучки на
русском нет — включил субтитры», а не молча подсунуть японскую дорожку. Молчаливый fallback здесь
читается как баг плеера.

Место для кода — `@letar/video-player-core` (vanilla, без React). Тогда механизм один для desktop,
папочного режима, `mobile-ui`, `animatrona-tracker` и standalone-плеера.

#### 19.4 Forced-субтитры и «надписи» — для папочного режима это дёшево

В режиме «Озвучка» субтитры нельзя гасить целиком: вместе с ними пропадают надписи на экране и
перевод песен. Гасить надо только полные, forced/надписи — оставлять.

⚠️ Уточнение (владелец, 2026-07-30): **в папочном режиме никакая БД и никакой манифест для этого не
нужны** — дорожки читаются прямо из контейнера, и forced там обычно уже помечен. Ниже — два разных
случая, их нельзя путать.

**Папочный режим — данные уже в файле, не хватает только их прочитать:**

- [x] ✅ 2026-07-30: `disposition` дописан в `-show_entries` и у `getSubtitleTracks`, и у
      `getAudioTracks` (`main/ffmpeg/probe.ts`). Флаги нормализуются в `isDefault`/`isForced`
      (ffprobe отдаёт 0/1) и доходят до UI: `MediaInfo` → `useFolderPlayer` → `useFolderModeUI` →
      `TrackSelector`, где рядом с кодеком появился бейдж «Forced»
- [x] ✅ **Классификация по названию дорожки** — сделана. `title` из `stream_tags` теперь разбирается
      («Надписи», «Signs & Songs», «Forced», «Караоке»)
- [x] ♻️ **Классификатор сведён к одной функции** —
      `detectSubtitleType({ filePath, title, disposition })` в `shared/utils/subtitle-type.ts`,
      покрыта 17 unit-тестами. Работает для внешних файлов (путь + имя папки + суффикс) и для
      встроенных дорожек (`title` + `disposition`). Node-зависимостей нет — при выносе в
      `libs/folder-scan` (§3) переезжает как есть.
      ⚠️ **Приоритет признаков решён явно** (это выяснилось тестом, а не сразу): название дорожки >
      имя файла/папки > `forced`. Причём `forced` учитывается **только** у безымянной дорожки: в
      рипах полные субтитры иногда помечают forced, чтобы плеер включал их сам, и трактовать такой
      флаг как «надписи» — значит гасить полные субтитры в режиме «Озвучка» ровно наоборот.
      Информация не теряется: `isForced` живёт отдельным полем, и режим «Озвучка» может оставлять
      forced-дорожки видимыми независимо от их типа
- [ ] Проверить `MediaInfoWasmProber` (§6) на том же: MediaInfo отдаёт `Forced: Yes` — сверить с
      выходом ffprobe в тесте сравнения проберов

**Библиотечный режим (импорт в БД + раздача по IPFS) — здесь хранить действительно негде:**

- [ ] Миграция БД: `isForced` у `SubtitleTrack` и `AudioTrack` (в схеме есть только `isDefault`)
- [ ] Поле в `AnimeManifest`/`EpisodeManifest` — при транскоде и раздаче флаг из контейнера теряется,
      а в папочном режиме он всегда под рукой. Это и есть причина разницы между двумя случаями
- [ ] ⏰ Привязка к §15.3: поле в манифест добавлять **до** массовой перезаливки библиотеки

#### 19.5 Приёмка

Папка, где есть `ja` и `ru` аудио плюс `ru` и `en` субтитры: переключение режима меняет **обе**
дорожки одним действием; при недостижимом предпочтении показывается причина; выбор держится между
сериями и между запусками приложения; в режиме «Озвучка» forced-надписи остаются видны.

### 20. Отдельное расследование: два standalone-плеера

Задача владельца (2026-07-30) — разобраться отдельно, а не походя внутри §19.
**Расследование проведено 2026-07-30, выводы ниже.**

| Плеер                            | Размер                   | Как собирается          | Куда попадает                          |
| -------------------------------- | ------------------------ | ----------------------- | -------------------------------------- |
| `web-player/src/player.ts`       | 605 строк                | esbuild (`build.mjs`)   | `extraResources` → `web-player/`       |
| inline внутри `asset-bundler.ts` | ~290 строк JS (файл 897) | генерируется строкой JS | `play/` в `directoryCid` + web-экспорт |

#### 20.1 ✅ Ответ: `web-player/dist` в рантайме недостижим

Цепочка вызовов доказана по коду целиком:

1. `web-player/dist` читает **только** `copyPlayerAssets()`
   ([asset-bundler.ts:104–144](main/services/web-export/asset-bundler.ts)).
2. `copyPlayerAssets()` вызывается **только** из `bundleAssets()` (там же, строка 208).
3. `bundleAssets()` вызывается **только** из `WebExportManager.startExport()`
   ([web-export-manager.ts:104](main/services/web-export/web-export-manager.ts)) — и только в
   ветке режимов `embedded` / `referenced`.
4. Режим приходит из renderer'а: `webResourceMode` в
   [use-export-dialog-state.ts:74](renderer/src/components/library/export/use-export-dialog-state.ts)
   инициализируется как `'publish'`, а сеттер `setWebResourceMode` **экспортируется, но не
   вызывается нигде** — в UI переключателя режима нет (кнопка так и подписана «Опубликовать в
   IPFS»).
5. Значит реально исполняется только `publish` → `publishVirtual()` →
   `buildDirectoryStructure()` → **inline-плеер**.

Плюс сам исходник это уже признаёт: [player.ts:294](web-player/src/player.ts) —
«этот dev-плеер не используется в production».

**Что за это платится:** `node web-player/build.mjs --prod` стоит в **7 таргетах сборки**
(`build`, `build:win`, `build:linux`, `build:mac`, `release:*`), а `web-player/dist` (28 КБ)
попадает в `extraResources` ([electron-builder.yml:306](electron-builder.yml)). Размер
незначителен — цена в другом: два разных плеера поддерживаются как живые.

- [ ] Решение владельца: удалить `web-player/` целиком (+ шаг сборки, + `extraResources`, +
      `copyPlayerAssets`/`generateIndexHtml`, + `bundleAssets` если режимы `embedded`/`referenced`
      признаны мёртвыми) **или** оставить как основу для §20.4. Третьего состояния («лежит и
      собирается, но не используется») быть не должно

#### 20.2 Пользователи видят inline-плеер

`<gateway>/ipfs/<cid>/play/` собирается
[play-folder-builder.ts:186](main/services/ipfs/play-folder-builder.ts) → тот же
`buildDirectoryStructure()` → `generateIndexHtmlContent()`. То есть **весь пользовательский путь
идёт через inline-плеер**, а esbuild-плеер не видит никто.

Дополнительно: два плеера даже не взаимозаменяемы по расположению — esbuild-версия рассчитана
жить в подпапке `player/` и тянет `../manifest.json`, inline — лежать в корне и тянуть
`./manifest.json`.

#### 20.3 Таблица «фича × плеер» (по коду, 2026-07-30)

| Фича                                           | esbuild `player.ts`                | inline в `asset-bundler.ts`        |
| ---------------------------------------------- | ---------------------------------- | ---------------------------------- |
| Выбор аудиодорожки по ключу `language:title`   | ✅                                 | ✅                                 |
| Дефолты дорожек из `manifest.defaults`         | ✅                                 | ✅                                 |
| Раздельная аудиодорожка + синхронизация (1 с)  | ✅                                 | ✅                                 |
| Автопереход на следующую серию                 | ✅                                 | ✅ (с сохранением дорожек)         |
| **ASS-субтитры (SubtitlesOctopus)**            | ❌ заглушка                        | ✅                                 |
| **Сохранение прогресса (localStorage)**        | ❌                                 | ✅ (ключ `animatrona-<cid>`)       |
| **Запоминание выбора дорожек между сериями**   | ❌                                 | ✅                                 |
| **Горячие клавиши** (`space/k/j/l/m/f`, ±10 с) | ✅                                 | ❌                                 |
| Индикатор буферизации                          | ✅                                 | ❌                                 |
| Перетаскивание прогресс-бара (mousedown+move)  | ✅                                 | ❌ (только клик)                   |
| Клик по кадру = пауза                          | ✅                                 | ✅                                 |
| Главы (OP/ED) — в манифесте есть               | ❌ не читает                       | ❌ не читает                       |
| Fallback по нескольким IPFS-гейтвеям           | ❌ список из 4, используется `[0]` | ❌ список из 2, используется `[0]` |
| Чтение `manifest.version` / `generatorVersion` | ❌                                 | ❌                                 |

Вывод по фичам: **ни один не является надмножеством другого** — горячие клавиши и буферизация
есть только в мёртвом, ASS и прогресс только в живом. Поэтому «просто удалить один» без переноса
двух-трёх фич будет регрессией для пользователя.

#### 20.4 Единый бандл на `@letar/video-player-core` — технически возможен

- `@letar/video-player-core` — vanilla, единственная зависимость `shaka-player` и **только как
  `import type`** (инстанс инжектится параметром `init({ Shaka })`). Значит `KeyboardHandler`,
  `AudioSyncManager`, `ControlsAutoHide`, `SubtitleManager`, `format-time`, `srt-to-vtt`
  импортируются в standalone-бандл без единой рантайм-зависимости.
- Ограничение «без сборщика и без сети на гейтвее» **не нарушается**: esbuild собирает один IIFE
  на этапе сборки Animatrona, а `asset-bundler` затем читает готовый файл с диска и кладёт его в
  директорию — вместо того чтобы держать ~290 строк JS шаблонной строкой внутри TS.
- Побочная выгода: сегодняшний inline-код не покрыт ни линтером, ни типами, ни тестами (он —
  строка), а бандл из `.ts` покрывается всем.
- `KeyboardHandler` уже умеет русскую раскладку — standalone-плеер получит горячие клавиши
  бесплатно, а это одна из двух фич, из-за которых мёртвый плеер нельзя просто удалить.
- SubtitlesOctopus остаётся внешним скриптом (`lib/subtitles-octopus/`), как сейчас: он и не
  собирается бандлером, его файлы уже кладутся в директорию.

- [ ] Порядок работ, если решение «объединять»: собрать `web-player` на `video-player-core` →
      перенести в него ASS + localStorage-прогресс + запоминание дорожек из inline-версии →
      переключить `buildDirectoryStructure()` на чтение готового бандла → удалить
      `generateIndexHtmlContent()` → проверить на живом гейтвее → только потом удалять старое

#### 20.5 Версионирование манифеста — пишется, но не читается

`generateManifest()` кладёт `version: 2`, `createdAt` и `generatorVersion: app.getVersion()`
([manifest-generator.ts:125–142](main/services/web-export/manifest-generator.ts)). **Ни один из
двух плееров не читает ни одно из трёх полей** (проверено грепом: единственное упоминание
`generatorVersion` вне генератора — объявление типа в `shared/types/web-player.ts`). Локальный
интерфейс манифеста в `player.ts` вообще не знает про `createdAt`/`generatorVersion`, а `version`
объявлен и не проверяется.

- [ ] Раз старые раздачи останутся в сети навсегда (§22.6), плеер обязан хотя бы честно сказать
      «манифест новее, чем я умею», а не молча отвалиться. Минимум — проверка `version` на входе

**Зачем это до §19:** пока плееров два, механизм предпочтений дорожек придётся писать дважды. Хуже
то, что он **уже** написан дважды по-разному — и именно в главном desktop-плеере его нет вовсе.

### 21. 🔴 Чек-лист перед полным перезаливом библиотеки

Владелец готовит полный перезалив **сейчас** (2026-07-30). Задача раздела — чтобы второго
перезалива не потребовалось. Ниже — аудит формата по коду, а не по памяти.

#### 21.1 Сначала главное: что вообще требует повторной заливки

Разделение по стоимости восстановления — от него зависит, что блокер, а что нет:

| Класс                                                                                                      | Как восстанавливается                                                                   | Блокер? |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| **A.** Поля манифеста, данные для которых есть в БД или в API (метаданные, жанры, внешние ID, en-переводы) | `regenerateAll` — пересборка манифеста и directory listing, **видео не перезаливается** | нет     |
| **B.** Файлы, которые физически не залиты в IPFS (не выбранные дорожки, шрифты)                            | только из исходника — а он после импорта удаляется                                      | **да**  |
| **C.** Результат транскода (профиль, CQ, битность, кодек)                                                  | повторный транскод из исходника, часы GPU                                               | **да**  |

⚠️ Ключевое, что легко перепутать: **добавление поля в манифест — это класс A.** В IPFS изменение
JSON внутри директории меняет только CID директории, блоки видео остаются те же. `buildAnimeDirectory`
уже умеет собирать директорию из существующих CID. То есть «мы забыли поле в манифесте» ≠ «нужен
перезалив».

#### 21.2 Ложная тревога: сырой дамп ffprobe уже сохраняется

Я поднимал forced-флаг (§19.4) как блокер перезаливки. Проверил — **это не так**, страховка уже
встроена:

- `getFullProbe` ([demux.ts:70](main/ffmpeg/demux.ts)) вызывает
  `ffprobe -show_format -show_streams -show_chapters -of json` **без `-show_entries`** → ffprobe
  отдаёт всё, включая `disposition` (`forced`/`default`) каждого потока
- этот сырой вывод кладётся в `metadata.json` как `ffprobeRaw`
  ([demux.ts:535](main/ffmpeg/demux.ts)), заливается в IPFS и попадает в `directoryCid` как
  `episodes/NN/meta/metadata.json` (поле `EpisodeManifest.metadataCid`)
- связь «поток исходника → дорожка манифеста» есть: у `ManifestAudioTrack`/`ManifestSubtitleTrack`
  хранится `streamIndex`

Значит forced, названия дорожек, теги контейнера и главы можно достать позже **без исходника** —
из уже пропинненного дампа. Это класс A, а не блокер. Вывод шире: **сырой дамп страхует от любых
будущих полей, которые читаются из исходника.**

- [ ] Но проверить на пилоте: `metadataCid` заполняется не у всех записей — в
      [import-service.ts:337](main/services/import/import-service.ts) он местами сбрасывается в
      `null`, а [cid-recovery.ts:213](main/services/ipfs/cid-recovery.ts) умеет генерировать
      «минимальный metadata.json из данных БД», когда оригинал потерян. То есть у части старой
      библиотеки полного дампа нет. **Условие приёмки перезаливки: у каждого эпизода есть
      `metadataCid` с настоящим `ffprobeRaw`, а не с суррогатом из БД**

#### 21.3 Настоящие блокеры — класс B: что не залито, того потом не будет

- [ ] **Заливать ВСЕ субтитры, а не выбранные.** Субтитры весят килобайты — экономить на них
      бессмысленно, а достать потом можно только из исходника
- [ ] **Заливать ВСЕ вложенные шрифты (attachments).** В плане пиннинга шрифты помечены как
      «некритичная потеря» ([anime-directory-builder.ts:668](main/services/ipfs/anime-directory-builder.ts)
      — «Без recovery — мёртвые шрифты»). Для ASS это **не** некритично: без нужного шрифта надписи
      и караоке рендерятся другим шрифтом, то есть не так, как задумал фансабер. Пересмотреть
      решение до перезаливки
- [ ] **Решить про неиспользуемые аудиодорожки.** Здесь экономия реальная (гигабайты), поэтому
      правило должно быть осознанным, а не случайным. Минимум — записывать в манифест список
      **отброшенных** дорожек (язык, название, кодек, размер), чтобы потом было видно, что именно
      потеряно и стоит ли доставать
- [ ] **`isForced` / `SubtitleType` в манифесте.** Данные восстановимы из дампа (§21.2), но раз
      перезалив всё равно идёт — записать их сразу в `ManifestSubtitleTrack`/`ManifestAudioTrack`
      (`isForced`, `kind: 'full' | 'signs' | 'songs'`), чтобы плееры не разбирали сырой ffprobe

#### 21.4 Главное необратимое решение — параметры транскода (класс C)

Это единственное, что действительно нельзя переделать дешёвым способом.

- [ ] **Зафиксировать и записать профиль до старта**, а не подбирать по ходу: кодек, CQ/CRF,
      битность (8 vs 10), пресет, целевой VMAF. `ManifestEncodingInfo` сохраняет всё это (включая
      `ffmpegCommand` и `vmafScore`) — но только то, чем реально кодировали
- [ ] **10-bit решается один раз.** Транскод 10-бит исходника в 8-бит необратим: полосы на градиентах
      обратно не убрать. Для аниме (плавные градиенты, тёмные сцены) это заметно
- [ ] **Пилот на 1–2 тайтлах до массового прогона:** перезалить, открыть в плеере, проверить
      `contentHealth`, посмотреть глазами на тёмную сцену и на надписи. Только потом запускать всё
- [ ] Прикинуть общее время GPU и место в IPFS заранее — чтобы перезалив не встал на середине

#### 21.5 Страховка, которая делает всё остальное восстановимым

Если исходник можно скачать заново, класс B перестаёт быть страшным.

- [ ] **Сохранять `.torrent` + `magnetURI` + `infoHash` для каждого аниме.** Сейчас: `.torrent`
      заливается в IPFS (`sourceTorrentCid`, попадает в `source/source.torrent`) и в `source.json`
      лежит ссылка на страницу раздачи. Но `infoHash` и `magnetURI` живут только в
      `TorrentDownload` (модель качалки, запись может быть удалена) и **в `source.json` их нет**
- [ ] Расширить `sourceDoc` в [anime-directory-builder.ts:342](main/services/ipfs/anime-directory-builder.ts):
      `infoHash`, `magnetURI`, оригинальные имена файлов исходника, размеры. Это килобайты, а даёт
      возможность восстановить исходники через годы, даже если БД потеряна целиком
- [ ] Для тайтлов, залитых **не** с торрента, — записывать хотя бы оригинальные имена файлов и их
      размеры/чексуммы. Сейчас в манифесте нет ни имени исходного файла, ни хеша

#### 21.6 Что можно спокойно отложить (не блокеры)

Фиксирую отдельно, чтобы перезалив не разросся до бесконечности:

- **Двуязычные метаданные и внешние ID (§15)** — приходят из API, добавляются пересборкой
  манифеста. ⚠️ Но `Anime.shikimoriId` как единственный `@unique`-ключ стоит расширить **до**
  перезаливки: иначе при реимпорте через другой провайдер записи не сматчатся и появятся дубликаты
- **Спрайты превью, скриншоты, аудио-отпечатки OP/ED** — генерируются из видео, а видео останется
  в IPFS. Позже потребуют только скачивания из IPFS, не исходника
- **Структура директории** (`play/`, `source/`, `meta/`) — пересобирается дешево
- **`generatorVersion` / `version: 1`** в манифестах уже есть — версионирование формата заложено,
  читатели смогут отличить старые документы от новых

#### 21.7 Порядок действий

1. Расширить `sourceDoc` (§21.5) и внешние ID в БД (§21.6) — это правки на пару часов
2. Включить заливку всех субтитров и шрифтов (§21.3)
3. Добавить `isForced`/`kind` в манифест (§21.3)
4. Зафиксировать профиль транскода письменно (§21.4)
5. Пилот на 1–2 тайтлах + проверка `contentHealth` и глазами
6. Только после этого — массовый прогон

### 22. Инфраструктурные риски перезаливки (могут стоить третьего захода)

Формат манифеста — не единственное, что способно испортить перезалив. Ниже то, что проверено по
коду и требует решения **до** массового прогона.

#### 22.1 🔴 Где будет жить контент — главный вопрос

Прошлый раз библиотека потерялась вместе с пиннер-сервером, и именно поэтому идёт перезалив. Если
новый контент осядет только на локальной ноде, третий перезалив — вопрос времени (сдохший диск,
переустановка Windows, потерянный `~/.ipfs`).

Инструменты уже есть: удалённый пиннинг реализован через **Pinata**
([pinata-service.ts](main/services/pinata-service.ts), [remote-pin.handlers.ts](main/ipc/remote-pin.handlers.ts))
плюс [pin-queue-poller.ts](main/services/ipfs/pin-queue-poller.ts) для очереди.

- [ ] Посчитать стоимость: сколько гигабайт займёт библиотека после транскода и во что это встаёт
      на Pinata в месяц. Если дорого — решить, что пиннится удалённо (редкое и невосстановимое),
      а что живёт только локально
- [ ] Рассмотреть свою вторую ноду (например, Kubo на s2) как более дешёвый пиннер и/или зеркало
- [ ] **Автоматизировать**: `directoryCid` должен уходить в удалённый пин сразу после сборки, а не
      «когда-нибудь руками». Иначе часть библиотеки останется незастрахованной, и узнаем мы об этом
      снова после потери
- [ ] Проверить, что удалённый пин реально подтверждён (`pinata.isPinned`), а не просто поставлен в
      очередь — «поставили в очередь» и «контент сохранён» это разные состояния

#### 22.2 Место на диске: старое не исчезает само

При пересборке старые `directoryCid` остаются пропинненными — в
[anime-directory-builder.ts:1079](main/services/ipfs/anime-directory-builder.ts) прямо записано, что
`pin.rm` на дочерние CID намеренно не делается («избыточная оптимизация, создаёт лишние риски»).
Значит во время перезаливки на диске одновременно лежат старая и новая версии.

- [ ] Прикинуть пик занятого места **до** старта: старая библиотека + новая + temp-файлы транскода
- [ ] Порядок операций строго такой: залить новое → проверить полноту → unpin старое → `repo gc`.
      Инструменты готовы: [bulk-unpin.ts](main/services/ipfs/bulk-unpin.ts) (быстрый массовый
      `pin.rm`), `repoGc` в [pin-status-service.ts](main/services/ipfs/pin-status-service.ts),
      [orphan-audit.ts](main/services/ipfs/orphan-audit.ts) для поиска осиротевших пинов
- [ ] ⚠️ Никогда не наоборот. Unpin+gc до проверки полноты — это потеря данных без права на отмену

#### 22.3 Возобновляемость: прогон на десятки часов упадёт хотя бы раз

- [ ] Проверить, что массовый прогон переживает перезапуск приложения, падение GPU и обрыв IPFS —
      `ImportQueueItem` персистентный, но надо убедиться, что эпизод не остаётся в состоянии
      «половина дорожек залита», и что повтор не создаёт дубликаты
- [ ] Логи прогона писать в файл, а не только в консоль: разбираться в том, что случилось на 30-м
      часу, придётся уже после падения

#### 22.4 Бэкап перед стартом

- [ ] Копия `app.db` до начала (это **рабочая** библиотека, не тестовые данные — в PLAN уже
      отмечалось, что сброс dev-БД уничтожит реальную библиотеку)
- [ ] Плюс экспорт в человекочитаемый JSON (список тайтлов, эпизодов, CID) — страховка от потери
      самой схемы и способ сверить «до/после»

#### 22.5 Автоматическая проверка полноты вместо глаз

Прецедент уже был: v0.52.3 — молчаливые потери дорожек не попадали в `contentHealth`, потому что
отфильтровывались ещё в SQL-запросе. Глазами такое не ловится.

- [ ] Верификатор «залито ли всё, что было в исходнике»: читает `ffprobeRaw` из
      `episodes/NN/meta/metadata.json` в IPFS и сверяет с манифестом — совпадает ли число
      аудиодорожек, субтитров, шрифтов, глав. Расхождение = отчёт, а не тишина
- [ ] Прогонять его после каждого тайтла в массовом прогоне, а итог складывать в сводный отчёт

#### 22.6 Старые ссылки после перезаливки

`publishLibrary` и IPNS в приложении есть ([publisher.handlers.ts](main/ipc/publisher.handlers.ts)),
подписки читают опубликованную библиотеку. Значит старые `directoryCid` могли уже разойтись —
у подписчиков, в переписке, на трекере.

- [ ] Сохранить таблицу `старый directoryCid → новый` (весит килобайты). Без неё невозможно даже
      понять, на что указывала мёртвая ссылка
- [ ] Решить, обновляется ли опубликованная библиотека/IPNS-запись автоматически по ходу перезаливки

### 23. Задачи на следующую сессию

Обе задачи владелец поставил отдельными прогонами (2026-07-30), **гуглить разрешено и нужно**.

#### 23.1 Полный прогон: что обязательно должно лежать в `directoryCid`

Не выборочная проверка, как в §21, а систематический обход: пройти по **всем** сущностям БД и
артефактам импорта и по каждой ответить — попадает ли она в `directoryCid`, нужна ли там, и что
случится, если её там не окажется.

Что проверить обязательно (список открытый, не исчерпывающий):

- каждая модель `schema.zmodel`, имеющая `*Cid`-поле, — есть ли она в дереве директории
- всё, что читается из исходника при импорте: дорожки, шрифты, главы, теги, вложения
- пользовательские данные (`WatchProgress`, `watchStatus`, `userRating`) — по принципу минимума БД
  они **не** должны попадать в раздачу; убедиться, что не протекают
- изображения студий/персонала/персонажей, постеры, баннеры, скриншоты, спрайты
- источник: `.torrent`, `magnetURI`, `infoHash`, имена и размеры исходных файлов (§21.5)
- сам плеер (`play/`) и его зависимости — SubtitlesOctopus, шрифты, wasm: раздача должна открываться
  на голом гейтвее без Animatrona

Погуглить для сверки с чужим опытом:

- как метаданные упаковывают Jellyfin/Kodi (NFO), AniDB, MediaInfo XML — какие поля они считают
  обязательными, чего у нас нет
- практики упаковки датасетов в IPFS: CAR-архивы (`ipfs-car`), DAG-JSON, версионирование через IPNS.
  Отдельно проверить гипотезу: **CAR-экспорт одного тайтла как единый файл-бэкап** — это дало бы
  восстановление без работающей IPFS-сети
- как чужие проекты решают «раздача должна открываться через 5 лет без нашего софта»

Критерий готовности: таблица «сущность → лежит в directoryCid → критичность потери → решение», по
которой видно, что перезалив ничего не забыл.

#### 23.2 UI/UX-исследование и улучшение опыта

Отдельный прогон, не «сделать красиво по ходу дела». Охват — и папочный плеер (§18, §19), и сама
Animatrona: библиотека, каталог, импорт, очередь, настройки.

Метод:

1. Пройти основные сценарии как пользователь, а не как автор кода: первый запуск, импорт первого
   тайтла, просмотр серии, возврат через неделю, поиск в большой библиотеке
2. Сравнить с чужими решениями — **погуглить и посмотреть**: Seanime (+ его плеер Denshi), Miru,
   Jellyfin, Plex, Stremio, mpv с uosc, а также Crunchyroll и Netflix как эталон массового UX.
   Смотреть не на красоту, а на конкретные разрывы: сколько шагов до просмотра, что показано без
   клика, где приходится думать
3. Прогнать `/audit:ui-ux-audit` и привлечь агента `ui-architect` — они дают формальную часть
   (контраст, размеры целей, WCAG, консистентность)
4. Свести в список с приоритетами, а не в поток замечаний: «ломает сценарий» / «раздражает» /
   «косметика»

Что уже известно и должно войти во вход этой задачи:

- §18 (клик по видео, задержки дорожек, горячие клавиши, indicator'ы) и §19 (режим озвучка/сабы)
- Из наблюдений: главный экран для нового приложения — не библиотека, а «продолжить смотреть»;
  для плеера главный вход — двойной щелчок по файлу, а не иконка (§6.2)
- Локализация (§14) меняет вёрстку: en-строки местами длиннее русских, кнопки и бейджи поедут

Критерий готовности: приоритизированный список с оценкой трудоёмкости, из которого можно набрать
спринт, плюс отдельно вынесенные «ломает сценарий» — их починить сразу.

#### 23.3 Системные находки монорепо — тоже отдельная сессия

Найдено по ходу планирования 2026-07-30. Владелец распорядился разбирать отдельной сессией, а не
попутно. Каждый пункт самодостаточен — можно брать по одному.

**Разобрано в сессии 2026-07-30** (отдельная сессия по этому разделу): расследование §20 доведено
до выводов, оба быстрых фикса сделаны, вся документация написана. Остались решения владельца —
они помечены ниже.

**Дублирование и shared-first:**

- [x] **Два standalone-плеера** — расследование проведено, выводы и таблица «фича × плеер» в §20.
      Кратко: `web-player/dist` в рантайме недостижим (доказано по цепочке вызовов), пользователи
      видят inline-плеер, ни один не надмножество другого. Остаётся **решение владельца** — удалять
      мёртвый или делать из него единый бандл на `@letar/video-player-core` (§20.1, §20.4)
- [x] **Классификатор «надписи/песни» работает только для внешних файлов** — сведён к одной функции
      `detectSubtitleType({ filePath, title, disposition })` в `shared/utils/subtitle-type.ts`
      (17 unit-тестов). Применён и к встроенным дорожкам в `probe.ts`, тип `SubtitleType` больше не
      объявлен в четырёх местах — три из них теперь реэкспорт единого источника. При выносе в
      `libs/folder-scan` (§3) модуль переезжает целиком: Node-зависимостей в нём нет
- [ ] **Папочный плеер целиком лежит внутри приложения** (~2.5к строк в `renderer/src/app/player/`),
      хотя переиспользуется вторым приложением. Это Фаза 1 (§5) — здесь только отметка, что находка
      относится к тому же классу «должно быть в `libs/`»

**Быстрые фиксы, которые не требуют большого контекста:**

- [x] **Клик по видео не ставит паузу** — `stopPropagation` с контейнера video убран, добавлен
      `onDoubleClick` → полный экран (второй `click` двойного гасится по `event.detail`, состояние
      воспроизведения откатывается, чтобы фулскрин не оставлял видео на паузе). Закрыто e2e-тестом
      `apps/animatrona-e2e/src/04-player/video-click.electron.spec.ts` — **тест проверен на старом
      билде и падает на нём**, то есть баг он реально ловит. ⚠️ Зелёный прогон ждёт починки
      `next build` (см. ниже)
- [x] **`disposition` не запрашивается у ffprobe** — дописан в `-show_entries` для аудио и
      субтитров, `isDefault`/`isForced` прокинуты до UI, в `TrackSelector` появились бейджи
      «Forced» и «Надписи»/«Песни» (для внешних файлов бейдж типа тоже заработал — тот же
      классификатор). Побочно: `usePlayerControls.togglePlay` больше не роняет unhandled
      `AbortError` при быстрой смене play/pause

**Документация:**

- [x] Заметка про **`app://` вместо `file://`** —
      [electron-app-protocol.md](/.claude/docs/electron-app-protocol.md) (почему `file://` ломает
      Worker/WASM, готовый код привилегированной схемы, таблица выбора `file://` / `app://` /
      localhost-сервер, как отличить проблему origin). `.claude/rules/electron.md` дополнен, ссылка
      добавлена в корневой `CLAUDE.md`. Попутно `apps/animatrona/**` добавлен в `paths:` правила —
      раньше правила Electron в этой папке не подхватывались
- [x] Скилл **`/create:new-electron-app`** — создан
      ([.claude/commands/create/new-electron-app.md](/.claude/commands/create/new-electron-app.md)):
      генератор, выбор `app://` против `file://`, ассоциации файлов + single instance lock (с
      ловушкой «путь пришёл раньше, чем renderer готов»), грабли платформы, headless-проверка main
      через `npx electron scripts/verify-*.cjs`, правила против ложно-зелёных e2e. Заглушка в
      `/create:new-app` теперь ведёт на него
- [x] Зафиксировано в скилле [`i18n-multilingual`](/.claude/skills/i18n-multilingual/SKILL.md), что
      стеков **два и это осознанно** (решение 2026-07-30): таблица «окружение → стек», причина
      (next-intl завязан на RSC/middleware/локаль в URL и не работает в либах, Vite и Node) и прямой
      запрет «унифицировать». Описание скилла тоже обновлено, иначе агент с задачей по Electron его
      не найдёт

**Найдено попутно в этой же сессии (в исходном списке не было):**

- [ ] 🔴 **`next build` renderer'а падает** на пререндере `/_not-found`:
      `InvariantError: Expected workStore to be initialized`. Проверено отложением своих правок —
      **воспроизводится и без них**, то есть источник в другом месте (в рабочей копии на момент
      сессии были чужие незакоммиченные изменения renderer'а). Пока не починено, нельзя собрать
      `dist/win-unpacked`, а значит и прогнать electron-e2e на свежем коде
- [ ] 🔴 **Main-процесс не типизируется вообще ничем.**
      `apps/animatrona/main/tsconfig.json` имеет `include: ["src/**/*.ts", "preload/**/*.ts",
"../shared/**/*.ts"]`, а код лежит в `main/ffmpeg`, `main/services`, `main/ipc`, `main.ts` —
      под `src/**` не попадает почти ничего. Корневой `tsconfig.json` приложения `main` вообще
      исключает, а webpack собирает через `ts-loader` с `transpileOnly: true`. Ad-hoc прогон tsgo по
      исправленному include даёт **337 ошибок** (часть — артефакты `moduleResolution: node16`, но
      далеко не все). Задача: починить include, разделить конфиг под реальную сборку, разгрести
      ошибки. До этого любая правка в `main/` типами не проверена
- [ ] **Все 4 e2e-теста плеера молча скипались** (`04-player/folder-player.electron.spec.ts`):
      искали `getByRole('link', { name: /плеер/i })`, а пункты сайдбара — `Box as="button"`
      ([Sidebar.tsx:160](renderer/src/components/layout/Sidebar.tsx)). Локатор не находился →
      `test.skip()` → зелёный репорт при нулевой проверке. В новом `video-click` спеке locator
      исправлен и скипы убраны; остальные четыре ждут той же правки (и, вероятно, покажут реальные
      баги, когда наконец начнут выполняться)
- [ ] **Два форматтера с противоречащими конфигами.** `dprint.json` (`trailingCommas:
onlyMultiLine`) против `.prettierrc` (`trailingComma: es5` + `prettier-plugin-organize-imports`).
      `nx format` = prettier убирает висячие запятые в списках параметров и переставляет импорты,
      хук на запись файла = dprint возвращает обратно. Из-за этого в рабочей копии постоянно висят
      «изменённые» файлы без единой смысловой правки. Нужно выбрать один и вычистить второй из
      документации/хуков

## Открытые задачи

- [ ] **Обновить Electron 42.8.0 → 43.2.0** (root `package.json`, animatrona своей версии не
      пинит — использует корневую)

  Часть более широкого дрейфа версий Electron по монорепо — обновлять здесь первой, как
  референс, но **сразу за ней подтянуть остальные три electron-приложения**, которые сидят
  на куда более старых мажорах и рискуют разъехаться ещё сильнее:
  - `kami-key-the` — `^40.6.1`
  - `label-printer-desktop` — `^39.2.7`
  - `poster-microtext-desktop` — `42.6.1` (точный пин, submodule)

  **Риск: средний/высокий** (оценка из ревью major-обновлений, 2026-07-30). Что проверить
  руками при апдейте именно animatrona:
  - `postinstall`/`postinstall:dev` в `package.json` (строки 17-18) жёстко пересобирают
    нативный модуль `classic-level` под ABI `41.0.0` через `@electron/rebuild` — уже
    рассинхронизировано с текущим Electron 42.x, при апдейте до 43 сверить актуальный ABI
    Electron 43 и поправить версию в обеих командах;
  - IPFS/kubo-стек (`kubo`, `kubo-rpc-client`) и sql.js WASM-миграции — проверить, что
    нативные модули вообще пересобираются под новый ABI, не только `classic-level`;
  - GUI руками не протестировать в песочнице Claude Code (см. `.claude/rules/electron.md`
    «Грабли») — после апдейта нужен реальный живой запуск у Ками, не считать «собралось» за
    «работает».

- [ ] **Автоопределение глав (OP/ED) для папочного режима плеера (`/player`)**

  ⚠️ **Переносится в Фазу 3 плана Animatrona Player** (см. раздел выше): после введения
  интерфейса `MediaProber` главы отдают обе реализации, и кнопка «Пропустить опенинг» появляется
  сразу в двух приложениях. Классификацию брать из `@letar/video-player-react`
  (`utils/detect-chapter-types.ts`), а не дублировать из `main/services/import/helpers.ts`.

  **Проблема:** при импорте в библиотеку (`main/services/import/chapter-creator.ts`
  `createChapters()`) главы из контейнера (ffprobe `-show_chapters`) классифицируются через
  `detectChapterType`/`isChapterSkippable` (`main/services/import/helpers.ts`) и попадают в
  IPFS-манифест эпизода → плеер показывает кнопку «Пропустить опенинг/эндинг». В папочном режиме
  (`/player`, просмотр файлов с диска без импорта в библиотеку) этого нет вообще — `useFolderPlayer.ts`
  (`scanTracksForEpisodeInternal`) вызывает `getCachedProbe()`, который уже возвращает
  `mediaInfo.chapters` (`main/ffmpeg/probe.ts` `getChaptersAndAttachments()` — `-show_chapters`
  входит в тот же ffprobe-вызов, что уже делается для аудио/видео/субтитров, **дополнительного
  прохода ffmpeg не требуется**), но `embeddedTracks` в `useFolderPlayer.ts` (строки ~262–281)
  берёт из `mediaInfo` только `audioTracks`/`subtitleTracks` — `chapters` отбрасывается.

  **План реализации:**
  1. `useFolderPlayer.ts`: прокинуть `mediaInfo.chapters` в `embeddedTracks` (или отдельное поле
     `FolderPlayerState.chapters`) наряду с audio/subtitles.
  2. Классификация типа (OP/ED/RECAP/PREVIEW) — переиспользовать `detectChapterType`/
     `isChapterSkippable` из `main/services/import/helpers.ts` (та же логика, что при импорте, не
     дублировать эвристику).
  3. Конвертация в формат плеера — по аналогии с `manifestChapterToPlayerChapter()`
     (`renderer/src/components/player/chapter-utils.ts`), но из секунд ffprobe (`{start, end,
title}`), а не из мс IPFS-манифеста (`ManifestChapter`) — нужен паралелльный конвертер
     `probeChapterToPlayerChapter()` рядом с существующим.
  4. Передать `chapters` в `<VideoPlayer>` на `/player/page.tsx` (проп уже поддерживается
     компонентом для библиотечного режима — `ChapterEditor.tsx`/кнопка пропуска уже умеют её
     рендерить, нужно только запитать данными в папочном режиме).

  По ресурсам — бесплатно (данные уже вычисляются существующим ffprobe-вызовом), вся работа в
  этой задаче — прокинуть уже готовые данные через слои, которые их сейчас отбрасывают.

### Производительность

- [ ] **Аудит производительности — молниеносный рендер как у нативного приложения**

  **Цель:** Приложение должно рендериться мгновенно — открытие каталога, навигация, скролл.

  #### Направления аудита

  **Список аниме (критично):**
  - [x] Виртуализация списка — сделано в v0.55.3/0.55.5, общий хук `useVirtualizedGrid` (v0.55.8)
  - [x] Infinite scroll (v0.55.15/0.55.16, см. отдельная задача ниже)
  - [x] **Мемоизация `AnimeCard` через `React.memo`** (v0.55.9) — сам `memo` стоял с самого начала,
        но **не работал**: `AnimeGrid`/`FranchiseView` считали `genres={anime.genres?.map(...)}`
        прямо в разметке, создавая новый массив на каждом рендере. Виртуализатор перерисовывает
        сетку на каждый тик скролла → мемоизация обнулялась и все видимые карточки рендерились
        заново каждый кадр. `genreNames` вынесен в `useMemo` в `use-library-page.ts`; заодно
        стабилизировался `ipfsSizeBreakdown` (был новый объект на каждом пересчёте).
  - [x] Debounce на фильтрах/поиске — уже был: `useDebounce(searchInput, 250)` в `use-library-page.ts`
  - [x] **Оптимизация изображений постеров** (v0.55.13) — `AnimeCard` (главная сетка) уже
        использовал `next/image`. Добавлены `loading="lazy"` + `decoding="async"` к обычным Chakra
        `Image` в невиртуализированных списках: `RelatedAnimeRow.tsx`, `FranchiseTimeline.tsx`,
        `EpisodeCard.tsx`, `VideoSection.tsx`, `AnimeMetadataSection.tsx`.

  **Запросы к БД:**
  - [x] Индексы на часто фильтруемых полях — проверено: `status`, `year`, `watchStatus`, `name`,
        `shikimoriId`, `franchiseId` покрыты `@@index` в `schema.zmodel`. `pinnedLocally`,
        `needsReupload`, `ageRating` индексов не имеют — намеренно не добавлял: это
        низкоселективные булевы/enum-поля на таблице в сотни строк, индекс тут не окупается.
  - [x] **`select` только нужные поля** (v0.55.9) — главная находка аудита. Запрос списка тянул
        все `episodes` → `audioTracks` → `subtitleTracks` → `fonts` ради четырёх сумм `ipfsSize`:
        **25 824 объекта / 757 КБ payload** на библиотеке из 338 аниме. Заменено на
        `getAnimeIpfsSizes()` — один `$queryRaw` с `UNION ALL` + `GROUP BY` (1 057 строк, 32 КБ).
        Замеры — в CHANGELOG [0.55.9]. ⚠️ Само время SQL выросло (7.6 → 12.9 мс, появились JOIN'ы),
        выигрыш в объёме передачи через границу процесса, а не в базе.
  - [x] TanStack Query cache при навигации назад — проверено, вмешательства не требует:
        `@letar/query-provider` preset `standard` даёт `staleTime` 5 мин и `refetchOnWindowFocus: false`,
        так что возврат в библиотеку читает кэш.

  **Рендер приложения:**
  - [ ] Профилировать через React DevTools Profiler — найти компоненты с дорогим рендером (нужен
        запущенный десктоп-клиент, не сделано; см. ниже находку по коду вместо профайлера)
  - [x] **Проверить лишние `useEffect` с тяжёлыми зависимостями** (v0.55.10, частично) — точечный
        аудит always-mounted `Sidebar` и его карточек (`ContinueWatchingCard`, `WatchNextCard`,
        `EncodingStatusCard`). Сами эффекты в порядке (корректные deps, `setInterval` с cleanup),
        но карточки не были обёрнуты в `React.memo` — два опроса в `Sidebar` (диск 30с, power-save
        5с) перерисовывали всё поддерево каждый тик. Обёрнуты в `memo`, см. CHANGELOG [0.55.10].
        Остальные 122 файла с `useEffect` (222 вызова) не проверены — точечный проход по
        наиболее «горячим» always-mounted компонентам, не полный аудит.
  - [x] **Electron: main process не блокирует renderer** (v0.55.14) — рендерер использует только
        `ipcRenderer.invoke` (проверено по `main/preload/**`), `sendSync` нигде не встречается,
        значит блокировка main-потока не морозит рендер напрямую (только задерживает конкретный
        IPC-ответ). Рантайм-запросы к БД идут через Prisma (async) — `better-sqlite3`/синхронный
        SQL встречается только в sql.js миграциях при старте, не в hot path. Найдена единственная
        точка реального блокирующего синхронного вызова — `execSync('taskkill ...', {timeout:
5000})` в `terminateProcess`/`terminateChildProcess`
        (`main/utils/process-control.ts:228,256`), дергается при отмене/паузе транскода
        (`transcode-manager.ts`, `pools/base-pool.ts`) — в худшем случае блокирует main-процесс до
        5с, если `taskkill` зависнет. Путь редкий (клик «отменить» на активной задаче), не
        затрагивает обычный скролл/навигацию — исправление отложено (перевод на `execFile`
        каскадно меняет сигнатуры 4 вызывающих мест в критичном для транскода коде, нужно решение
        пользователя, не факт что стоит риска ради редкого пути).
  - [ ] Проверить размер JS бандла Next.js — `@next/bundle-analyzer` **не работает с Turbopack**
        (дефолтный билдер этого приложения). **Найден и подтверждён root cause (v0.55.14):**
        `ANALYZE=true nx build animatrona -- --webpack` теперь корректно пробрасывает флаг в
        `next build` (в отличие от попытки v0.55.10) и резолвит `@letar/hooks` через настоящий Nx
        таргет — но сама webpack-сборка падает ДО генерации отчёта анализатора. Причина —
        `@libsql/client`/`@libsql/hrana-client` принудительно в `transpilePackages`
        (`next.config.js`, обязательно для Turbopack — иначе битые ESM-зависимости), а внутри этих
        пакетов есть platform-detection с динамическим `require`, который webpack превращает в
        require-context (сканирует ВСЮ директорию пакета как модули) — попадают `README.md`,
        `LICENSE`, `.d.ts` без соответствующих loader'ов → `Module parse failed`. Turbopack эту
        директорию не сканирует целиком, поэтому в проде (Turbopack-билд) всё собирается нормально.
        **Тупик без отдельной работы**: нужен либо webpack-специфичный `IgnorePlugin`/`ContextReplacementPlugin`
        для `@libsql/*` (условно, только когда билдер = webpack), либо смириться и не иметь анализа
        бандла для этого конкретного набора зависимостей. `next experimental-analyze` (альтернатива
        из v0.55.10) не проверялась — не нашёл такой команды в CLI `next` в этой версии.

  **Метрики успеха:** открытие каталога <100ms, скролл 60fps без jank, переход между страницами <200ms

  **Задел на следующую сессию (после v0.55.10):**
  - **Анализ бандла** — прогнать `ANALYZE=true nx build animatrona -- --webpack` (полная сборка,
    дольше обычной, но резолвит `@letar/hooks` и остальные workspace-пакеты через настоящий Nx
    таргет — прямой `next build` внутри `renderer/` в обход Nx для этого не годится, см. попытку
    в CHANGELOG [0.55.10]). Альтернатива, если `--webpack` не пробрасывается в `nx:run-commands`
    билд-таргета — `next experimental-analyze` (turbopack-нативный, не пробовался вообще).
  - **React DevTools Profiler** — нужен реально запущенный десктоп-клиент (`nx dev animatrona`
    внутри Electron, не web-превью). Сценарий для профилирования: открыть библиотеку на реальных
    300+ аниме → поскроллить → открыть/закрыть карточку деталей → вернуться назад. Смотреть на
    компоненты с высоким self time при скролле (виртуализированная сетка тикает на каждый кадр).
  - [x] **Остаток useEffect-аудита: `AppShell`/`GlobalVideoProvider`/`TitleBar`/`PageTransition`**
        (v0.55.12) — проверены все четыре кандидата. Найден и пофикшен реальный баг:
        `useGlobalShortcuts` дёргал `window.addEventListener/removeEventListener('keydown', ...)` на
        каждый рендер `AppShell` (always-mounted layout, ре-рендерится при каждой навигации), потому
        что `handleKeyDown` зависел от инлайн-объекта `callbacks`, пересоздаваемого в JSX на каждый
        рендер. Исправлено latest-ref паттерном (`callbacksRef`), `handleKeyDown` зависит только от
        `router`. `TitleBar.tsx`/`PageTransition.tsx`/`GlobalVideoProvider.tsx` — уже в порядке
        (mount-once эффекты с пустыми deps либо throttled). Остальные ~120 файлов с `useEffect` —
        компонентные/страничные, риск ниже (монтируются один раз на страницу), низкий приоритет,
        не проверялись.
  - **main process / worker_threads** — не начато. Проверить: не блокируют ли renderer тяжёлые
    синхронные операции в main (ffmpeg probe, IPFS pin/unpin, sql.js миграции) — искать `execSync`/
    большие синхронные циклы в `main/services/**`, кандидаты на вынос в `worker_threads` или хотя
    бы в `async`-обёртки, если сейчас блокируют IPC event loop.
  - [x] **Побочная находка (не из плана аудита, реальный баг пользователя, v0.55.14): папочный
        режим плеера приписывал субтитры/аудио чужих серий текущему эпизоду** —
        `scanTracksForEpisodeInternal` (`useFolderPlayer.ts`) передавала в `scanExternalSubtitles`/
        `scanExternalAudio` только ОДИН текущий видеофайл. `fuzzyMatchToVideo`
        (`external-subtitle-scanner.ts`) при `videoFiles.length === 1` считает это фильмом и матчит на
        него все субтитры/аудио из папки, включая относящиеся к другим сериям — в меню субтитров
        сериала показывались дубли дорожек всех серий. Исправлено — передаётся полный список видео
        папки (`[...episodes, ...bonusVideos]`), matcher теперь матчит по номеру эпизода честно. См.
        CHANGELOG [0.55.14].
  - ⚠️ Перед стартом проверить file reservations на `apps/animatrona/**` через
    `mcp__agent-mail__file_reservation_paths` — на момент v0.55.10 параллельно работали другие
    агенты (`RoseRobin`, `AmberOwl`, `TealGorge`) над выносом хуков в `@letar/hooks` (незакоммичено,
    ломало прямой `next build`); если работа ещё не влилась в `main` — учитывать её при мёрже
    (`use-library-page.ts`, `AnimeFilters/index.tsx` уже ссылались на несуществующий пакет).

- [x] **Infinite scroll / пагинация для списка аниме** (v0.55.15/0.55.16)

  **Проблема:** Список аниме рендерит 300+ карточек одновременно — растёт вместе с библиотекой. Это убивает скролл и начальный рендер.

  **Рекомендуемое решение: виртуализация + infinite scroll** (лучший UX для библиотеки)
  - `@tanstack/react-virtual` — виртуализирует DOM, рендерит только ~20 видимых карточек
  - Infinite scroll через `IntersectionObserver` или TanStack Query `useInfiniteQuery`
  - Размер страницы: 40–60 аниме (достаточно для заполнения экрана × 2)

  **Альтернатива: пагинация** (проще, но хуже UX для библиотеки)
  - Кнопки «Предыдущая / Следующая» или numbered pages
  - URL param `?page=N` для deep linking

  **Реализация (infinite scroll + виртуализация):**
  - [x] Виртуализация `AnimeGrid` (режим «По отдельности») через `useWindowVirtualizer` из
        `@tanstack/react-virtual` (уже был в корневых deps монорепо — hoisting, отдельно в
        `apps/animatrona/package.json` добавлять не пришлось). Строки виртуализируются, число
        колонок пересчитывается по ширине контейнера через `ResizeObserver` (повторяет
        `repeat(auto-fill, minmax(200px, 1fr))`), высота строки — динамический `measureElement`
        (не статичная оценка, подстраивается под реальный рендер карточки). Данные по-прежнему
        грузятся одним `findMany` без cursor-пагинации — рендерится DOM только видимых карточек,
        но сам запрос и`groupAnimeByFranchise` работают с полным набором как раньше.
  - [x] **Виртуализация `FranchiseView`** (v0.55.5) — единый список элементов (франшизы +
        одиночные аниме, порядок сохранён) через тот же `useWindowVirtualizer`-паттерн, что
        `AnimeGrid` (v0.55.3): колонки по ширине контейнера, динамическая высота строки через
        `measureElement` (нужна из-за неоднородной высоты — `FranchiseCard` со стопкой постеров
        выше одиночной `AnimeCard`).
  - [x] **`use-library-page.ts` переключён на `useInfiniteFindManyAnime` (skip/take по 60)** (v0.55.15) —
        `groupAnimeByFranchise()` по-прежнему получает **полный** набор (франшизный режим,
        множественный выбор, диалог пакетной публикации — `needsFullData` в
        `use-library-page.ts`), но обычный просмотр в режиме «По отдельности» пагинирован.
        Подробности реализации, включая `createInfiniteFindManyHook`/`useCountAnime` — в
        CHANGELOG.md [0.55.15] и PLAN_COMPLETED.md.
  - [x] **Sentinel-элемент + `IntersectionObserver`** (v0.55.16) — первая версия триггера подгрузки
        (по индексу последней виртуализированной строки, v0.55.15) оказалась ненадёжной —
        пользователь сообщил, что дальше первой страницы список не грузится. Заменено на
        sentinel-`Box` под сеткой + `IntersectionObserver(rootMargin: '800px')` в `AnimeGrid.tsx` —
        не зависит от внутренностей `useWindowVirtualizer`. ⚠️ Финальная проверка пользователем
        после этого фикса — на момент завершения сессии ещё не подтверждена.
  - [x] **Сохранять позицию скролла при навигации назад** (v0.55.7) — новый хук
        `use-scroll-restoration.ts` в `app/library/_lib/`: сохраняет `window.scrollY` в
        sessionStorage (throttled через `requestAnimationFrame`), ключ —
        `pathname?searchParams#viewMode` (по аналогии с `FILTERS_STORAGE_KEY` в
        `useFilterParams.ts`, но отдельный ключ и с добавлением режима отображения — у
        individual/franchise разная высота строк). Восстановление — несколько попыток
        `scrollTo` через `requestAnimationFrame` (до 5 кадров), т.к. виртуализированная сетка
        (`useWindowVirtualizer`) уточняет итоговую высоту после первых кадров через
        `measureElement` — однократный вызов сразу после монтирования промахивается.
        Подключено в `library/page.tsx`: `useScrollRestoration(!isLoading, viewMode)`.
  - [x] **Рефакторинг: общий хук `useVirtualizedGrid`** (v0.55.8) — `AnimeGrid.tsx` и
        `FranchiseView.tsx` дублировали идентичную логику виртуализации (`containerRef` +
        `ResizeObserver`, `scrollMargin`, расчёт `columns`/`cardWidth`, `useWindowVirtualizer`,
        разметка строки). Вынесено в `renderer/src/lib/hooks/use-virtualized-grid.ts`, компоненты
        оставили только рендер карточки и `estimateSize(cardWidth)` под свою карточку. Подробности
        — CHANGELOG.md [0.55.8].

  ✅ Проверено пользователем вживую (2026-07-29): сетка (columns) — подтверждено работает после
  фикса `useVirtualizedGrid` (v0.55.15). Infinite scroll (подгрузка следующих страниц при скролле)
  — ещё не подтверждено после последнего фикса (sentinel + IntersectionObserver, v0.55.16), просил
  проверить в следующем запуске.

---

### UX улучшения

- [x] **Подробный лог и прогресс для регенерации манифестов и аудита хранилища** (v0.48.0) — ProgressLog компонент, broadcastToWindows per-anime, progress bar + auto-scroll лог
- [x] **Массовый отказ от дорожек при импорте** — реализовано через `onApplyToAll` в TrackGroupEditor/FileCard (применить настройки ко всем эпизодам)
- [x] **Кнопка «Удалить все завершённые» в очереди кодирования** — `clearCompleted()` в ImportQueueView.tsx (кнопка + keyboard shortcut)
- [x] **Фильтр по озвучке** — реализован как `fandubber` фильтр в AnimeFilters (SearchableSelect по dubGroup)
- [x] **Фильтр по возрастному рейтингу (ageRating)** (v0.48.0) — поле `ageRating String?` в модели, заполнение при импорте/регенерации/обновлении метаданных, фильтр «Возраст» (Все / До 13 / 13+ / 17+). Задача для трекера передана в PLAN animatrona-tracker
- [x] **Метадата кодирования: команда FFmpeg** — отображается в EncodingInfoDialog.tsx с кнопкой копирования
- [x] **Флаг GPU/CPU при импорте** — `forceCpu` переключатель в EncodingSettingsCard. Баг: video-pool сбрасывал `useCpuFallback` при восстановлении GPU из глобальных настроек — исправлено (v0.48.0)
- [x] **Отображение ссылки на Рутрекер (sourceUrl)** — кнопка в хедере деталей + пункт в ActionMenu (rutrackerUrl)

- [x] **Перенос ImportProcessor из renderer в main** — очередь энкода не должна зависеть от рендерера (v0.44.x)
  - [x] Фаза 1-3: ImportService, import-db, import-ipfs, хелперы в main/services/import/
  - [x] Фаза 4: Интеграция в ImportQueueController.processNext()
  - [x] Фаза 4.1: Исправление 9 багов (compound key, downloadPoster, rebuildManifest, externalSubsMap, logger)
  - [x] Фаза 5: Упрощение renderer — удалён lib/import/ (~3000 строк мёртвого кода: ImportProcessor, use-import-flow, дубликаты audio/subtitle/chapter creators)
  - [x] Фаза 6: Очистка deprecated кода (export-manager deprecated полей, isPssuspendAvailable)
  - [x] Фаза 7: Фикс загрузки аудиодорожек в IPFS — handleAudioCompleted не загружал аудио после удаления renderer обработчика
- [x] **Восстановление аудиодорожек для аниме v0.44–v0.46.7** — задача устарела: вместо точечного восстановления затронутая библиотека переимпортируется заново с Рутрекера целиком (см. «Реимпорт с Рутрекера сливается в существующее аниме», v0.52.4) — механизм для этого уже готов, остался только сам прогон по списку.
- [x] **Автодетекция GPU и CPU профили кодирования** — определение поколения GPU (Blackwell/Ada/Ampere/Turing), условный seed профилей, CPU кодирование через SVT-AV1/libx265
- [x] **Импорт из Рутрекера** — вставить ссылку → парсинг → скачивание → энкод (см. ТЗ ниже)
  - [x] Фаза 1: Парсер Рутрекера + тесты (cheerio, 100 тестов)
  - [x] Фаза 2: Shikimori auto-match по ссылке/названию (27 тестов)
  - [x] Фаза 3: Встроенный торрент-клиент (webtorrent)
  - [x] Фаза 4: UI: ввод ссылки + превью
  - [x] Фаза 5: Оркестратор: скачивание → очередь импорта
  - [x] Фаза 6: UI: прогресс скачивания + интеграция с ImportQueue
  - [x] Фаза 7: Сидирование + управление + авто-удаление
  - [x] Фаза 8: Настройки торрент-клиента
- [ ] **MiniPlayer — Layout-Level Player архитектура** — бесшовное воспроизведение при навигации (как YouTube)
  - [x] Фаза 1: `GlobalVideoProvider` — persistent video+Shaka+audio в layout.tsx
  - [x] Фаза 2: `VideoPlayer` — берёт video из store через appendChild (не создаёт новый)
  - [x] Фаза 3: Store расширен (`audioSrc`, `audioElement`, `setAudioSrc`)
  - [x] Фаза 4: `useGlobalVideo` — audioSrc синхронизируется через WatchPage useEffect → setAudioSrc
  - [x] Фаза 5: `MiniPlayer` — интерактивный seekbar (Chakra Slider), timeupdate/play/pause sync через store
  - [x] Фаза 6: Audio sync работает через event listeners в GlobalVideoProvider (seeked → audio.currentTime)
  - [x] Фаза 7: `MiniPlayer` — сохранение прогресса в БД (useMiniPlayerProgress: throttle 5 сек, auto-completed ≤120 сек)
  - [x] Фаза 8: autoResume при expand уже работает (isResuming → пропуск ResumeOverlay, autoPlay=true)
  - [ ] Фаза 9: Тестирование полного цикла: play → mini → seek → expand → mini → close
  - [x] Фаза 10: Cleanup не требуется — debug-логов и keep-alive кода нет

  **Архитектура:**

  ```
  layout.tsx (PERSISTENT — не перемонтируется)
  ├── GlobalVideoProvider
  │   ├── video element (один раз, живёт всегда)
  │   ├── audio element (отдельная дорожка, persistent)
  │   └── Shaka Player (загружает при store.src)
  ├── MiniPlayer (mode === 'mini' → appendChild(video))
  └── {children} — страницы
      └── WatchPage → VideoPlayer
          └── appendChild(video) — тот же элемент!
  ```

  **Ключевые файлы:**
  - `components/global-video/GlobalVideoProvider.tsx` — provider (создан)
  - `components/global-video/global-video-store.ts` — Zustand store
  - `components/player/VideoPlayer.tsx` — использует video из store
  - `components/mini-player/MiniPlayer.tsx` — перемещает video + sync
  - `app/watch/_hooks/useGlobalVideo.ts` — initVideo/minimize/expand
  - `app/layout.tsx` — `<GlobalVideoProvider>` обёртка

### Синхронизация прогресса с трекером — бесшовный переход между устройствами

**Сценарий:** начал смотреть на компьютере → ушёл с телефоном (продолжить в дороге) →
досмотрел на телевизоре → на кухне переключился на колонку/Алису (аудио-часть или просто
пауза до возврата к экрану). Переход между устройствами должен быть максимально малошовным —
минимум ручных действий («найди серию → перемотай на то же место»).

**Исследование проведено (2026-07-29)** — вывод: частота синхронизации (push ~7с, pull ~30с)
не была узким местом, проблему создавала топология связей между Desktop/mobile/TV/tracker.
Найдено 4 структурных разрыва + 3 попутных бага:

1. [x] **Прогресс с телефона/TV (через mobile-server) не push'ился на трекер сразу** —
       `handleSaveProgress` в `mobile-server/routes/progress.ts` писал в SQLite и слал IPC-событие
       в renderer, но не вызывал `pushWatchProgressImmediate` — прогресс улетал на трекер только
       с 5-минутным полным sync (или не улетал вовсе, если Desktop выключили раньше). **Исправлено
       (v0.55.6)** — добавлен вызов push с `episode.number`/`durationMs` сразу после upsert'а.
2. [x] **Общий debounce-таймер push'а на весь сервис** (`tracker-sync.ts`) — одно поле
       `pushDebounceTimer` вместо мапы по ключу. Досмотрел серию → сразу открыл следующую →
       `clearTimeout` убивал push предыдущей серии безвозвратно (offline-очередь не подхватывала,
       т.к. отмена была до постановки в неё). **Исправлено (v0.55.6)** — `pushDebounceTimers: Map`
       с ключом `` `${trackerAnimeId}:${episodeNumber}` ``, таймеры больше не гасят друг друга.
3. [ ] **Телевизор не умеет в трекер вообще** — `animatrona-tv/src/api/client.ts` ходит только в
       Desktop (`createApiClient` из `@letar/animatrona-shared`, без tracker-адаптера, в отличие
       от mobile). Посмотрел на телефоне в дороге → пришёл домой → TV увидит прогресс, только если
       Desktop включён. **Не мой скоуп** — `apps/animatrona-tv`, нужен отдельный `tracker.ts`
       адаптер по образцу `animatrona-mobile/src/api/adapters/tracker.ts`.
4. [ ] **«Продолжить просмотр» в дороге не работает** — `getLastWatched()` в
       `animatrona-mobile/src/api/adapters/tracker.ts:508` всегда возвращает `null` («трекер не
       имеет такого эндпоинта»), хотя эндпоинт есть — `GET /api/watch-progress/continue`. Но он
       принимает только сессию (`getSession()`), не API Key — мобильный клиент ходит с ключом и
       получил бы пустой список. **Не мой скоуп** — `verifyApiKey` в `continue/route.ts`
       (animatrona-tracker) + подключение в mobile-адаптере.
5. [ ] **Переключение Desktop↔Tracker только вручную** — `activeServerId` в
       `animatrona-mobile/src/store/servers.ts` меняет пользователь через UI. Нужен авто-выбор:
       Desktop доступен (та же локальная сеть) → приоритет ему, иначе — Tracker. **Не мой скоуп**
       — `animatrona-mobile`, возможно и `animatrona-tv`.
6. [ ] **Offline-очередь на телефоне не помнит, для какого сервера накоплена запись** —
       `progressSync.ts` (`SyncQueueItem`) хранит только `episodeId`. Накопилась очередь на
       Desktop, пользователь переключился на Tracker → элементы уйдут с чужим `episodeId` →
       постоянные ошибки. **Не мой скоуп** — `animatrona-mobile`, добавить `serverId` в
       `SyncQueueItem`.

**Из рассмотрения намеренно исключено:** push через WebSocket/SSE вместо текущего pull —
30-секундная задержка не была источником проблемы, pull при возврате приложения в foreground
(`AppState` → `active`) закрывает большую часть ощущения «уже подхватилось» дешевле. Интеграция
с Алисой/умными колонками — отдельный проект (навык в Яндекс.Диалогах, публичный HTTPS-эндпоинт,
отдельный аудиопоток), не расширение существующих клиентов; отложено до появления спроса.

- [x] **Мобильный клиент (React Native)** — реализован в `apps/animatrona-mobile/` (v0.3.1+)
- [ ] **ActivityPub федерация** — серверная часть в animatrona-tracker
- [ ] **Поддержка Intel QSV и AMD AMF** — hw encode для Intel Arc (av1_qsv) и AMD RX 7000+ (av1_amf). Детекция через `ffmpeg -encoders`, отдельные наборы профилей. По фидбеку от пользователей
- [ ] **Дедупликация дорожек в манифестах** — у аниме, импортированных до фикса audio-track-creator (unique streamIndex), могут быть дубликаты. Нужен UI для массовой регенерации
- [x] **Инвалидация кеша при фоновой синхронизации с трекером** (v0.55.4) — `TrackerSyncListener.tsx`
      уже существовал и был подключён в `layout.tsx`, но инвалидировал только `['animes']`
      (список), `['watchProgress']`, `['filterCounts']` — не хватало `['anime']` (детали
      конкретного аниме, `useFindUniqueAnime`, страница `library/[id]`). Если фоновый sync менял
      `watchStatus`/`userRating`, а пользователь в этот момент был на странице деталей — она не
      обновлялась до ручного перехода. Добавлена `queryClient.invalidateQueries({ queryKey:
['anime'] })` по аналогии с `MobileProgressSync.tsx`.

---

## ТЗ: Импорт из Рутрекера

### Концепция

Пользователь вставляет ссылку на раздачу Рутрекера → Animatrona парсит страницу, извлекает метаданные, скачивает торрент, матчит с Shikimori и планирует пайплайн энкода. Пользователь проверяет, что всё определилось верно, и запускает энкод.

### Флоу пользователя

```
1. Вставить ссылку rutracker.org/forum/viewtopic.php?t=XXXXX
   ↓
2. Парсинг страницы → превью:
   - Название (рус/ориг), постер
   - Shikimori match (авто или ручной)
   - Жанры, студия, год, кол-во серий
   - Озвучки и субтитры (из описания)
   - Качество исходника (из MediaInfo в посте)
   - Магнет-ссылка
   ↓
3. Пользователь проверяет, корректирует если нужно
   ↓
4. Выбор папки скачивания (дефолт из настроек)
   ↓
5. Скачивание торрента (встроенный клиент)
   Параллельно: серия скачалась → появляется в списке готовых к проверке
   ↓
6. Пользователь проверяет скачанные серии:
   - Просмотр дорожек (аудио/субтитры), выбор нужных
   - Выбор профиля кодирования
   - Подтверждение → серия уходит в очередь энкода
   ↓
7. Стандартный ImportQueue flow:
   - VMAF подбор CQ (если включён)
   - Транскодирование
   - Генерация манифестов, скриншотов, публикация в IPFS
   ↓
8. Сидирование исходного торрента до ratio ≥ 2.0
   Пользователь может видеть список и удалять вручную
```

### Архитектура

#### 1. Парсер Рутрекера (`rutracker-parser.ts`)

**Вход:** URL страницы раздачи или HTML-строка
**Выход:** `RutrackerTorrentInfo`

```typescript
interface RutrackerTorrentInfo {
  /** URL страницы */
  url: string
  /** ID темы */
  topicId: number

  // Из заголовка (topic-title)
  nameRu: string // "Тетрадь Смерти"
  nameOriginal: string // "Death Note"
  type: string // "TV", "TV+Special", "Movie", "OVA"
  episodeInfo: string // "37 из 37", "13+1 из 13+1"
  episodeCount: number // 37
  languages: string[] // ["RUS(ext)", "JAP+Sub"]
  year: number // 2006
  genres: string[] // ["психологический триллер", "мистика"]
  sourceType: string // "BDRip", "WEB-DL", "HDTVRip"
  resolution: string // "1080p", "720p"

  // Из тела поста (post_body, <span class="post-b">)
  country?: string
  duration?: string // "37 эп ~23 мин"
  director?: string
  studio?: string
  description?: string
  quality?: string // "BDRip [1080p] [Source: JP Blu-Ray]"
  releaseGroup?: string // "SOFCJ-Raws", "Kawaiika-Raws"
  releaseType?: string // "Без хардсаба"

  // Озвучки (из секции "Озвучка")
  dubGroups: Array<{
    name: string // "Мега-Аниме", "MC Entertainment"
    type: 'dub' | 'sub' // дубляж или субтитры
    language: string // "RUS", "ENG"
    isExternal: boolean // внешние файлы
    details?: string // "[2x2]", "[FAN]"
  }>

  // Техническая информация (из MediaInfo в <pre>)
  mediaInfo?: {
    videoCodec: string // "x264", "HEVC"
    bitDepth: number // 10
    width: number // 1920
    height: number // 1080
    fps: number // 23.976
    videoBitrate: number // 6500 (kbps)
    audioTracks: Array<{
      codec: string // "FLAC", "AC3", "Opus"
      channels: string // "2.0", "5.1"
      language: string
      bitrate: number
    }>
  }

  // Внешние ссылки (из тела поста)
  externalLinks: {
    shikimoriUrl?: string // "https://shikimori.one/animes/z790-ergo-proxy"
    shikimoriId?: number // 790 (извлечён из URL)
    anidbUrl?: string
    worldArtUrl?: string
    malUrl?: string
  }

  // Магнет и постер
  magnetLink: string
  posterUrl?: string // из <var class="postImg">

  // Список файлов (если есть в спойлере)
  fileList?: string[]
}
```

**Парсинг заголовка** — регулярка:

```
^(.+?)\s*/\s*(.+?)\s*\[(\w+(?:\+\w+)?)\]\s*\[(.+?)\]\s*\[(.+?)\]\s*\[(\d{4}),\s*(.+?),\s*(\w+)\]\s*\[(\d+p)\]$
```

**Парсинг тела** — DOM-парсинг:

- Поля: `querySelectorAll('.post-b')` → текст после каждого = значение
- MediaInfo: `querySelector('pre.post-pre')` → парсинг вывода MediaInfo
- Ссылки: `querySelectorAll('a.postLink[href*="shikimori"], a[href*="anidb"], a[href*="myanimelist"], a[href*="world-art"]')`
- Магнет: `querySelector('a.magnet-link')?.href`
- Постер: `querySelector('.postImg')?.title` (атрибут title содержит URL)

#### 2. Встроенный торрент-клиент (`torrent-service.ts`)

**Технология:** `webtorrent` или `libtorrent` (через N-API binding)

**Рекомендация:** `webtorrent` — чистый JS, работает в Node.js, поддерживает магнет-ссылки, event-driven API. Минус: может быть медленнее libtorrent на больших торрентах.

**Альтернатива:** `libtorrent` через `node-libtorrent` — нативная производительность, полный BitTorrent стек. Минус: нужен native rebuild для Electron.

```typescript
interface TorrentService {
  /** Добавить торрент по магнет-ссылке */
  addMagnet(magnetUri: string, downloadPath: string): Promise<TorrentHandle>

  /** Получить список активных торрентов */
  getActiveTorrents(): TorrentStatus[]

  /** Получить статус торрента */
  getStatus(torrentId: string): TorrentStatus

  /** Удалить торрент (с данными или без) */
  remove(torrentId: string, deleteFiles: boolean): Promise<void>

  /** Подписка на завершение скачивания файла */
  onFileComplete(callback: (torrentId: string, filePath: string, fileIndex: number) => void): () => void

  /** Подписка на прогресс */
  onProgress(callback: (torrentId: string, progress: TorrentProgress) => void): () => void
}

interface TorrentStatus {
  id: string
  name: string
  /** Прогресс скачивания 0-1 */
  progress: number
  /** Скорость скачивания (байт/с) */
  downloadSpeed: number
  /** Скорость отдачи (байт/с) */
  uploadSpeed: number
  /** Скачано байт */
  downloaded: number
  /** Отдано байт */
  uploaded: number
  /** Ratio (uploaded / downloaded) */
  ratio: number
  /** Количество пиров */
  peers: number
  /** Количество сидов */
  seeds: number
  /** Состояние */
  state: 'downloading' | 'seeding' | 'paused' | 'error'
  /** Список файлов */
  files: TorrentFile[]
  /** Путь скачивания */
  downloadPath: string
  /** Магнет-ссылка (для восстановления при перезапуске) */
  magnetUri: string
  /** Время добавления */
  addedAt: string
}

interface TorrentFile {
  index: number
  name: string
  path: string
  size: number
  /** Прогресс скачивания этого файла 0-1 */
  progress: number
  /** Файл полностью скачан */
  done: boolean
}

interface TorrentProgress {
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  peers: number
  eta: number // секунд до завершения
}
```

#### 3. Авто-сидирование и управление (`seeding-manager.ts`)

```typescript
interface SeedingManager {
  /** Проверить и удалить торренты с ratio ≥ 2.0 */
  checkAndCleanup(): Promise<{ removed: string[] }>

  /** Получить список сидируемых торрентов */
  getSeedingList(): SeedingTorrent[]

  /** Удалить торрент из сидирования */
  removeTorrent(torrentId: string, deleteFiles: boolean): Promise<void>
}

interface SeedingTorrent {
  id: string
  name: string
  ratio: number
  uploaded: number
  /** Привязка к аниме (если есть) */
  animeId?: string
  animeName?: string
  state: 'seeding' | 'paused'
  addedAt: string
}
```

**Правила авто-очистки:**

- Периодическая проверка (каждые 30 мин)
- Если `ratio ≥ 2.0` — удалить торрент + исходные файлы
- Уведомление в UI при удалении
- Настройка target ratio в Settings

#### 4. Оркестратор (`rutracker-import-orchestrator.ts`)

Связывает парсер, торрент-клиент и существующий ImportProcessor:

```
RutrackerParser.parse(url)
  → ShikimoriMatcher.match(info) // авто по ссылке или поиск по названию
  → TorrentService.addMagnet(magnetUri, downloadPath)
  → onFileComplete → определить episodeNumber из имени файла
  → Серия появляется в UI как "готова к проверке"
  → Пользователь проверяет дорожки, выбирает профиль, подтверждает
  → ImportQueueController.addItem() // стандартная очередь
  → ImportProcessor обрабатывает как обычно
```

**Параллельность:** каждый файл (эпизод) скачивается независимо. Как только файл завершён — он появляется в UI для проверки. Пользователь может проверять и отправлять на энкод по одной серии, пока остальные ещё качаются.

#### 5. БД: изменения

**Существующая модель `Anime` — новое поле:**

```zmodel
model Anime {
  // ... существующие поля ...

  /// URL источника импорта (страница Рутрекера и т.д.)
  sourceUrl       String?
}
```

Сохраняется при импорте, отображается в UI деталей аниме. Позволяет вернуться к раздаче даже после удаления торрента.

**Новые модели:**

```zmodel
/// Настройки торрент-клиента
model TorrentSettings {
  id                String  @id @default("default")
  /// Папка для скачивания по умолчанию
  defaultDownloadPath String?
  /// Целевой ratio для авто-удаления (дефолт 2.0)
  targetRatio       Float   @default(2.0)
  /// Максимальная скорость скачивания (0 = без лимита, байт/с)
  maxDownloadSpeed  Int     @default(0)
  /// Максимальная скорость отдачи (0 = без лимита, байт/с)
  maxUploadSpeed    Int     @default(0)

  @@allow('all', true)
}

/// Активный/завершённый торрент
model Torrent {
  id              String    @id @default(cuid())
  /// Магнет-ссылка
  magnetUri       String
  /// Название торрента
  name            String
  /// URL источника (страница Рутрекера)
  sourceUrl       String?
  /// Папка скачивания
  downloadPath    String
  /// Состояние
  state           String    @default("downloading") // downloading, seeding, paused, completed, removed
  /// Скачано байт
  downloaded      Int       @default(0)
  /// Отдано байт
  uploaded        Int       @default(0)
  /// Ratio
  ratio           Float     @default(0)

  /// Привязка к аниме
  anime           Anime?    @relation(fields: [animeId], references: [id], onDelete: SetNull)
  animeId         String?

  /// Извлечённые метаданные Рутрекера (JSON)
  parsedInfo      String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@allow('all', true)
  @@index([animeId])
  @@index([state])
}
```

#### 6. UI

**Новая страница/секция:** «Импорт из Рутрекера»

**Экран 1 — Ввод ссылки:**

- Поле ввода URL + кнопка "Анализировать"
- Или drag-and-drop .torrent файла (будущее)

**Экран 2 — Превью раздачи:**

- Постер + название (рус/ориг)
- Shikimori match (автоматический, с возможностью сменить)
- Жанры, студия, год, кол-во серий
- Озвучки из описания
- Техническая информация из MediaInfo
- Выбор папки скачивания (дефолт из настроек)
- Кнопка "Скачать и закодировать"

**Экран 3 — Прогресс скачивания + энкода:**

- Общий прогресс торрента (скорость, пиры, ETA)
- Список серий: ◻ скачивается | ✓ скачано | ⚙ кодируется | ✅ готово
- Стандартный UI ImportQueue для энкода

**Настройки (Settings → Торрент):**

- Папка скачивания по умолчанию
- Целевой ratio для авто-удаления (дефолт 2.0)
- Лимиты скорости (скачивание/отдача)

**Управление сидированием (Settings → Торрент или отдельная вкладка):**

- Список сидируемых торрентов (название, ratio, скорость отдачи, время)
- Кнопки: пауза, удалить (с файлами / без)
- Индикатор: "Будет удалён при ratio ≥ 2.0"

### Зависимости (npm)

| Пакет        | Назначение                                        |
| ------------ | ------------------------------------------------- |
| `webtorrent` | Встроенный торрент-клиент (JS, без native)        |
| `cheerio`    | Парсинг HTML страницы Рутрекера (server-side DOM) |
| `iconv-lite` | Декодирование Windows-1251 → UTF-8                |

### Порядок реализации

| Фаза | Что                                                | Зависимости                |
| ---- | -------------------------------------------------- | -------------------------- |
| 1    | Парсер Рутрекера + тесты                           | cheerio, iconv-lite        |
| 2    | Shikimori auto-match по ссылке/названию            | Существующий shikimori API |
| 3    | Встроенный торрент-клиент                          | webtorrent                 |
| 4    | UI: ввод ссылки + превью                           | Фаза 1-2                   |
| 5    | Оркестратор: скачивание → очередь импорта          | Фаза 3 + ImportQueue       |
| 6    | UI: прогресс скачивания + интеграция с ImportQueue | Фаза 4-5                   |
| 7    | Сидирование + управление + авто-удаление           | Фаза 3                     |
| 8    | Настройки торрент-клиента                          | Фаза 7                     |

### Ограничения и риски

- **Рутрекер заблокирован в РФ** — нужен VPN/прокси на стороне пользователя. Animatrona не обходит блокировку сама, но можно добавить настройку прокси для HTTP-запросов
- **Парсинг HTML хрупкий** — формат постов не стандартизирован, разные авторы оформляют по-разному. Парсер должен быть толерантным к вариациям
- **webtorrent в Electron** — может конфликтовать с Kubo по портам. Нужно выделить отдельные порты
- **Размер торрентов** — аниме в BDRip 1080p ~1GB/серия, сезон ~25GB. Нужно проверять свободное место

---

Выполненные задачи — см. [PLAN_COMPLETED.md](PLAN_COMPLETED.md)

---

**Последнее обновление:** 2026-08-09
