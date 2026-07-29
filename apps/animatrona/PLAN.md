# Animatrona — План развития

## Текущая версия: 0.55.6

## Черновик (новые идеи)

- [x] **`play/` — standalone Web Player встроен прямо в directoryCid** (v0.54.0) — принцип:
      ВСЁ, что нужно для просмотра, должно физически лежать внутри `directoryCid` и пиниться
      вместе с ним — если пиннер-сервер потерян, восстановить можно только то, что реально
      попало под recursive pin директории; полагаться на «где-то ещё есть» нельзя. IPFS не
      дублирует блоки по CID, так что это ничего не стоит. Теперь для просмотра аниме нужен
      только IPFS-гейтвей + `<gateway>/ipfs/<directoryCid>/play/` — без Animatrona, без
      animatrona-web, без отдельной публикации. - Новый `main/services/ipfs/play-folder-builder.ts` — переиспользует существующий
      standalone-плеер из `web-export/asset-bundler.ts` (`buildDirectoryStructure`) и
      `web-export/manifest-generator.ts` (`generateManifest`, режим `referenced` — src в
      манифесте это голые CID, плеер резолвит их через gateway независимо от глубины папки).
      Строит `QueueExportConfig` из уже загруженных Prisma-данных аниме (включены ВСЕ эпизоды
      и ВСЕ аудио/суб-дорожки — в отличие от ручного экспорта, где пользователь выбирает
      подмножество). - `anime-directory-builder.ts` пробрасывает `play/` как ещё одну папку рядом с `meta/` и
      `source/`, строится **после** основного цикла по эпизодам. `play/episodes/NN/video.webm`
      и т.д. ссылаются на те же CID, что и основное дерево — IPFS не дублирует блоки, только
      одна лишняя запись в directory listing. - **Главы (OP/ED) — тоже в `play/`, не пропущены.** `chapters.json` каждого эпизода уже
      часть `directoryCid` (`episodes/NN/meta/chapters.json`, существовало и раньше) — сама
      по себе задача пин-безопасности тут была решена ещё до этой сессии. Не хватало только
      того, чтобы плеер в `play/` реально показывал метки: `buildPlayFolderEntries()` получает
      уже вычисленный `chaptersByEp` (episodeId → живой/восстановленный chaptersCid, из
      pre-pass'а `buildAnimeDirectory()`) и читает содержимое через `safeCat()` — никакого
      нового контента не пинится, только чтение уже пропинненного JSON для наполнения
      `WebPlayerManifest.episodes[].chapters`. - Prisma-запрос в `buildAnimeDirectory()` расширен: `season.number`, `title`/`streamIndex`/
      `isDefault` у audio/subtitle треков (раньше выбирались только `language`/`dubGroup`).

- [x] **Сохранение исходного .torrent файла в directoryCid + разделение торрентов по категории**
      (v0.53.0) — идея: раз уже раздаём аниме по CID, разумно раздавать и сам .torrent, которым
      его залили, плюс явно зафиксировать источник (ссылку на Рутрекер), а не только держать её
      в БД. Реализовано: - `QBittorrentService` экспортирует `.torrent` через `/api/v2/torrents/export` (qBittorrent
      4.5+) сразу как только метаданные раздачи получены (имя+размер стали известны), заливает
      байты в IPFS (`pin: false`) и сохраняет CID в `TorrentDownload.torrentFileCid`. На версиях
      qBittorrent <4.5 экспорт получает 404 — источник (ссылка) всё равно сохраняется, просто
      без самого файла; в логе явное предупреждение с просьбой обновить qBittorrent. - CID пробрасывается через весь путь импорта (`getDownloadMeta` → `ImportWizardDialog` →
      `ImportQueueParsedInfo.sourceTorrentCid` → `Anime.sourceTorrentCid`). - `anime-directory-builder.ts`: новая папка `source/` в `directoryCid` — `source.json`
      (`{ source: { type, url }, torrentFileCid }`, расширяемо под другие типы источников —
      nyaa, anidex, прямые ссылки — без изменения схемы основного манифеста) + сам файл
      `source.torrent` (родовое имя — источник не обязательно Рутрекер). - Торренты, добавленные через Animatrona, помечаются категорией qBittorrent `animatrona`
      (`ANIMATRONA_TORRENT_CATEGORY` в `qbittorrent-service.ts`, авто-создаётся при `init()`).
      Вкладка «Animatrona» / «Остальное» в `torrents/page.tsx` фильтрует список по этой
      категории — торренты, добавленные вручную через сам qBittorrent (или другим приложением),
      больше не мешаются в общем списке. - Миграция БД `20260729010000_add_source_torrent_cid` (`Anime.sourceTorrentCid`,
      `TorrentDownload.torrentFileCid`) применена вручную через `prisma db execute` +
      `migrate resolve --applied` — обычный `db:migrate` упирался в рассинхронизацию чек-суммы
      старой миграции `20260728044106_add_needs_reupload_flag` в локальной БД, а сброс dev-БД
      уничтожил бы реальную библиотеку (это не тестовые данные, а рабочий `app.db`).

- [x] **Авто-импорт по ссылке из комментария .torrent файла** (v0.55.0) — кнопка «Найти источник»
      на карточке торрента вкладки «Остальное» (торренты, добавленные не через Animatrona).
      `QBittorrentClient.getProperties()` (`/api/v2/torrents/properties`) вытаскивает `comment`
      раздачи, регулярка ищет в нём ссылку на страницу Rutracker, дальше прогоняется обычный
      пайплайн парсинг+матчинг (`processRutrackerImport`) по этой ссылке — **без повторного
      скачивания**: файлы уже на диске/качаются, IPC-хендлер `rutracker:findSourceForTorrent`
      только связывает уже присутствующий торрент с результатом матчинга
      (`QBittorrentService.updateMeta`: `shikimoriId`/`animeName`/`rutrackerUrl`). При уверенном
      автоматическом матче — привязка сразу; при неуверенном — ссылка открывается во внешнем
      браузере для ручной проверки во вкладке Rutracker. `sourceTorrentCid` для таких торрентов
      уже проставляется автоматически существующим экспортом `.torrent` файла в
      `QBittorrentService` (не зависит от категории qBittorrent), отдельно делать это не нужно.

- [x] **E2E для импорта из Рутрекера + фикс Shikimori под TUN-VPN** (v0.52.5) — новый сьют
      `apps/animatrona-e2e/src/03-import/rutracker-import.electron.spec.ts` (навигация,
      disabled-состояние кнопки, детерминированная ошибка при недоступном Shikimori API,
      happy-path на реальной сети с прямым матчем по shikimoriId). Первый же реальный прогон
      поймал баг: `net.fetch` (Chromium) падал `net::ERR_FAILED` на POST к shikimori.io под
      TUN-VPN (Clash), хотя обычный Node-сокет проходил 200 OK — TUN режет по TLS-отпечатку,
      не по прокси-настройкам (`session.setProxy` тут бессилен, `resolveProxy()` возвращает
      `DIRECT`). Пофикшено переводом `main/services/shikimori/{client,anime-api,
franchise-api}.ts` на глобальный `fetch` (Node/undici). Заодно почищен несвязанный
      SSR-краш `shaka-player` (`self is not defined`), блокировавший вообще любую сборку
      `nx build:win` с 3 июля — статический импорт заменён на динамический `import()` в
      `GlobalVideoProvider.tsx`/`useShakaPlayer.ts`.

- [x] **Реимпорт с Рутрекера сливается в существующее аниме** (v0.52.4) — решение по
      перезаливке библиотеки: не пытаться восстанавливать/аудировать старые CID, а просто
      реимпортировать уже импортированные аниме заново через вставку ссылки на Рутрекер (парсер
      уже подхватывает максимум из описания раздачи). Реимпорт матчится строго по тому же
      `shikimoriId` и сливается в существующую карточку (`existingAnimeId`/`isRetranscode`,
      переиспользован механизм «Добавить эпизоды») вместо создания дубликата. При расхождении
      числа серий — подтверждение (может быть другой релиз/качество). После чистого успеха —
      `needsReupload` снимается автоматически в `ImportService.process()`.
      Изменённые места: [library.handlers.ts](main/ipc/library.handlers.ts) `checkAnimeExists`
      теперь возвращает `episodeCount`/`needsReupload`; [torrents/page.tsx](renderer/src/app/torrents/page.tsx)
      `handleImport` — проверка + confirm + прокидка `existingAnimeId` в `ImportWizardDialog`;
      [import-service.ts](main/services/import/import-service.ts) — сброс `needsReupload` в конце
      `process()` при чистом успехе retranscode-режима.

- [x] **Аудит `buildAnimeDirectory` — молчаливые потери не попадали в contentHealth** (v0.52.3)
      — при переходе на новый pinner-сервер и полной перезаливке важно, чтобы regenerateAll честно
      показывал что реально не хватает. Найдено: `audioTracks`/`subtitleTracks` фильтровались по
      `transcodedCid`/`fileCid` not null на уровне SQL-запроса — дорожки без загруженного в IPFS
      контента (транскодировано, но не залито, см. открытую задачу «Восстановление аудиодорожек»
      ниже) никогда не попадали в `missingCids`, `contentHealth` ложно показывал `'complete'`.
      То же самое с эпизодом без `transcodedCid` — просто `continue` без записи потери. Убран
      where-фильтр у audioTracks/subtitleTracks (fonts — оставлен намеренно, некритичная потеря),
      добавлены `missingCids` записи (`kind: 'video' | 'audio' | 'sub'`) во всех трёх местах —
      теперь корректно триггерят `contentHealth: 'broken'`.

- [x] **Метка «Требует перезаливки» на всю текущую библиотеку** (v0.52.2) — после серии
      фиксов регенерации манифеста (гонки pin/unpin, мёртвые CID, зависшая `regenerateAll`) стало
      ясно, что раздача через утраченный pinner-сервер была неудачным подходом: весь текущий контент
      придётся перезаливать заново на новую схему раздачи. Поле `Anime.needsReupload` (default
      `false` для новых импортов), миграция `20260728044106_add_needs_reupload_flag` backfill'ит
      `true` всей библиотеке на момент перехода. UI: оранжевый бейдж на карточке + фильтр
      «Перезаливка» в каталоге. Снимается вручную после реимпорта/republish.

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

### Производительность

- [ ] **Аудит производительности — молниеносный рендер как у нативного приложения**

  **Цель:** Приложение должно рендериться мгновенно — открытие каталога, навигация, скролл.

  #### Направления аудита

  **Список аниме (критично):**
  - [ ] Виртуализация списка (`@tanstack/react-virtual` или `react-window`) — рендерить только видимые карточки (сейчас рендерится 300+ DOM-элементов)
  - [ ] Infinite scroll или пагинация (см. отдельная задача ниже)
  - [ ] Мемоизация `AnimeCard` через `React.memo` — исключить лишние ре-рендеры при изменении фильтров
  - [ ] Debounce на фильтрах/поиске — не триггерить запрос при каждом нажатии
  - [ ] Оптимизация изображений постеров — lazy load `loading="lazy"`, `decoding="async"`, правильный `sizes`

  **Запросы к БД:**
  - [ ] Проверить наличие индексов на часто фильтруемых полях (`status`, `year`, `watchStatus`, `pinnedLocally`)
  - [ ] `select` только нужные поля в запросах к аниме-списку (не тянуть тяжёлые JSON/BLOB поля)
  - [ ] Отладить TanStack Query cache — убедиться что при навигации назад данные из кеша, а не новый запрос

  **Рендер приложения:**
  - [ ] Профилировать через React DevTools Profiler — найти компоненты с дорогим рендером
  - [ ] Проверить лишние `useEffect` с тяжёлыми зависимостями
  - [ ] Electron: убедиться что main process не блокирует renderer (тяжёлые операции через `worker_threads`)
  - [ ] Проверить размер JS бандла Next.js (`nx build animatrona` → анализ webpack stats)

  **Метрики успеха:** открытие каталога <100ms, скролл 60fps без jank, переход между страницами <200ms

- [ ] **Infinite scroll / пагинация для списка аниме**

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
  - [ ] Переключить `use-library-page.ts` с `findMany` на `findMany + skip/take` (cursor pagination)
        — сознательно отложено: `groupAnimeByFranchise()` группирует по connected components на
        основе `sourceRelations`, и ей нужен **весь** набор аниме одновременно (франшиза может
        включать тайтлы за пределами текущей страницы) — курсорная пагинация без редизайна
        группировки будет ломать франшизный режим (тайтл то есть в группе, то standalone, в
        зависимости от того, что уже подгружено).
  - [ ] Sentinel-элемент внизу → `useInfiniteQuery` подгружает следующую страницу (зависит от пункта выше)
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

  ⚠️ Визуально не проверено — `nx typecheck:tsgo`/`nx lint` чистые, но animatrona это Electron-
  desktop, не web-превью; ручная проверка (скролл по большой библиотеке, ресайз окна, смена
  колонок) — на пользователе при следующем запуске приложения.

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

**Последнее обновление:** 2026-07-29
