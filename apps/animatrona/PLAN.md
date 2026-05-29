# Animatrona — План развития

## Текущая версия: 0.52.2

## Черновик (новые идеи)

- [x] **Выпилить `manifestCid` — перейти только на `directoryCid`** — выполнено в v0.52.0: удалено поле `Anime.manifestCid` из `schema.zmodel`, создана миграция `remove_anime_manifest_cid`, удалены все обращения в main/renderer/shared-types.

- [ ] **Покадровая перемотка на паузе** — при паузе кнопки/горячие клавиши +/- 5 кадров. Нужно: `ffmpeg` seek по кадрам или ExoPlayer `seekToNextMediaItem`/frame-level seek через `Player.seekTo()` с `SeekParameters.EXACT`

- [x] **IPFS pin-discipline: пинить только корни** — долгосрочный фикс к проблеме «25к recursive pin при 3 аниме».

  **Контекст:** `client.add()` в Kubo по умолчанию ставит recursive pin на каждый добавленный объект. В animatrona `addBytes()`/`addFile()` вызывается десятки раз на каждое аниме (manifest, animeInfo, episodes-doc, relations-doc, franchise-graph, episode-previews, episode-manifest × N, chapters-doc, thumbnails-doc, encoding-doc и т.д.) — все они получают свой recursive pin, который затем не снимается, когда CID становится дочерним внутри `directoryCid`.

  **Краткосрочный фикс уже сделан**: после `client.pin.add(directoryCid)` в [anime-directory-builder.ts](main/services/ipfs/anime-directory-builder.ts) снимаем recursive pin со всех `entries` (они становятся indirect). Добавлена кнопка «Нормализовать pins» в настройках для одноразовой чистки существующих pin'ов через [pin-normalizer.ts](main/services/ipfs/pin-normalizer.ts).

  **Долгосрочный фикс выполнен:**
  1. ✅ Опция `pin` добавлена в `addBytes()` и `addFile()` ([unified-ipfs-service.ts](main/services/ipfs/unified-ipfs-service.ts), [unixfs-service.ts](main/services/ipfs/unixfs-service.ts)). Дефолт `pin: true` сохранён для обратной совместимости.

  2. ✅ Конвертированы JSON-документы, попадающие в `directoryCid` (`pin: false`):
     - [anime-manifest-generator.ts](main/services/anime-manifest-generator.ts): `animeInfoCid`, `episodesCid`, `episodePreviewsCid`, `franchiseGraphCid`, `relationsCid`, `manifestCid`. Удалён избыточный `pinSubDocuments` после генерации манифеста (directory builder следующим вызовом пинит сам).
     - [manifest-generator.ts](main/services/manifest-generator.ts): `chaptersCid`, `thumbnailsCid`, `encodingCid`.
     - [anime-info-generator.ts](main/services/anime-info-generator.ts): `animeInfoCid`.
     - [anime-directory-builder.ts](main/services/ipfs/anime-directory-builder.ts): `updatedManifestCid`.

  3. **Намеренно НЕ переведены на `pin: false`** (оставлены `pin: true` как safety net):
     - Медиафайлы (`addFile`) — большие, добавляются заранее, без guarantee рebuild'а директории.
     - `chapter-creator.ts`, `episode-manifest-regen.ts` — flow с неопределённым follow-up rebuild. Сохраняют `pinSubDocuments` для безопасности. Краткосрочный фикс в anime-directory-builder unpin'нет их при следующей сборке директории.
     - `contentEqual` ветка в `anime-manifest-generator.ts` — early return без rebuild, `pinSubDocuments` остаётся.

  4. ✅ Краткосрочный фикс в `anime-directory-builder.ts` остаётся как **защита от регрессий**: после `pin.add(directoryCid)` всё ещё пробегает по `entries` и снимает recursive pin с child'ов. Если кто-то забудет `{ pin: false }` в новом коде или для медиафайлов — оно подчистит.

  5. ✅ Сервис нормализации [pin-normalizer.ts](main/services/ipfs/pin-normalizer.ts) + UI кнопка «Нормализовать pins» в настройках — одноразовая чистка существующих 25к pin'ов.

  **Acceptance:** для нового импорта аниме количество recursive pin'ов сводится к `directoryCid` + `posterCid`. Для существующих библиотек — кнопка «Нормализовать pins».

## Открытые задачи

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
- [ ] **Восстановление аудиодорожек для аниме v0.44–v0.46.7** — аудио транскодировалось, но не загружалось в IPFS (transcodedCid = null). Temp файлы удалены, в IPFS аудио нет. Единственный вариант — переимпортировать аудио из исходников через "Добавить дорожки" или полный реимпорт
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

- [ ] **Синхронизация прогресса с трекером** — отправлять DiscoverWatchProgress на animatrona-tracker для кросс-устройственного просмотра
- [x] **Мобильный клиент (React Native)** — реализован в `apps/animatrona-mobile/` (v0.3.1+)
- [ ] **ActivityPub федерация** — серверная часть в animatrona-tracker
- [ ] **Поддержка Intel QSV и AMD AMF** — hw encode для Intel Arc (av1_qsv) и AMD RX 7000+ (av1_amf). Детекция через `ffmpeg -encoders`, отдельные наборы профилей. По фидбеку от пользователей
- [ ] **Дедупликация дорожек в манифестах** — у аниме, импортированных до фикса audio-track-creator (unique streamIndex), могут быть дубликаты. Нужен UI для массовой регенерации
- [x] **Инвалидация кеша при фоновой синхронизации с трекером** — `tracker-sync.ts` отправляет `broadcastToWindows('tracker:syncCompleted')` при фоновом sync, но renderer нигде не слушает это событие для инвалидации TanStack Query кеша. Если sync изменил `watchStatus`, `userRating` или прогресс — UI не обновится до ручного перехода. Нужен listener-компонент (аналог `MobileProgressSync`) для подписки на `onSyncCompleted` и инвалидации `['animes']`, `['watchProgress']`, `['filterCounts']`

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

## Выполненные задачи

- [x] **Файловый логгер** (v0.44.8) — запись логов в %APPDATA%/logs/main.log, ротация 3x5MB, info+
- [x] **Фикс паузы/возобновления энкода** (v0.41.6) — resumeAll() падала при null process, процессы FFmpeg не приостанавливались реально
- [x] **Восстановление аудиодорожек + ImportError + UI ошибок** (v0.39.3)
- [x] **Прерывание VMAF при неэффективном сжатии** (v0.39.3)
- [x] **DRY рефакторинг shared-библиотек** (v0.39.0-0.39.2)
- [x] **Двусторонняя синхронизация Desktop ↔ Tracker** (v0.38.0)
- [x] **Discover плеер и каталог** (v0.37.0-0.37.4)

См. [PLAN_COMPLETED.md](PLAN_COMPLETED.md)

---

**Последнее обновление:** 2026-03-25
