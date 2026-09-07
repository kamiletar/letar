# Animatrona Player — план отдельного приложения

> Точка входа — [PLAN.md](./PLAN.md). Вынесено из PLAN.md при декомпозиции 2026-09-07
> (раздел разросся до ~1300 строк — см.
> [plan-decomposition-pattern](/.claude/docs/plan-decomposition-pattern.md)).
> Статус на момент выноса: план (2026-07-30), к реализации не приступали.

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

- [x] `nx g @letar/generators:new-lib folder-player-react` и `… new-lib folder-scan` (2026-09-06) —
      `libs/folder-player-react` (`--react`, каркас Chakra/React) и `libs/folder-scan`
      (framework-free, Node). Только скаффолд генератором — typecheck:tsgo/lint/test пустого
      каркаса зелёные на обеих. Перенос кода и подключение к Animatrona — следующие пункты этой
      фазы, ещё не начаты.
- [x] Перенесена renderer-часть (2026-09-06): `libs/folder-scan` получил `subtitle-type.ts`
      (классификатор, framework-free), `libs/folder-player-react` — `host.ts` (контракты
      `FolderPlayerHost`/`FolderPlayerStorage`), `types.ts`, `parse-filename.ts`, `probe-cache.ts`,
      `useWatchProgress`/`useFolderHistory`/`useExternalAudio`/`useFolderPlayer` (все принимают
      `host`/`storage` параметром вместо прямого `window.electronAPI`/`localStorage`),
      `EpisodeSidebar`, `RecentFoldersCard`. `renderer/src/app/player/page.tsx` собирает
      `folderPlayerHost: FolderPlayerHost` из своего `window.electronAPI` и передаёт его в хуки;
      `useWatchProgress(localStorage)`/`useFolderHistory(localStorage)` — `window.localStorage`
      структурно удовлетворяет `FolderPlayerStorage`. Старые файлы в `app/player/{types,_hooks,
      _components}` и `renderer/src/lib/{parse-filename,cache/}` удалены, не оставлены копией.
      ⚠️ **`useFolderModeUI.tsx` намеренно НЕ перенесён** — импортирует `TrackInfo`/`TrackSelector`/
      `VideoPlayerRef` из `@/components/player`, которые app-local, не часть `@letar/video-player-react`
      (вынос потребовал бы либо тащить видео-плеер компоненты следом, либо параметризовать хук
      инжектируемыми типами/компонентами — оверинжиниринг для этого шага). Хук остался в приложении,
      но принимает `host: FolderPlayerHost` и использует `useExternalAudio`/`UseFolderPlayerReturn`
      из новой либы — частичная миграция этого одного файла.
- [x] Перенести main-часть, ввести `MediaProber`, `FfprobeProber` оставить в Animatrona как адаптер
      (2026-09-07). В `libs/folder-scan` перенесены: `external-audio-scanner.ts` (+spec),
      `external-subtitle-scanner.ts`, `font-matcher.ts`, `subtitle-parser.ts`, `fs-utils.ts`,
      консольный `logger.ts` (без Electron — файловый `main/utils/logger.ts` не годится
      библиотеке), обобщённые `allowed-paths.ts`/`media-protocol.ts` (whitelist и media://
      протокол параметризованы функцией `isPathAllowed`/списком seed-путей, а не завязаны на
      `app.getPath`), новый `scan-folder.ts` (`scanFolderForMedia`, вынесен из
      `main/ipc/fs.handlers.ts`) и `media-prober.ts` — интерфейс `MediaProber` + нормализованные
      `AudioTrack`/`SubtitleTrack`/`VideoTrack`/`MediaChapter`/`MediaInfo`, которые
      `apps/animatrona/shared/types.ts` теперь ре-экспортирует вместо локальных копий.
      `main/ffmpeg/probe.ts` (webpack-таргет `animatrona:build`, использует `ffmpeg.handlers.ts`)
      экспортирует `ffprobeProber: MediaProber = { probe: probeFile }` — тонкая обёртка без
      изменения существующей логики. `main/protocols/allowed-paths.ts` и `media.protocol.ts`
      остались тонкими Animatrona-адаптерами (сидят whitelist библиотекой/temp/userData,
      инжектируют свой `isPathAllowed` в протокол). `main/src/ffmpeg` (esbuild-таргет
      `animatrona-main:build`) сознательно не тронут — уже задокументированный дрейф
      (`animatrona-dual-build-alias-drift.md`), используется другими хендлерами
      (vmaf/import-queue-controller), не участвует в папочном плеере.
- [x] `main/webpack.config.js` + `main/tsconfig.json` — alias/paths на `libs/folder-scan/src`
      (по образцу существующих `@letar/animatrona-utils`/`@letar/animatrona-types`); esbuild-таргет
      (`animatrona-main:build`) резолвит через `tsConfig`, отдельного списка алиасов не требует
- [x] `renderer/next.config.js` — `@letar/folder-player-react` и `@letar/folder-scan` в
      `transpilePackages`; `apps/animatrona/renderer/tsconfig.json` (у renderer свой набор `paths`,
      отдельный от `apps/animatrona/tsconfig.json`) — обе либы добавлены туда же, иначе
      `next build --webpack` падает `Module not found` даже при зелёном `typecheck:tsgo`
- [x] **Приёмка:** `nx lint animatrona && nx typecheck:tsgo animatrona && nx build animatrona` —
      зелёные (2026-09-07, включая main-часть после переноса выше: `typecheck:main`,
      `nx lint folder-scan`, `nx test folder-scan` — 61/61 тестов — тоже зелёные). Осталось:
      e2e `04-player` в electron-режиме + ручная проверка папки с внешними ASS и аудио.
      ⚠️ `typecheck:tsgo` зелёный не доказывает, что прод-билд соберётся — прецедент
      `SortablePhotoGrid` (2026-07-21), поэтому `nx build` обязателен. Свежий прецедент того же
      класса на этой самой задаче: `typecheck:tsgo` был зелёным, а `next build --webpack` падал
      `Module not found` — у `apps/animatrona/renderer/` свой `tsconfig.json` с собственными
      `paths`, отдельными от `apps/animatrona/tsconfig.json` (который читает только `typecheck:tsgo`)
- [x] Обобщён в отдельный документ (2026-09-06):
      [electron-nextron-dual-tsconfig-paths-drift.md](/.claude/docs/electron-nextron-dual-tsconfig-paths-drift.md) —
      проверено, что тот же паттерн (раздельный `@letar/*`-набор `paths` в корневом и в
      `renderer/tsconfig.json`) есть и у `label-printer-desktop`/`poster-microtext-desktop`, у всех
      трёх списки синхронны на момент проверки

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
- [x] `,`/`.` — покадрово (2026-09-06, см. «Покадровая перемотка на паузе» выше)
- [ ] `s` — сохранить кадр в PNG (для аниме востребовано; два варианта — с субтитрами и без)
- [ ] Русские аналоги для каждой новой клавиши, как уже сделано для существующих

#### 18.4 Приятное, но не в v1

- [ ] **Экранный индикатор действия** (громкость, seek, скорость). В `mobile-ui` уже есть
      `GestureIndicator` и `DoubleTapRipple` — поднять в общую либу, а не писать заново
- [ ] **Нормализация громкости.** Аниме часто тихое, а разброс между сериями большой. Без ffmpeg
      это делается на WebAudio (`GainNode` + `DynamicsCompressorNode`) — дёшево и работает в
      обычном воспроизведении
- [ ] **Кроп чёрных полос / зум** (плеерский, просмотр без изменения файла) — для 4:3-равок и
      энкодов с «вшитыми» полосами. **Не то же самое**, что автообрезка при импорте (§21.5,
      реализована 2026-09-06): та обрезает исходник один раз при транскоде (необратимо,
      с подтверждением в `FileCard.tsx`) и не занимает место в готовом файле; эта — обратимая
      настройка просмотра поверх уже смонтированного файла, полезна там, где автодетект при
      импорте не нашёл устойчивой рамки или где обрезка нежелательна (например источник без
      реальных полос, но с логотипом канала внизу кадра). Два независимых слоя, код не
      конфликтует — плеерский зум применяется поверх любого видео независимо от того, обрезался
      ли он при транскоде.
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

- [x] Миграция БД: `isForced` у `SubtitleTrack` и `AudioTrack` (2026-09-06,
      `20260906203900_add_track_is_forced`)
- [x] Поле в `AnimeManifest`/`EpisodeManifest` (2026-09-06) — `ManifestAudioTrack.isForced`/
      `ManifestSubtitleTrack.isForced` в `@letar/animatrona-types`. Источник — то же самое
      `disposition.forced` из ffprobe, что уже читает папочный режим
      (`isDispositionFlagSet` из `@letar/folder-scan`), только раньше `main/ffmpeg/demux.ts`
      (используется библиотечным импортом, не путать с `main/ffmpeg/probe.ts` для папочного
      режима) вовсе не запрашивал `disposition` у ffprobe и не прокидывал его дальше. Флаг
      теперь течёт через весь конвейер: `demux.ts` → `audio-track-creator.ts`/
      `subtitle-track-creator.ts` → `import-db.ts` (create + оба `findXForManifest`) →
      `manifest-generator.ts` (`rebuildManifestTracks`, включая сравнение в `serializeAudio`/
      `serializeSub`) → манифест эпизода. Дополнительно проставлен в трёх местах, где Prisma
      `select` дублируется отдельно от `import-db.ts` (`manifest.handlers.ts`,
      `episode-manifest-regen.ts` `EPISODE_TRACKS_SELECT`) — иначе поле осело бы в БД, но не
      доехало до `rebuildManifestTracks`. Внешние дорожки (drag&drop, не из контейнера) флага не
      несут, `isForced: false` по умолчанию. lint/typecheck:tsgo animatrona — зелёные (0 ошибок).
      ⚠️ Полный прогон тестов не завершён этой задачей — `nx test animatrona` падает на
      несвязанном пред-существующем разрыве (`Cannot find package '@letar/folder-scan'` из
      vitest для `main/services/external-subtitle-scanner.ts`, файл этой задачей не тронут) —
      см. отдельную находку ниже.
- [x] ⏰ Привязка к §15.3 выполнена: поле добавлено в манифест до массовой перезаливки библиотеки

**✅ Находка выше устранена (2026-09-06, релиз 0.55.59)** — `@letar/folder-scan` добавлен в
настоящие `dependencies` `apps/animatrona/package.json` (см. CHANGELOG.md), `nx test animatrona`
снова полностью зелёный: 9/9 файлов, 166/166 тестов (подтверждено повторно в сессии консолидации
Prisma select ниже).

- [x] Консолидация трёх дублей Prisma `select` из пункта выше (2026-09-06) — вынесены
      `AUDIO_TRACK_MANIFEST_SELECT`/`SUBTITLE_TRACK_MANIFEST_SELECT` в `import-db.ts`,
      `manifest.handlers.ts` и `episode-manifest-regen.ts` теперь импортируют их вместо своих
      копий. Сверка нашла реальное расхождение: `EPISODE_TRACKS_SELECT` не запрашивал `ipfsSize`
      — фолбэк размера файла в `rebuildManifestTracks` терялся бы при регенерации манифеста для
      CID, которого ещё нет в старом манифесте. Подробности —
      [PLAN_COMPLETED-1.md § Консолидация Prisma select для треков манифеста](/apps/animatrona/PLAN_COMPLETED-1.md).

- [x] Тот же класс проблемы, что у `@letar/folder-scan` выше, найден превентивно (2026-09-06,
      релиз 0.55.61) ещё в трёх пакетах: `@letar/electron-storage`, `@letar/hooks`,
      `@letar/query-provider` — реально импортируются в `main/ipc/tracker.handlers.ts`,
      `main/services/distribution-service.ts`, `main/services/pinata-service.ts`,
      `main/services/regen-checkpoint.ts`, но были подключены только через
      `nx.implicitDependencies`/tsconfig paths, без записи в `dependencies`. Ещё не проявилось
      падением (текущие `*.spec.ts` не тянут эти файлы транзитивно), но следующий тест на них упал
      бы с тем же `Cannot find package`. Добавлены в `dependencies`, `bun install` создал симлинки,
      `nx test`/`lint`/`typecheck:tsgo animatrona` — зелёные (166 тестов).

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
- [x] **Автоматизировать**: `directoryCid` должен уходить в удалённый пин сразу после сборки, а не
      «когда-нибудь руками». Иначе часть библиотеки останется незастрахованной, и узнаем мы об этом
      снова после потери — **закрыто для батч-импорта** (2026-09-06): шаг ARCHIVING в
      `rutracker-batch-import.ts`, см. «Дисковая гигиена батча» в разделе про рутрекер-батч выше.
      Для ручного одиночного импорта (`import-service.ts`) автоматизация всё ещё не сделана —
      остаётся ручной шаг через UI, если это не переносить отдельной задачей на общую функцию.
- [x] Проверить, что удалённый пин реально подтверждён (`pinata.isPinned`), а не просто поставлен в
      очередь — «поставили в очередь» и «контент сохранён» это разные состояния — **закрыто для
      батч-импорта**: тот же ARCHIVING ждёт `isSafeToUnpinLocally`/`pinata.isPinned` перед
      локальным unpin, не полагается на факт постановки в очередь.

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
- [x] **Аудит гонки нормализации/GC vs активный импорт** (2026-09-06): при батч-импорте
      суб-документы аниме заливаются в Kubo с `pin:false` в расчёте на будущую indirect-защиту
      через `directoryCid`, который ещё не собран и не сохранён в БД — в этом окне контент не
      виден ни `pin.ls`, ни `refs(directoryCid)`. Находки:
  - `markAsLocalOnly`/`markAsQueued`/`markAsPinnedRemote` (`pin-status-service.ts`) нигде не
    вызываются в реальном пайплайне — таблица `PinStatus` пуста для всего свежего контента,
    `isSafeToUnpinLocally()` сейчас всегда возвращает `true`. Актуально только когда/если
    заработает §22.1/§14 batch-спека с `rutracker-batch-import.ts` (файл пока не существует).
  - `normalizeAllPins()` (`pin-normalizer.ts`) саму гонку не ловит: трогает только CID, уже
    reachable через `refs(directoryCid)` — то есть уже часть закоммиченного в БД дерева.
    Незалинкованный `pin:false`-контент для него невидим в принципе, потерять его так нельзя.
  - Реальный риск — голый `repo.gc()` за IPC `ipfs:repoGc` (`unified-ipfs-service.ts:443`):
    никакой защиты, никакой проверки активного импорта. `safeLocalGc()`
    (`pin-status-service.ts:314`, нормализация + GC) существует, но не вызывается вообще
    ниоткуда — мёртвый код.
  - Фикс, внесённый в этой сессии: `ImportQueueController.hasActiveImport()`
    (`import-queue-controller.ts`) + гейт в начале `normalizeAllPins()` — throw при активном
    импорте (`preparing`/`transcoding`/`postprocess`). Коммит `c8c82bfd`.
- [x] **Гейт `ipfs:repoGc` (2026-09-06, отдельная сессия по task_f511ca24)**: `repoGc()`
      (`unified-ipfs-service.ts:443`) теперь тоже проверяет
      `ImportQueueController.getInstance().hasActiveImport()` и бросает исключение во время
      активного импорта — тем же способом, что и `normalizeAllPins()`. Мёртвый `safeLocalGc()`
      (`pin-status-service.ts`, дублировал ту же защиту, но не вызывался ниоткуда) удалён вместе
      с неиспользуемым импортом `normalizeAllPins`; подключать его вместо голого `repoGc()` не
      стали — это поменяло бы IPC-контракт (`SafeGcResult` вместо `{blocksRemoved}`) и задело бы
      preload/renderer/типы, что выходило за рамки фикса. Коммит `12f13082`.

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

- [x] **`next build` renderer'а падает** на пререндере `/_not-found`:
      `InvariantError: Expected workStore to be initialized` — причинно проверено отдельной
      сессией 2026-09-01: код (`layout.tsx`, оба Route Handler) не содержит вызовов dynamic API
      вне request-scope, два чистых прогона (`rm -rf .next` + `next build --webpack`) подряд без
      единой правки кода прошли зелёными. Вывод — транзиентная гонка за `node_modules` с
      параллельным `bun install` (в `.bun`-сторе одновременно лежали три версии `next`), тот же
      класс проблемы, что и `Module not found` для `@ark-ui/react/*` в соседнем пункте плана.
      Разбор — [nextron-renderer-transpile-packages-required.md](/.claude/docs/nextron-renderer-transpile-packages-required.md#дополнение-2026-09-01-транзиентный-invarianterror-на-_not-found--тоже-гонка-за-node_modules).
      Если падение повторится — сначала переприбить чистым прогоном, не чинить код на веру
- [x] **Main-процесс не типизировался вообще ничем — исправлено (2026-09-06).**
      `apps/animatrona/main/tsconfig.json` был переписан под реальную структуру исходников
      (`module`/`moduleResolution` → `ESNext`/`bundler` вместо `Node16`, снят фантомный
      `references` в `tsconfig.spec.json`, снят `rootDir`/`outDir`, `include` расширен до
      `**/*.ts`). Из 295 реальных ошибок (после починки конфига) разгребены все 295 — часть
      оказалась одними лишь пробелами в типах, часть — настоящими давними багами, молчавшими
      только потому что main/ никогда не проверялся: жанры/темы аниме не сохранялись через
      локальный torrent-импорт (`Genre`/`Theme` писались с несуществующими полями, ошибка
      Prisma глушилась try/catch), `AnimeRelation.upsert` бил по несуществующему compound-ключу,
      весь `AchievementService` был без `await` (методы `achievements-store.ts` асинхронны),
      watchdog зависших видео-задач (`video-pool.ts`) читал поля не с того объекта и никогда не
      срабатывал, ретрай скачивания постера не срабатывал из-за неверной проверки результата,
      автостарт синхронизации трекеров терял `await` у конфига, `tracker.handlers.ts` падал бы
      при первом вызове `syncLibrary` (не импортированы `path`/`app`/`fs`), `resumeTask` в
      `base-pool.ts` не проверял `process` на `null` (в отличие от парного `pauseTask`).
      Добавлен постоянный гейт — таргет `typecheck:main` (`tsgo --project main/tsconfig.json
      --noEmit`), подключён как `dependsOn` к `typecheck:tsgo` — теперь любая новая ошибка в
      `main/` ловится тем же прогоном, что и raньше проверял только `renderer`/`shared`
- [x] **Все 4 e2e-теста плеера молча скипались — исправлено (2026-09-06).**
      `04-player/folder-player.electron.spec.ts` искал `getByRole('link', { name: /плеер/i })`,
      а пункты сайдбара — `Box asChild` вокруг `<button type="button">`
      ([Sidebar.tsx:160](renderer/src/components/layout/Sidebar.tsx)). Локатор не находился →
      `test.skip()` → зелёный репорт при нулевой проверке. Заменено на `getByRole('button', ...)`
      по образцу уже исправленного `video-click` спека (там же — тот же фикс для локатора
      «Библиотека», задетого той же причиной в четвёртом тесте). Прогнать вживую не удалось —
      нужен production-билд Electron и GUI, недоступные в песочнице агента (см.
      `.claude/rules/electron.md` § «GUI-уровень невозможно проверить в сендбоксе»); проверено
      статически — regex локаторов совпадает с реальными `label` из `navItems` в `Sidebar.tsx`
- [x] **Два форматтера с противоречащими конфигами** — перепроверено 2026-09-06, больше не
      воспроизводится: ни `.prettierrc`, ни `prettier`/`prettier-plugin-organize-imports` в
      `apps/animatrona` не найдено (`.prettierrc` отсутствует в файловой системе и не встречается
      в истории git по этому пути). `dprint` остаётся единственным форматтером, как и требует
      корневой `CLAUDE.md`. Пункт был описан со слов наблюдения на 2026-07-30 — либо файл убрали
      без обновления плана, либо конфликт был локальным артефактом IDE. Действие не требуется
