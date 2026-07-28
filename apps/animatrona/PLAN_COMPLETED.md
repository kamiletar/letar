# Выполненные задачи — Animatrona

Детальное описание всех реализованных фич.

> **Архив обновлён:** 2026-07-28

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
