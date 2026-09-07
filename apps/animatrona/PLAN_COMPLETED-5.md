# Animatrona — Выполненные задачи (Часть 5)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: v0.8.9 — v0.36.0.

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
