# Animatrona — План развития

## Текущая версия: 0.55.34

## 🎯 Приоритет следующей сессии (владелец, 2026-09-07)

**Взять в работу [PLAN_ANIMATRONA_PLAYER.md](./PLAN_ANIMATRONA_PLAYER.md) в первую очередь**,
раньше остальных пунктов ниже. Цель — не просто продвинуть, а **довести до конца и опубликовать**
(релиз в `kamiletar/letar`, тег `animatrona-player-v*`, живой инсталлятор на сайте) — это
единственная задача в плане с явным дедлайном «выпустить», а не «сделать кусок».

⚠️ Публикация плеера меняет и `animatrona-landing` — сайт до сих пор представляет только один
продукт (полную Animatrona), после релиза лёгкого плеера там появляется вторая (а с учётом уже
решённого 2026-09-07 раздела «Animatrona Viewer» ниже — потенциально третья) карточка продукта,
затрагивает позиционирование, §9/§16 плана плеера («Фаза 5 — сайт», «Мультиязычный лендинг») —
это НЕ отдельная опциональная доработка, а часть той же цели «довести до конца и опубликовать».

## Черновик (новые идеи)

## Техдолг: `as=` на Chakra-компонентах — Box/Text/Heading (не Icon) [ЗАКРЫТО 2026-09-06]

`<Icon as={IconComponent}>` теперь почищен полностью и в `renderer/src/components/**` (475
вхождений в 114 файлах, см. PLAN_COMPLETED.md запись 2026-08-26), и в `renderer/src/app/**` (42
файла, 56 узлов без `boxSize=` — codemod автоматически 0 не сконвертировал, всё вручную, см.
PLAN_COMPLETED.md запись 2026-08-26, доп.). ⚠️ Прежняя формулировка этого раздела ошибочно
утверждала, что оставшиеся 284 находки в `app/**` — исключительно `Box as=`/`Text as=`; на деле
там был и непочищенный `Icon as=` вперемешку с `as="button"`. Semgrep
(`letar-chakra-as-prop-forbidden`, `.semgrep/letar-rules.yml`, WARNING) всё ещё даёт находки на
`as="button"`/`as="span"` и т.п. в `mobile-ui/**`, части `renderer/src/app/**`
(`EpisodeSidebar.tsx`, `MobileAccessCard.tsx`, `IpfsStatusSection.tsx`, `PublishingSection.tsx`,
`RemotePinningSection.tsx` и др.) и разрозненно в `components/{command-palette,shortcuts,social,
update}/*`. Разбор на `asChild` + нативный тег — отдельная, существенно более крупная задача
(`mobile-ui` — не Chakra v3 web-стек, там `as=` может иметь другую природу — проверить перед
переносом того же рецепта). Не блокирует pre-commit (WARNING), но входит в общую цель §61
корневого `PLAN.md` (полная чистка `apps/*` перед возвратом правила к ERROR).

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

  - [x] Фикс (2026-09-06): извлечена чистая функция `isFranchiseGraphStale(graphUpdatedAt)`
        ([anime-manifest-generator.ts](main/services/anime-manifest-generator.ts), TTL — неделя,
        `FRANCHISE_GRAPH_TTL_MS`). Ветка кеша теперь перезапрашивает граф у Shikimori, если
        `graphUpdatedAt` устарел (или графа не было вовсе), вместо безусловного `if
        (franchise?.graphCid)`. Тесты — `main/services/__tests__/anime-manifest-generator.spec.ts`
        (4 теста на граничные случаи TTL). Актуально и для реимпорта, не только для
        `regenerateAll` — фикс в общей точке входа, обе ветки используют один код.

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
  - [x] Фикс (2026-09-06): не ставить `createdAnimeId`, если `upsertAnime` вернул уже
        существующее аниме. Реализовано через явную проверку существования **до** upsert —
        новая `db.animeExistsByShikimoriId()`
        ([import-db.ts](main/services/import/import-db.ts)), вызывается в `createAnimeRecord()`
        ([anime-record-setup.ts](main/services/import/anime-record-setup.ts)), которая теперь
        возвращает `{ id, isNewlyCreated }` вместо голого `id`. `import-service.ts` ставит
        `this.createdAnimeId` только при `isNewlyCreated === true` — cleanup при ошибке/отмене
        удаляет только то, что этот запуск сам и создал. Тесты —
        `main/services/import/__tests__/anime-record-setup.spec.ts` (4 теста, мокает
        `import-db`/`shikimori/client`/`import-ipfs`).

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

  - [x] Фикс (2026-09-06): `spriteCid`/`vttCid`/`chaptersCid` добавлены в сброс retranscode
        ([episode-file-processor.ts](main/services/import/episode-file-processor.ts)), и
        `spriteCid`/`vttCid` теперь пишутся в `updateEpisode` постпроцесса
        ([post-process-runner.ts](main/services/import/post-process-runner.ts)) сразу из
        `spriteData`, а не только в манифест.

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

  - [x] Частично реализовано (2026-09-06), взят «дешёвый» вариант из двух описанных выше:
    - `rating` — оказался чистой плюмбинг-ошибкой: `selectedAnime.score` уже был доступен и на
      renderer (добавлен в payload очереди, `ImportWizardDialog.tsx`), и в типе
      `ImportQueueSelectedAnime`, просто не передавался в `upsertAnime`. Теперь `rating:
      selectedAnime.score ?? null` в `createAnimeRecord` — попадает и в БД (`Anime.rating`),
      и оттуда в манифест.
    - `nameEn`/`synonyms` — путь через БД дороже, чем казалось: сценарий выбора аниме кликом по
      карточке результата поиска (`ShikimoriSearchStep.tsx`, самый частый путь) кладёт в
      `selectedAnime` **superficial** `ShikimoriAnimePreview` без `english`/`synonyms` вообще —
      полные `ShikimoriAnimeDetails` подгружаются только для `preselectedShikimoriId`-потока.
      Правильный фикс требует трогать flow выбора в поиске, а не только `createAnimeRecord`.
      Взят «дешёвый» вариант, отдельно упомянутый выше: `buildAnimeInfo()`
      ([anime-info-generator.ts](main/services/anime-info-generator.ts)) теперь берёт
      `nameEn`/`synonyms` из БД, а если там пусто — из `shikimoriData.english`/`.synonyms`
      (свежий запрос к Shikimori, который и так уже делается для того же `AnimeInfo`). Это
      закрывает `meta/info.json`, но НЕ `Anime.nameEn`/`Anime.synonyms` в БД — и по «Принципу
      минимума БД» (`CLAUDE.md`) это ровно то место, где эти поля и должны жить (IPFS —
      источник истины, БД — только то, что нужно для WHERE/ORDER/JOIN, а `nameEn`/`synonyms`
      в фильтрах библиотеки не участвуют).
    - `Episode.name` — **реализовано (2026-09-07), best-effort через AniList.** ⚠️ Прежняя
      формулировка «прокинуть имя эпизода от Shikimori» была ошибочна — проверены все
      GraphQL-запросы к Shikimori ([queries.ts](main/services/shikimori/queries.ts)), у `Anime`
      есть только `episodes`/`episodesAired` (числа), потитульных названий отдельных серий
      Shikimori не хранит вообще (в отличие от AniDB/TVDB). Источник — `Media.streamingEpisodes`
      AniList (список эпизодов со стриминговых площадок Crunchyroll/HIDIVE/...), заголовки не
      канонические и формат задаёт площадка, не AniList — поэтому чисто best-effort: не
      распарсилось — просто не заполняем.
      - Запрос `streamingEpisodes { title }` добавлен в существующий AniList-запрос
        ([client.ts](main/services/anilist/client.ts)) — тот же TTL-кэш по ключу
        `anilistId/malId`, что и `descriptionEn`, второй сетевой запрос не нужен.
      - Чистая функция `buildAniListEpisodeNameMap()` ([episode-names.ts](main/services/anilist/episode-names.ts))
        парсит `"Episode N - Title"`/`"Ep. N: Title"`/`"N - Title"` (и `—`/`–` вариации тире) в
        карту «номер серии → название»; заголовок без текста после разделителя (просто
        `"Episode 5"`) не даёт названия. При дубле номера с разных площадок — первое найденное.
        13 тестов ([episode-names.spec.ts](main/services/anilist/__tests__/episode-names.spec.ts)).
      - Подключено в [anime-manifest-generator.ts](main/services/anime-manifest-generator.ts) —
        только при свежей генерации `AnimeInfo` (не при переиспользовании `animeInfoCid` из кеша
        БД), пишет `Episode.name` в БД для эпизодов без имени и сразу отражает в собираемом
        манифесте, не дожидаясь следующего прогона. Non-fatal — ошибка AniList/записи в БД не
        роняет генерацию манифеста.
      - Not done: парсинг имени серии из имени файла (альтернативный источник) — не исследован,
        большинство аниме-релизов не включают тайтл серии в имя файла, только номер.

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

- [ ] **Animatrona Player — отдельное приложение для папочного просмотра** (план от 2026-07-30) —
      раздел «Плеер» выделяется в самостоятельный лёгкий продукт (~130 МБ против 282 МБ), общий код
      уезжает в `libs/folder-player-react` + `libs/folder-scan`, Animatrona переходит на них.
      Подробный план — [PLAN_ANIMATRONA_PLAYER.md](./PLAN_ANIMATRONA_PLAYER.md) (вынесен из этого
      файла при декомпозиции 2026-09-07, раздел разросся до ~1300 строк).

## Animatrona Viewer — отдельное приложение для IPFS-просмотра

**Статус:** план (2026-09-07), к реализации не приступали.
**Решено с владельцем (2026-09-07):**

| Вопрос                               | Решение                                                                                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Отношение к «Animatrona Player» выше | **Отдельное третье приложение**, не расширение папочного плеера. Три продукта по аналогии с K-Lite Lite/Full/Mega: `animatrona-player` (папки, без IPFS) — Lite; `animatrona-viewer` (IPFS-просмотр, без импорта) — Standard; `animatrona` (всё) — Mega |
| Судьба самой Animatrona              | **Не трогаем** — остаётся полнофункциональной (импорт + кодирование + просмотр + библиотека). У релиз-мейкеров тоже есть потребность смотреть залитое, отбирать функциональность у них незачем                                                          |
| IPFS-доступ у нового приложения      | **Полный узел Kubo** (не HTTP-gateway) — участвует в раздаче (сидирует), соответствует духу P2P-проекта, не зависит от доступности стороннего шлюза                                                                                                     |
| Имя nx-проекта                       | `apps/animatrona-viewer` — по аналогии с `animatrona-player`, не путается с `animatrona-tracker` (это отдельный веб-каталог/модерация, не desktop-клиент)                                                                                               |

**Идея:** подавляющему большинству пользователей не нужны импорт с Rutracker/торрентов, ffmpeg
транскодирование, профили кодирования, сборка MKV — они хотят посмотреть уже готовый релиз,
которым кто-то поделился через IPFS. Сейчас за это приходится ставить тот же инсталлятор
(**282 МБ**), что и релиз-мейкеры используют для создания контента. Третье приложение —
IPFS-библиотека + плеер + подписки/discover, без единого байта кода импорта/кодирования.

### 1. Инвентаризация (факты по коду на 2026-09-07, без предложений по переносу)

**Renderer-роуты** (`apps/animatrona/renderer/src/app/*`, оценка по строкам):

| Категория              | Роуты                                                                                                  | Файлов | Строк |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------ | ----- |
| **viewer**             | `discover`, `library`, `party`, `player`, `watch`, `subscriptions`, `history`, `friends`, `reputation` | 75     | 8 700 |
| **creator/import**     | `import`, `import-cid`, `import-rutracker`, `transcode`, `test-encoding`, `torrents`                   | 16     | 4 184 |
| **settings (смешано)** | `settings/_settings/*` — 14 карточек, `settings/profiles/*`                                            | 82     | 9 549 |

⚠️ `torrents` — про статус раздачи/сидирования (P2P), не про просмотр напрямую; нужно смотреть
содержимое отдельно при переносе — может понадобиться и viewer'у (он тоже сидирует через Kubo).

**`settings/_settings/*` — 14 карточек, требуют ручной классификации по имени файла:**
creator-only: `EncodingProfilesCard`, `TranscodingSettingsCard`, `QBittorrentSettingsCard`,
`TorrentSettingsCard`, `TrackerPublishingCard`. viewer-relevant: `LibrarySettingsCard`,
`PlayerSettingsCard`, `ThemeSettingsCard`, `MobileAccessCard`, `TraySettingsCard`,
`UpdateSettingsCard`(+`New`), `FederationCard`, `P2PSharingCard` (сидирование — нужно и viewer'у).

**IPC-хендлеры** (`apps/animatrona/main/ipc/*.handlers.ts`, 42 файла) — классификация по имени,
не по содержимому (требует ревизии при реализации):

- **creator-only** (явно про импорт/кодирование): `import-queue.handlers`, `transcode.handlers`,
  `parallel-transcode.handlers`, `ffmpeg.handlers` (частично — probe нужен и viewer'у),
  `rutracker.handlers`, `restore-tracks.handlers`, `audio-reencode.handlers`,
  `intro-detector.handlers`, `vmaf.handlers`, `web-export.handlers`, `export-queue.handlers`,
  `templates.handlers`.
- **viewer-relevant**: `ipfs.handlers`, `anime-manifest.handlers`, `manifest.handlers`,
  `library.handlers`, `subscription.handlers`, `federation.handlers`, `watch-party.handlers`,
  `history.handlers`, `friends.handlers`, `reputation.handlers`, `bonus.handlers`,
  `achievements.handlers`, `franchise.handlers`, `presence.handlers`, `remote-pin.handlers`,
  `subtitle.handlers`, `stats.handlers`, `shikimori.handlers` (поиск/метаданные при просмотре).
- **общие/инфраструктурные** (нужны обоим): `app.handlers`, `dialog.handlers`, `fs.handlers`,
  `window.handlers`, `tray.handlers`, `updater.handlers`, `deep-link.handlers`, `logs.handlers`,
  `scheduler.handlers`, `profile.handlers`, `mobile-server.handlers`, `torrent.handlers`,
  `tracker.handlers`, `publisher.handlers` (публикация — вероятно creator-only, требует проверки).

**`main/services/*` — крупнейшие директории (нетривиальный вес переноса):**

| Директория/файл                                                                    | Вес    | Категория (предварительно)                                     |
| ---------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `ipfs/anime-directory-builder.ts`                                                  | 62 КБ  | viewer — строит структуру раздачи для чтения манифеста         |
| `ipfs/unified-ipfs-service.ts`                                                     | 18 КБ  | viewer — обёртка над IPFS-операциями                           |
| `ipfs/pin-manager.ts`, `pin-status-service.ts`, `pin-normalizer.ts`                | ~29 КБ | viewer — участие в раздаче (сидирование через P2P)             |
| `kubo/kubo-service.ts`                                                             | 27 КБ  | viewer — обёртка над Kubo-нодой, нужна и creator'у (общий код) |
| `kubo/kubo-daemon.ts`                                                              | 26 КБ  | viewer — запуск/жизненный цикл Kubo-процесса, общий код        |
| `kubo/peer-sync-service.ts`                                                        | 16 КБ  | viewer — P2P синхронизация пиров                               |
| `import/*`, `transcode-manager.ts`, `parallel-transcode-manager.ts`, `rutracker/*` | —      | **creator-only**, не переносить                                |
| `shikimori/*`                                                                      | —      | общее — поиск метаданных нужен и при импорте, и при discover   |
| `federation/*`                                                                     | —      | viewer — подписки на чужие раздачи/трекеры                     |
| `mobile-server/*`                                                                  | —      | общее — раздача на мобильные клиенты в локальной сети          |

**`schema.zmodel` — модели верхнего уровня (38 моделей):**

- **viewer**: `Anime`, `Season`, `Episode`, `Genre`/`GenreOnAnime`, `Theme`/`ThemeOnAnime`,
  `AnimeRelation`, `Franchise`, `WatchProgress`, `DiscoverWatchProgress`, `Subscription`,
  `Tracker`, `FederatedContent`, `FederationSettings`, `File`, `PinStatus`, `AudioTrack`,
  `SubtitleTrack`, `SubtitleFont` (дорожки уже готового релиза — не создаются, только читаются),
  `UserStats`, `DailyStats`, `UserReputation`, `UserAchievement`, `AchievementProgress`,
  `UserBonusPoints`, `BonusTransaction`, `LocalUserProfile`, `Friend`, `FriendRequest`,
  `ShikimoriStudio`/`ShikimoriPerson`/`ShikimoriCharacter`, `SyncQueueItem`, `Settings` (частично).
- **creator-only**: `ImportError`, `ImportQueueItem`, `TorrentDownload`, `EncodingProfile`.
- Пересечение почти полное — БД у viewer'а нужна практически такая же тяжёлая (SQLite+Prisma+
  ZenStack+миграции), в отличие от папочного `animatrona-player`, у которого её нет вовсе
  (localStorage). **Это ключевое архитектурное отличие от уже реализованного плана Player** —
  здесь сокращения веса на БД не будет, экономия идёт только за счёт отсутствия ffmpeg/кодеков.

### 2. Чего НЕТ готового (в отличие от Player, где `@letar/video-player-core/react` уже переиспользуемы)

- **Нет общей библиотеки для IPFS/Kubo** — весь код в `apps/animatrona/main/services/ipfs/` и
  `kubo/` (~180 КБ суммарно по перечисленным выше файлам), ни один файл не вынесен в `libs/`.
  Перенос в новый `libs/ipfs-kubo-core` (по аналогии с `libs/folder-scan`) — предварительное
  условие, иначе получится вторая копия, которая разъедется с оригиналом (тот же урок, что
  зафиксирован в решении «Общий код» для Player).
- **Нет разделения `unified-ipfs-service.ts`/`kubo-service.ts` на «нужно для publish» vs «нужно
  для read»** — не проверялось, требует чтения содержимого перед переносом.
- **`kubo.exe` (84 МБ) уже используется как отдельный бинарь** — в отличие от Player, который
  ЗАМЕНЯЕТ ffprobe на `mediainfo.js`, здесь Kubo остаётся (по решению владельца — полный узел),
  экономии на этом компоненте не будет. Реальная экономия — только `ffmpeg.exe` (202 МБ, если
  Shaka Player справляется с уже готовыми (транскодированными) контейнерами без доп. кодеков) и
  отсутствие Prisma-миграций/инструментов импорта/UI импорта.

### 3. Оценка веса (предварительно, требует уточнения после реального разделения)

| Компонент              | Animatrona (текущая) | Animatrona Viewer (оценка)                                                                                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ffmpeg.exe`           | 202 МБ               | нет (просмотр — работа Shaka Player, не ffmpeg)                                                                                                         |
| `ffprobe.exe`          | 193 МБ               | под вопросом — нужен ли вообще для чтения уже готового манифеста (метаданные дорожек уже в IPFS JSON, см. «Принцип минимума БД» в CLAUDE.md приложения) |
| `kubo.exe`             | 84 МБ                | **остаётся** (решение владельца — полный узел)                                                                                                          |
| SQLite/Prisma/миграции | есть                 | **остаётся** (модели почти те же, см. выше)                                                                                                             |
| **Итог**               | ~282 МБ              | ориентировочно 80–130 МБ (грубая прикидка, без реального прогона)                                                                                       |

### 4. Следующие шаги (для будущей сессии — не начинать без прямой команды владельца)

- [ ] Прочитать содержимое `unified-ipfs-service.ts`/`kubo-service.ts`/`kubo-daemon.ts` целиком —
      определить реальную границу read/write API (что нужно только для публикации новых релизов).
- [ ] Решить: `libs/ipfs-kubo-core` — общая библиотека для main-процесса Animatrona + Viewer +
      Tracker (веб, если у него тоже что-то похожее) — или пока только Animatrona+Viewer.
- [ ] Уточнить объём `ffprobe`-зависимости у viewer'а — можно ли полностью обойтись метаданными
      из IPFS-манифеста без локального probe готового файла.
- [ ] Расписать разделение `settings/_settings/*` по карточкам явно (не по названию, по факту
      использования — что читает/пишет `EncodingProfile`/`ImportQueueItem` и т.п.).
- [ ] Только после этого — `nx g @letar/generators:electron-app animatrona-viewer` и перенос по
      готовому списку, тем же паттерном, что уже отработан на `@letar/folder-scan` (перенос →
      обобщение через интерфейсы там, где Viewer и Animatrona расходятся — например read-only vs
      read-write доступ к Kubo).

## Открытые задачи

- [ ] ⚠️ **Открытый вопрос: `nx dev animatrona` (интерактивный Electron dev через nextron)
      по-прежнему запускает renderer через Turbopack, не webpack.** Закрыт основной риск
      Turbopack+Emotion hydration (2026-08-25, см. PLAN_COMPLETED.md) — `--webpack` добавлен в
      standalone `nx dev/build animatrona-renderer` и во все 8 таргетов реальной
      Electron-сборки `apps/animatrona:build`. Но `nextron@10.3.0` CLI (`nextron.config.js`)
      хардкодит `next dev -p <port> <rendererSrcDir>` без опции передать `--webpack` —
      проверено по исходнику пакета, команда `dev` поддерживает только
      `--renderer-port`/`--startup-delay`/`--electron-options`/`--run-only`. Next.js CLI тоже не
      читает бандлер из env (только CLI-флаг, проверено по `next-dev.js`). Не блокирует —
      дев-only путь, не то, что паковается пользователю — но означает, что живая разработка
      через `nx dev animatrona` теоретически может поймать тот же класс гидратационных багов.
      Решение не найдено в рамках сессии: либо патчить/форкать nextron, либо смириться и
      документировать как известное ограничение дев-режима. GUI-уровень самого Electron-окна
      не проверяем в сендбоксе Claude Code в принципе (`.claude/rules/electron.md`), так что
      даже если добавить `--webpack`, подтвердить фикс живым прогоном можно только руками
      пользователя.

- [ ] ⚠️ **Открытый вопрос: заводить ли `@letar/*` зависимости в `mobile-ui`?** При аудите дублей
      `prefers-reduced-motion` (2026-08-20) нашлись ещё два инлайн-вхождения в
      `mobile-ui/src/App.tsx` (реактивный `useReducedMotion`) и `mobile-ui/src/components/ExpandableText.tsx`
      (пер-рендерное чтение) — не тронуты. `mobile-ui` сейчас изолированный Vite-пакет без единой
      `@letar/*` зависимости (`package.json` содержит только `@chakra-ui/react`/`react`/`react-router-dom`),
      предположительно намеренно — под мобильный бандл. Если это архитектурное решение подтверждено —
      вопрос закрыт как есть. Если нет — стоит подключить `@letar/hooks` и унифицировать так же, как
      в `renderer`.

- [x] **Обновить Electron 42.8.0 → 43.2.0** — задача устарела сама собой: на 2026-09-06 корневой
      `package.json` и все 4 electron-приложения (`animatrona`, `kami-key-the`,
      `label-printer-desktop`, `poster-microtext-desktop`) уже на **Electron 44.2.0** (обгоняет
      исходную цель 43.2.0), апдейт произошёл в одной из более ранних сессий без отметки этого
      пункта плана выполненным. Проверено `node -p "require('electron/package.json').version"`
      → `44.2.0`, реально установлен (не только продекларирован в `package.json`).

      **Найдена и исправлена одна мелкая нестыковка при ревизии:** `postinstall`/
      `postinstall:dev` пересобирали `classic-level` под ABI Electron `44.1.0` (строка вида
      `@electron/rebuild -v 44.1.0`) вместо фактических `44.2.0` — минорный дрейф внутри того же
      мажора (ABI Node обычно не меняется между минорными Electron, но версия для заголовков
      должна совпадать точно). Поправлено на `44.2.0` в обеих командах.

      **Не проверено в этой сессии** (недоступно в песочнице Claude Code, см.
      `.claude/rules/electron.md` «Грабли»): реальная пересборка `classic-level` под новый ABI
      (`bun install` не запускался), IPFS/kubo-стек и sql.js WASM на живом Electron-окне, GUI —
      нужен реальный запуск у Ками, «собралось» не равно «работает».

- [x] **Автоопределение глав (OP/ED) для папочного режима плеера (`/player`)** — сделано
      2026-09-06, v0.55.55 (детали реализации — PLAN_COMPLETED.md). `ProbedChapter` в
      `@letar/folder-player-react` (host + state), классификация `detectChapterType`/
      `isChapterSkippable` вынесена из `main/services/import/helpers.ts` (реэкспорт для обратной
      совместимости) в `shared/utils/chapters.ts` — один источник для main и renderer, без
      дублирования. `probeChapterToPlayerChapter()` в `chapter-utils.ts`, `useChapterAutoSkip`
      переиспользован для автопропуска по `Settings.skipOpening`/`skipEnding`.

  ⚠️ **Частично консолидировано 2026-09-06** (по итогам ревью с владельцем): на деле
  независимых реализаций было четыре, не две. `main/services/manifest-generator.ts` держал
  собственный приватный дубль title-only `detectChapterType`/`isChapterSkippable` (разошёлся с
  `shared/utils/chapters.ts` — главы для IPFS-манифеста при первичной генерации классифицировались
  иначе, чем главы, дописываемые позже через `chapter-creator.ts`) — заменён на импорт из
  `shared/utils/chapters.ts`. `@letar/video-player-react` (`utils/detect-chapter-types.ts`,
  title + позиция/длительность как фоллбэк) оказался **нигде не используемым** во всём
  монорепо — только в собственном spec-файле; его буквальная копипаста в
  `renderer/.../ChapterMarkers.tsx` (тоже мёртвая, ни одного вызова) удалена, версия в `libs`
  оставлена как задел на будущее. Позиционный фоллбэк (опенинг в первые ~180с длиной 60-150с)
  сознательно не подключён никуда: в animatrona уже есть намного точнее работающий
  `main/services/intro-detector.ts` — аудио-фингерпринт (Chromaprint) с попарным сравнением
  эпизодов, а не догадка по типовой длине. `MediaProber`-интерфейс (Фаза 3) по-прежнему не
  существует — сама эта абстракция остаётся нереализованной задачей.

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
  - [x] ✅ Root cause закрыт (v0.55.27, 2026-08-25) — заодно с переводом `renderer` на webpack
        для фикса Turbopack+Emotion hydration-риска (PLAN.md §36 корневого репо). Тупик решён не
        `IgnorePlugin`/`ContextReplacementPlugin` (webpack не даёт им отличить платформенный
        `require` внутри `libsql` от остального содержимого пакета так же избирательно, как
        нужно), а явным `config.externals` для `'libsql'` — резолвится абсолютным путём
        (`require.resolve('libsql', { paths: [path.dirname(require.resolve('@libsql/client'))]
        })`), т.к. bare-спецификатор не резолвится в bun isolated-инсталле. `libsql` теперь не
        попадает в webpack-граф вообще — `require.context`-проблема просто не возникает. `next
        build --webpack` теперь дефолтный билдер `renderer` (не только для `ANALYZE=true`), так
        что вопрос «нужен ли анализ бандла для этого набора зависимостей» снят — можно просто
        `ANALYZE=true nx build animatrona-renderer`. Детали фикса —
        `apps/animatrona/PLAN_COMPLETED-2.md` § «Turbopack+Emotion hydration-риск renderer».

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

## ТЗ: Батч-импорт с Рутрекера + роли дубляжа (запланировано, 2026-09-04)

### Концепция

Скормить список ссылок на раздачи Рутрекера (по одной на строку) и получить полностью
автоматический импорт: парсинг → матчинг с Shikimori → скачивание торрента → транскод →
публикация в IPFS — без ручного подтверждения каждой раздачи. Плюс новое поле каталога «роли
озвучивали» — актёры русского дубляжа/команда озвучки конкретной раздачи (не то же самое, что
японские сэйю с Shikimori в `characters[].voiceActor`).

Сейчас в приложении есть полный **ручной** pipeline (парсер → матчер → торрент → ImportQueue →
транскод, см. ТЗ ниже), но только по одной ссылке за раз, с подтверждением на каждом шаге через
UI. Задача — добавить batch-режим поверх существующих кирпичей, без дублирования уже написанной
логики.

### Решения (подтверждены пользователем 2026-09-04)

1. Батч делает **полный пайплайн** (метаданные + скачивание + транскод + IPFS), не только каталог.
2. Неуверенный матчинг с Shikimori (несколько кандидатов) → **не блокирует батч**: элемент уходит
   в очередь на разбор, батч идёт дальше по списку.
3. **Разбор неуверенных матчей делает не человек в UI, а Sonnet 5 в сессии Claude Code** (уточнение
   2026-09-05) — по названию раздачи, году, числу серий, жанрам и описанию из поста Sonnet
   однозначно определяет нужный `shikimoriId` среди кандидатов гораздо надёжнее эвристического
   скоринга (`rankCandidates`). Ручной UI-выбор остаётся только крайним фоллбэком (когда и Claude
   не уверен — например неполные/противоречивые данные в посте).
4. «Роли озвучивали»/команда дубляжа **и субтитров** — свободный текст поста слишком разнородный
   для регулярок, эта же логика подходит и сюда. **Уточнение 2026-09-05:** имя команды
   озвучки/сабов нередко указано только в структуре файлов/папок торрента (например
   `[AniLibria_HD]`, `Anidub`, `SHIZA Project` в имени файла или папки), а не в тексте поста —
   значит источником для Claude должен быть и сырой текст поста, и список путей реально
   скачанного торрента, оба сразу, не только один из них.
5. Разбор неуверенных матчей, извлечение ролей дубляжа и команд озвучки/сабов делает **один и тот
   же MCP-сервер** (Фаза 2), вызываемый из сессии Claude Code — не встроенный в приложение
   LLM-вызов. В Фазе 1 закладывается только инфраструктура хранения (кандидаты + контекст
   раздачи + текст поста + список файлов торрента — место под все три результата); сам
   MCP-сервер — Фаза 2.

### Что переиспользуется как есть

- `main/services/rutracker/rutracker-parser.ts` → `parseRutrackerPage()`.
- `main/services/rutracker/rutracker-import.ts` → `processRutrackerImport()` (авто-принятие
  уверенных матчей через `isAutoMatchConfident`, иначе `needsConfirmation: true` + `candidates`).
- `main/ipc/rutracker.handlers.ts` → `fetchRutrackerPage()` (вынести в переиспользуемый модуль).
- `main/services/rutracker/rutracker-download-orchestrator.ts` → `startDownload()`; приватный
  `buildImportQueueData()` уже показывает сборку `ImportQueueAddData` из скачанного торрента —
  вынести в экспортируемую функцию, не дублировать.
- `main/services/import-queue-controller.ts` (`ImportQueueController.getInstance()`) — очередь
  транскода работает полностью в main process, `addItems()`/`startQueue()` не требуют renderer.
- `main/services/content-deletion.ts` → `unpinAnimeContent(animeId)` — уже реализованное открепление
  контента аниме из локального Kubo с `requireRemotePin: true` (пропускает CID, ещё не
  подтверждённые на удалённых пинерах) и простановкой `Anime.pinnedLocally = false`; аниме остаётся
  в библиотеке. Ровно то, что нужно шагу ARCHIVING — не писать новую логику отпина, вызвать эту.
- `main/services/pinata-service.ts` + `main/ipc/remote-pin.handlers.ts` → `pinata.pinByCid(cid)` /
  `pinata.isPinned(cid)` — существующий клиент удалённого пиннинга (Pinata). Сейчас вызывается
  только руками из UI (см. §22.1 в разделе «ТЗ: Импорт из Рутрекера» ниже — автоматизация была
  запланирована, но не сделана); батч — первое место, где это становится автоматическим шагом
  пайплайна, а не отложенной инфраструктурной задачей.
- `main/services/rutracker/rutracker-download-orchestrator.ts` → `cancelDownload(infoHash,
  deleteFiles=true)` уже показывает вызов `getTorrentService().remove(infoHash, deleteFiles)` —
  тот же вызов, только не при отмене, а при успешном завершении шага ARCHIVING (см. ниже,
  почему сейчас это не происходит само).

### Фаза 1 — инфраструктура батча (эта задача)

- [ ] **Схема** (`schema/models/import.zmodel`): `BulkImportItemStatus` enum (`PENDING`,
      `FETCHING`, `MATCHING`, `NEEDS_REVIEW`, `DOWNLOADING`, `QUEUED`, `ARCHIVING`, `DONE`,
      `ERROR`, `SKIPPED`) — `ARCHIVING` вставлена между `QUEUED` и `DONE`: элемент уже
      транскодирован и лежит в БД, но ещё не прошёл дисковую гигиену (см. «Дисковая гигиена
      батча» ниже) — `DONE` теперь означает не только «аниме импортировано», но и «место после
      него уже освобождено» — + `model BulkImportItem` (batchId, url, status, position,
      shikimoriId, animeName, infoHash — infoHash активной/завершённой торрент-загрузки этого
      элемента (нужен на шаге ARCHIVING, чтобы найти и убрать раздачу из qBittorrent, и чтобы
      `resumeBatch` после перезапуска приложения знал, какой торрент довычищать), candidatesJson —
      кандидаты Shikimori для NEEDS_REVIEW, torrentInfoJson —
      контекст раздачи для Claude: nameRu/nameOriginal/year/episodeCount/genres/studio/
      description, resolvedShikimoriId — пишет MCP-инструмент ИЛИ ручной UI-фоллбэк, один и тот
      же путь продолжения пайплайна, animeId, diskCleanupJson — прогресс дисковой гигиены
      `{ sourceDeletedAt?, remotePinRequestedAt?, remotePinConfirmedAt?, localUnpinnedAt?,
      targetVmafUsed?, sourceFileSize?, finalVideoSize? }` — последние три пишет шаг «реальная
      проверка размера» (см. «VMAF-фоллбэк на шумных источниках» ниже): 95 или 92 реально
      использовали и фактические размеры исходника/результата, не только оценка по сэмплам, один
      JSON вместо семи колонок по аналогии с `candidatesJson`/`torrentInfoJson`, error) +
      `model DubExtractionTask` (animeId
      unique-relation на Anime, rutrackerUrl, rawText — текст `post_body` целиком, fileListJson —
      **список путей файлов/папок реально скачанного торрента** (`TorrentInfo.files[].path`, а не
      только `fileList` из спойлера на странице поста — имя команды озвучки/сабов часто зашито
      только в имени файла или папки, например `[AniLibria_HD]`/`Anidub`/`SHIZA Project`, и
      далеко не всегда продублировано в тексте поста), status `PENDING|DONE|SKIPPED`, resultJson —
      заполняется тем же MCP-сервером в Фазе 2). Связь `Anime.dubExtractionTask
      DubExtractionTask?`. После правки — `nx zenstack:generate animatrona && nx db:push
      animatrona`.
- [ ] **Парсер**: `RutrackerTorrentInfo.rawPostText?: string` — `postBody.text().trim().slice(0,
      30000)` в `parseRutrackerPage()` (main/services/rutracker/types.ts + rutracker-parser.ts).
- [ ] **AnimeInfo/AnimeManifest** (`libs/animatrona-types/src`): новый тип
      `AnimeManifestDubRole { character, actor, dubGroup? }` рядом с `AnimeManifestPerson` +
      поле `AnimeInfo.dubCast?: AnimeManifestDubRole[]` рядом с уже существующими
      `fandubbers?: string[]`/`fansubbers?: string[]` (сейчас нигде не заполняются с
      Рутрекера — `resultJson` из `DubExtractionTask` несёт `{ dubCast?: AnimeManifestDubRole[],
      fandubbers?: string[], fansubbers?: string[] }`, MCP-сервер в Фазе 2 заполняет все три из
      текста поста **и** списка файлов торрента). `main/services/anime-info-generator.ts`
      подмешивает все три поля из `DubExtractionTask` со `status: 'DONE'`, если она есть у аниме.
- [ ] **`ImportQueueController.updateItemStatus()`**: добавить `this.emit('itemStatus', {
      itemId, status, error })` рядом с существующим `emit2Windows(...)` — класс уже наследует
      `EventEmitter`, просто не используется. Нужно batch-сервису, чтобы дождаться
      `completed`/`error` конкретного item без polling.
- [ ] **Новый сервис** `main/services/rutracker/rutracker-batch-import.ts` — синглтон,
      последовательная обработка URL (не параллелить торренты/транскод, как и в ручном флоу):
      fetch → parse+match → уверенный матч идёт в DOWNLOADING → QUEUED → ARCHIVING → DONE (с
      созданием `DubExtractionTask`), неуверенный — сохраняет `candidatesJson`+`torrentInfoJson`,
      статус NEEDS_REVIEW, пропускается дальше по списку. Пока батч активен — лёгкий poll-луп
      (например раз в 30–60 сек) по `BulkImportItem` со `status: NEEDS_REVIEW` и заполненным
      `resolvedShikimoriId` (его пишет MCP-инструмент из Фазы 2 ИЛИ ручной UI-фоллбэк — один и
      тот же код продолжения): подхватывает элемент и ведёт его дальше по обычной ветке
      DOWNLOADING → QUEUED → ARCHIVING → DONE, как уверенный матч. **Тот же poll-луп** (не
      отдельный) параллельно опрашивает `BulkImportItem` со `status: ARCHIVING` и незавершённым
      `diskCleanupJson` — см. «Дисковая гигиена батча» ниже, шаг подтверждения удалённого пина
      асинхронный и требует того же механизма ожидания, что и разбор NEEDS_REVIEW. Poll, а не
      событие — MCP-сервер и приложение живут в разных процессах, ничего не роняет, если Claude
      Code разбирает очередь, пока приложение выключено (просто подхватится при следующем
      запуске/poll-тике). Состояние батча живёт в БД (`BulkImportItem`), не в памяти — переживает
      перезапуск приложения (`resumeBatch(batchId)` подхватывает всё не-`DONE`/`SKIPPED`, включая
      незавершённый ARCHIVING — довычищает диск и довычитывает подтверждение пина, не начиная
      транскод заново). Методы разбора:
      `resolveReview(itemId, shikimoriId)` (тот же путь, что и у MCP-инструмента — вызывается и
      из ручного UI-фоллбэка, и из poll-лупа), `skipReview(itemId)`, `retryItem(itemId)`.
- [ ] **VMAF-фоллбэк на шумных источниках, без предсказаний** (2026-09-06, по решению
      пользователя). Фиксированный VMAF 95 на старом зашумлённом мастере требует непропорционально
      много бит на «сохранение шума», который VMAF как метрика ценит наравне с полезной деталью —
      итоговый AV1-файл может выйти **больше** источника. Рассмотрели денойз+film-grain-synthesis
      (SVT-AV1 `film-grain-denoise=1`, уже частично используется — [sample.ts:47-48](main/src/ffmpeg/sample.ts),
      [video-pool.ts:984-985](main/services/pools/video-pool.ts)) как более «правильный» по сути
      фикс — отклонено пользователем: во-первых, требует CPU-энкода (`libsvtav1`), у `av1_nvenc`
      (GPU, дефолтный путь) параметра `film-grain` нет вообще; во-вторых, синтезированное зерно не
      совпадает по фазе/позиции с реальным зерном оригинала — сравнивать такой результат с шумным
      исходником через VMAF (или любую другую референсную метрику — SSIMULACRA2/Butteraugli тоже
      сравнивают конкретные пиксели, а не «похожесть текстуры вообще») бессмысленно, метрика видит
      разницу в шуме и занижает оценку независимо от того, какую метрику взять. Дело не в выборе
      метрики — простой реактивный фоллбэк снимает вопрос целиком, без денойза и без CPU.
  - **Что уже есть и переиспользуется.** `findOptimalCQ()`
    ([vmaf.ts:224](main/src/ffmpeg/vmaf.ts)) принимает `targetVmaf` (сейчас везде дефолт 95 —
    [use-encoding-settings.ts:19](renderer/src/components/import/preview/use-encoding-settings.ts),
    оба встроенных шаблона в [templates-store.ts:158,170](main/services/templates-store.ts)) и уже
    **бросает исключение**, если оценочный размер закодированного файла (по 4 сэмплам) не меньше
    оригинала (`estimatedSavings <= 0`, [vmaf.ts:423-429](main/src/ffmpeg/vmaf.ts)). Ручной флоу на
    этот throw реагирует диалогом пользователю (`VmafAutoDialog.tsx`); батчу нужен автоматический
    ответ на то же исключение.
  - **Одна повторная попытка на VMAF 92, без эвристик и предсказаний по году/жанру.** В
    `rutracker-batch-import.ts` (не в самом `findOptimalCQ` — сигнатуру не меняем): вызвать
    `findOptimalCQ` с `targetVmaf: 95`; если бросило исключение `estimatedSavings <= 0` —
    перехватить и повторить **ровно один раз** с `targetVmaf: 92`, тем же профилем, тем же GPU.
    Никакой лесенки из 3+ шагов, никакой эвристики по `airedOn.year` (обсуждали и отклонили —
    ненадёжный проксятся-по-факту сигнал вместо измеримого) — решение принимается только по факту
    первой неудачи, не предсказанием заранее. Успела 95 — используем её результат, ко второй
    попытке не переходим вовсе.
  - **Если и 92 не сжало — не гадать дальше, а на ручной разбор.** Если вторая попытка тоже бросила
    исключение — это уже не «немного шумно», а рип, который в принципе плохо сжимается (или почти
    достиг предела для контента). Дальше вниз не идём (91, 89, ...) — элемент уходит в `ERROR` с
    обоими оценочными размерами (95 и 92) в сообщении, требует ручного решения (другой профиль,
    другой источник, или смириться с исходным размером — не автоматизировать этот выбор).
  - **Реальная проверка размера — не только оценка по сэмплам.** Оценка `estimatedSize` в
    `findOptimalCQ` считается по 4 коротким сэмплам и экстраполируется на всю длительность — она
    может ошибаться на конкретных сериях (заставка/титры сильно отличаются от основного контента).
    Поэтому шаг 1 «Удаление исходников» дисковой гигиены (см. выше) — не просто следующий шаг
    после транскода, а ворота: **перед** вызовом `getTorrentService().remove()` сравнить
    фактический размер уже загруженного в IPFS видео (`videoIpfsSize`, уже считается в
    `post-process-runner.ts:359`) с фактическим размером исходного файла на диске (ещё доступен —
    удаление происходит именно на этом шаге). Если факт оказался больше исходника (сэмплы
    ошиблись, включая случай, когда даже 92 по сэмплам казалась приемлемой, а по факту — нет) —
    **не удалять исходник**, элемент уходит в `ERROR` с сообщением о фактическом перерасходе
    размера вместо тихого перехода в `ARCHIVING`/`DONE` с раздутым файлом и удалённым оригиналом,
    который было бы уже не восстановить. Оба размера (исходный/итоговый, вместе с итоговым
    `targetVmaf` — 95 или 92) пишутся в `diskCleanupJson` рядом с остальными таймстампами — видно
    в таблице статусов, насколько реально сжалась каждая раздача, а не только по факту
    «сжалась/не сжалась».
- [ ] **Дисковая гигиена батча** (2026-09-06, встроено по решению пользователя — место на диске не
      бесконечное, а батч потенциально прогоняет десятки раздач подряд без присмотра). Три шага
      внутри статуса ARCHIVING, выполняются в этом порядке (порядок важен — см. обоснование под
      каждым шагом), пишутся в `diskCleanupJson` по мере выполнения:

  1. **Удаление исходников.** Сразу после того, как транскод и IPFS-заливка эпизода(ов) успешно
     завершились (стандартный `post-process-runner.ts` уже удаляет свою рабочую папку
     `createdAnimeFolder` — это НЕ то же самое, что папка скачанного торрента): вызвать
     `getTorrentService().remove(infoHash, true)` (тот же вызов, что `cancelDownload` делает при
     отмене, — см. `rutracker-download-orchestrator.ts`) — убирает раздачу из qBittorrent
     (останавливает сидирование) и удаляет скачанные файлы из `Downloads/Animatrona/<torrent>/`.
     Безопасно сразу: контент уже перекодирован и лежит в локальном Kubo (addToIpfs пинит
     локально по умолчанию), исходник для этого больше не нужен.
     ⚠️ **Почему этот шаг вообще нужно было писать явно:** в ручном флоу импорта
     (`import-service.ts`) такого вызова изначально не было вообще ни на одном успешном пути —
     только `import-failure-cleanup.ts` трогал файлы, и то при ошибке/отмене. Успешный ручной
     импорт оставлял исходник висеть в `Downloads/Animatrona/` и раздачу — сидировать в
     qBittorrent бессрочно.
     **Закрыто и для ручного импорта (2026-09-06):** вместо отдельной функции в
     `import-service.ts` переиспользован уже существовавший в `import-queue-controller.ts`
     механизм сопоставления торрента с папкой импорта (тот же, что раньше только помечал торрент
     `importStatus: 'imported'` для бейджа на странице `/torrents` — реального авто-удаления по
     ratio не было, это был чисто ручной UI-шаг). `markTorrentImported(folderPath)` в
     `import-queue-torrent.ts` заменена на `removeTorrentSource(folderPath)`: то же
     сопоставление торрента по `folderPath.startsWith(t.path)`, но вместо
     `updateMeta(..., {importStatus: 'imported'})` — `getTorrentService().remove(infoHash, true)`.
     Вызывается из того же места в `import-queue-controller.ts` (`updateItemStatus`, ветка
     `status === 'completed'`), которое обслуживает оба флоу — и одиночный ручной импорт, и
     батч (когда `rutracker-batch-import.ts` появится и будет обновлять статус тем же путём) — то
     есть общая точка уже была, отдельного `finalizeSuccessfulDownload(infoHash)` не
     потребовалось. Для drag&drop-импорта файлов (нет соответствующего торрента) функция тихо
     ничего не делает — совпадения по `folderPath` не найдётся.
     Пишет `diskCleanupJson.sourceDeletedAt`.
  2. **Пин на пиннере.** `pinata.pinByCid(anime.directoryCid)` (см. `pinata-service.ts`) —
     запрос удалённого пина в Pinata сразу после сборки `directoryCid`, не «когда-нибудь руками»
     (закрывает первый пункт §22.1 ниже, для батч-элементов — насовсем, не только для этого
     перезалива). Пишет `diskCleanupJson.remotePinRequestedAt`.
  3. **Распин на компе — только после подтверждения, не после постановки в очередь.** Poll-луп
     батч-сервиса (тот же, что описан выше для ARCHIVING) периодически проверяет
     `isSafeToUnpinLocally(cid)` (`pin-status-service.ts`) для CID аниме — это не «пин поставлен в
     очередь», а «Pinata подтвердила, что контент реально у неё» (закрывает второй пункт §22.1).
     Как только подтверждено — `unpinAnimeContent(animeId)` (переиспользуется как есть, см. выше):
     локальный Kubo открепляет контент, `Anime.pinnedLocally = false`, аниме остаётся в
     библиотеке и в БД — просто раздаётся/скачивается с пинера при обращении, а не с локального
     диска. Пишет `diskCleanupJson.remotePinConfirmedAt` и `localUnpinnedAt`, статус элемента
     переходит ARCHIVING → DONE.
     ⚠️ **Порядок 2→3 нельзя менять.** Если открепить локально раньше подтверждения удалённого
     пина, а Pinata по какой-то причине контент не примет (квота, сбой сети, протухший JWT) —
     единственная копия исчезает безвозвратно: исходник уже удалён шагом 1, локальный пин снят,
     удалённого пина нет. `isSafeToUnpinLocally` — это ровно тот гейт, который не даёт этому
     случиться; `deleteAnimeContent`/`unpinAnimeContent` уже её вызывают внутри себя
     (`requireRemotePin: true`), но явный poll до вызова экономит бессмысленные попытки открепить
     то, что заведомо не готово.
     Если Pinata отвечает ошибкой (просрочен JWT, не настроен) — элемент остаётся в ARCHIVING
     бессрочно с `remotePinRequestedAt` без `remotePinConfirmedAt`; это видно в таблице статусов
     batch UI, не проваливается в тихий DONE с потенциально единственной копией на диске
     пользователя.
- [ ] **IPC**: `main/ipc/rutracker-batch.handlers.ts` (`rutrackerBatch:start/getState/
      resolveReview/skipReview/retryItem`) + preload + `renderer/src/types/electron.d.ts`.
- [ ] **UI**: `renderer/src/app/import-rutracker/batch/page.tsx` — textarea со списком ссылок
      (по одной на строку, формат `Посмотрено.txt`) + таблица статусов (включая ARCHIVING — с
      подсказкой «ждём подтверждения удалённого пина», не просто спиннер) + блок «Требует
      подтверждения» для NEEDS_REVIEW (переиспользовать рендер кандидатов из
      `import-rutracker/page.tsx`). Подписка на `rutrackerBatch:progress` для live-обновлений.
- [ ] Обновить `CHANGELOG.md` + bump `package.json`.

### Фаза 2 — MCP-сервер разбора очереди (Claude Code: матчинг + роли дубляжа/сабов), не начата

По решению пользователя — вызывается из сессии Claude Code, не из самого приложения (никакого
API-ключа/SDK внутри Animatrona). Тонкий локальный MCP-сервер по паттерну
`.claude/docs/mcp-server-pattern.md` (аналог `postgres-*`/`studio-mcp`), читает/пишет напрямую
через `better-sqlite3` в `app.db` (dev — `apps/animatrona/prisma/data/app.db`, prod —
`%APPDATA%/@letar/animatrona/data/app.db`). Два независимых набора инструментов на одном
сервере:

- **Разбор неуверенных матчей:** `list_pending_match_reviews()` (читает `BulkImportItem` со
  `status: NEEDS_REVIEW` и `resolvedShikimoriId: null` — отдаёт `candidatesJson` +
  `torrentInfoJson`), `submit_match_resolution(itemId, shikimoriId)` (пишет
  `resolvedShikimoriId` — дальше подхватывает poll-луп batch-сервиса, см. Фазу 1),
  `skip_match_review(itemId, reason)` (→ `SKIPPED`, когда неоднозначно даже для Claude —
  например неполные/противоречивые данные в посте).
- **Роли дубляжа и команды озвучки/сабов:** `list_pending_dub_tasks()` (отдаёт `rawText` **и**
  `fileListJson` — оба источника сразу, имя команды часто есть только в путях файлов/папок, не в
  тексте поста, см. решение 4 выше), `submit_dub_result(id, { dubCast?, fandubbers?,
  fansubbers? })`, `skip_dub_task(id, reason)` — заполняет столько полей, сколько реально нашлось
  (не все раздачи содержат роли по именам, но команда/студия в имени файла есть почти всегда).

Claude Code периодически (или по команде пользователя) разбирает обе очереди своим языковым
пониманием текста раздачи и структуры файлов. Результат матчинга подхватывает batch-сервис
(продолжает пайплайн); результат ролей/команд приложение подхватывает при следующей регенерации
AnimeInfo/манифеста (см. `anime-info-generator.ts` в Фазе 1).

### Верификация (Фаза 1)

1. `nx zenstack:generate animatrona && nx db:push animatrona`, `nx typecheck:tsgo animatrona` —
   зелёные.
2. Ручной прогон на 2–3 URL из `Посмотрено.txt` через `/import-rutracker/batch`: уверенные матчи
   доходят до `DONE` (аниме в библиотеке, эпизоды транскодированы), неоднозначный тайтл уходит в
   `NEEDS_REVIEW` с заполненным `torrentInfoJson`/`candidatesJson` и не блокирует остальные
   строки. Ручное `resolveReview()` (без MCP, симулируя Фазу 2) доводит такой элемент до `DONE`.
3. `nx db:studio animatrona` — после успешного импорта строка `DubExtractionTask` создана,
   `rawText` не пустой, `status = 'PENDING'`.
4. **Дисковая гигиена (шаг ARCHIVING):** после `DONE` для тестового элемента —
   `Downloads/Animatrona/<torrent>/` физически удалена, торрент отсутствует в списке qBittorrent;
   `pinata.isPinned(anime.directoryCid)` возвращает true; `nx db:studio animatrona` показывает
   `Anime.pinnedLocally = false` и заполненные все четыре поля `diskCleanupJson`; локальный Kubo
   (`ipfs pin ls` через `getKuboService()`) больше не держит CID этого аниме, но само аниме и его
   эпизоды видны в библиотеке UI и воспроизводятся (контент отдаётся с Pinata через шлюз).
5. **Отказ пиннера не роняет батч:** временно испортить JWT в `remotePin:updateConfig` (или
   отключить сеть) перед стартом ARCHIVING на одном элементе — элемент зависает в `ARCHIVING` с
   `remotePinRequestedAt`, но без `remotePinConfirmedAt`/`localUnpinnedAt`; исходник при этом уже
   удалён (шаг 1 не зависит от Pinata), а локальный Kubo-пин цел — контент не потерян. Остальные
   элементы батча продолжают обрабатываться, не блокируются одним зависшим ARCHIVING.
6. **VMAF-фоллбэк реально срабатывает и реально останавливается:** прогнать через батч заведомо
   шумную/зернистую раздачу — первая попытка (95) бросает `estimatedSavings <= 0`, вторая (92)
   проходит, `diskCleanupJson.targetVmafUsed = 92`. Отдельно прогнать современную чистую раздачу —
   успевает с первой попытки на 95, вторая попытка не запускается вовсе (лог это подтверждает).
   Отдельно — совсем убитый рип, где не сжимает и 92: обе попытки бросают исключение, элемент
   уходит в `ERROR` с обоими оценочными размерами в сообщении, третьей попытки (91, 89, ...) нет.
7. **Реальный перерасход ловится до удаления исходника:** искусственно занизить сообщаемый
   `videoIpfsSize` (или взять заведомо крошечный тестовый файл с шумом, где сэмплы обманывают
   оценку) так, чтобы факт оказался больше исходника даже после успешной по сэмплам попытки —
   элемент уходит в `ERROR` с обоими размерами в сообщении, `Downloads/Animatrona/<torrent>/`
   **не** удалена, торрент **не** снят с раздачи в qBittorrent — оригинал остаётся физически цел
   для повторной попытки с другим профилем.
8. Перезапуск приложения с батчем в процессе (в т.ч. на элементе в статусе `ARCHIVING`) —
   `rutrackerBatch:getState` возвращает незавершённые элементы, продолжение не создаёт дублей
   `BulkImportItem`/`Anime` и не запускает транскод заново — только довычитывает
   `diskCleanupJson`.
9. `nx lint animatrona` — чисто.

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
