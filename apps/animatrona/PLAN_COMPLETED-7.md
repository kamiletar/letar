# Animatrona — Выполненные задачи (Часть 7)

> Точка входа и карта всех частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Диапазон: 2026-06-19 (v0.52.2) + миграция торрент-клиента/pre-encode/хранилище (перенесено из PLAN.md 2026-08-09).

## v0.52.2 — pinner4 (s3) в Bootstrap и Peering.Peers (2026-06-19)

- **PINNER4:** добавлены константы `PINNER4_PEER_ID` + `PINNER4_ADDR` в `kubo-config.ts`; pinner4 вошёл в Bootstrap[] и Peering.Peers[] Kubo
- **peer-sync-types.ts:** pinner4 добавлен в `KNOWN_PINNER_PEER_IDS`
- **peer-sync-service.ts:** pinner4 добавлен в `buildHardcodedFallback()` — s3 теперь hardcoded fallback пир
- **Мотивация:** s3 (новый сервер IPFS gateway/pinner) вступил в строй, нужно добавить его в swarm animatrona

---

> Перенесено из PLAN.md: 2026-08-09

### Миграция торрент-клиента: webtorrent → qBittorrent

**Проблема:** webtorrent качает файлы в RAM (OOM при 40GB+), блокирует event loop Electron (зависание UI, каталог не открывается), вызывает вылеты приложения. Все 5 критичных багов — симптомы одной причины: JS торрент-клиент в процессе Electron.

**Решение:** Переход на qBittorrent Web API v2. qBittorrent — отдельный процесс, качает напрямую на диск, Animatrona управляет через HTTP.

#### Архитектура

```
Animatrona (Electron)                    qBittorrent (отдельный процесс)
┌──────────────────────┐                 ┌─────────────────────────┐
│  QBittorrentService  │── HTTP REST ──→ │  Web API /api/v2/*      │
│  (main process)      │                 │  Cookie auth (SID)      │
│                      │                 │                         │
│  Polling loop:       │                 │  Качает на диск         │
│  sync/maindata?rid=N │←── delta JSON ──│  (без RAM буфера)       │
│  каждые 2 сек        │                 │                         │
│                      │                 │  Сидирует автономно     │
│  file.progress === 1 │                 │  (ratio, лимиты)        │
│  → ImportQueue       │                 └─────────────────────────┘
└──────────────────────┘
```

#### Фазы реализации

- [x] **Фаза 1: QBittorrentClient** (v0.48.0) — HTTP-обёртка над Web API v2 (`qbittorrent-client.ts`), cookie auth, auto-relogin, fallback /stop→/pause для <5.0
- [x] **Фаза 2: QBittorrentService** (v0.48.0) — singleton с polling через `/sync/maindata`, маппинг состояний, события `torrent:progress/done/error/file:complete`, восстановление из TorrentDownload
- [x] **Фаза 3: Замена TorrentService** (v0.48.0) — `TorrentServiceInterface` общий контракт, `initTorrentService()` фабрика, интеграция с orchestrator и IPC handlers
- [x] **Фаза 4: UI — настройки подключения** (v0.48.0) — `QBittorrentSettingsCard`, IPC `qbittorrent:testConnection`, инструкция
- [x] **Фаза 5: UI — прогресс и управление** (v0.48.0) — переиспользуется существующий `torrents/page.tsx` через тот же IPC API
- [x] **Фаза 6: Удаление webtorrent** (v0.48.0) — удалён `torrent-service.ts` и тесты, убран `webtorrent` и `@types/webtorrent` из deps, упрощена фабрика до единственного qBittorrent бэкенда, упрощена UI карточка (убран select). Поле `torrentBackend` оставлено в schema как legacy (SQLite DROP COLUMN через sql.js ненадёжно)

#### API qBittorrent — используемые эндпоинты

| Действие         | Метод  | Эндпоинт                          | Ключевые параметры                            |
| ---------------- | ------ | --------------------------------- | --------------------------------------------- |
| Авторизация      | `POST` | `/api/v2/auth/login`              | `username`, `password` → cookie SID           |
| Версия           | `GET`  | `/api/v2/app/version`             | —                                             |
| Добавить магнет  | `POST` | `/api/v2/torrents/add`            | `urls`, `savepath`, `category`                |
| Список торрентов | `GET`  | `/api/v2/torrents/info`           | `filter`, `category`, `hashes`                |
| Файлы торрента   | `GET`  | `/api/v2/torrents/files`          | `hash` → `[{name, size, progress, priority}]` |
| Sync (дельты)    | `GET`  | `/api/v2/sync/maindata`           | `rid` → только изменения с прошлого запроса   |
| Пауза            | `POST` | `/api/v2/torrents/stop`           | `hashes` (pipe-separated или `all`)           |
| Возобновить      | `POST` | `/api/v2/torrents/start`          | `hashes`                                      |
| Удалить          | `POST` | `/api/v2/torrents/delete`         | `hashes`, `deleteFiles`                       |
| Лимит ratio      | `POST` | `/api/v2/torrents/setShareLimits` | `hashes`, `ratioLimit`, `seedingTimeLimit`    |
| Приоритет файла  | `POST` | `/api/v2/torrents/filePrio`       | `hash`, `id`, `priority` (0=skip, 1=normal)   |
| Скорость         | `GET`  | `/api/v2/transfer/info`           | → `dl_info_speed`, `up_info_speed`            |

#### Интерфейс QBittorrentClient

```typescript
interface QBittorrentConfig {
  /** URL Web UI (дефолт http://localhost:8080) */
  url: string
  /** Логин (дефолт admin) */
  username: string
  /** Пароль */
  password: string
}

interface QBittorrentClient {
  /** Подключиться и авторизоваться */
  connect(config: QBittorrentConfig): Promise<void>
  /** Проверить доступность */
  isConnected(): boolean
  /** Версия qBittorrent */
  getVersion(): Promise<string>

  /** Добавить торрент по магнет-ссылке */
  addMagnet(magnetUri: string, savePath: string): Promise<string> // → hash

  /** Информация о торренте */
  getTorrentInfo(hash: string): Promise<QBTorrentInfo>
  /** Список торрентов с фильтром */
  getTorrents(filter?: QBTorrentFilter): Promise<QBTorrentInfo[]>
  /** Файлы торрента с прогрессом */
  getFiles(hash: string): Promise<QBTorrentFile[]>

  /** Sync API — дельты с последнего запроса */
  syncMainData(rid: number): Promise<QBSyncResponse>

  /** Управление */
  pause(hashes: string[]): Promise<void>
  resume(hashes: string[]): Promise<void>
  delete(hashes: string[], deleteFiles: boolean): Promise<void>
  setShareLimits(hashes: string[], ratioLimit: number): Promise<void>
  setFilePriority(hash: string, fileIds: number[], priority: 0 | 1 | 6 | 7): Promise<void>

  /** Глобальная скорость */
  getTransferInfo(): Promise<QBTransferInfo>
}

interface QBTorrentInfo {
  hash: string
  name: string
  state: string // downloading, uploading, pausedDL, stalledDL, error, ...
  progress: number // 0-1
  dlspeed: number // байт/сек
  upspeed: number // байт/сек
  eta: number // секунд до завершения
  ratio: number
  size: number
  downloaded: number
  uploaded: number
  added_on: number // unix timestamp
  completion_on: number // unix timestamp (0 если не завершён)
  save_path: string
  category: string
  tags: string
  num_seeds: number
  num_leechs: number
}

interface QBTorrentFile {
  index: number
  name: string
  size: number
  /** Прогресс скачивания файла 0-1 */
  progress: number
  /** 0=skip, 1=normal, 6=high, 7=maximal */
  priority: number
}

interface QBSyncResponse {
  rid: number
  full_update: boolean
  torrents?: Record<string, Partial<QBTorrentInfo>>
  torrents_removed?: string[]
  server_state?: QBTransferInfo
}

interface QBTransferInfo {
  dl_info_speed: number
  dl_info_data: number
  up_info_speed: number
  up_info_data: number
  connection_status: 'connected' | 'firewalled' | 'disconnected'
}
```

#### Логика определения завершённого файла

```typescript
// Polling loop (каждые 2 сек)
const sync = await client.syncMainData(lastRid)
lastRid = sync.rid

for (const [hash, torrent] of Object.entries(sync.torrents ?? {})) {
  if (torrent.progress === 1) {
    // Торрент целиком завершён
    emit('torrentComplete', hash)
  } else {
    // Проверяем отдельные файлы
    const files = await client.getFiles(hash)
    for (const file of files) {
      if (file.progress === 1 && !completedFiles.has(`${hash}:${file.index}`)) {
        completedFiles.add(`${hash}:${file.index}`)
        emit('fileComplete', hash, file.index, file.name)
        // → оркестратор определяет episodeNumber из имени → ImportQueue
      }
    }
  }
}
```

#### Зависимости

- **npm:** Никаких — достаточно `fetch()` (Node 18+) или `undici` (уже в Electron). Можно взять `@ctrl/qbittorrent` для удобства, но тонкий клиент на 200 строк — проще
- **Пользователь:** Должен установить qBittorrent и включить Web UI (`Settings → Web UI → Enable`)

#### Требования к пользователю

1. Установить qBittorrent (https://www.qbittorrent.org/)
2. Включить Web UI: `Tools → Options → Web UI → ✓ Web User Interface`
3. Задать порт (дефолт 8080), логин/пароль
4. В Animatrona: `Settings → Торрент → URL/логин/пароль`

#### Обратная совместимость

- Существующая модель `Torrent` в БД остаётся (сохраняет `magnetUri`, `state`, `ratio`)
- `TorrentSettings` остаётся (дефолтная папка, target ratio, лимиты скорости)
- Новое поле в `TorrentSettings`: `qbittorrentUrl`, `qbittorrentUsername`, `qbittorrentPassword`
- При первом запуске после обновления: показать диалог миграции

### Pre-encode шаг в пайплайне реимпорта

**Проблема:** Некоторые эпизоды после импорта имеют битые потоки (видео/манифест неполные). Сейчас фикс ручной: пережать исходник сторонней программой → реимпорт. Оригинальный файл нужно сохранять — он может понадобиться для повторных попыток с другими настройками.

**Решение:** Встроить опциональный pre-encode шаг в существующий пайплайн реимпорта. При нажатии «Реимпорт» (🔄) на битом эпизоде — предложить включить pre-encode.

#### Пайплайн

```
Кнопка 🔄 «Реимпорт» на карточке с ошибкой
  → Диалог реимпорта (существующий) + новый чекбокс:
    ☑ Pre-encode исходника (H264, libx264)
      CRF: [18]  Preset: [medium]
  → Если чекбокс включён — перед стандартным импортом:
    1. Найти исходный видеофайл в episode.folderPath
    2. FFmpeg: libx264 -crf N -preset P → temp файл в той же папке
       (оригинал НЕ трогаем)
    3. Import pipeline работает с temp файлом как источником
    4. После завершения импорта — temp файл удаляется
  → Если чекбокс выключен — стандартный реимпорт как сейчас
```

#### Реализация

- [x] **Фаза 1: PreEncodeStep** (`main/services/import/pre-encode-step.ts`)
  - `preEncodeFile(sourcePath, options)` → `{ tempPath }`, `cleanupPreEncodeTemp()`
  - FFmpeg libx264 + progress callback + автоочистка temp

- [x] **Фаза 2: Интеграция в ImportQueueController**
  - `retryMissingEpisodes(itemId, preEncodeOptions)` в import-queue-controller.ts
  - `ImportService`: stage `pre-encode` → подменяет исходники на temp файлы → очистка в finally

- [x] **Фаза 3: UI — чекбокс в диалоге реимпорта**
  - IPC `import-queue:retry-missing` с `preEncodeOptions`
  - Preload `retryMissingEpisodes(itemId, preEncodeOptions)`

#### Дефолты pre-encode

| Параметр  | Дефолт    | Описание                          |
| --------- | --------- | --------------------------------- |
| Кодек     | `libx264` | CPU H264 (всегда доступен)        |
| CRF       | `18`      | Визуально lossless                |
| Preset    | `medium`  | Баланс скорость/качество          |
| Audio     | `copy`    | Аудиодорожки без изменений        |
| Subtitles | `copy`    | Субтитры без изменений            |
| Оригинал  | сохранить | Temp файл удаляется после импорта |

### Управление хранилищем — Отпинивание/запинивание (полный цикл)

**Бэкенд уже готов:**

- `unpinAnimeContent(animeId)` в `content-deletion.ts:309` — unpin всех CID + `pinnedLocally = false`
- IPC handler `library:unpinAnime` в `tracker.handlers.ts:394`
- Preload `unpinAnime()` в `tracker.preload.ts:74`
- Поле `pinnedLocally` в модели Anime (schema.zmodel:325)
- `AnimeCard` показывает облачный индикатор при `!pinnedLocally`

**Нужно реализовать (UI + обратная операция):**

- [x] **Фаза 1: Кнопка «Отпинить с диска» в ActionMenu** (v0.48.0)
  - `ActionMenu.tsx`: пропсы `pinnedLocally`, `onUnpin`/`onRepin`, `isUnpinning`/`isRepinning`
  - Пункт меню «Отпинить с диска» (LuCloudUpload) / «Запинить на диск» (LuHardDrive)
  - `library/[id]/page.tsx`: handlers handleUnpin/handleRepin + toasts + invalidate queries

- [x] **Фаза 2: Обратная операция — repinAnimeContent** (v0.48.0)
  - `content-deletion.ts`: `repinAnimeContent(animeId)` — собирает все CID, пинит через PinManager
  - `tracker.handlers.ts`: IPC `library:repinAnime`
  - `tracker.preload.ts`: `repinAnime(animeId)`
  - `electron.d.ts`: тип

- [x] **Фаза 3: Фильтр «Хранение» в каталоге** (v0.48.0)
  - `AnimeFilters/types.ts`: `pinnedStatus` + `onPinnedStatusChange`
  - `useFilterParams.ts`: URL param `pinned`
  - `AnimeFilters.tsx`: кнопки «Все / На диске / Облако»
  - `use-library-page.ts`: WHERE по `pinnedLocally`

- [x] **Фаза 4: Импорт из каталога с выбором pin/no-pin** (v0.48.0)
  - `anime-importer.ts`: `importAnimeFromManifest(cid, { pin })` — pinnedLocally корректно
  - `discover/page.tsx`: две кнопки — «Импорт» (pin) и «В облако» (no-pin)
  - IPC/preload: параметр `pin?: boolean` в `animeManifest:import`

> Перенесено из PLAN.md: 2026-08-09

#### Плеер: клик по видео и двойной клик (§18.1 бывшего PLAN.md)

- [x] **Клик по видео не ставит паузу.** ✅ Исправлено 2026-07-30. Причина была именно такая:
      внешний контейнер несёт `onClick`, а вложенный `<div ref={videoContainerRef}>` с самим
      `<video>` растянут на 100%×100% и глушил событие через `onClick={(e) => e.stopPropagation()}`,
      поэтому пауза работала только по чёрным полосам. `stopPropagation` убран (в коде оставлен
      комментарий-предупреждение, чтобы не вернули), контролы и хедер и так гасят всплытие у себя,
      так что двойного toggle не возникает
- [x] Двойной клик по видео → полный экран. ✅ Добавлен `onDoubleClick`. **Задержку одиночного клика
      не вводил** — пауза должна отзываться мгновенно, а конфликт разрешён иначе: браузер на двойном
      клике присылает `click`(detail=1) → `click`(detail=2) → `dblclick`, второй click гасится по
      `event.detail`, а изменение состояния от первого откатывается в обработчике двойного. Итог
      двойного клика: полный экран, воспроизведение как было
- [x] Оба пункта закрыты e2e-тестом
      `apps/animatrona-e2e/src/04-player/video-click.electron.spec.ts` (клик по центру кадра
      настоящей мышью, без `force`, чтобы проверялось попадание события). Тест прогнан на **старом**
      билде и падает на нём — значит проверяет поведение, а не наличие обработчика. Зелёный прогон
      ждёт починки `next build` (§23.3, найдено попутно)

> Перенесено из PLAN.md: 2026-08-09

- [x] **Дотипизировать rutracker/torrent IPC в electron.d.ts** (v0.55.1) — описаны секции
      `rutracker`/`torrent` в `ElectronAPI` + канонические типы (`RutrackerTorrentInfo`,
      `RutrackerImportResult`, `TorrentInfo`, `TorrentProgress` и т.д.), `@ts-nocheck` убран из
      `torrents/page.tsx` и `import-rutracker/page.tsx`. По пути найдены и починены реальные баги,
      которые скрывал `@ts-nocheck`: прогресс скачивания терял `totalSize` на первом же tick
      (перезаписывался `undefined`, т.к. `TorrentProgress` — компактный формат без этого поля);
      `fs.scanFolder` в `handleImport` всегда возвращал 0 файлов при импорте из папки (код читал
      несуществующее `scanResult.data.files` вместо `scanResult.files`); `handleFindSource`
      терял TS-сужение по `res.data.found`/`res.data.linked` внутри вложенного `setTorrents`
      колбэка (property-access narrowing не переживает границу closure — исправлено через
      алиасинг в `const found = res.data`). Локальные дублирующиеся интерфейсы (`TorrentInfo`,
      `MatchResult`, `CandidateScore` в обоих файлах) заменены на канонические импорты из
      `@/types/electron`, устраняя источник будущего дрейфа типов. `Box as="img"` заменён на
      Chakra `Image` (полиморфный `as="img"` не типизировал `src`).

#### Гейт нормализации pins на время активного импорта (2026-09-06)

- [x] **Аудит гонки `isSafeToUnpinLocally` vs `addFile` при батч-импорте** — фоновый субагент
      флагнул потенциальную гонку в [pin-status-service.ts:91](main/services/ipfs/pin-status-service.ts)
      (`isSafeToUnpinLocally`, единственный гейт перед `pin.rm` в `pin-normalizer.ts:142`).
      Проверка кодом дала более широкую картину, чем исходная гипотеза:
  - `markAsLocalOnly`/`markAsQueued`/`markAsPinnedRemote` нигде не вызываются в реальном
    пайплайне (только в собственном файле) — таблица `PinStatus` пуста для всего свежего
    контента, `isSafeToUnpinLocally()` сейчас всегда возвращает `true`. Механизм рассчитан на
    batch-спеку из §14/§22.1 (`rutracker-batch-import.ts`), которая пока не реализована —
    файла не существует.
  - Сам `normalizeAllPins()` эту гонку не ловит структурно: трогает только CID, уже reachable
    через `client.refs(directoryCid)`, то есть уже часть закоммиченного в БД дерева.
    Незалинкованный `pin:false`-контент (суб-документы аниме, добавленные в расчёте на будущую
    indirect-защиту через ещё не собранный `directoryCid`) для нормализатора попросту невидим —
    не в `pin.ls` (не запинен), не в `refs()` (ещё не в дереве). Потерять его через
    `normalizeAllPins()` нельзя даже с always-`true` гейтом.
  - Реальный риск — необёрнутый `client.repo.gc()` за IPC `ipfs:repoGc`
    (`unified-ipfs-service.ts:443`): без нормализации, без проверки `PinStatus`, без гейта
    активного импорта. `safeLocalGc()` (`pin-status-service.ts:314`, нормализация + GC перед
    ним) существует, но не вызывается вообще ниоткуда — мёртвый код, к UI не подключён.
  - Демон Kubo стартует без `--enable-gc` (`kubo-daemon.ts`) — автоматического
    периодического GC нет, `repo.gc()` запускается только вручную через UI/IPC. Снижает
    вероятность, но не убирает риск.
- [x] **Фикс** — точечный, только в двух файлах: `ImportQueueController.hasActiveImport()`
      (`import-queue-controller.ts`, singleton уже хранит очередь+статусы, метод проверяет
      `currentId`/статусы `preparing`/`transcoding`/`postprocess`) + throw в начале
      `normalizeAllPins()` (`pin-normalizer.ts`) при активном импорте. `nx typecheck:tsgo` и
      `nx lint` зелёные. Коммит `c8c82bfd`.
- [ ] ⚠️ Не закрыто в этой сессии: `ipfs:repoGc` тем же гейтом не защищён — заведена отдельная
      фоновая задача (см. PLAN.md §22.2), результат которой нужно проверить в следующей сессии.

#### Документирование ловушки dual-tsconfig paths у Nextron-приложений (2026-09-06)

- [x] Прецедент из этой сессии (см. PLAN.md, «Фаза 1», коммит `c4cad00e`) — `apps/animatrona/
      renderer/tsconfig.json` имеет собственный набор `@letar/*`-`paths`, отдельный от
      верхнеуровневого `apps/animatrona/tsconfig.json`; `typecheck:tsgo` читает первый, `next build`
      второй — обобщён в отдельный документ
      [electron-nextron-dual-tsconfig-paths-drift.md](/.claude/docs/electron-nextron-dual-tsconfig-paths-drift.md).
- [x] Проверены остальные Nextron-приложения монорепо (`kami-key-the`, `label-printer-desktop`,
      `poster-microtext-desktop`) — тот же паттерн раздельных tsconfig подтверждён у
      `label-printer-desktop`/`poster-microtext-desktop` (списки синхронны на момент проверки),
      `kami-key-the` не подвержен (минимальный каркас, `renderer/tsconfig.json` не переопределяет
      `paths`).
- [x] Ссылка на новый документ добавлена в индекс корневого `CLAUDE.md` (раздел
      «Next.js — ловушки»). Коммит `2249b0fe` (только `.claude/docs/` + `CLAUDE.md`, без кода
      приложения — не биллируемая внутренняя работа над инфраструктурой студии, `time_discard`).

#### Фикс `nx test animatrona` — `@letar/folder-scan` не резолвился под vitest (2026-09-06)

- [x] `apps/animatrona/main/services/import/__tests__/anime-record-setup.spec.ts` падал на сборе
      (`Cannot find package '@letar/folder-scan'`) — пакет был подключён только в
      `nx.implicitDependencies` и в `paths`/`include` `tsconfig.json`, но не в реальных
      `dependencies` `package.json`, поэтому bun не создавал симлинк
      `apps/animatrona/node_modules/@letar/folder-scan`, а `vitest.config.mts` `resolve.alias`
      покрывает только `'@' → './main'`. `typecheck:tsgo` (резолвит через `tsconfig.json` paths) и
      прод-сборка (webpack/esbuild-алиасы) пакет видели — падал только vitest. Класс проблемы —
      [vitest-unlinked-workspace-lib-imports.md](/.claude/docs/vitest-unlinked-workspace-lib-imports.md).
- [x] Фикс — добавлена `"@letar/folder-scan": "workspace:*"` в `dependencies` (тот же формат, что
      уже используют `@letar/seed-utils`/`@letar/icon-generator` в этом же файле), `bun install` из
      корня создал симлинк. `nx test animatrona` — 9/9 файлов, 166 тестов зелёных (было 8/9 файлов
      собиралось). `nx lint`/`nx typecheck:tsgo` без регрессий.

> Перенесено из PLAN.md: 2026-09-06
