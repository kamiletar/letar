# PLAN — Animatrona Folder Player

## ✅ Переименование из `animatrona-player` (2026-09-08)

Приложение переименовано в `animatrona-folder-player` по решению владельца (задача от
`animatrona-coordinator-dev`, доставлена не через Agent Mail — identity `animatrona-dev` была
retired на момент отправки, зафиксирована прямо здесь координатором). Каталог, `name` в
`project.json`/`package.json`, `appId` в `electron-builder.yml`, упоминания в
`README.md`/`PLAN.md`/`PLAN_TESTING.md` — обновлены. Продуктовое имя (`productName`/
`shortcutName` в `electron-builder.yml`) оставлено «Animatrona Player» — это отображаемое
пользователю название, не внутренний слаг. Каскада на другие animatrona-приложения не было
(не импортирует `@letar/animatrona-types`, изолирован).

## ✅ Перенос плана из `apps/animatrona/PLAN_ANIMATRONA_PLAYER.md` (2026-09-08)

Весь раздел ниже (§0–§13) изначально жил как под-документ `apps/animatrona/
PLAN_ANIMATRONA_PLAYER.md` — вынесен туда при декомпозиции `animatrona/PLAN.md` 2026-09-07,
когда этого приложения ещё не существовало как отдельного nx-проекта. С тех пор приложение
сгенерировано, реализовано (Фазы 1–2 в основном готовы) и переименовано, но план оставался в
чужом каталоге — этот файл был пустышкой с шаблонным чек-листом «Фаза 1 — MVP», не отражавшим
реальный прогресс. Перенесено целиком, с фактическими правками только на устаревшие
утверждения о названии (см. §0 и §13 ниже). Историческая часть документа (записи `[x]` о том,
что и когда было сделано под старым именем `animatrona-player`) не переписывалась — это
точный отчёт о том, что реально происходило.

⚠️ **Разделы §14 и далее остались в `apps/animatrona/`** (переименован в
[`PLAN_ANIMATRONA_ECOSYSTEM.md`](/apps/animatrona/PLAN_ANIMATRONA_ECOSYSTEM.md)) — вопреки
названию исходного файла, они не про это приложение: локализация всей экосистемы (§14, но
применима и здесь), провайдер метаданных Shikimori/AniList (§15, только Animatrona — у
folder-player нет БД), мультиязычный лендинг (§16), статьи про трекер (§17), UI/UX плеера в
общих либах (§18–19, разделяется через `@letar/video-player-core`/`react`), расследование двух
IPFS-веб-плееров и чек-лист перезалива библиотеки (§20–21, только Animatrona).

## Animatrona Player — отдельное приложение для папочного просмотра

**Статус:** план (2026-07-30), к реализации не приступали.
**Идея:** раздел «Плеер» (`/player`) — самодостаточный продукт. Человек хочет посмотреть аниме,
которое уже скачал папкой: серии + внешние ASS-субтитры + внешние аудиодорожки + шрифты.
Ему не нужны IPFS, торренты, транскод, библиотека и Shikimori. Сейчас всё это он обязан
установить (инсталлятор **282 МБ**), чтобы получить доступ к плееру.
Второе приложение переиспользует папочный плеер через общие библиотеки — из одного кода
получаются два продукта.

### 0. Решения (принято 2026-07-30)

| Вопрос                     | Решение                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Имя nx-проекта             | ~~`apps/animatrona-player`~~ → **`apps/animatrona-folder-player`** (переименовано 2026-09-08 решением владельца; исходное обоснование короткого имени не подтвердилось — путаницы с `libs/video-player-*` не возникло, но появилась другая путаница: с десктопным `animatrona-dev` в Agent Mail)                         |
| productName (для человека) | «Animatrona Player», подзаголовок на сайте — «плеер аниме из папки» (SEO делает контент страницы, не имя exe) — **не переименовано**, остаётся отображаемым названием                                                                                                                                                    |
| appId                      | ~~`com.letar.animatrona-player`~~ → **`com.letar.animatrona-folder-player`** (сменён вместе с nx-проектом 2026-09-08 — на момент смены автообновление ещё не было включено, `userData` пользователей не пострадал; если решение «менять нельзя» когда-то давалось всерьёз, ко дню переименования оно уже не применялось) |
| Публикация                 | Релизы **из монорепо** `kamiletar/letar`, тег `animatrona-folder-player-v*` (обновлён под новое имя, публикации ещё не было — см. §8)                                                                                                                                                                                    |
| Кодеки                     | Докачка ffmpeg по требованию (Фаза 6), в v1 — честная детекция + «открыть в системном плеере»                                                                                                                                                                                                                            |
| Общий код                  | Выносим в `libs/` **сразу для обоих**: Animatrona переходит на либы в той же работе (иначе две копии разъедутся)                                                                                                                                                                                                         |
| Локализация                | ru + en **с первого дня** — и в новом приложении, и в самой Animatrona. Подробно — §14                                                                                                                                                                                                                                   |

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

- [x] Каркас сгенерирован (2026-09-07): `apps/animatrona-player`, `nx lint` /
      `nx typecheck:tsgo` / `nx build:win` — зелёные, установщик собран (**112 МБ** unpacked-базы,
      без единой либы плеера — ориентир из §2 «≤130 МБ» пока не под угрозой).
      **Найден и исправлен реальный баг генератора** (не специфичный для этого приложения — ловит
      ЛЮБОЙ свежесгенерированный `electron-app`): таргет `build:win` делал `cd renderer && next
      build` без явного пути. У `renderer/` нет своего `package.json`, поэтому Next резолвит
      корень проекта через подъём к ближайшему `package.json` — попадает на `apps/<app>/`
      (на уровень выше `renderer/`), не находит там `app/` и падает `Couldn't find any pages or
      app directory`. У уже существующих Electron-приложений (`label-printer-desktop` и др.) баг
      маскировался — там `apps/<app>/app/` случайно существует как каталог **скомпилированного
      main-процесса** (`background.js`), и его самого существования достаточно, чтобы проверка
      Next не бросила исключение — реальная сборка страниц при этом шла бы из неверного корня.
      Фикс — `next build renderer` (относительный путь как позиционный аргумент, без `cd`) и в
      `libs/generators/src/generators/electron-app/files/project.json.template`, и в уже
      сгенерированном `apps/animatrona-player/project.json`.
      Заодно всплыл сквозной баг `@letar/forms`/`@letar/forms-core` (не наш, докладываю
      отдельно forms-coordinator-dev): собственный typecheck `next build` (не `tsgo`) валит
      declarative table-поле (`field-data-grid.tsx`) — типы `@tanstack/react-table` разошлись с
      версией, под которую писался код. `nx typecheck:tsgo` этой проблемы не видит (другой чекер).
      Обход — `typescript: { ignoreBuildErrors: true }` в `next.config.js`, тот же паттерн уже стоял
      в `label-printer-desktop` по той же причине; добавлен и в шаблон генератора, и в это
      приложение — иначе каждое новое Electron-приложение будет натыкаться на то же самое.
      ⚠️ GUI-уровень (открытие окна, клики) не проверялся — недоступно в сендбоксе Claude Code
      (`.claude/rules/electron.md`), нужен живой запуск `nx dev animatrona-player` у владельца.

- [x] Подключены `@letar/folder-player-react` и `@letar/folder-scan` (2026-09-08).
      - `tsconfig.json`/`renderer/tsconfig.json` — `paths`+`include` на обе библиотеки (main
      видит обе, renderer только `folder-player-react` — `folder-scan` Node-only);
      `package.json` `dependencies` + `bun install` (симлинк в `node_modules/@letar/`).
      - `main/webpack.config.js` — alias `@letar/folder-scan` на `libs/folder-scan/src`, тот же
      паттерн, что у `label-printer-desktop` (см. `.claude/docs/animatrona-dual-build-alias-drift.md`).
      - Main-процесс: `main/protocols/allowed-paths.ts`+`media.protocol.ts` — тонкие обёртки над
      библиотекой (без папки библиотеки, только userData/temp + папки, выбранные пользователем);
      `main/ipc/dialog.handlers.ts` (`dialog:selectFile`/`selectFolder`), `main/ipc/fs.handlers.ts`
      (`fs:scanFolder`/`scanExternalAudio`/`scanExternalSubtitles`) — портированы из Animatrona,
      но raw `ipcMain.handle()` (без `createHandler`-фабрики — её обёртка `{success,data,error}`
      не совпадает с прямыми формами, которых ждёт `FolderPlayerHost`). `background.ts`:
      `registerMediaProtocol()` до `app.whenReady()`, `setupMediaProtocolHandler()`+
      `initAllowedPaths()` после — тот же порядок, что в Animatrona.
      - `preload.ts`/`renderer/types/electron.d.ts` — `window.electronAPI.dialog.*`/`fs.*`.
      - `renderer/app/page.tsx` — переписан: строит `FolderPlayerHost` из `window.electronAPI`
      (`probe()` — заглушка, `MediaInfoWasmProber` не подключён, отдельный пункт ниже), рендерит
      `EpisodeSidebar`+`RecentFoldersCard`+`<video>` через `useFolderPlayer`/`useFolderHistory`/
      `useWatchProgress`. `toMediaUrl()` — упрощённая версия без IPFS-логики Animatrona
      (`renderer/app/_lib/media-url.ts`).
      - ⚠️ Пойманная и исправленная грабля: статический экспорт (`next export`) пререндерит
      страницу на этапе сборки — `window.electronAPI`/`window.localStorage` там не существуют,
      `ReferenceError: window is not defined` в `next build`. Фикс — `mounted`-флаг
      (`useState`+`useEffect`) и no-op host/storage до монтирования, реальные подставляются
      только в браузере.
      - Проверено: `nx typecheck:tsgo animatrona-player`, `nx lint animatrona-player`,
      `next build --webpack renderer` (статический экспорт) и `webpack --config
        main/webpack.config.js` — все зелёные. GUI-уровень не проверялся (недоступно в сендбоксе,
      см. запись выше про Фазу 2) — нужен живой `nx dev animatrona-player`.
- [x] Подключены `@letar/video-player-react` и `@letar/video-player-core` (2026-09-08).
      - `apps/animatrona-player/renderer/app/_components/VideoPlayer.tsx` — новый компонент,
      собственный `containerRef`/`useShakaPlayer` (не переиспользует `GlobalVideoProvider` из
      Animatrona — тот нужен там для персистентности видео между роутами, здесь навигации между
      страницами нет). `shaka-player` грузится динамическим `import()` внутри `useEffect` (ссылка
      на `self` в топ-левел коде пакета падает на SSR/пререндере статического экспорта) — тот же
      паттерн, что в `GlobalVideoProvider.tsx` Animatrona.
      - Хуки/компоненты библиотеки использованы напрямую: `useShakaPlayer`, `usePlayerState`,
      `usePlayerControls`, `useAutoHideControls`, `useKeyboardShortcuts`, `useSubtitles`,
      `SharedPlayerControls`, `SubtitleOverlay`, `PlayerLoadingOverlay`, `Tooltip`.
      - `renderer/app/_theme/system.ts` — `createSystem(defaultConfig, defineConfig({...}))` с
      `playerSemanticTokens` из `@letar/video-player-react`, подключён через `RootChakraProvider
      value={system}` в `providers.tsx` (Animatrona вместо этого дублирует токены локально в
      своей теме — здесь выбран более правильный вариант, реальное потребление экспорта библиотеки).
      - `renderer/public/` — вендорные ассеты SubtitlesOctopus (`subtitles-octopus.js` +
      `-worker.wasm`/`libassjs-worker.js`/`default.woff2`), скопированы из Animatrona; `<Script
      src="/subtitles-octopus.js" strategy="beforeInteractive" />` в `layout.tsx`.
      - `page.tsx` — плоский `<video>` заменён на `<VideoPlayer>`; субтитр берётся первым матчем
      из `player.externalTracks.subtitles` (уже отфильтрован по текущему эпизоду в
      `useFolderPlayer`), `matchedFonts`/`filePath` пропускаются через `toMediaUrl()`.
      - **Осознанно не подключено** (в компоненте — JSDoc-комментарий с той же формулировкой):
      - раздельные внешние аудиодорожки — `AudioTrackInfo`/`usesSeparateAudio` в
      `@letar/video-player-core` завязаны на IPFS `transcodedCid`, для локальных файлов из
      `@letar/folder-scan` не подходят напрямую; `usesSeparateAudioRef` всегда `false`;
      - главы (`ChapterList`/`ChapterSkipButton`) — нет `MediaInfoWasmProber`, нет данных;
      - Picture-in-Picture, sprite-превью на ховере прогресс-бара, кадр-степпинг — Animatrona-
      специфичные надстройки, не портированы.
      - Проверено: `nx typecheck:tsgo animatrona-player`, `nx lint animatrona-player`,
      `next build renderer` (статический экспорт, Turbopack) и `webpack --config
        main/webpack.config.js` — все зелёные. GUI-уровень не проверялся (недоступно в сендбоксе).
- [x] `app://` вместо `file://` (§6.1 ниже, 2026-09-08) — `main/protocols/app.protocol.ts`:
      привилегированная схема (`standard/secure/supportFetchAPI/corsEnabled/stream`), обработчик
      раздаёт файлы из `renderer/out/` (prod — `process.resourcesPath/renderer/out`, dev не
      используется — там `loadURL(http://localhost:port)` как и раньше). `resolveOutFile()`
      нормализует путь и защищён от path traversal (`../..` откатывается на `index.html`, не
      выходит за пределы `outDir`). `background.ts`: `registerAppProtocol()` до `whenReady()`
      рядом с `registerMediaProtocol()`, `setupAppProtocolHandler()` после — `loadFile(...)`
      заменён на `loadURL(APP_INDEX_URL)` (`app://local/index.html`). `renderer/next.config.js`:
      убран хак `assetPrefix: './'` — абсолютные пути `/_next/...` резолвятся от корня схемы
      `app://local/`, как в обычном вебе (снято и ограничение «только одна страница на корне»,
      хотя пока используется только одна).
      Проверено: `nx typecheck:tsgo`/`nx lint` зелёные, `next build renderer` (реальный
      статический экспорт, абсолютные пути `/_next/static/chunks/*.js` подтверждены в
      `index.html`) и `webpack --config main/webpack.config.js` — зелёные. `resolveOutFile()`
      прогнан на реальных файлах экспорта (index.html, вложенный chunk, path-traversal попытка)
      — все три случая резолвятся корректно. GUI-уровень (реальная загрузка окна) не проверялся —
      недоступно в сендбоксе Claude Code, нужен живой `nx dev`/`build:win` у владельца.
- [x] `MediaInfoWasmProber` на `mediainfo.js` (0.3.7 — реально поддерживаемый релиз, не
      устаревшие плейсхолдеры `1.0.x`) — `main/services/media-info-prober.ts`, реализует
      `MediaProber` из `@letar/folder-scan` (та же нормализованная `MediaInfo`, что и
      `ffprobeProber` в Animatrona).
      - Node-паттерн из `src/cli.ts` самой библиотеки (канонический источник — отдельного
      `examples/node` у пакета нет): `fsPromises.open` → `analyzeData(() => fileSize, readChunk)`
      → `close()` в `finally`.
      - WASM грузится через `locateFile`, резолвящий `mediainfo.js/MediaInfoModule.wasm`
      (реальный exports-подпуть пакета) в рантайме. **Ловушка:** обычный `require.resolve` со
      строкой-шаблоном webpack пытается разрешить статически на этапе сборки и падает
      (`Package path . is exported ... but no valid target file was found`) — фикс:
      `__non_webpack_require__.resolve(...)`, алиас нативного Node `require`, который webpack не
      анализирует. `mediainfo.js` также добавлен в `externals` `main/webpack.config.js` (та же
      логика, что и `electron`/`typescript`) — иначе бандл тащил бы Emscripten-глу впустую.
      - IPC: `main/ipc/probe.handlers.ts` (`probe:file`, raw `{success,data,error}`, без
      `createHandler`-обёртки — конвенция уже установлена в этом приложении для `fs.handlers.ts`),
      `main/preload.ts` (`electronAPI.probe`), `renderer/types/electron.d.ts`.
      - `renderer/app/page.tsx` — `probe()` больше не заглушка: мапит полную `MediaInfo` в узкую
      `MediaProbeInfo` (audio/subtitle-дорожки), тот же приём, что в
      `apps/animatrona/renderer/src/app/player/page.tsx`.
      - ⚠️ **Открытый риск, не закрыт этой задачей** (см. §3): `index` аудио/субтитр-дорожки —
      `StreamOrder` из mediainfo.js ("порядок потока для этого типа, счёт с 0"), не гарантированно
      совпадает с ffprobe stream index (тот нумерует сквозным индексом по всем типам разом,
      mediainfo.js — по каждому типу отдельно). Тест-сравнение `FfprobeProber` vs
      `MediaInfoWasmProber` на одинаковых файлах (§11) остаётся отдельной, не начатой задачей —
      в песочнице нет ни одной MKV/MP4-фикстуры для эмпирической проверки.
      - ⚠️ **Главы намеренно не реализованы** (`chapters: undefined`) — MediaInfoLib отдаёт их
      только как внутренние позиции `Chapters_Pos_Begin`/`Chapters_Pos_End`, ссылающиеся на
      необёрнутый `Get()`-API; реальные метки времени (по общим знаниям о MediaInfoLib) лежат в
      динамических timecode-ключах `extra`-словаря Menu-трека, но точный формат ключей не
      проверен на реальном файле — фикстур с главами в репозитории нет. Решение — не гадать с
      парсингом, который мог бы подсунуть плееру неверные границы, а оставить `undefined` явно
      прокомментированным до появления тестового файла. Кнопка «Пропустить опенинг» (§7) от этого
      всё ещё не подключена.
      - `attachmentFonts` тоже `undefined` — эта JS-обвязка над MediaInfoLib не отдаёт вложения
      MKV отдельным списком (в отличие от ffprobe `-show_streams`).
      - Проверено: `nx typecheck:tsgo animatrona-player`, `nx lint animatrona-player`, `webpack
        --config main/webpack.config.js` (главная проверка — что `mediainfo.js`-обвязка вообще
      собирается) и `next build renderer` — все зелёные. Дополнительно прогнан headless-прогон
      main-процесса (`bun build ... --target=node --format=cjs --external electron --external
        mediainfo.js` + `../../node_modules/.bin/electron.exe scripts/<verify>.cjs`, приём из
      `.claude/rules/electron.md`) на произвольном файле — WASM реально загрузился и
      `probeFile()` вернул корректный `MediaInfo` (включая формат/размер), подтверждает, что
      `locateFile`/`__non_webpack_require__` работает в живом Electron main-процессе, а не только
      компилируется. Временные verify-скрипты удалены после проверки, в репозитории не осели.
- [x] Встроенные ASS/SRT-субтитры и шрифты — без ffmpeg, через `matroska-subtitles`
      (0.3.7 → фактически 3.3.2, npm; без своих типов — амбиентная декларация по месту
      использования) + SubtitlesOctopus (уже в зависимостях). `main/services/embedded-subtitles.ts`,
      IPC `subtitles:extractEmbedded` (`main/ipc/embedded-subtitles.handlers.ts`).
      - Библиотека — стримовый `Transform` (`fs.createReadStream(mkv).pipe(new SubtitleParser())`),
      **не** собирает готовый .ass/.srt файл сама: отдаёт заголовок трека (`CodecPrivate` —
      `[Script Info]`+`[V4+ Styles]`) один раз (`tracks`) и распарсенные поля каждой ASS
      Dialogue-строки по одному (`subtitle` — `layer/style/name/margin*/effect/text`, время —
      отдельно `time`/`duration` самого блока) + вложения-шрифты (`file` — `filename`/`mimetype`/
      `data: Buffer`, реальные байты, без доп. извлечения). Сборка валидного .ass/.srt текста —
      целиком на нашей стороне (`buildAssContent`/`buildSrtContent`).
      - ⚠️ **Найдено эмпирически, не только по документации библиотеки:** `CodecPrivate`
      (`track.header`), которую кладут реальные мюксеры (проверено на ffmpeg), уже содержит
      собственную — пустую — секцию `[Events]`/`Format:`. Наивная конкатенация «header + своя
      секция Events» даёт файл с ДВУМЯ блоками `[Events]` подряд (первый пустой). Фикс —
      `stripEventsSection()` обрезает header по первому вхождению `[Events]` перед тем, как
      добавить собственную секцию с гарантированно совпадающим порядком полей Format/Dialogue.
      - `VideoPlayerSubtitle` (`renderer/app/_components/VideoPlayer.tsx`) расширен опциональным
      `content` (alternative к `url`) — прокидывается в `subtitleContent` `SubtitleOverlay`
      (`@letar/video-player-react`, уже поддерживал этот проп, просто не был использован).
      Шрифты — `Blob`/`URL.createObjectURL()` в рендерере (данные приходят по IPC как
      `Uint8Array`), `SubtitleOverlay.fonts` фетчит их как обычные URL, blob: ничем не хуже
      `media://`.
      - `page.tsx`: встроенные субтитры — **фоллбэк**, только когда для эпизода не нашлось ни
      одного внешнего файла (`player.externalTracks.subtitles.length === 0`) — потоковое чтение
      всего файла ради субтитров/шрифтов (seek не помогает, они рассеяны по контейнеру) дорого
      для больших видео, гонять его на каждый эпизод с уже имеющимися внешними Rus Sub/ не нужно.
      Выбор дорожки при нескольких встроенных субтитрах — берётся первая (`tracks[0]`); полноценный
      выбор по языку/дефолтности — отдельная задача, вне scope (у `matroska-subtitles` `tracks`
      нет флагов default/forced в принципе, только `number/language/type/name/header`).
      - Проверено принципиально иначе, чем предыдущие пункты — не только typecheck/lint/build, а
      реальным MKV-файлом, собранным на месте через локальный ffmpeg (`ffmpeg -attach ... -c:s ass`
      / `-c:s srt`, embedded ASS-трек + вложенный `arial.ttf` в одном файле, отдельно —
      embedded SRT-трек). Headless-прогон через `../../node_modules/.bin/electron.exe` (приём из
      `.claude/rules/electron.md`) реально распарсил оба файла: извлёк кириллицу и латиницу без
      повреждений, корректные тайминги, шрифт побайтово совпал с исходным (1045720 байт).
      Дополнительно результат для ASS-трека прогнан через `ffmpeg -vf ass=reconstructed.ass`
      (тот же libass, что и в SubtitlesOctopus/libass-wasm) — лог подтвердил `Added subtitle
      file: 'reconstructed.ass' (2 styles, 2 events)` и успешный подбор шрифта (`fontselect:
        Arial → ArialMT`), т.е. собранный файл — не просто синтаксически похож на .ass, а реально
      принимается движком рендеринга. Именно этим прогоном была найдена и исправлена ошибка с
      двойной секцией `[Events]` выше — типизация и сборка её не ловили. Тестовые MKV — в
      scratchpad-каталоге сессии, в репозиторий не попали.
      - Отдельно найдена и исправлена языковая ловушка (не относится к архитектуре): литеральная
      подстрока `*/` внутри собственного JSDoc-комментария (`margin*/effect`) закрывает блок
      комментария раньше времени — весь код после нём начинает парситься как код, `tsgo` в этом
      случае даёт нечитаемый каскад из полусотни синтаксических ошибок, из которого причина не
      очевидна. Не баг tsgo — обычное поведение `/* ... */`, просто с непривычно шумной
      диагностикой у этого парсера конкретно на многострочных template literals после места
      обрыва.
- [x] Детекция неподдерживаемых кодеков + сообщение + «открыть в системном плеере» (2026-09-08).
      `renderer/app/_lib/codec-support.ts` — `checkCodecSupport(videoTracks, audioTracks)`, чистая
      функция без внешних API: детерминированный список известных отказов Chromium (AVC/H.264
      10-bit = Hi10P; звук AC3/E-AC3/DTS/DTS-HD/TrueHD), сверенный с таблицей §4. Проверяется
      только реально воспроизводимая дорожка (`isDefault`, иначе первая) — файл с альтернативной
      AC3-дорожкой и дефолтной AAC не блокируется зря.
      ⚠️ **Отклонение от формулировки задачи**: `navigator.mediaCapabilities.decodingInfo()` не
      использован. Он требует точную строку кодека (`avc1.PPCCLL` с profile/level idc), а
      `mediainfo.js` отдаёт только текстовый профиль (`Format_Profile: "High"`) без числовых
      idc-кодов — построение строки было бы угадыванием, которое дало бы **как false positive,
      так и false negative** на реальных файлах. Детерминированный список из документированной
      таблицы даёт точный результат ровно для тех кодеков, которые в этой таблице перечислены
      (это и есть весь известный риск продукта), без риска угадать неверно. Уточнение
      `navigator.mediaCapabilities` для остальных кодеков (HEVC-профили и т.п.) — не начато,
      можно вернуться к нему отдельной задачей, если понадобится точность за пределами таблицы.
      HEVC намеренно не блокируется — Chromium умеет его аппаратно в зависимости от системы,
      это не гарантированный отказ.
      UI (`page.tsx`): проба через `window.electronAPI.probe()` напрямую (в обход
      `host.probe()` — тот отдаёт узкий `MediaProbeInfo` без видеодорожек, см. комментарий в
      коде), при обнаруженной несовместимости `VideoPlayer` заменяется на сообщение + кнопку
      «Открыть в системном плеере» (новый IPC `app:openInSystemPlayer` → `shell.openPath()`,
      `main/ipc/app.handlers.ts`) + неактивную кнопку «Включить расширенную поддержку форматов»
      (ведёт в Фазу 6, пока не реализована — тултип «появится в следующей версии»).
      K-Lite/системные кодек-паки сознательно не рассматривались как путь внутри самого
      приложения — Chromium декодирует `<video>` собственным движком, не через системные
      DirectShow-фильтры; K-Lite реально работает только через фоллбэк «открыть в системном
      плеере», это и есть архитектура кнопки.
      Проверено: `nx typecheck:tsgo`/`nx lint`/`next build renderer`/`webpack --config
        main/webpack.config.js` — зелёные. Логика `checkCodecSupport` прогнана вручную на пяти
      сценариях (Hi10P+AAC, AVC8bit+AC3, AV1+Opus, HEVC10bit+AAC, мультиаудио с AC3 не-дефолтной
      дорожкой) — все дали ожидаемый результат. Юнит-тесты (vitest) не заведены — у приложения
      сейчас нет тестовой инфраструктуры вовсе (нет `vitest.config`, нет тестового таргета в
      `project.json`); заводить её ради одной чистой функции — отдельная задача, см. §11 «Тесты
      писать через агентов». GUI-уровень (реальный чёрный экран → сообщение → клик → системный
      плеер) не проверялся — недоступно в сендбоксе, нужен живой прогон на реальном Hi10P/AC3-файле.
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

- [x] `fileAssociations` в `electron-builder.yml` + открытие переданного файла + single instance +
      drag&drop + `powerSaveBlocker` + `backgroundThrottling: false` (2026-09-08, всё разом —
      пункты плотно связаны одним потоком «файл пришёл откуда угодно → открылся в плеере»).
      - `electron-builder.yml`: `fileAssociations` на `mkv/mp4/avi/webm/mov/wmv/flv/m4v/ts/m2ts`
      (набор синхронизирован с новым `VIDEO_EXTENSIONS` в `main/constants/file-filters.ts`, а не
      с более узким списком из этого пункта плана — взят из сканера `@letar/folder-scan`, это и
      есть источник истины «что вообще считается видео»).
      - `main/services/file-args.service.ts` — `findVideoFileInArgv(argv)`, чистая функция без
      Electron-зависимостей (проверена вручную на реалистичных argv: путь к файлу вперемешку с
      exe/dev-портом/флагами — находит корректно, порт с dev-сервера не путает с файлом).
      - `main/background.ts`: `app.requestSingleInstanceLock()` в самом верху модуля (до
      регистрации протоколов) — вторая копия завершается сразу (`app.quit()` +
      `process.exit(0)`); `second-instance` фокусирует окно и шлёт файл из `commandLine`;
      `open-file` (macOS) — обязателен до `whenReady()`, файл ставится в `pendingFilePath`, если
      окно ещё не готово; общий `sendOpenFile()`/флаг `rendererReady` (выставляется в
      `did-finish-load`, сбрасывается на `closed`) не даёт послать IPC в ещё не загруженную
      страницу. `backgroundThrottling: false` — в `webPreferences` `BrowserWindow`.
      - IPC: `app:openFile` (main → renderer, не `handle`, а `send`/`on` — событие, не запрос) +
      `preload.ts` `onOpenFile()` возвращает функцию отписки; `getPathForFile(file)` —
      `webUtils.getPathForFile` (тот же паттерн, что в `poster-microtext-desktop`); `power:
        setPreventSleep` (`main/ipc/power.handlers.ts`, новый) — `powerSaveBlocker.start/stop`
      с проверкой `isStarted` (идемпотентно на повторные вызовы с одним и тем же состоянием).
      - `renderer/app/page.tsx`: подписка на `onOpenFile` → `player.openSingleFile(path)` (уже
      существующий метод хука, минуя диалог выбора); `onDragOver`/`onDrop` на обоих корневых
      элементах (idle-экран и экран плеера) — расширение пути через новый
      `_lib/dropped-path.ts` `isVideoFilePath()` решает файл это или папка (сам путь дублирует
      список расширений `file-filters.ts`, не импортирует — main и renderer собираются раздельными
      бандлерами, общий модуль не резолвится без отдельной настройки алиасов, дублировать короче).
      - `renderer/app/_components/VideoPlayer.tsx`: `power.setPreventSleep(state.isPlaying)`
      эффектом на изменение состояния воспроизведения + отдельный cleanup-эффект на
      размонтирование (смена эпизода/выход из плеера) — гарантирует снятие блокировки даже если
      воспроизведение не было явно поставлено на паузу.
      Проверено: `nx typecheck:tsgo`/`nx lint`/`next build renderer`/`webpack --config
        main/webpack.config.js` — зелёные (lint потребовал `eslint-disable-next-line
        react-hooks/exhaustive-deps` на двух хуках с `player.openSingleFile`/`openFolder` в
      зависимостях — тот же паттерн, что уже стоял в файле для `player.isFolderMode`). YAML
      `electron-builder.yml` распарсен Python `yaml.safe_load` — синтаксис `fileAssociations`
      корректен. GUI-уровень (реальный двойной клик, drag&drop, спящий экран) не проверялся —
      недоступно в сендбоксе, нужен живой прогон `build:win` + установка у владельца.
- [x] Запоминать размер, позицию и полноэкранность окна между запусками (`@letar/electron-storage`,
      2026-09-08). `main/services/window-bounds.service.ts` —
      `createJsonStore<WindowBoundsState>('window-bounds.json', ..., { mergeDefaults: true })`.
      `getInitialWindowState()` вызывается синхронно (`loadSync`) до создания `BrowserWindow` и
      валидирует сохранённые bounds против `screen.getAllDisplays()` — если окно в прошлый раз
      было на мониторе, который сейчас отключён, откатывается к дефолту вместо появления за
      пределами видимой области. `trackWindowBounds(window)` — дебаунс 500мс на `resize`/`move`,
      немедленное сохранение на `maximize`/`unmaximize`/`enter-full-screen`/`leave-full-screen`/
      `close`. Пока окно maximized/fullscreen, «нормальные» bounds не перезаписываются текущими
      (раздутыми) — берётся последнее сохранённое значение, иначе после первого разворачивания
      восстановленный размер навсегда стал бы «во весь экран».
      Подключение — как в `poster-microtext-desktop`/`label-printer-desktop`: `implicitDependencies`
      было бы недостаточно само по себе (см. `libs.md`), здесь библиотека сразу и в
      `dependencies`, и в `paths`/`include` обоих tsconfig, и в alias `main/webpack.config.js`
      (иначе резолв `@letar/electron-storage` в бандле main-процесса не находит `node_modules/`).
      Только main-процесс — renderer не тронут: `FolderPlayerStorage` (интерфейс
      прогресса/истории папок) синхронный (`getItem`/`setItem`, как `localStorage`), а
      `createJsonStore` — асинхронный/main-only API за IPC-границей; мост между ними (например
      через `ipcRenderer.sendSync`) — отдельное архитектурное решение, не часть этой задачи.
      Проверено: `nx typecheck:tsgo animatrona-player`, `nx lint animatrona-player`,
      `webpack --config main/webpack.config.js` — все зелёные. GUI-уровень (реальное
      восстановление позиции окна) не проверялся — недоступно в сендбоксе.
- [x] Кэш probe на диске, а не только LRU в памяти: ключ `путь + mtime + размер`. Повторное
      открытие той же папки не должно снова пробивать все серии (2026-09-08).
      `main/services/probe-disk-cache.service.ts` — JSON-стор через `@letar/electron-storage`
      (`probe-cache.json` в userData, `atomic: true`, `mergeDefaults: true`), ключ — путь к
      файлу, значение — `{ mtimeMs, size, data: MediaInfo, probedAt }`. Хит только при
      совпадении `mtimeMs`/`size` с текущим состоянием файла на диске (`fs.stat`) — TTL по
      времени не нужен, замена/перекодирование файла того же имени сама инвалидирует запись.
      Эвикция самых старых по `probedAt` при превышении 500 записей. `main/ipc/probe.handlers.ts`
      оборачивает `mediaInfoWasmProber.probe()` в `getCachedProbe()` — контракт `probe:file`
      не изменился, кэш прозрачен для `FolderPlayerHost`/renderer. In-memory LRU рендерера
      (`libs/folder-player-react/src/lib/probe-cache.ts`) не тронут — он экономит IPC-вызовы
      внутри одного запуска, дисковый кэш — между запусками, слои не конфликтуют.
      Проверено: `nx typecheck:tsgo animatrona-folder-player`, `nx lint animatrona-folder-player`,
      `webpack --config main/webpack.config.js` — зелёные.
- [ ] Проверить, что 1080p/4K декодируются на GPU, а не на CPU (`chrome://gpu` в devtools окна;
      на Linux может понадобиться флаг VAAPI)

### 7. Фаза 3 — главы OP/ED (закрывает открытую задачу ниже, теперь для обоих приложений)

> **Уточнение 2026-09-08:** формулировка «`MediaProber` отдаёт главы у обеих реализаций» была
> неточной для этого приложения — `mediaInfoWasmProber` **сознательно** возвращает
> `chapters: undefined` (см. комментарий в `main/services/media-info-prober.ts`: формат
> динамических timecode-ключей Menu-трека MediaInfoLib не проверен без реальных MKV-фикстур с
> главами). Закрыто не доработкой mediainfo.js-биндинга, а вторым источником — **ffprobe**
> (теперь доступен благодаря Фазе 6): `-show_chapters -print_format json` — документированный
> стабильный формат, не требующий проверки на реальном файле, чтобы доверять схеме, в отличие от
> внутреннего API MediaInfoLib.

- [x] `main/services/ffmpeg/chapters.service.ts` — `probeChaptersWithFfprobe(filePath)`. Работает,
      только если ffmpeg доступен (`getFfmpegStatus()` из Фазы 6); иначе `undefined`, без ошибки
      — файл без глав играется как раньше, просто без кнопки «Пропустить опенинг». Не кэшируется
      отдельно (`ffprobe -show_chapters` не декодирует видео, быстрый) — вызывается заново на
      каждую пробу, вне дискового кэша `probe-disk-cache.service.ts`, чтобы доступность ffmpeg
      (могли поставить после первой пробы файла) проверялась актуально, а не застревала в кэше.
- [x] `main/ipc/probe.handlers.ts` — если `mediaInfoWasmProber` не дал глав (всегда так),
      подмешивает результат `probeChaptersWithFfprobe`.
- [x] Классификация — переиспользована `detectChapterTypes` из `@letar/video-player-react`
      (`utils/detect-chapter-types.ts`), **но она не была реэкспортирована из публичного API
      библиотеки** (`utils/index.ts` содержал только `formatTime`/`parseSpriteCues`) — нигде в
      монорепо не использовалась до этой задачи, несмотря на существующие тесты. Добавлена в
      `utils/index.ts`, версия библиотеки бампнута (0.2.1 → 0.2.2). Проверено: typecheck самой
      библиотеки и всех известных потребителей (`animatrona`, `animatrona-tracker`,
      `animatrona-folder-player`) — зелёные, чисто аддитивный экспорт.
- [x] Конвертация `MediaChapter[]` (ffprobe, `{start,end,title}`) → `Chapter[]` с `type`,
      определённым `detectChapterTypes` (в отличие от `animatrona-tracker`, где тип уже приходит
      готовым из `ManifestChapter` — здесь манифеста нет, определяется по названию/позиции
      эвристикой). Логика — в `shared/chapter-mapping.ts` (`classifyMediaChapters`), не в самом
      хуке: `vitest.config.mts` не включает `renderer/**` в тесты (та же конвенция, что у
      `animatrona`/`label-printer-desktop`/`poster-microtext-desktop`), поэтому чистая логика
      выносится в `shared/`, а `renderer/app/_hooks/use-chapter-skip.ts` остаётся тонкой
      мемоизирующей обёрткой без собственной логики для покрытия тестами.
- [x] `VideoPlayer.tsx` — `ChapterSkipButton` (кнопка «Пропустить опенинг/эндинг» поверх видео,
      готовый компонент из `@letar/video-player-react`, ранее использовался только в
      `animatrona-tracker`) + маркеры глав на прогресс-баре через существующий проп
      `chapters`/`onChapterSeek` у `SharedPlayerControls`. Seek — `controls.seek(time)`
      (абсолютные секунды), не `controls.handleSeek` (принимает проценты 0-100 для прогресс-бара,
      разные сигнатуры — заметил при подключении).
      Без автопропуска и списка глав (`ChapterList`/toggle из `animatrona-tracker`) — эта задача
      про кнопку, не про полноценный менеджер глав; список глав можно добавить отдельно, если
      понадобится.
- [ ] Приёмка на реальном файле — не проверено, тот же блокер песочницы (нет MKV-фикстур с
      реальными главами, нет GUI), что у §10/§10.1/§3/§6/§11: файл с главами в MKV показывает
      кнопку «Пропустить опенинг» в первые ~90 сек и «Пропустить эндинг» в последние; файл без
      глав или без ffmpeg — без кнопки, без ошибок; маркеры глав видны на прогресс-баре.

### 8. Фаза 4 — сборка и публикация

- [x] `project.json`: `dev`, `build`, `build:win`, `build:linux`, `release:win`, `lint`,
      `typecheck:tsgo`, `format` (2026-09-08). `test` намеренно не заведён — у приложения пока
      нет vitest-инфраструктуры вовсе, заводить таргет без единого теста бессмысленно, это
      отдельная задача §11 «Тесты писать через агентов». `build` — компиляция без паковки
      (`next build renderer` + webpack main), `build:linux`/`release:win` — по образцу
      `build:win` (`electron-builder --linux` / `--win --publish always`). Никаких `db:*`/
      `zenstack:*` — приложение без БД. Проверено: `nx typecheck:tsgo`/`nx lint` зелёные.
- [x] `electron-builder.yml`: `appId com.letar.animatrona-folder-player` — сделано попутно
      переименованием 2026-09-08 (см. §0), раньше первоначально задуманного момента этой фазы
- [x] `electron-builder.yml`: NSIS (`oneClick: false`) — уже стояло;
      `publish: { provider: github, owner: kamiletar, repo: letar }` вместо `publish: null`
      (2026-09-08). Само автообновление (`electron-updater`) в приложении не подключено —
      отдельный пункт ниже, блокирован на состояние релизного канала Animatrona.
- [x] ⚠️ **Точная** версия electron в `devDependencies` — уже стояла (`"44.2.0"`, точная).
- [x] ⚠️ electron-builder ищет `node_modules` от `projectDir`, а не `appDir` — версия
      `electron-builder` уже зафиксирована точно (`"26.15.3"`, не `^26.15.3`) в `devDependencies`.
- [x] `.github/workflows/release-animatrona-folder-player.yml` по тегу `animatrona-folder-player-v*`
      (2026-09-08): build win/linux/mac → релиз **в `kamiletar/letar`**. Без шага зеркалирования
      исходников (в отличие от `release-animatrona.yml`) и без ZenStack/Prisma-шагов — приложение
      без БД. `permissions: contents: write` + штатный `GITHUB_TOKEN` (не PAT `secrets.GH_TOKEN`,
      как у Animatrona) — релиз пишется в тот же репозиторий, не в чужой.
      ⚠️ **Проверено:** [publish-npm.yml](/.github/workflows/publish-npm.yml) триггерится только
      на `forms-v*.*.*`/`form-mcp-v*.*.*`/`zenstack-form-plugin-v*.*.*` — новый тег
      `animatrona-folder-player-v*` под эти паттерны не подходит, конфликта нет. YAML
      провалидирован `yaml.safe_load` (jobs: create-release/build-windows/build-linux/
      build-macos/publish-release). **Не проверено живым прогоном** — реальный push тега и
      публикация релиза не выполнялись (нужен git push, требует отдельного одобрения; см.
      `.claude/rules/git.md`), поэтому workflow не гонялся в GitHub Actions ни разу.
- [x] **Шаг проверки веса в CI**: падать, если установщик > 130 МБ — реализовано в каждом из
      трёх build-джобов workflow (`du -m`, сравнение с `env.MAX_INSTALLER_SIZE_MB: 130`),
      до загрузки в релиз. Не запускался живьём по той же причине, что пункт выше.
- [ ] Автообновление (`electron-updater`) — включать только после того, как первый релиз в letar
      реально появился и `latest.yml` отдаётся
- [x] **Портативная сборка** вторым target'ом (2026-09-08). `electron-builder.yml`: `win.target`
      получил второй элемент `{ target: portable, arch: [x64] }` рядом с `nsis`; `artifactName`
      задан для обоих (`${productName}-Setup-${version}.exe` / `${productName}-portable-
      ${version}.exe`), чтобы имена не пересекались и предсказуемо матчились в CI. `.AppImage`
      для Linux уже портативен сам по себе, отдельного target'а там не заводилось.
      `release-animatrona-folder-player.yml` (job `build-windows`): проверка веса и загрузка в
      релиз переписаны с «первый попавшийся `*.exe`» на цикл по всем `dist/*.exe` — с двумя exe
      старая версия либо проверила/залила бы не тот файл, либо пропустила второй молча.
      Проверено: YAML обоих файлов валиден (`yaml.safe_load`), `nx lint animatrona-folder-player`
      зелёный. Живой прогон сборки (нужен Windows-раннер electron-builder) не выполнялся.

**Побочная находка, отдельная задача:** релизный контур Animatrona рассинхронизирован —
`electron-builder.yml` публикует в `repo: letar` (где релизов нет), а workflow загружает ассеты в
`kamiletar/animatrona`, где последний релиз **v0.50.1** при текущей версии **0.55.16**. То есть
автообновление у пользователей Animatrona, скорее всего, не работает с апреля 2026. Проверить и
починить до того, как заводить второй продукт на том же механизме.

### 9. Фаза 5 — сайт ✅ (2026-09-08)

- [x] `apps/animatrona-landing/src/lib/github.ts` — параметризовано через `ReleaseSource
      { owner, repo, tagPrefix }`: `ANIMATRONA_SOURCE` (текущее поведение, без изменений) и
      `FOLDER_PLAYER_SOURCE` (`kamiletar/letar`, префикс `animatrona-folder-player-v`).
      `@letar/github-releases` уже поддерживал `tagPrefix` — правка ушла только в лендинг.
      Добавлен `findWindowsAssets()` (NSIS-инсталлятор vs portable — у плеера теперь два `.exe`
      в релизе, старый `findAssetForPlatform` слепо брал первый попавшийся). `getDisplayVersion`
      принимает `fallback` параметром вместо захардкоженной версии Animatrona.
- [x] Фильтр релизов по префиксу тега — через `tagPrefix` у `FOLDER_PLAYER_SOURCE`
      (готовая возможность `@letar/github-releases`, не нужно было ничего чинить в библиотеке).
- [x] Страница `/player` (`src/app/player/page.tsx`, Server Component со своими `metadata` —
      не наследует canonical с главной): таблица отличий от полной Animatrona, таблица «что
      играет из коробки» (контейнеры / встроенные и внешние субтитры-шрифты-дорожки / чего нет —
      Hi10P, AC3/DTS/TrueHD), секция скачивания (переиспользован `DownloadsSection` с релизом
      из `FOLDER_PLAYER_SOURCE`, честно показывает «скоро» до первого реального релиза). Ссылка
      «Плеер» добавлена в `navbar.tsx`.
- [x] SEO — «плеер для аниме из папки», «внешние аудиодорожки и ASS-субтитры» в `title`/
      `description`/H1 страницы `/player`, не в названии приложения.
- [x] Позиционирование — явный блок на хиро `/player`: приложение ничего не скачивает и не ищет
      контент (ни торрентов, ни IPFS, ни каталога), только проигрывает то, что уже на диске.
- [x] Побочный фикс: `DownloadsSection` показывал на `/player` копирайт Animatrona про
      GPU-транскодирование (NVENC/libsvtav1) — неверно для плеера, который вообще не
      транскодирует. Вынесено в необязательный проп `requirementsNote` (дефолт — прежний текст
      Animatrona, homepage не затронут), `/player` передаёт свой текст про декодирование
      Chromium без GPU.

### 10. Фаза 6 — докачка ffmpeg и воспроизведение «неудобных» форматов

> **Решение владельца (2026-09-08), отменяет прежнюю рекомендацию по экономии веса:**
> «Всеядность нужна плееру. Он должен воспроизводить любой контент, найденный на раздачах. Если
> будет увеличен размер сборки — это не так страшно, как то, что плеер откажется что-то
> воспроизводить». Поэтому берём **полную BtbN-gpl** (163 МБ архив), а не `essentials` — набор
> кодеков важнее мегабайтов. Побочный плюс: `.zip`/`.tar.xz` распаковываются штатными средствами
> ОС, тогда как `essentials` у gyan.dev распространяется **только `.7z`** и потребовал бы новой
> зависимости (`7zip-min`). На вес инсталлятора это не влияет вовсе — ffmpeg в дистрибутив не
> входит.

- [x] Скачивание по требованию в `userData` (не в инсталлятор): UI с прогрессом, отмена,
      возможность удалить — `main/services/ffmpeg/ffmpeg-installer.service.ts`,
      IPC `ffmpeg:*`, панель `renderer/app/_components/ExtendedFormatsPanel.tsx`. Скачивается
      весь пакет BtbN (win64-gpl `.zip` / linux64-gpl `.tar.xz`), ffprobe оставлен рядом с
      ffmpeg намеренно — при полной сборке экономии от его удаления нет, а точные индексы
      дорожек он ещё пригодится сверять (см. риск «индексы дорожек у mediainfo ≠ ffprobe»).
      **Уже установленный в системе ffmpeg (PATH) распознаётся и используется как есть** —
      таким пользователям качать 163 МБ не нужно.
      ⚠️ **Проверки контрольной суммы нет — и не может быть в текущем виде.** BtbN не публикует
      `.sha256`-сайдкары для тега `latest` (проверено 2026-09-08: 404 на все варианты), а сам
      тег перезаписывается ежедневно, поэтому захардкоженная сумма протухла бы за сутки. Вместо
      неё — функциональная верификация после распаковки: `ffmpeg -version` с кодом 0 плюс
      наличие всех нужных декодеров в `-decoders` (`h264`, `hevc`, `ac3`, `eac3`, `dts`,
      `truehd`). Битую или неполную сборку это ловит не хуже суммы; от подмены защищает HTTPS
      к github.com. Частичная/оборванная загрузка удаляется целиком, а не остаётся выглядеть
      установленной.
- [x] Эскалация по стоимости, а не «всегда транскод»: 1. **ремукс** (`-c copy`) — когда проблема
      в контейнере (AVI/WMV/FLV/TS); 2. **только звук** (AC3/DTS/TrueHD → AAC, видео `copy`) —
      самый частый случай в аниме; 3. **видео** (Hi10P → H.264 8-bit, `-pix_fmt yuv420p`) —
      последний вариант. Реализовано чистой функцией `buildTranscodePlan()` в
      `shared/transcode-plan.ts` (+ `buildCodecArgs()`), покрыто unit-тестами.
      Аппаратные энкодеры намеренно не подставляются: у каждого вендора свой набор ключей, а
      промах по доступности даёт падение ffmpeg вместо картинки — `libx264 -preset veryfast`
      предсказуем везде.
      Заодно `codec-support.ts` переехал из `renderer/app/_lib/` в **`shared/`** — теперь список
      неподдерживаемого один на оба процесса (renderer показывает, main чинит), не может
      разъехаться. Появился `@shared/*` алиас: корневой `tsconfig.json`, `renderer/tsconfig.json`
      (его читает `next build`!) и `main/webpack.config.js` — все три держать синхронно, см.
      [electron-nextron-dual-tsconfig-paths-drift](/.claude/docs/electron-nextron-dual-tsconfig-paths-drift.md).
- [x] ~~Отдача потока: локальный HTTP на `127.0.0.1` + HLS-сегменты~~ — **от HLS сознательно
      отказались в v1**, вместо него подготовка файла целиком во временный MP4
      (`main/services/ffmpeg/transcode.service.ts`). Причина: свой HLS-плейлист приходится
      генерировать с расчётными длительностями сегментов, а при `-c:v copy` ffmpeg режет по
      реальным keyframe — заявленные и фактические границы расходятся, и перемотка начинает
      врать именно в самом частом сценарии (перекодируется только звук). Готовый MP4 даёт
      точную перемотку бесплатно, не зависит от живого процесса и кэшируется тривиально.
      Плата — ожидание перед стартом (десятки секунд при перекодировании звука, минуты при
      Hi10P), о чём UI предупреждает явно. HLS остаётся кандидатом на будущее, если ожидание
      окажется неприемлемым на практике.
- [x] Кэш готовых файлов + автоочистка, чтобы не забить диск: `userData/transcoded/`, ключ —
      `sha1(путь + mtime + size + стратегия + индекс дорожки)`, потолок 20 ГБ с вытеснением
      самых давних. Незавершённая подготовка живёт под именем `*.part.mp4` и кэшем не считается.
      Повторное открытие той же серии стартует мгновенно.
- [x] **Эмпирическое подтверждение решения владельца (2026-09-08).** Headless-прогон
      `scripts/verify-ffmpeg.cjs` на машине разработки показал: найденный в системе
      **ffmpeg 8.0 `essentials_build` от gyan.dev — без декодера DTS**. То есть ровно тот
      «экономный» вариант, который предлагался в прежней редакции этого пункта, на практике
      отказался бы проигрывать часть раздач. Отсюда доработка UI: если бинарь есть, но
      каких-то декодеров в нём нет, панель предлагает докачать полную сборку, а не падает на
      подготовке файла. Скачанный ffmpeg всегда имеет приоритет над системным.
- [ ] Приёмка: файл Hi10P + AC3 играет со звуком и перемоткой; чистая установка без ffmpeg играет
      обычный AV1/H.264 без единого лишнего запроса.
      ⚠️ **Не проверено на реальных файлах** — в песочнице нет ни MKV/MP4-фикстур, ни GUI
      (тот же блокер, что у §3/§6/§11). Проверено: типы, линт, unit-тесты чистой логики
      (`shared/*.spec.ts`) и headless-прогон main-процесса
      (`../../node_modules/.bin/electron.exe scripts/verify-ffmpeg.cjs` — статус ffmpeg и все
      четыре ветки эскалации с реальными аргументами). Скрипт принимает путь к видеофайлу
      аргументом и тогда прогоняет настоящую подготовку — этим и проверять на реальной
      Hi10P/AC3-раздаче. Живой GUI-прогон — за владельцем, до релиза.
- [ ] ⚖️ **Лицензионная заметка:** сборки BtbN — GPL. Когда ffmpeg **не входит в дистрибутив**, а
      скачивается пользователем в userData и вызывается как отдельный процесс через CLI, вопрос
      «производного произведения» не встаёт. Это дополнительный плюс выбранного пути. Заодно
      отметить: Animatrona ffmpeg-gpl **поставляет внутри инсталлятора** — там как минимум нужен
      текст лицензии и ссылка на исходники в «О программе». Проверить, есть ли (отдельная задача)

#### 10.1 Превью-спрайт для перемотки

> Обнаружено при вопросе владельца «а для перемотки показывается превью?» (2026-09-08):
> отображающая часть (`TimelinePreview`, `parseSpriteCues`/`sprite-vtt.ts`, проп `spriteUrl`/
> `spriteCues` у `SharedPlayerControls`/`SharedProgressBar` из `@letar/video-player-react`) уже
> существует и уже подключена в `VideoPlayer.tsx` — тем же кодом, что и в `animatrona`. Спрайты
> никогда не генерировались только потому, что у плеера папок не было ffmpeg до Фазы 6. Теперь
> есть — добавлена генерация.

- [x] Раскладка и WebVTT — чистая логика без зависимости от electron/ffmpeg,
      `shared/sprite-layout.ts`: `planSpriteLayout(durationSec)` (интервал между кадрами не реже
      `MIN_INTERVAL_SEC=5` сек, число кадров не больше `TARGET_FRAME_COUNT=200`, сетка до 10
      столбцов), `formatVttTimestamp`, `buildSpriteVtt` (координаты `xywh` по сетке слева
      направо/сверху вниз, последний cue тянется до реальной длительности файла, а не до
      `frameCount * intervalSec`), `buildSpriteFilter` — строка `-vf` для одного вызова ffmpeg
      (`fps=1/N,scale=...,crop=...,tile=ColxRow`, один кадр `-frames:v 1` — весь спрайт-лист
      получается одним проходом, без ручной сборки кадров).
- [x] Нарезка через ffmpeg — `main/services/ffmpeg/sprite.service.ts`: `generateSprite(filePath,
      durationSec)`. Работает, только если ffmpeg доступен (`getFfmpegStatus()` из Фазы 6) —
      иначе `null`, без ошибки пользователю. Кэш в `userData/sprites/`, ключ —
      `sha1(путь + mtime + size)`, `.part.jpg` → `rename` только на успех, потолок 512 МБ с
      LRU-вытеснением пары `.jpg`+`.vtt`. `cancelSpriteGeneration()` — обрывает при смене эпизода.
- [x] IPC `sprite:generate`/`sprite:cancel`/`sprite:getCacheSize`/`sprite:clearCache` —
      `main/ipc/ffmpeg.handlers.ts`, `main/preload.ts`, `renderer/types/electron.d.ts`.
- [x] Подключение в `VideoPlayer.tsx`: новый обязательный проп `filePath` (реальный путь на
      диске, для Hi10P/AC3 — путь к уже подготовленной transcode-копии, не тот же `src`, что
      прошёл через `media://`). Нарезка запускается **в фоне после старта воспроизведения**
      (`isVideoReady && state.duration`, ref-гвард `spriteRequestedForRef` — не блокирует старт
      просмотра и не перезапускается на промежуточные уточнения `duration` от Shaka), результат
      передаётся в уже существующие `spriteUrl`/`spriteCues` `SharedPlayerControls`. Смена файла
      обрывает предыдущую нарезку через `sprite.cancel()` в cleanup эффекта.
      `page.tsx` передаёт `filePath={preparedPath ?? currentVideoPath}` — тот же путь, что уже
      используется для `src`.
- [x] Unit-тесты чистой логики — `shared/sprite-layout.spec.ts` (66 тестов на весь `shared/`,
      написаны делегированным агентом): границы `planSpriteLayout` (0/NaN/Infinity → `null`,
      нижний порог интервала на коротком видео, верхний предел кадров на длинном, `columns` не
      больше `frameCount` для совсем короткого видео), `formatVttTimestamp` (округление
      миллисекунд, часы, отрицательные значения), `buildSpriteVtt` (число cue = `frameCount`,
      последний cue тянется до `durationSec`, переход на вторую строку сетки), `buildSpriteFilter`
      (порядок частей фильтра). `nx test`/`nx lint`/`nx build` — зелёные.
- [ ] Приёмка на реальном файле — не проверено, тот же блокер песочницы (нет MKV-фикстур, нет
      GUI), что и у §10/§3/§6/§11: наведение на полосу перемотки должно показать превью после
      первого прохода нарезки; без установленного ffmpeg превью просто не появляется, без ошибок
      в UI; повторное открытие той же серии отдаёт спрайт из кэша мгновенно.

### 11. Тесты

- [x] Unit (vitest) — `parse-filename` и `detect-chapter-types` уже были покрыты тестами до
      этой задачи (найдено при ревизии 2026-09-08, не переписывались). Написаны через
      делегированного агента (2026-09-08, по инструкции ниже):
      `libs/folder-scan/src/lib/external-subtitle-scanner.spec.ts` (31 тест — матчинг внешних
      субтитров к сериям, разбор языка/группы из имени файла, поиск папок субтитров/шрифтов),
      `libs/folder-scan/src/lib/font-matcher.spec.ts` (20 тестов — поиск и сопоставление
      шрифтов, с реальной временной ФС через `mkdtempSync`), `libs/folder-player-react/src/lib/
      probe-cache.spec.ts` (11 тестов — in-memory LRU-кэш probe, TTL, инвалидация). Для
      тестируемости из `external-subtitle-scanner.ts` экспортированы ранее module-private
      функции (`fuzzyMatchToVideo`, `normalizeLanguageCode`, `extractGroupNameFromSubsDir`,
      `isSubtitleFolder`, `isFontFolder`, `matchFontsToFiles`) — по образцу уже экспортированных
      аналогов в `external-audio-scanner.ts`, логика при экспорте не менялась.
      `nx test folder-scan` — 112/112, `nx test folder-player-react` — 34/34, `nx lint` обеих
      либ — чисто.
      ⚠️ **Найден и исправлен реальный баг** (агент только задокументировал в тесте, фикс — этой
      же сессией сразу следом, до коммита): `fuzzyMatchToVideo` в `external-subtitle-scanner.ts`
      сливал шаг 1 (точный матч) и общий bidirectional `startsWith` в одну проверку, из-за чего
      шаг 2 (разбор суффикса `.lang_group` типа `.jp_netflix`/`.ru_AniLibria`) был недостижим
      для любой папки с несколькими сериями — subBaseName вида `<videoBaseName>.jp_netflix`
      всегда матчился по `startsWith` раньше, чем код успевал распознать суффикс. Язык/группа
      субтитра из имени файла терялись молча (работал только спецкейс одного видео-файла —
      фильма, где эта логика вынесена в отдельную раннюю ветку). Порядок шагов исправлен по
      образцу `external-audio-scanner.ts` (точный матч → стрип суффикса → общий prefix-матч).
      — **Сравнение `FfprobeProber` vs `MediaInfoWasmProber` на одинаковых файлах остаётся не
      начатым** — блокировано отсутствием MKV/MP4-фикстур в песочнице (см. §3/§6 — тот же
      блокер, что и раньше).
- [x] `apps/animatrona-folder-player-e2e` — smoke + папочный сценарий (2026-09-08). Генератор
      `e2e-suite` не применялся (⚠️ он рассчитан на веб-приложения с `baseURL`/`webServer` на
      dev-порт — у Electron-плеера без фиксированного порта неприменим, см. `.env-files.md`) —
      сьют собран руками по образцу `apps/animatrona-e2e` (упрощённый: без БД/welcome-онбординга,
      которых у этого приложения нет). `project.json`/`tsconfig.json`/`playwright.config.ts`
      (только `electron`+`smoke` проекты, без `dev-chromium`/`webServer`) + `helpers/
      electron.helpers.ts` (свой `getElectronAppPath()` → `dist/win-unpacked/Animatrona
      Player.exe`) + `fixtures/create-test-videos.ts` (bundled ffmpeg `animatrona`, только
      build-time инструмент). Тесты: `01-smoke/app-launches` (версия, пустой экран с кнопкой
      «Выбрать папку»), `02-player/folder-playback` (выбор папки → сайдбар с эпизодами → клик
      по эпизоду → `<video>` реально грузит буфер, `readyState >= 2`).
      ⚠️ **Локатор кнопки эпизода — не zero-padded номер.** `getDisplayName()` в `EpisodeSidebar`
      отдаёт `"1"`/`"2"`/`"3"`, не `"01"`/`"02"`/`"03"` — локатор с `hasText: '01'` находит 0
      элементов (найдено первым прогоном, видно по accessibility-снапшоту Playwright при
      падении: `button "1 1 100 100.9 KB"`). Фикс — `hasText: /^\d/` (доступное имя кнопки
      эпизода — единственное среди контролов плеера, начинающееся с цифры).
      Прогнано локально на упакованном `build:win` (production build обязателен —
      `checkProductionBuild()` скипает тесты без него): 8/8 зелёных
      (`nx e2e animatrona-folder-player-e2e -- --project=electron --project=smoke`).
      ⚠️ Вопреки общему правилу `.claude/rules/electron.md` про недоступность GUI-уровня в
      сендбоксе Claude Code — здесь Playwright `_electron.launch()` **отработал штатно** внутри
      этой сессии (Chromium-процесс Electron поднялся, окна открылись, клики и `page.screenshot()`
      сработали). Не переносить как общее «правило исключение снято» — зафиксировано именно как
      наблюдение для этого прогона; если у будущей сессии/агента launch не пройдёт (сообщение
      про network service/`--no-sandbox`), это по-прежнему ожидаемо согласно электрон-доку, не
      регресс.
- [ ] Animatrona: существующий сьют `04-player` — регрессионный гейт для Фазы 1
- [ ] ⚠️ GUI-уровень (нативные диалоги, drag&drop) в песочнице не проверяется — main-процесс
      гонять headless: `npx electron scripts/verify-*.cjs` (паттерн из
      [.claude/rules/electron.md](/.claude/rules/electron.md))
- [x] Тесты писать через агентов (`e2e-test-writer` / `/workflow:test-write`), не руками —
      применено к unit-тестам выше через `Agent` (general-purpose, не `e2e-test-writer` — это
      были vitest unit-тесты, не Playwright)

### 12. Риски

| Риск                                                                  | Что делаем                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Кодеки: половина аниме — Hi10P/AC3, без Фазы 6 продукт слабее mpv/VLC | v1 честно сообщает и отдаёт файл системному плееру; Фаза 6 закрывает         |
| Регрессии в рабочей Animatrona при выносе в либы                      | e2e `04-player` + `nx build` + ручной прогон реальной папки                  |
| Индексы дорожек у mediainfo ≠ ffprobe → не та озвучка                 | тест-сравнение проберов как условие приёмки Фазы 2                           |
| Два инсталлятора = двойная поддержка и два канала обновлений          | общий код в libs, единый workflow-шаблон; сначала починить релизы Animatrona |
| ASS внутри MKV + шрифты                                               | `matroska-subtitles` + SubtitlesOctopus, проверить на реальных раздачах      |
| Ожидание «собралось = работает» для GUI Electron                      | первый живой запуск руками, до релиза                                        |
| Worker/WASM под `file://` молча не запускаются → ASS не рендерится    | схема `app://` вместо `file://` реализована (§6.1, 2026-09-08)               |
| «Лёгкость» уплывает по мере роста фич                                 | шаг проверки веса установщика в CI (§8), а не обещание в README              |

### 13. Открытые вопросы и задачи вокруг

- **Уточнение продуктовой линейки (2026-09-07) — уже решено, не здесь.** То, что в разговоре
  называлось `animatrona-ipfs-player`, оказалось уже согласованным с владельцем в тот же день
  третьим приложением — `apps/animatrona-viewer` (см. раздел «Animatrona Viewer — отдельное
  приложение для IPFS-просмотра» в [apps/animatrona/PLAN.md](/apps/animatrona/PLAN.md), таблица
  решений там же). Линейка из трёх продуктов по аналогии с K-Lite Lite/Standard/Mega:
  `animatrona-folder-player` (этот раздел, папки, без IPFS) — Lite; `animatrona-viewer`
  (IPFS-просмотр без импорта) — Standard; `animatrona` (всё) — Mega.
  ⚠️ **Устарело и исправлено 2026-09-08:** здесь раньше стояло «имя nx-проекта остаётся как есть,
  переименование не потребовалось» — на следующий день после этой записи владелец всё-таки решил
  переименовать `apps/animatrona-player` в `apps/animatrona-folder-player` (см. §0 выше и
  [PLAN_TESTING.md](./PLAN_TESTING.md)/`README.md`). Урок: формулировка «переименование не
  потребуется» — это состояние на момент записи, не гарантия на будущее; не копировать такие
  фразы как факт без даты проверки.
- [ ] ⚠️ **Открытый вопрос: библиотечный режим поверх нескольких папок старых торрент-раздач**
      (2026-09-07, решение владельца ещё нужно). Сейчас папочный режим — это «открыть ОДНУ папку и
      посмотреть», без сохранённого списка. Идея — дать `animatrona-folder-player` вести список
      **нескольких** закреплённых корневых папок (каждая — уже скачанная раздача старого формата, не
      через Animatrona) как
      подобие библиотеки, без БД. Ложится на уже существующий JSON-стек истории/прогресса
      ([useFolderHistory.ts](renderer/src/app/player/_hooks/useFolderHistory.ts),
      [useWatchProgress.ts](renderer/src/app/player/_hooks/useWatchProgress.ts),
      `@letar/electron-storage`, см. §0/§1) — не новая архитектура, а расширение того же паттерна с
      «последних открытых папок» до «закреплённого списка папок с кэшем скана». Открытые вопросы
      раньше реализации: 1) обнаружение, что закреплённая папка на диске переименована/удалена/
      изменилась (протухание кэша скана); 2) пересканировать по требованию (кнопка «обновить») или
      при каждом старте приложения (дольше холодный старт — противоречит §5 «холодный старт ≤ 3 с»);
      3) не путать с уже записанной ниже фичей «группировка по сезонам/плейлист из нескольких папок»
      — та про части ОДНОГО тайтла, эта — про РАЗНЫЕ тайтлы как элементы библиотеки.
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

### 14. Живой GUI-фидбек владельца (2026-09-08)

Первый реальный прогон (`nx dev`) вне сендбокса — три замечания одним сообщением: «в целом
работает хорошо. Но выбора дорожек нет, верхняя панель и кнопка закрытия выглядят некрасиво,
постер не подгрузился».

- [x] **Постер не подгружался.** `EpisodeSidebar.posterUrl` нигде не передавался из `page.tsx` —
      без него компонент всегда падает на generic-иконку папки. У этого приложения нет ни БД, ни
      Shikimori-опознания (принципиально, см. §0) — фикс: локальный поиск файла `poster`/`cover`/
      `folder`.`jpg`/`.jpeg`/`.png`/`.webp` в корне открытой папки (`main/services/poster-finder.service.ts`,
      IPC `fs:findPoster`, без рекурсии — постер кладут рядом с сериями, не внутри них). Отдаётся
      через уже существующий `media://` (изображения в его MIME-таблице уже были, только раньше
      никто не отправлял туда путь к постеру). ⚠️ `EpisodeSidebar.posterUrl` — общий проп с
      `animatrona` (там источник — Shikimori); doc-комментарий в `libs/folder-player-react`
      уточнён, чтобы не вводить в заблуждение про единственный источник.
- [x] **Верхняя панель выглядела некрасиво.** `background.ts` никогда не вызывал
      `Menu.setApplicationMenu(...)` — Electron рисовал стандартное меню «File Edit View Window»
      под нативным заголовком окна, ненужное этому плееру (в отличие от `animatrona`, у которого
      есть свой `Menu.buildFromTemplate`). Фикс — `Menu.setApplicationMenu(null)` в
      `app.whenReady()`.
- [ ] ⚠️ **«Кнопка закрытия» — не переопознано однозначно.** Могло иметь в виду то же самое
      («верхняя панель» целиком, включая нативные кнопки окна) — тогда фикс выше уже закрывает
      обе жалобы одним изменением. Либо — кнопку «Закрыть список» (`LuX`, `EpisodeSidebar`
      строка ~356) в шапке сайдбара, стандартный `IconButton variant="ghost"`, стилизован так же,
      как везде в остальном коде. Кастомизация нативных кнопок окна (frameless/`titleBarOverlay`)
      — отдельное архитектурное решение с более широким blast radius (весь window-хром), не
      делается заодно с этим фидбеком без явного подтверждения, что имелось в виду именно это.
      Нужен живой прогон с фиксом меню выше, чтобы понять, осталась ли жалоба.
- [x] **Выбора дорожек нет — закрыто (аудио и субтитры), см. §17.** Ни аудио-, ни сабо-селектора
      в UI не было вообще — `mediaInfo` (`audioTracks`/`videoTracks`) уже приходил из
      `probe:file`, но никуда не выводился, кроме `codecSupport`. Ближайший образец —
      `apps/animatrona/renderer/src/components/player/TrackSelector.tsx`, но он завязан на
      дискографию IPFS (`transcodedCid`, статус готовности), dub-группы и edit/delete — этому
      приложению (только локальные фиксированные дорожки, без дозагрузки) нужна урезанная версия
      без этих веток. ⚠️ Второй GUI-прогон (2026-09-08, см. §15) снова назвал это первым пунктом —
      самая заметная дыра из трёх исходных замечаний. Оба — субтитры и аудио — сделаны §17.

### 15. Второй живой GUI-фидбек владельца (2026-09-08) — три новых замечания

- [x] **Кнопки перемотки на ±10 сек нечитаемы.** `LuSkipBack`/`LuSkipForward` (react-icons/lu) —
      те же «трек-скип» пиктограммы (`|◄`/`►|`), что визуально означают «предыдущий/следующий
      трек» в подавляющем большинстве плееров — а рядом в `navigationSlot` стоят
      `LuChevronLeft`/`LuChevronRight` для смены СЕРИИ. Два похожих по силуэту контрола с разным
      действием в одном ряду — источник жалобы. Фикс в общей `SharedPlayerControls`
      (`@letar/video-player-react`, затрагивает и `animatrona`, не только этот плеер): иконки на
      `LuRotateCcw`/`LuRotateCw` (общепринятые «перемотать на N сек» из YouTube/Netflix-style
      плееров, визуально далеки от chevron'ов навигации) + число секунд оверлеем поверх иконки.
- [x] **История открытых папок не сохранялась между перезапусками.** Настоящий баг, не
      отсутствующая фича: `page.tsx` использует SSR-гейт `mounted ? window.localStorage :
      noopStorage` (обязателен — `window` не существует при пререндере Next.js), а
      `useFolderHistory`'s эффект загрузки истории имел `deps: []` — срабатывал РОВНО ОДИН раз,
      всегда с ещё не подменённой `noopStorage` (эффект коммитится раньше, чем срабатывает
      `setMounted(true)` в родителе и `storage` успевает замениться на реальный
      `window.localStorage`). Запись в историю при этом работала (`saveToStorage` в `addFolder`
      берёт актуальный `storage` через свежий `useCallback`), поэтому баг был незаметен в
      течение одной сессии — только после перезапуска. Фикс — `useFolderHistory.ts`:
      `deps: [storage]` вместо `[]`, эффект перечитывает хранилище повторно, когда `storage`
      меняет референс с заглушки на настоящее. `animatrona` (второй потребитель хука) передаёт
      `localStorage` напрямую и стабильно — для него фикс не меняет поведение, эффект как и
      раньше срабатывает один раз. Регресс-тест — `useFolderHistory.spec.ts`, кейс
      «перечитывает хранилище, когда storage заменяется с заглушки на настоящее».
- [x] **Пару секунд воспроизведения → спиннер → продолжает с той же позиции.** Реальный баг в
      общем `useShakaPlayer` (`@letar/video-player-react`), не особенность конкретного файла.
      `startTime` (позиция резюме при открытии файла) стоял в deps главного эффекта
      инициализации плеера. `useWatchProgress` фоново сохраняет позицию просмотра раз в
      `SAVE_INTERVAL = 5000` мс (`flushToStorage` → `setProgressStorage`) — это ре-рендерит
      `page.tsx`, где `resumeTime = watchProgress.getResumeTime(currentVideoPath)` пересчитывается
      каждый рендер и теперь возвращает уже ТЕКУЩУЮ позицию, а не исходную резюме-точку. Новое
      значение `startTime` меняет deps эффекта → плеер целиком пересоздаётся (`unload` + `destroy`
      + новый `<video>` + `player.load()`) прямо во время штатного проигрывания, и повторяется
      каждые ~5 секунд весь сеанс. Фикс — `startTimeRef` (снапшот через `useRef`, обновляется
      отдельным эффектом), основной эффект инициализации и `reload()` читают `startTimeRef.current`
      и `startTime` больше не в deps — плеер пересоздаётся только при реальной смене `src`
      (новый эпизод), а не при любом изменении числа резюме-позиции. Регресс-тест —
      `useShakaPlayer.spec.ts`, кейс «НЕ переинициализирует плеер, если меняется только
      startTime». Второй потребитель хука в репозитории — только `animatrona-tracker`, но у него
      свой независимый `use-shaka-player.ts` (см. дедуп-аудит в CHANGELOG приложения), общий хук
      использует только этот плеер — блокирующего влияния на другие приложения нет.
      ⚠️ **Проверено живьём владельцем (2026-09-08, отдельный прогон `build:win`).** Первое
      сообщение («проблема экрана загрузки после начального показа видео сохранилась») выглядело
      как рецидив этого же бага. Уточняющие вопросы показали другую картину: спиннер разовый (не
      повторяется каждые ~5 сек, как было до фикса), и после него видео **продолжает с той же
      позиции без отката назад** — то есть плеер не пересоздаётся. Это не тот баг: судя по всему,
      обычная начальная буферизация Shaka (`isLoading` корректно идёт `true→false` один раз, пока
      грузится первый буфер) — ожидаемое поведение, не регресс. Фикс §15 подтверждён живым тестом,
      доп. правки не потребовались.

### 16. Третий живой фидбек владельца (2026-09-08) — раскладка кнопок + тёмная тема

- [x] **Раскладка транспортных кнопок — «как в MPC».** Владелец прислал скриншот классической
      панели Media Player Classic (play, prev/rewind/forward/next вокруг play). Реализовано в
      общей `SharedPlayerControls` (`@letar/video-player-react`) — новые опциональные слоты
      `beforeControlsSlot`/`afterControlsSlot` вокруг блока перемотка-play-перемотка, старый
      `navigationSlot` (рендерится после таймера) оставлен как есть для обратной совместимости —
      `animatrona`/`animatrona-tracker` не трогались (см. правило «не править чужой app-код»,
      только уведомление координатору). `animatrona-folder-player` переведён на новые слоты:
      prev-эпизод → ⟲10с → play/pause → ⟳10с → next-эпизод. Версия библиотеки 0.2.3 → 0.2.4.
      Регресс-тест не понадобился — `SharedPlayerControls.spec.tsx` (235 тестов пакета) остались
      зелёными без изменений; визуально подтверждено скриншотом через реальный Playwright-запуск
      упакованного приложения (`.claude/artifacts/folder-player-controls-mpc.png`).
- [x] **Тёмная тема.** Инфраструктура уже была (`ColorModeProvider` из `@letar/chakra-provider`,
      `defaultTheme="system"`, дефолтные семантические токены Chakra с `_dark`-вариантами) — не
      хватало только видимого переключателя. Добавлена `ColorModeButton` (тоже уже существовала
      в библиотеке, не использовалась) в правый верхний угол экрана выбора папки. Подтверждено
      двумя скриншотами через тот же e2e-прогон (клик по кнопке переключает тему без
      перезагрузки): `.claude/artifacts/folder-player-idle-light.png` /
      `folder-player-idle-dark.png`. Сайдбар/сама область плеера намеренно остаются
      чёрными в обеих темах — это стандартное поведение видеоплеера, не связано с темой
      приложения.

### 17. Выбор дорожек субтитров (2026-09-08)

- [x] **Кнопка выбора дорожки субтитров на панели плеера.** Новый `SubtitleTrackSelector`
      (`_components/`, только это приложение — не трогает `TrackSelector.tsx` из `animatrona`).
      Кастомный dropdown (`position: absolute`), не Chakra `Menu` — по тому же образцу, что
      `SpeedSelector` из `@letar/video-player-react`: `Menu.Positioner` ломается в fullscreen-
      контейнере плеера (комментарий в исходнике `SpeedSelector.tsx`).
      - Список объединяет внешние файлы субтитров (`player.externalTracks.subtitles`, найдены
      `@letar/folder-scan`) и встроенные в контейнер MKV дорожки (`player.embeddedTracks.subtitles`
      — лёгкие метаданные язык/название из уже сделанной пробы `mediainfo.js`, без
      дополнительного чтения файла на каждый эпизод), плюс пункт «Выключены».
      - Автовыбор по умолчанию не изменился (внешний субтитр эпизода, иначе первая встроенная
      дорожка — как было раньше на `tracks[0]`), просто стал переключаемым руками. Ручной выбор
      пользователя запоминается флагом (`subtitleAutoSelectedRef`) и сбрасывается на каждую
      смену эпизода — на новом эпизоде снова работает автовыбор, а не залипший индекс с
      предыдущего.
      - Извлечение СОДЕРЖИМОГО встроенной дорожки (`matroska-subtitles`, потоковый разбор ВСЕГО
      файла — дорого для больших файлов) запускается лениво: только когда встроенная дорожка
      реально выбрана (по умолчанию или руками), не на каждый эпизод при наличии внешних
      субтитров — то же ограничение, что было в исходном фоллбэк-коде до этой задачи.
      - Кнопка не рендерится вовсе, если у эпизода нет ни одной альтернативы субтитрам
      (`options.length <= 1` — остался только пункт «Выключены»).
      - Новый слот `trackSelectorSlot` на `VideoPlayerProps` (аддитивно, `SharedPlayerControls`
      уже принимала одноимённый проп и просто не была подключена) — прокидывается в
      `SharedPlayerControls` без изменений в самой библиотеке.
      - Регресс-тестов не добавлено (UI-компонент с интерактивным dropdown). ⚠️ **Подтверждено
      живьём владельцем (2026-09-08, build:win 0.6.4, реальный сериал): «Субтитры работают!»**
- [x] **Аудиодорожки.** В отличие от `animatrona` (там «переключение аудио» на самом деле означает
      загрузку ДРУГОГО файла — другой IPFS CID на другую дорожку — не наш случай, у нас все
      аудиодорожки лежат в одном MKV), здесь нужно было переключение дорожки внутри уже
      загруженного файла — нигде в этой кодабазе такого переключения раньше не было. Реализовано
      через `getVariantTracks()`/`selectVariantTrack()` Shaka Player: в режиме прямого `src=`
      (не DASH/HLS манифест — наш случай для локальных MKV) Shaka проксирует нативные
      `HTMLMediaElement.audioTracks` браузера как `variant`-треки — новый хук `useAudioTracks`
      (`@letar/video-player-react`) схлопывает их по `audioId` в список уникальных дорожек.
      `ShakaPlayerInstance` расширен методами `getVariantTracks`/`selectVariantTrack` аддитивно —
      `animatrona-tracker` (второй потребитель `useShakaPlayer`) их просто не использует, не
      затронут. `AudioTrackSelector` — второй `TrackDropdownButton` рядом с субтитрами (общий
      компонент выделен из исходного `SubtitleTrackSelector`, чтобы не дублировать разметку
      dropdown).
      - ⚠️ **Живая проверка (2026-09-08) нашла две реальные причины, по которым кнопка вообще не
      появлялась** — обе воспроизведены детерминированно синтетическим MKV с двумя AAC-дорожками
      (сгенерирован bundled ffmpeg из `apps/animatrona`, только как dev-инструмент для фикстуры,
      не как рантайм-зависимость) через Playwright/Electron `_electron.launch` напрямую по
      собранному `dist/win-unpacked`:
      1. **`HTMLMediaElement.audioTracks` — выключенная по умолчанию экспериментальная фича
      Blink**, `video.audioTracks === undefined` без флага. Не «пустой список» — самого
      API нет. Фикс — `app.commandLine.appendSwitch('enable-blink-features',
           'AudioVideoTracks')` в `main/background.ts`, до `app.whenReady()`.
      2. **В режиме `src=` Shaka не заполняет числовой `audioId`/`videoId` варианта** (оба
      `null`) — реальный нативный `AudioTrack.id` браузера лежит в `originalAudioId`/
      `originalVideoId` (строка). Хук `collectAudioTracks` фильтровал по `audioId === null`
      и не находил вообще ничего — список всегда был пуст, кнопка не рендерилась
      (`options.length <= 1`). Фикс — `useAudioTracks` теперь ключуется на
      `originalAudioId`/`originalVideoId` (строки), `AudioTrackOption.audioId` сменил тип
      `number → string`. В манифестном режиме (DASH/HLS) Shaka заполняет оба поля разом,
      поэтому ключевание на `originalAudioId` работает единообразно в обоих режимах —
      не специфично для `src=`.
      - Прежний риск («не проверено эмпирически, отдаёт ли Chromium несколько `audioTracks` для
      локального MKV») закрыт: **да, отдаёт**, при включённом флаге Blink. Без него — не отдаёт
      вовсе, и это не платформенное ограничение, а просто отсутствие флага (см. фикс выше) —
      никакого альтернативного технического подхода (ремукс/экстракция аудио) не потребовалось.
      - ⚠️ Подтверждено автоматизированной проверкой (2026-09-08, Playwright/Electron по
      собранному `dist/win-unpacked`, build:win 0.6.6): после обоих фиксов кнопка появляется,
      dropdown показывает язык+название каждой дорожки, клик по ней реально переключает активный
      `audioTrack` браузера. ⚠️ **Подтверждено живьём владельцем (2026-09-08, build:win 0.6.6,
      реальный сериал): «Отлично! Работает!»** — исходный баг-репорт «не вижу выбора
      аудиодорожки» закрыт, оба закрытых риска (§14/§15 «выбора дорожек нет») сняты.
      - ⚠️ **Второй баг-репорт (2026-09-08, реальная папка `ID Invaded [BDRip 1080p]`): «субтитры
      открываются, а вот аудиодорожки нет».** Не регрессия только что закрытого фикса —
      `ffprobe` по реальным MKV подтвердил ровно один встроенный аудиопоток (FLAC, японский,
      2 канала), так что кнопка embedded-селектора корректно скрыта (`options.length <= 1`).
      Настоящий пробел: у этой раздачи русская озвучка лежит отдельными `.mka`-файлами в
      подпапке `Rus sound/` — `@letar/folder-scan`'s `external-audio-scanner.ts` уже умел её
      находить (паттерн `'rus sound'` в `AUDIO_FOLDER_PATTERNS`), `useFolderPlayer.ts` уже
      отдавал результат через `player.externalTracks.audio`, отфильтрованный по номеру серии —
      но `animatrona-folder-player` никогда не подключал это к UI вообще (в отличие от
      `animatrona`, где `useFolderModeUI.tsx` уже делает то же самое). Фикс — в
      `VideoPlayer.tsx` объединил embedded- и external-опции в один `AudioTrackSelector` с
      префиксами `embedded:`/`external:` (тот же паттерн ID-неймспейсинга, что уже был у
      субтитр-селектора), воспроизведение внешней дорожки — через уже существующий хук
      `useExternalAudio` (`@letar/folder-player-react`, создаёт отдельный `new Audio()`,
      мьютит видео, синхронизирует play/pause/seek/rate/volume). Новые пропы `host`/
      `externalAudioTracks` прокинуты из `page.tsx`. Переиспользовал готовую библиотечную
      инфраструктуру целиком — код `libs/` не менялся, только `apps/animatrona-folder-player/`.
      - ⚠️ Подтверждено автоматизированной проверкой (2026-09-08, Playwright/Electron по
      собранному `dist/win-unpacked`, build:win 0.6.6) **на реальной папке пользователя**
      (не синтетической фикстуре): dropdown показывает и «JA» (embedded, активная), и
      «Rus sound (RUS)» (external); выбор внешней дорожки мьютит видео и реально запускает
      сетевой запрос `.mka`-файла через `media://`-протокол. Живого подтверждения владельцем
      по этому конкретному фиксу на момент записи ещё не было — следующий шаг при следующем
      использовании плеера.
      - ⚠️ **Третий баг-репорт (2026-09-08): «пропуск опенинга ставит видео на паузу».**
      Кнопка `ChapterSkipButton` (`@letar/video-player-react`) лежит внутри общего
      кликабельного видеоконтейнера (`<Box onClick={controls.togglePlay}>` в
      `VideoPlayer.tsx` — клик по любому месту видео переключает play/pause), но её
      собственный `onClick` не звал `event.stopPropagation()` — клик по кнопке всплывал
      наверх и сразу после перемотки ставил видео на паузу (было играющее → `togglePlay`
      выключал). `SharedPlayerControls`/`SharedProgressBar` уже используют этот паттерн
      (`e.stopPropagation()` в самом верху обработчика) — `ChapterSkipButton` был
      единственным интерактивным элементом внутри контейнера без него. Фикс — та же строка
      в `handleSkip`. Добавлен регрессионный тест в `ChapterSkipButton.spec.tsx`
      (клик внутри контейнера с собственным `onClick` не должен его вызывать), библиотека
      `@letar/video-player-react` 0.2.6 → 0.2.7. Общий код — второй потребитель компонента,
      `animatrona-tracker` (`tracker-video-player.tsx`), получает фикс автоматически тем же
      изменением, если у него был тот же паттерн клика по видео (не проверялось отдельно —
      не в скоупе этой сессии).
      - ⚠️ **Четвёртая реакция (2026-09-08): «пропуск в 8-бит — жёстко для плеера, юзерам не
      объяснить».** Fallback для Hi10P-видео перекодировал в 8-битный H.264 — рабочий, но
      деградирующий цвет без необходимости: проблема была в кодеке (Chromium физически не
      декодирует H.264 High 10 Profile ни на какой системе, Google выпилили его из своей
      сборки — не GPU/драйверная проблема), не в глубине цвета как таковой. Заменил целевой
      кодек на **VP9 profile 2 (тоже 10-бит)** — Chromium декодирует его софтверно (libvpx),
      без зависимости от GPU. Проверено эмпирически на реальном Hi10P-файле (`[Beatrice-Raws]
      91 Days - 01`, BtbN win64-gpl ffmpeg из `userData`, уже скачанный пользователем):
      - `-c:v libvpx-vp9 -pix_fmt yuv420p10le -profile:v 2 -crf 30 -b:v 0 -deadline realtime
      -cpu-used 5 -row-mt 1` — MP4-мьюксер принимает VP9 без проблем (`vp09`/faststart), полный
      24.5-минутный эпизод перекодировался за ~4 минуты (**5.98x реалтайма**, сопоставимо с
      прежним x264-фоллбэком, не медленнее на порядок).
      - Воспроизведение проверено через `<video>` (не только `canPlayType` — реальный кадр
      декодировался и отрисовался, скриншот), включая **перемотку к концу файла (23:21/24:20)
      с работающим сиком** и звук — на сервере с поддержкой `Range`-запросов (важно: без
      `Range` браузер не может искать в файле — это ограничение тестового HTTP-сервера, не
      кодека; собственный `media://`-протокол приложения уже поддерживает byte-range для
      MP4-вывода, структура контейнера не изменилась).
      - `shared/transcode-plan.ts` `buildCodecArgs` — целевой кодек video-transcode ветки
      заменён целиком, обновлены `reasons`-тексты (были «пережимаем в 8-битный H.264» →
      «перекодируем в VP9, сохраняя 10 бит») и doc-комментарии. `transcode-plan.spec.ts`
      обновлён под новые аргументы. `ffmpeg-installer.service.ts`/decoders-проверка не
      трогалась — она про декодеры для чтения ИСХОДНИКА (h264/hevc/ac3/...), не про энкодер
      вывода, паттерн проекта энкодеры не верифицирует вовсе (не только для VP9 — так было и
      для прежнего x264).
      - Не сделано в этой сессии (осознанно, отдельная задача по просьбе владельца): полный
      эпизод по-прежнему ждёт перекодирования целиком, прежде чем начать играть (~4 минуты на
      серию) — потоковый старт воспроизведения во время фонового докодирования остатка
      (fMP4 + раннее начало) не реализован, требует архитектурной переделки
      `transcode.service.ts` (см. его doc-комментарий про осознанный отказ от HLS-подхода) и
      не входил в объём этого фикса.

### 18. Потоковый старт воспроизведения для Hi10P (0.7.0, 2026-09-08)

      Отдельная задача, отложенная в §17 — «воспроизведение начнётся сразу» (владелец: «так мы
      же договорились...» — на самом деле было явно отложено как отдельная задача, уточнено в
      диалоге; после уточнения — «Делай дальше»).

      **Подход:** фрагментированный MP4 (`-movflags frag_keyframe+empty_moov+default_base_moof`)
      + `MediaSource`/`SourceBuffer` в рендерере. Байты ffmpeg идут в `pipe:1` (не в файл), тем
      же потоком одновременно пишутся на диск в `.part.mp4` (кэш по содержимому — как раньше) И
      пушатся в рендерер через IPC чанками. Прогресс переведён на отдельный файловый дескриптор
      `-progress pipe:3` (третий индекс `stdio` сверх stdin/stdout/stderr), чтобы не путался с
      самими медиаданными на stdout.

      Технически провалидировано ДО реализации (from-scratch тесты в `.claude/artifacts/`,
      удалены): фрагментированный MP4 действительно позволяет `<video>`-элементу начать
      воспроизведение до окончания добавления всех фрагментов в `SourceBuffer`; перемотка внутри
      уже полученного диапазона работает корректно (тестовый Python `http.server` не отдаёт
      `Range`-заголовки — не баг кодека/контейнера, ограничение тестового сервера, тот же класс,
      что уже был отмечен в §17).

      **Область действия — намеренно только `video-and-audio` (Hi10P) стратегия.** Для
      `audio-only`/`remux` (`-c:v copy`) исходный видеокодек/профиль неизвестны заранее — честная
      MIME-строка для `SourceBuffer` недостижима без разбора битстрима, а угадывание рискует
      тихим decode-mismatch хуже отсутствия ускорения вовсе. Эти стратегии и так быстрые
      (секунды/десятки секунд на серию) — потоковый путь им не нужен. MIME-строка
      `video/mp4; codecs="vp09.02.10.10,mp4a.40.2"` фиксированная — видео мы сами кодируем в VP9
      profile 2 (гарантированно), звук — либо тоже сами кодируем в AAC-LC (`audioAction:
      transcode`), либо копируем уже-AAC исходник (`audioAction: copy`, самый частый случай для
      Hi10P-раздач) — для звука MSE у Chromium заметно менее строг к точности codec-строки, чем
      для видео (декодирует по фактическим ADTS/ESDS-заголовкам потока, не по заявленному
      профилю).

      **Файлы:**
      - `shared/transcode-plan.ts` — `-g 48 -keyint_min 48` в video-transcode ветке
        `buildCodecArgs` (регулярный интервал ключевых кадров, 2с при 24fps — предсказуемые
        границы фрагментов fMP4; не влияет на цельнофайловый режим).
      - `main/services/ffmpeg/transcode.service.ts` — новая `startStreamingTranscode()`:
        не ждёт завершения, зовёт колбэки `onChunk`/`onProgress`/`onEnd`/`onError` по мере
        поступления данных. При попадании в кэш (уже готовый файл) — синхронно возвращает
        `{cached: true, outputPath}`, стрим не запускается вовсе.
      - `main/ipc/ffmpeg.handlers.ts` — `transcode:prepareStreaming` (не ждёт завершения,
        форвардит колбэки в `event.sender.send` как `transcode:streamChunk/streamProgress/
        streamEnd/streamError`).
      - `main/preload.ts` + `renderer/types/electron.d.ts` — новые методы/подписки
        `transcode.prepareStreaming`/`onStreamChunk`/`onStreamProgress`/`onStreamEnd`/
        `onStreamError` в `electronAPI`.
      - `renderer/app/_hooks/use-transcode-stream.ts` (новый) — оркестрирует `MediaSource`:
        создаёт её и `blob:`-URL ДО первого чанка (воспроизведение может начаться сразу, как
        только браузер откроет `MediaSource`), очередь `appendBuffer` с сериализацией через
        `updateend`, `mediaSource.duration` выставляется сразу из `durationMs` (mediainfo уже
        знает точную длительность заранее — не нужна сложность «неизвестной длительности»
        живого стрима). Живёт на уровне `page.tsx`, не `ExtendedFormatsPanel` — IPC-слушатели
        чанков не должны обрываться, когда панель размонтируется после старта воспроизведения
        (сразу, как только есть `src`).
      - `renderer/app/_components/ExtendedFormatsPanel.tsx` — принимает готовый `stream` как
        проп (не создаёт свой хук), кнопка «Смотреть» вместо «Подготовить и проиграть», когда
        `stream.supported`; фаза `connecting` показывает короткую буферизацию вместо прогресс-
        бара на несколько минут.
      - `renderer/app/page.tsx` — `streamedSrc` state рядом с `preparedPath`, отмена стрима
        при смене эпизода (иначе фоновый ffmpeg продолжает кодировать уже никому не нужный файл).
      - **`libs/video-player-react`** (0.2.7 → 0.2.8) — `useShakaPlayer` получил новый
        опциональный параметр `mimeType`, форвардится в `player.load(src, startTime, mimeType)`.
        Обязателен для `blob:`-URL на `MediaSource`: без явного MIME Shaka пытается определить
        тип манифеста (DASH/HLS) сетевым sniffing-запросом, а такой URL не отдаёт контент по
        обычному сетевому запросу — sniffing не сработает. Обратно совместим (параметр
        опциональный, `undefined` не меняет прежнее поведение) — `animatrona`/
        `animatrona-tracker` не затронуты.

      **Не сделано / известные ограничения:**
      - Fallback на цельнофайловый режим при decode-ошибке потокового пути НЕ реализован —
        если поток провалится посреди воспроизведения (редкий edge case неправильно угаданной
        audio codec-строки при `audioAction: copy`), пользователь увидит ошибку и должен нажать
        «Попробовать снова» вручную, а не получит автоматический тихий откат на прежний
        цельнофайловый путь. Осознанное решение по объёму сессии — см. `надёжность важнее
        скорости` в общих принципах: сузили область (только гарантированные codec-строки) вместо
        того, чтобы строить сложную сеть отказоустойчивости.
      - Перемотка за пределы уже полученного диапазона не имеет отдельного UI-индикатора
        (буферизация) — работает как обычная браузерная буферизация `<video>`, без кастомного
        прогресс-бара «сколько уже скачано/докодировано».
      - Живого подтверждения владельцем на реальном файле на момент записи ещё не было —
        собран `dist/win-unpacked` (build:win 0.7.0), автотесты (`typecheck:tsgo`/`lint`/
        `test` — 237/237 в `video-player-react`, `animatrona-folder-player` зелёный) прошли,
        но десктопное Electron-окно не доступно для автоматизированной проверки в этой сессии
        (не веб-страница — не тот же класс, что HTTP-тесты выше) — следующий шаг: тест владельцем.

      **⛔ Статус 2026-09-08 (после живой проверки владельцем): НЕ РАБОТАЕТ, отключено флагом.**
      Первый прогон — лоадер крутился минуту, воспроизведение не началось. Диагностика вскрыла
      реальный race condition в `use-transcode-stream.ts`: `setSrc(objectUrl)` вызывался
      синхронно ДО того, как стало известно, попадание это в кэш или нет — при кэш-хите
      `page.tsx` успевал смонтировать `<VideoPlayer>` на уже уничтоженный `MediaSource`. Фикс
      (перенос `setSrc`/`setPhase('streaming')` внутрь `.then()` после проверки `!result.cached`,
      + staleness-guards) применён, типы/линт/тесты зелёные, свежая сборка — но при повторной
      живой проверке владельцем воспроизведение **всё равно не началось за 20 секунд**, при этом
      лог main-процесса подтвердил, что ffmpeg в этот раз реально запустился в потоковом режиме
      (`[Transcode] Запуск ffmpeg (потоковый режим)`) — то есть баг не в race condition (та часть
      почищена), а глубже: где-то в связке `SourceBuffer.appendBuffer`/`updateend`-очередь/
      Shaka `mimeType`-путь при `src=blob:`. Не диагностировано — сессия остановлена по решению
      владельца в пользу системной замены (см. §19, MPV).

      Флаг `STREAMING_ENABLED = false` в `use-transcode-stream.ts` — путь `video-and-audio`
      сейчас всегда идёт через прежний надёжный цельнофайловый режим ожидания (как до 0.7.0).
      Код потоковой инфраструктуры (fMP4-ffmpeg, IPC-стрим, MSE-хук, `mimeType` в
      `useShakaPlayer`) оставлен в дереве нетронутым — не удалять: либо пригодится для
      дальнейшей диагностики, либо станет ненужным целиком, если MPV снимет саму необходимость
      транскодирования (см. §19).

### 19. ⏳ MPV вместо ffmpeg-транскодирования — системная замена (план, 2026-09-08)

      Решение владельца после провала §18: вместо того чтобы чинить fMP4/MSE-стрим по кускам,
      разобраться, действительно ли транскодирование Hi10P (VP9 profile 2 перекодирование,
      минуты ожидания на серию) вообще нужно — если декодировать исходный Hi10P (H.264
      High10 Profile) можно напрямую через нативный видеоплеер mpv, транскодирование для этой
      стратегии становится не нужно вовсе, а не «нужно, но с потоковым стартом».

      **Почему сейчас у нас ffmpeg-транскодирование, а не прямое воспроизведение:** Chromium/
      Shaka (через `<video>`/MSE) не умеет декодировать H.264 High10 Profile (10-бит) — это и
      есть причина существования всей стратегии `video-and-audio` в `transcode-plan.ts`. mpv
      использует свой собственный декодер (libavcodec/FFmpeg тот же, но встроенный в проигрыватель,
      не браузерный движок) — Hi10P для него нативный, ничем не отличается от обычного видео.

      **Два варианта интеграции, оценены технически (без реализации):**

      - **`node-mpv`** — рекомендуемый путь. Спавнит настоящий `mpv.exe`, управление через
        IPC-сокет (play/pause/seek/громкость и т.п.), поддерживает `--wid=<HWND>` — встраивание
        видео-вывода mpv в конкретное нативное окно/дочернее окно по хендлу. В Electron это
        означает: создать скрытый `BrowserWindow`/child window или использовать offscreen-регион
        текущего окна, получить его нативный HWND (через `getNativeWindowHandle()`), передать в
        `--wid`. Зрелая, поддерживаемая библиотека.
      - **`mpv.js`** — нативный Node-аддон, оборачивающий `libmpv` напрямую (без отдельного
        процесса), рендерит через OpenGL прямо в контекст. В теории даёт более гибкую интеграцию
        (например рендер в `<canvas>`), но: нативный аддон нужно пересобирать под каждую версию
        Electron (ABI), сопровождение заброшено/нерегулярно обновляется под свежие Electron —
        риск несовместимости с Electron 44 (текущая версия приложения) без готовых бинарников.
        Не рекомендуется как основной путь.

      **Установка бинарника mpv:** переиспользовать паттерн `animatrona` (десктоп) для ffmpeg —
      скачивание бинарника по требованию при первом запуске/установке, не бандлить в дистрибутив
      напрямую (размер). Источник — официальные Windows-сборки mpv (shinchiro builds) или winget,
      уточнить на этапе реализации.

      **⚠️ Главная архитектурная цена — «проблема воздушного пространства» (airspace problem):**
      нативные дочерние окна (в т.ч. видео-вывод mpv через `--wid`) в Electron/Chromium ВСЕГДА
      рисуются поверх HTML-контента, независимо от CSS `z-index` — это ограничение композитинга
      Chromium, не решается стилями. Сейчас поверх видео в HTML лежит: прогресс-бар/контролы,
      `ChapterSkipButton` (пропуск опенинга/эндинга), субтитры через SubtitlesOctopus (libass-wasm,
      рендерится в HTML/canvas поверх `<video>`), `AudioTrackSelector`. Все эти оверлеи со
      встраиванием mpv через `--wid` окажутся ПОД видео, а не поверх — потребуется либо:
      (а) отказ от части HTML-оверлея в пользу встроенных возможностей mpv (у mpv есть свой
      OSC — on-screen controller, lua-скриптуемый, и встроенный рендер субтитров через libass
      «из коробки» — потенциальная замена SubtitlesOctopus для этого приложения конкретно, раз
      mpv и так их рендерит нативно), либо
      (б) более сложная техника наложения (transparent overlay window поверх видео-окна,
      синхронизация позиции/размера с основным окном при ресайзе — есть прецеденты у других
      Electron+видео проектов, но заметно больше кода и граблей с чувствительностью к таймингу
      ресайза/перемещения окна).

      **Не начато.** Следующая сессия должна начать с: (1) решить (а) vs (б) для UI-оверлея —
      вероятно (а) для субтитров (mpv/libass это делает лучше, чем текущий костыль), но
      пропуск опенинга/эндинга и выбор аудиодорожки, скорее всего, придётся оставить в HTML и
      выбрать (б) для них, либо тоже перенести на mpv OSC/IPC-команды; (2) убедиться, что mpv
      реально декодирует Hi10P-файлы владельца без транскодирования вообще (быстрая живая
      проверка — `mpv.exe <файл>` напрямую, без всякой Electron-интеграции, ДО того как писать
      код); (3) если (2) подтвердится — решить, остаётся ли ffmpeg-транскодирование вообще
      нужным хоть для чего-то (звук в экзотических контейнерах? remux edge cases?) или mpv
      закрывает всю задачу целиком, включая `audio-only`/`remux` стратегии из §18.

### 20. Разбор «всеядность и интерфейс»: mpv vs WASM-декодирование (исследование, 2026-09-08)

      Продолжение §19. Задача от владельца: **плеер должен быть всеядным, как нативный**.
      Ниже — что удалось измерить и найти, прежде чем писать код.

      #### 20.1 Замер: транскодирование не нужно ни по какой технической причине

      На реальном файле владельца `[Beatrice-Raws] 91 Days - 01` (`h264`, profile **High 10**,
      `yuv420p10le`, 1920x1080, 23.976 fps, звук FLAC) системным ffmpeg замерена чистая скорость
      декодирования (`-f null -`, без вывода):

      | режим                       | скорость  | fps  |
      | --------------------------- | --------- | ---- |
      | многопоточно (по умолчанию) | **25.3x** | ~610 |
      | `-threads 1`                | **4.5x**  | ~100 |

      Вывод: Hi10P — это не «тяжёлый» формат. Даже **один поток** декодирует его в 4.5 раза
      быстрее реального времени. Значит нынешние ~4 минуты ожидания на серию (перекодирование в
      VP9 profile 2, §17) — плата не за производительность, а исключительно за то, что Chromium
      отказывается декодировать этот профиль сам. Любой честный декодер закрывает задачу с
      огромным запасом. Это же число — главный аргумент за вариант **B4** ниже: даже если
      WASM-декодер медленнее нативного в 2–3 раза, запас остаётся.

      #### 20.2 Почему в Electron «HTML поверх mpv» — настоящая проблема, а у других её нет

      Эталон того, чего мы хотим — **Jellyfin Media Player**: веб-интерфейс Jellyfin рисуется
      поверх встроенного libmpv, в одном окне. Работает это потому, что JMP собран не на
      Electron, а на **QtWebEngine**, где веб-слой — обычный виджет и его можно положить поверх
      видео-слоя ([jellyfin-media-player](https://github.com/jellyfin/jellyfin-media-player),
      [webview.qml](https://github.com/jellyfin/jellyfin-media-player/blob/master/src/ui/webview.qml)).
      В Electron такого API нет вовсе — нативное дочернее окно всегда рисуется поверх HTML
      («airspace problem»), CSS `z-index` на него не действует. Это подтверждает и практика:
      попытки встроить mpv через `--wid` в окно Electron заканчиваются либо чёрным экраном, либо
      видео поверх всего интерфейса
      ([Node-MPV#106](https://github.com/j-holub/Node-MPV/issues/106),
      [mpv#10189](https://github.com/mpv-player/mpv/issues/10189) — на Windows mpv с `--wid`
      периодически создаёт вообще отдельное окно).

      #### 20.3 Четыре варианта, по возрастанию цены

      **B1. mpv отдельным окном, но своим (не «системный плеер»).** Кладём mpv в поставку,
      запускаем процессом, управляем по JSON-IPC (на Windows — именованный канал
      `\\.\pipe\mpvsocket`, протокол простой, свой клиент — это ~150 строк, готовая обёртка не
      нужна: npm-пакет `node-mpv` не публиковался 6 лет, `node-libmpv` — 7).
      Наш React-UI остаётся на экране библиотеки: список серий, прогресс, «дальше — следующая».
      Внутри видео — родной OSC mpv или сторонний скин `uosc`. Субтитры, дорожки, главы, шейдеры
      — всё нативное и бесплатно.
      ✅ Всеядность буквально нативная, риск почти нулевой, работы мало.
      ❌ Второе окно; наши `ChapterSkipButton`/селекторы дорожек/SubtitlesOctopus не нужны
      (их функции берёт на себя mpv, но нашего дизайна там не будет).

      **B2. mpv `--wid` внутри нашего окна + отдельное прозрачное окно-оверлей с контролами.**
      Видео живёт в нашем окне, интерфейс — во втором frameless-прозрачном окне, которое
      синхронизируется по позиции/размеру. Готовая инфраструктура для этого существует —
      [electron-overlay-window](https://github.com/SnosMe/electron-overlay-window) (Windows +
      X11, версия 4.1.0, обновлялась недавно): она сама ищет целевое окно, держит геометрию
      синхронной и шлёт события жизненного цикла.
      ❌ Грабли известны заранее: прозрачные окна на Windows не ресайзятся штатно
      ([electron#49173](https://github.com/electron/electron/issues/49173)); клики сквозь оверлей
      — только через `setIgnoreMouseEvents(true, { forward: true })`, переключаемый по наведению
      ([electron#23042](https://github.com/electron/electron/issues/23042)); плюс фокус, alt-tab,
      полноэкранный режим и дрожание геометрии при ресайзе. Работает, но это постоянный источник
      мелких багов.

      **B3. libmpv нативным аддоном + собственный композитинг.** Ровно этим путём идёт
      **Seanime Denshi** — Electron-клиент с встроенным libmpv-плеером (`MpvCore`), который
      рисует «прямо во вьюпорт приложения, без отдельного окна». Разбор их устройства:

      - пакеты `@mpv-prism/core|react|electron` **не лежат в npm** — ставятся тарболлами с
        `seanime.app` ([seanime-denshi/package.json](https://github.com/5rahim/seanime/blob/main/seanime-denshi/package.json),
        [mpv-prism.lock.json](https://github.com/5rahim/seanime/blob/main/mpv-prism.lock.json));
      - лок-файл прибит к **Electron 42** и проверяет мажор при сборке («Native binaries are
        incompatible») — у нас Electron 44;
      - сборка тянет Electron со **своего зеркала** (`electronDownload.mirror:
        https://seanime.app/assets/electron/`), то есть команда контролирует и сам рантайм.

      Похожий, но более скромный по охвату путь описан у IPTVnator: libmpv грузится нативным
      аддоном, `vo=libmpv`, рендер через render API в собственный `NSOpenGLView` — и **только на
      macOS**, где слои действительно можно упорядочить
      ([IPTVnator blog](https://4gray.github.io/iptvnator/blog/embedded-mpv-macos-experiment/)).
      На Windows аналог упирается либо в тот же airspace, либо в собственный компоновщик поверх
      [offscreen-рендеринга с общей GPU-текстурой](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering)
      (`webPreferences.offscreen.useSharedTexture`), где приложение обязано само склеивать слои и
      само пробрасывать ввод в `webContents`.
      ❌ Для нас это недели работы, свой нативный аддон под каждый мажор Electron и, по сути,
      свой видеокомпоновщик. Чужой готовый пакет взять нельзя (закрытый, чужая версия Electron).

      **B4. Отказаться от mpv в пользу декодирования внутри Chromium — WASM + WebCodecs
      ([libmedia](https://github.com/zhaohappy/libmedia)).** Смена движка воспроизведения, но
      **весь наш React-интерфейс остаётся как есть**: нет нативных окон — нет airspace-проблемы.
      Что даёт библиотека (по её README и npm):

      - демуксеры на TypeScript: **matroska**, mp4/mov, mpegts, avi, flv, ogg;
      - декодеры видео wasm-модулями из libavcodec: **h264 (включая 10-бит)**, hevc, vvc, av1,
        vp8/vp9, mpeg1/2/4, а где браузер умеет сам — WebCodecs (аппаратно);
      - декодеры звука: aac, mp3, opus, flac, vorbis, **ac3, eac3, dts**, wma — то есть ровно тот
        список, из-за которого сейчас существует ветка `audio-only` в `transcode-plan.ts`;
      - рендер 8 бит / **10 бит** / HDR через WebGL/WebGPU;
      - **субтитры ass/ssa/srt/vtt/ttml встроенно** (внутри — `assjs` + `ass-compiler`), то есть
        SubtitlesOctopus и наш парсер `matroska-subtitles` в перспективе не нужны;
      - лицензия LGPL-3.0 (GPL-заражение только у энкодеров x264/x265 — нам они не нужны);
      - живой проект: `@libmedia/avplayer` 1.3.1, релизы идут в 2026 году.

      ❌ Риски: многопоточность требует `SharedArrayBuffer` (значит COOP/COEP-заголовки на нашем
      кастомном протоколе, иначе откат на один поток); производительность на слабом железе; общая
      зрелость библиотеки (единственный автор). Но замер 20.1 показывает, что даже одного потока
      нативного декодера хватает с запасом 4.5x — при штрафе wasm 2–3x остаётся ~1.5–2x реального
      времени на 1080p Hi10P.

      #### 20.4 Что отпадает

      - **Патченный `libffmpeg.dll`** ([electron-chromium-codecs](https://github.com/ThaUnknown/electron-chromium-codecs))
        — закрывает HEVC/AC3/E-AC3, но **не Hi10P** (это не отсутствие декодера в ffmpeg, а
        запрет профиля в самом Chromium; CL на поддержку 9/10-бит H.264 был закрыт), и патчи
        доступны только до Electron 29 — у нас 44. Резервным вариантом больше не считаем.
      - **`mpv.js`** — заброшен, Pepper-плагин из эпохи, которой в Electron больше нет.

      #### 20.5 Предлагаемый следующий шаг — спайк на день, две проверки

      1. **mpv (полчаса).** Скачать портативный mpv, прогнать `mpv --vo=null --ao=null
         --untimed --frames=500` на том же файле — подтвердить, что нативный путь всеяден
         (ожидаемо да, см. 20.1). Затем грубый тест `--wid` в окне нашего приложения — посмотреть
         своими глазами, что происходит с HTML-оверлеем (ожидаемо: видео поверх всего).
      2. **libmedia (основная проверка).** Отдельная страница в renderer: `@libmedia/avplayer`
         играет тот самый MKV из папки владельца через наш `media://`-протокол. Смотрим: реальный
         fps и пропуски кадров, загрузку CPU, старт без ожидания, перемотку, звук FLAC/AC3,
         переключение аудиодорожек, ASS-субтитры из контейнера.

      Решение принимается по результату спайка. Ожидание автора: **B4 как основной путь**
      (всеядность без потери интерфейса и без ffmpeg-транскодирования вовсе) и **B1 как страховка
      и «экзотика»** — кнопка «Открыть в mpv» вместо нынешней «Открыть в системном плеере»,
      с mpv в поставке. B2/B3 брать только если B4 провалится по производительности.

### 21. Спайк libmedia: Hi10P играет в Chromium без транскодирования (2026-09-08)

      Проверка пункта 20.5(2) — сделана, результат положительный. Стенд: `@libmedia/avplayer`
      1.3.1 (UMD-сборка), локальный Node-сервер с Range и заголовками COOP/COEP, тот же файл
      `[Beatrice-Raws] 91 Days - 01` (H.264 **High 10**, 1080p, 23.976 fps, звук FLAC), браузер
      Chromium (движок тот же, что в Electron).

      **Что получилось:**

      | показатель                       | значение                              |
      | -------------------------------- | ------------------------------------- |
      | декодирование / отрисовка        | **23.96 / 23.96 кадра в секунду** — ровно частота исходника |
      | пропущенные кадры за 39 с        | **0**                                 |
      | ошибки декодирования             | **0**                                 |
      | звук FLAC                        | декодируется и отдаётся, пропусков 0  |
      | `crossOriginIsolated`            | `true` — многопоточность доступна     |
      | открытие файла (`load`)          | 2.5 с                                 |
      | первый кадр от загрузки страницы | 5.3 с «на холодную» (внутри — скачивание wasm 1.7 МБ + 0.4 МБ) |
      | перемотка на 10:00 / 23:20       | 754 мс / 113 мс, воспроизведение продолжается, пропусков 0 |

      То есть **10-битное видео играется как есть, в реальном времени, без ffmpeg и без
      ожидания** — нынешние ~4 минуты перекодирования на серию снимаются полностью.
      Скриншот с реальным кадром получен.

      **Что нужно приложению помимо самой библиотеки:**

      - wasm-декодеры кладутся рядом с приложением (`wasmBaseUrl` → `<base>/decode/h264-simd.wasm`
        и т.п.). Размеры: h264-simd 1.7 МБ, hevc-simd 1.2 МБ, ac3 0.6 МБ, dca (DTS) 0.8 МБ,
        flac/aac ~0.4–0.7 МБ, плюс `resample` и `stretchpitch`. Под нашу матрицу форматов — ~6 МБ
        в поставке, грузится только нужное;
      - COOP/COEP на протоколе рендерера (иначе откат на однопоточный режим);
      - абсолютный URL источника: относительный (`/media`) падает внутри воркера
        (`Failed to parse URL`), нужен `location.origin + путь`;
      - у источника без расширения — `load(url, { ext: 'mkv' })`.

      **Найденные острые углы:**

      - ⚠️ `seek()` принимает `int64` (**BigInt**). Передача обычного `Number` не бросает ошибку,
        а **молча вешает конвейер**: воспроизведение встаёт навсегда, `currentTime` замирает,
        ошибок в консоли нет. Обёртка обязана приводить тип сама.
      - ⚠️ **Нет API для внешних аудиодорожек.** Есть `externalSubtitles`/`loadExternalSubtitle`
        и `selectAudio(id)` по дорожкам внутри контейнера — но подключить отдельный файл озвучки
        (папки вида `RUS Sound` рядом с видео) библиотека не умеет. Сейчас это делает
        `useExternalAudio` из `@letar/folder-player-react` — отдельный `<audio>`, который
        синхронизируется с `<video>` по порогу 0.15 с. С libmedia видео рисует сама библиотека,
        и такой костыль придётся синхронизировать уже с её часами. Это самый весомый минус
        варианта B4 против mpv, где внешняя дорожка — штатная возможность (`--audio-file`,
        алиас `--audio-files-append`, плюс `audio-add` по JSON-IPC: дорожка попадает в общий
        список и играет от тех же часов, без ручной синхронизации).

      **Не измерено:** загрузка CPU в процентах и поведение на слабой машине (у владельца запас
      большой — 0 пропусков при 24 fps). Не проверено: AC3/DTS-звук (в тестовом файле FLAC),
      ASS-субтитры из контейнера, переключение аудиодорожек, HEVC.

### 22. Матрица форматов libmedia пройдена целиком (2026-09-08)

      Продолжение §21. Проверено на реальных файлах из папок владельца, каждый — автоматическим
      прогоном (загрузка → 12 с воспроизведения → переключение аудиодорожки → включение субтитров
      → перемотка в середину → ещё 7 с), стенд тот же: локальный сервер с Range и COOP/COEP,
      `@libmedia/avplayer` 1.3.1, `crossOriginIsolated: true`.

      | файл                          | контейнер | видео          | звук        | fps дек/рен | пропуски | ошибки |
      | ----------------------------- | --------- | -------------- | ----------- | ----------- | -------- | ------ |
      | 91 Days - 01                  | mkv       | H.264 High 10  | FLAC        | 24 / 24     | 0        | 0      |
      | Fumetsu no Anata e II - 01    | mkv       | HEVC Main 10   | FLAC + 3×AAC| 24 / 24     | 0        | 0      |
      | ID INVADED - 01 (x265)        | mkv       | HEVC Main 10   | FLAC        | 24 / 24     | 0        | 0      |
      | 7 Seeds - 01                  | **avi**   | MPEG-4 ASP     | 2× **AC3**  | 24 / 24     | 0        | 3 пак. |
      | BnHA OVA 1                    | mkv       | H.264 High     | **E-AC3**   | 24 / 24     | 0        | 0      |
      | Kamiina Botan - 01            | mkv       | H.264 High     | AAC         | 24 / 24     | 0        | 0      |
      | 91 Days - 01 → **DTS** (ffmpeg)| mkv      | H.264 High 10  | **DTS**     | 24 / 24     | 0        | 0      |

      Пропусков кадров и заиканий (`videoStutter`/`audioStutter`) — ноль везде. Три ошибочных
      аудиопакета в AVI — на старте и в момент переключения дорожки, на слух и на счётчиках
      пропусков не сказались.

      **Переключение аудиодорожек — работает и быстро.** `selectAudio(id)`: 22 мс на файле с
      четырьмя дорожками (MKV), 5 мс на AVI с двумя. После переключения — те же 24 fps, 0
      пропусков. `getStreams()` отдаёт язык и название дорожки (`AniLibria (…)`, `AniPlague (…)`)
      — ровно то, что нужно нашему селектору.

      **ASS-субтитры из контейнера — работают.** `selectSubtitle(id)` за 0–1 мс, реплики
      появляются, стили честные: рендер идёт DOM-ом (`div.ASS-box` поверх canvas), у каждой
      реплики свои `font-family`, толщина обводки, цвет тени, позиционирование и масштаб
      (`--ass-scale`). Русский текст рисуется корректно (проверено скриншотом).

      **`getChapters()` отдаёт главы** — 6 на файле Fumetsu, 3 на ID INVADED. Наш
      `ChapterSkipButton` останется рабочим.

      #### 22.1 Загрузка процессора (замер на Core Ultra 9 275HX, 24 потока)

      Считалось по приросту процессорного времени всех процессов приложения за 10 с относительно
      того же замера на паузе (фон ≈ 0.49 ядра).

      | сценарий                                | всего      | сверх фона   |
      | --------------------------------------- | ---------- | ------------ |
      | пауза (фон интерфейса)                  | 0.49 ядра  | —            |
      | Hi10P 1080p, WASM (аппаратного пути нет) | 1.02 ядра  | **0.53 ядра**|
      | HEVC 10 бит 1080p, аппаратный разрешён   | 0.85 ядра  | 0.36 ядра    |
      | HEVC 10 бит 1080p, только WASM           | 1.07 ядра  | 0.58 ядра    |

      То есть 1080p 10 бит через WASM стоит примерно **половину одного ядра**. Это сходится с
      замером §20.1 (нативный ffmpeg в один поток — 4.5x реального времени): штраф WASM выходит
      около двух раз, запас по реальному времени остаётся. На машине втрое медленнее это всё ещё
      ~1.5 ядра — играбельно, но уже без запаса; на совсем слабом железе 1080p 10 бит будет
      проблемой (у mpv на том же железе выручит аппаратный декодер, которого у Hi10P нет ни у
      кого, — так что для Hi10P слабое железо проблемно в любом варианте).

      #### 22.2 Два настоящих пробела варианта B4 (и цена каждого)

      1. **Вшитые в контейнер шрифты не подключаются.** `document.fonts` пуст, слова `FontFace`
         нет во всей сборке libmedia — вложения (`Attachment`-потоки) разбираются как потоки, но
         в браузер как шрифты не отдаются. Реплики рисуются подстановочным системным шрифтом:
         обычный диалог (Tahoma, Arial) выглядит верно, а надписи дизайнерскими шрифтами
         (`Tkachenko Sketch 4F`, `asinastra`, `RingBear` — их в файлах владельца по 11–16 штук) —
         нет.
         **Цена починки — небольшая.** Байты шрифта в памяти есть
         (`codecparProxy.extradataSize` = 327104 у первого вложения), но лезть указателем в кучу
         libmedia не нужно: у нас **уже есть** свой извлекатель вложений —
         `main/services/embedded-subtitles.ts` отдаёт `fonts: EmbeddedFont[]` для
         SubtitlesOctopus. Тот же массив достаточно скормить `new FontFace(...)` +
         `document.fonts.add()`, и DOM-рендер ASS начнёт видеть нужные начертания.

      2. **Внешних аудиодорожек нет в API совсем** (см. §21). `externalSubtitles` /
         `loadExternalSubtitle()` есть, `selectAudio()` работает только по дорожкам внутри
         контейнера. Для папок вида `RUS Sound` рядом с видео синхронизацию придётся писать
         самим — но уже против часов libmedia (`currentTime`, события `time`), а не против
         `<video>`, как в нынешнем `useExternalAudio` с порогом 0.15 с. У mpv это штатный
         `--audio-file` / `audio-add`.

      #### 22.3 Где сейчас проходит граница между вариантами

      После полной матрицы формулировка «mpv нужен ради всеядности» больше не верна:
      **libmedia сыграл всё, что нашлось на диске** — Hi10P, HEVC 10 бит (и x264-, и
      x265-происхождения), MPEG-4 ASP в AVI, FLAC/AAC/AC3/E-AC3/DTS, ASS из контейнера, главы,
      переключение дорожек. Остаётся ровно три вещи, ради которых mpv ещё имеет смысл:

      - **внешние аудиофайлы** (штатно у mpv, наш код у libmedia);
      - **аппаратное декодирование на слабом железе** (кроме Hi10P — его не ускоряет никто);
      - экзотика, которой на диске не нашлось: 4K HDR, TrueHD/Atmos, PGS/VobSub-субтитры
        картинкой, битые/недокачанные файлы.

      Цена mpv не изменилась и остаётся архитектурной: в Electron HTML поверх видео в одном окне
      не ложится (§20.2), то есть mpv — это второе окно и отказ от собственного интерфейса
      **внутри** видео.

      **Предложение:** B4 основным движком (весь интерфейс наш, транскодирования нет вовсе),
      mpv в поставке как режим «открыть в mpv» для перечисленных трёх случаев. Первые задачи по
      B4, в порядке: подключение `FontFace` из уже существующего извлекателя вложений; обёртка
      над `seek()` с приведением к BigInt; синхронизация внешней озвучки против часов libmedia.

### 23. План перехода на движок libmedia (составлен 2026-09-09, к исполнению)

      Раздел написан как **техзадание для следующей сессии** — самодостаточное, чтобы не
      перечитывать §20–§22 целиком. Решение принято владельцем по итогам §22: **libmedia
      основным движком, mpv — отдельным режимом «открыть в mpv» для трёх остаточных случаев**
      (внешние аудиофайлы, аппаратное декодирование на слабом железе, экзотика вроде 4K HDR,
      TrueHD и субтитров картинкой).

      Что уже установлено и переспрашивать не нужно:

      - Транскодирование в VP9 (§17) не нужно **ни по какой причине** — ни по производительности
        (§20.1), ни по совместимости (§22). Это плата за отказ Chromium декодировать Hi10P.
      - «HTML поверх видео в одном окне» в Electron невозможен (§20.2) — поэтому mpv не может
        быть основным движком, а не потому что он плох.
      - libmedia в Chromium сыграл всё, что нашлось на диске: Hi10P, HEVC Main 10 (x264- и
        x265-происхождения), MPEG-4 ASP в AVI, FLAC/AAC/AC3/E-AC3/DTS, ASS из контейнера, главы,
        переключение аудиодорожек. 24 fps, 0 пропусков, 0 ошибок (§22).
      - Загрузка CPU: 1080p 10 бит через WASM — примерно **полядра** на Core Ultra 9 275HX
        (§22.1), с включённой многопоточностью.

      #### 23.0 Стенд спайка — как воспроизвести, если понадобится

      Стенд жил во временном каталоге сессии и **в репозиторий не попал** (осознанно — разовая
      проверка, не часть приложения). Собирается из трёх кусков:

      1. Скрипт скачивания wasm-декодеров с
         `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/decode` — плюс каталоги
         `resample`, `stretchpitch`, `scale`: без `resample` падает
         `WebAssembly compilation aborted` уже на первом файле.
      2. Node-сервер на `127.0.0.1:8791`: раздаёт `/lib/*` (UMD-сборка из
         `node_modules/.bun/@libmedia+avplayer@1.3.1/.../dist/umd`), `/wasm/*` и `/media?id=<id>`
         из списка файлов. **Обязательны** заголовки `Cross-Origin-Opener-Policy: same-origin`,
         `Cross-Origin-Embedder-Policy: require-corp`,
         `Cross-Origin-Resource-Policy: same-origin` и поддержка `Range` (206 + `Content-Range`).
      3. Страница: `new AVPlayer({ container, wasmBaseUrl, enableWorker: true })`, затем
         `await player.load(<абсолютный URL>, { ext: 'mkv' })` и опрос `player.getStats()`.

      ⚠️ Две грабли стенда, чтобы не переоткрывать: **относительный URL источника не работает** —
      загрузка идёт внутри Worker, где `fetch('/media')` падает `Failed to parse URL`, нужен
      абсолютный; и **URL без расширения** требует явного `{ ext: 'mkv' }`, иначе
      `open stream failed, ret: -2`.

      #### 23.1 Э0 — риск-гейт: `crossOriginIsolated` под `app://`. Делать ПЕРВЫМ

      **Единственная проверка, способная изменить весь план, поэтому она первая.** Спайк шёл на
      `http://127.0.0.1`, а приложение грузит рендерер с кастомной схемы (`app://…/index.html`,
      см. `main/protocols/app.protocol.ts`, константа `APP_INDEX_URL`). Даёт ли Chromium
      `crossOriginIsolated: true` на кастомной схеме — неизвестно, а от этого зависит
      `SharedArrayBuffer`, то есть **многопоточное** декодирование.

      1. В `handleAppRequest` (`main/protocols/app.protocol.ts`, блок `headers` ответа) добавить
         `Cross-Origin-Opener-Policy: same-origin` и `Cross-Origin-Embedder-Policy: require-corp`.
      2. Схема `app` уже привилегированная (`standard`, `secure`, `supportFetchAPI`,
         `corsEnabled`, `stream` — там же, `registerSchemesAsPrivileged`). Добавлять ничего не
         нужно.
      3. `nx dev animatrona-folder-player`, в DevTools рендерера прочитать `crossOriginIsolated`.

      **Развилка:**

      - `true` — идём дальше без изменений.
      - `false` — libmedia откатится на однопоточные сборки. Это **не блокер**: §20.1 показывает
        4.5x реального времени у нативного однопоточного декодера. Но замеры §22.1 сделаны с
        потоками, поэтому **обязательно перемерить CPU в однопоточном режиме** до того, как
        выкидывать транскодирование (Э7). Если однопоточный режим не тянет 1080p 10 бит — B4
        сужается до «работает на быстрых машинах», и решение по mpv нужно пересматривать, а не
        додавливать.

      ⚠️ Под COEP `require-corp` **все подресурсы обязаны отдавать
      `Cross-Origin-Resource-Policy`**. `media://` — другой origin относительно `app://`, поэтому
      его ответы (и 206, и полный файл) должны получить
      `Cross-Origin-Resource-Policy: cross-origin`. Правится в
      `libs/folder-scan/src/lib/media-protocol.ts` (обе ветки ответа), а не в приложении: обёртка
      `main/protocols/media.protocol.ts` заголовков не задаёт вовсе. **Библиотека общая** —
      проверить потребителей (`git grep registerMediaProtocol`); заголовок безвредный, но правка
      выходит за scope приложения, коммитить отдельно.

      Смежная задокументированная грабля:
      [electron-app-protocol](/.claude/docs/electron-app-protocol.md) — под `file://` origin равен
      `null`, и это блокирует Worker и WASM. Мы на `app://`, не на `file://`, но если Э0 покажет
      странности с воркерами — смотреть туда первым делом.

      #### 23.2 Э1 — вендоринг wasm-декодеров

      libmedia грузит декодер по URL `${wasmBaseUrl}/decode/<codec><variant>.wasm`. Тянуть с CDN
      в десктопном приложении нельзя (офлайн + приватность) — кладём в поставку.

      - **Куда:** `renderer/public/libmedia/` → раздаётся как `app://<APP_HOST>/libmedia/…`,
        значит `wasmBaseUrl: 'app://<APP_HOST>/libmedia'`.
      - **Что:** каталоги `decode/`, `resample/`, `stretchpitch/`, `scale/`. Последние три
        обязательны.
      - **Варианты:** `''` (базовый), `-atomic` (многопоточный), `-simd`. Библиотека выбирает
        сама по возможностям среды.
      - **Кодеки под реальные папки владельца:** `h264`, `hevc`, `flac`, `aac`, `ac3`, `eac3`,
        `dca` (DTS), `mpeg4`, `mp3`, `opus`, `vorbis`, `vp9`, `av1`. Размеры simd-вариантов:
        h264 1675 КБ, hevc 1160 КБ, dca 825 КБ, aac 708 КБ, ac3 586 КБ, flac 363 КБ.
      - ⚠️ **Решить осознанно, что кладём в дистрибутив.** Три варианта × 13 кодеков — это
        десятки мегабайт в установщике. Разумный компромисс: `-simd` + базовый (SIMD есть во всех
        современных Chromium, базовый — страховка), `-atomic` только если Э0 дал
        `crossOriginIsolated: true`. Замерить размер `nx build:win animatrona-folder-player` до и
        после.
      - **Версионирование:** в `package.json` стоит `"@libmedia/avplayer": "^1.3.1"` —
        **сменить на точную версию**, иначе wasm и JS разъедутся при обновлении. Завести
        `scripts/fetch-libmedia-wasm.mjs`, чтобы обновление было воспроизводимым, а не ручным.

      #### 23.3 Э2 — вшитые шрифты через `FontFace`

      **Проблема (§22.2):** libmedia рисует ASS как DOM и берёт `font-family` из стиля реплики,
      но шрифты не регистрирует — слова `FontFace` нет во всей его сборке. Диалог в Tahoma
      выглядит верно, надписи дизайнерскими шрифтами — нет.

      **Ключевая тонкость:** ASS ссылается на шрифт по **имени семейства**
      (`Tkachenko Sketch 4F`), а имя файла вложения (`Tkachenko Sketch 4F (Regular).ttf`) с ним
      совпадает не всегда. Значит нужен разбор таблицы `name` внутри самого шрифта.

      1. `libs/folder-player-react/src/lib/font-family-names.ts` — чистая функция
         `parseFontFamilyNames(buffer: ArrayBuffer): string[]`. Разбирает sfnt-заголовок
         (`0x00010000` — TrueType, `OTTO` — CFF, `ttcf` — коллекция), находит таблицу `name`,
         возвращает значения nameID **1** (Font Family) и **16** (Typographic Family),
         дедуплицированные. Поддержать оба кодирования строк: platformID 3 (Windows, UTF-16BE) и
         platformID 1 (Mac, ASCII). **Своими руками, без зависимости** — `fontkit` слишком тяжёл
         для бандла рендерера, а нужен один блок формата.
      2. `font-family-names.spec.ts` — тест на синтетическом бинарнике шрифта, собранном прямо в
         тесте (sfnt-заголовок + одна таблица `name` формата 0). **Не завязываться на системные
         шрифты Windows** — тест обязан быть детерминированным и работать в CI.
      3. `libs/folder-player-react/src/lib/ass-fonts.ts` —
         `registerAssFonts(urls: string[]): Promise<() => void>`: скачивает каждый URL, парсит
         имена семейств, регистрирует `new FontFace(family, buffer)` + `document.fonts.add()`,
         возвращает функцию снятия. `document.fonts.delete()` в снятии **обязателен** — иначе при
         перелистывании серий регистрации копятся. Сверху тонкий хук `useAssFonts(urls)`.
      4. Источник URL уже есть, новый код извлечения писать не нужно:
         - вшитые — `main/services/embedded-subtitles.ts` возвращает `fonts: EmbeddedFont[]`
           (`{ filename, mimetype, data }`), рендерер уже делает из них blob-URL в
           `renderer/app/page.tsx` (переменная `fontUrls`);
         - внешние — там же, `match.matchedFonts.map((f) => toMediaUrl(f.path))`.

         Сегодня оба массива уходят в SubtitlesOctopus; при переходе на libmedia они уходят ещё и
         в `registerAssFonts`.

      ⚠️ Проверять **глазами на файле с надписями** (`Fumetsu no Anata e II` — 16 вложений,
      `Kamiina Botan` — 11), а не отсутствием ошибок в консоли: подстановка шрифта ошибки не
      даёт, это молчаливое расхождение внешнего вида.

      #### 23.4 Э3 — обёртка над `AVPlayer`

      Новый файл `libs/folder-player-react/src/lib/libmedia-player.ts` (хук `useLibmediaPlayer`
      сверху; чистое ядро отделить от React ради тестов).

      Обязательно закрыть собой:

      - **`seek()` требует BigInt.** Обычное число — не исключение, а **молчаливое зависание
        конвейера навсегда** (§21): `currentTime` замирает, счётчик отрисованных кадров стоит,
        ошибок нет. Обёртка обязана приводить тип сама (`BigInt(Math.round(ms))`) и никогда не
        пропускать `number` наружу. **Тест на это обязателен** — самая дорогая из найденных
        граблей.
      - `currentTime` — геттер, отдаёт `int64` в миллисекундах; наружу отдавать секундами
        `number`, как принято в остальном коде плеера. То же для `getDuration(): bigint`.
      - Разбор `getStreams()`: поле `mediaType` — **строка** (`'Video' | 'Audio' | 'Subtitle' |
        'Attachment'`), не число. Ошибка «фильтрую по `type === 1`» уже была допущена в спайке и
        тихо не отбирала ничего.
      - Прокинуть как есть (работают, замеры §22): `selectAudio(id)`, `selectSubtitle(id)`,
        `setSubtitleEnable(bool)`, `getChapters()`, `getSelectedAudioStreamId()`,
        `getSelectedSubtitleStreamId()`.
      - События через `player.on(...)`: `firstVideoRendered`, `time`, `error`, `ended`, `loaded`.

      Полезное сверх минимума, уже проверенное рабочим: `snapshot('png')` (кадр для превью),
      `setPlaybackRate`, `getStats()` (готовая диагностика — fps, пропуски, заикания; годится для
      отладочной панели).

      #### 23.5 Э4 — компонент плеера за флагом, рядом со старым

      Сейчас воспроизведение — `ShakaVideoPlayer` внутри
      `renderer/app/_components/VideoPlayer.tsx` (463 строки; `VideoPlayer` — тонкая обёртка,
      догружающая `shaka-player` динамическим импортом). Правильный ход — **не переписывать его,
      а добавить второй**:

      - `LibmediaVideoPlayer` рядом, с тем же пропс-контрактом `VideoPlayerProps`.
      - Выбор движка — явным флагом (настройка приложения либо переменная сборки), по умолчанию
        на время отладки старый.
      - `libs/video-player-react` (`useShakaPlayer` и соседи) **не трогать**: у него другие
        потребители, разбор —
        [shaka-player-hook-dedup-audit](/.claude/docs/shaka-player-hook-dedup-audit.md).

      Что отваливается само и это нормально: `ExtendedFormatsPanel` (предложение перекодировать),
      `renderer/app/_hooks/use-transcode-stream.ts` (там уже мёртвый `STREAMING_ENABLED = false`,
      §18). **Не удалять на этом шаге** — удаление отдельным этапом Э7, после того как новый
      движок отработает на всей папке.

      #### 23.6 Э5 — внешняя озвучка против часов libmedia

      **Пробел (§21, §22.2):** у libmedia нет API внешних аудиодорожек. `externalSubtitles` и
      `loadExternalSubtitle()` есть, `selectAudio()` — только по дорожкам внутри контейнера. У mpv
      это штатный `--audio-file` (алиас `--audio-files-append`) и `audio-add` по JSON-IPC.

      Сегодня закрыто хаком `libs/folder-player-react/src/lib/useExternalAudio.ts`: скрытый
      `<audio>`, видео мьютится, подтяжка по порогу `SYNC_THRESHOLD = 0.15` секунды.

      Что делать: **обобщить хук по источнику часов**, а не писать второй такой же. Ввести
      интерфейс «текущее время в секундах + play/pause/rate + подписка на изменения», две
      реализации — над `HTMLVideoElement` (как сейчас) и над обёрткой libmedia из Э3. Логика
      подтяжки и порог остаются общими.

      ⚠️ У libmedia свой аудио-конвейер через `AudioContext` (`getAudioOutputNode()`), поэтому в
      перспективе внешнюю дорожку можно свести в **тот же** `AudioContext` и получить общие часы
      без подтяжки вовсе. Но это отдельная задача, **не в первый заход**: первый заход — паритет с
      нынешним поведением на новых часах.

      #### 23.7 Э6 — субтитры: что остаётся от SubtitlesOctopus

      libmedia рисует ASS сам (DOM поверх canvas, §22). Значит SubtitlesOctopus и извлечение
      реплик через `matroska-subtitles` для **встроенных** дорожек становятся не нужны — но
      только после того, как Э2 (шрифты) подтверждён глазами.

      Не путать два пути:

      - **встроенные** дорожки — libmedia сам, `selectSubtitle(id)`;
      - **внешние** файлы `.ass`/`.srt` рядом с видео — `loadExternalSubtitle()` либо опция
        `externalSubtitles` при `load()`. ⚠️ В спайке этот путь **не проверялся** — проверить
        отдельно, до снятия старого рендера субтитров.

      Извлекатель вложений (`embedded-subtitles.ts`) **остаётся нужен в любом случае** — из него
      берутся шрифты для Э2, даже когда реплики рисует libmedia.

      #### 23.8 Э7 — снятие транскодирования (последним, по факту)

      Только когда новый движок отыграл всю папку без нареканий:

      - Кандидаты на удаление: `main/services/ffmpeg/transcode.service.ts`,
        `ffmpeg-installer.service.ts`, `ffmpeg-paths.ts`,
        `renderer/app/_hooks/use-transcode-stream.ts`, `ExtendedFormatsPanel.tsx`.
      - ⚠️ **`chapters.service.ts` и `sprite.service.ts` тоже лежат в `main/services/ffmpeg/`** —
        проверить каждый отдельно, прежде чем удалять каталог целиком. Главы libmedia отдаёт сам
        (`getChapters()`), спрайты превью — нет: либо оставить ffmpeg ради спрайтов, либо строить
        их через `snapshot()` нового движка.
      - Обновить `description` в `package.json` («без импорта, IPFS и транскодирования» — станет
        правдой буквально) и убрать `shaka-player` из зависимостей, если второй движок снят.

      #### 23.9 Порядок и критерии готовности

      | этап | что                                       | готово, когда                                                                                       |
      | ---- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
      | Э0   | COOP/COEP на `app://`, CORP на `media://` | в DevTools `crossOriginIsolated === true` (или задокументирован откат на один поток + перемеренный CPU) |
      | Э1   | wasm в `renderer/public/libmedia/`        | плеер стартует офлайн, в сети ноль запросов к CDN                                                    |
      | Э2   | `parseFontFamilyNames` + `registerAssFonts` | надписи в `Fumetsu no Anata e II` совпадают с эталоном mpv/VLC на глаз                              |
      | Э3   | обёртка над `AVPlayer`                    | тест: `seek(число)` не проходит мимо приведения к BigInt                                             |
      | Э4   | `LibmediaVideoPlayer` за флагом           | серия играет целиком, дорожки/субтитры/главы переключаются                                           |
      | Э5   | внешняя озвучка на новых часах            | папка с `RUS Sound` играет с той же точностью, что сейчас                                            |
      | Э6   | встроенные субтитры без SubtitlesOctopus  | ASS из контейнера рисуется штатно, внешние `.ass` тоже                                               |
      | Э7   | ffmpeg снят                               | `build:win` собирается, серия стартует без ожидания перекодирования                                  |

      #### 23.10 Чего не делать

      - **Не браться за встраивание mpv в окно** (`--wid`, libmpv-аддон, окно-оверлей). Разобрано
        в §20.3 (B2/B3) и закрыто. «Открыть в mpv» отдельным окном (B1) — да, но это отдельная
        задача, не часть этого перехода.
      - **Не читать байты вложений через указатель в кучу libmedia.** Технически они там есть
        (`codecparProxy.extradataSize` = 327104 у первого вложения), но лезть туда не нужно —
        свой извлекатель вложений уже есть (Э2, п. 4).
      - **Не удалять ffmpeg раньше Э7** и не удалять каталог `main/services/ffmpeg/` целиком, не
        разобравшись с главами и спрайтами.
      - **Не полагаться на «ошибок в консоли нет»** как на проверку: обе самые дорогие грабли
        этого движка (число вместо BigInt в `seek`, неподключённые шрифты) — молчаливые.


      #### 23.11 Открытые вопросы

      - [ ] ⚠️ **Открытый вопрос: режим «открыть в mpv» (вариант B1) не запланирован по срокам.**
        Решение «mpv в поставке как отдельный режим» принято по существу (§22.3), но задачей
        нигде не заведено: неясно, делать его до перехода на libmedia (как страховку, если Э0
        или Э5 упрутся), после (как добивку экзотики) или не делать вовсе, если libmedia закроет
        всё на практике. Цена вопроса — портативный mpv в дистрибутиве (~40 МБ) плюс клиент
        JSON-IPC (на Windows — именованный канал, ~150 строк; готовые npm-обёртки мертвы:
        `node-mpv` не публиковался 6 лет, `node-libmpv` — 7). Решать после Э4, когда станет
        видно, насколько libmedia справляется в реальной эксплуатации.
      - [ ] ⚠️ **Открытый вопрос: сколько wasm класть в установщик.** Три варианта сборки
        (базовый/`-atomic`/`-simd`) × 13 кодеков — десятки мегабайт. Развилка описана в 23.2, но
        решение зависит от результата Э0 (нужны ли `-atomic` вообще) и от замера итогового
        размера `build:win`.

      #### 23.12 Гигиена

      `PLAN.md` этого приложения после §23 — около 1900 строк, то есть у верхней границы
      диапазона из [plan-decomposition-pattern](/.claude/docs/plan-decomposition-pattern.md)
      (~1500–2000). Резать **по заголовкам** (`### N.`), не по номерам строк, и завести точку
      входа. Разумный разрез: §1–§16 (история MVP) в отдельную часть, §17–§23 (текущая линия:
      транскодирование → mpv → libmedia) оставить в основном файле.

      #### 23.13 Общее знание вынесено в `.claude/docs/` (2026-09-09)

      Предел Chromium по Hi10P, разбор четырёх вариантов обхода (перекодирование / mpv-варианты /
      libmedia) и обе молчаливые ловушки (`seek()` требует BigInt, вшитые шрифты не подключаются)
      касаются не только этого приложения — вынесены в
      [chromium-video-codec-limits.md](/.claude/docs/chromium-video-codec-limits.md), со ссылкой
      из корневого `CLAUDE.md`. §20–§23 здесь остаются источником истины с полным контекстом
      (стенд спайка, пошаговый план перехода Э0–Э7) — общий док не дублирует план перехода, только
      измерения и ловушки, применимые где угодно ещё. Тот же выбор движка применим к
      `apps/animatrona` (свой ffmpeg-стек, та же проблема Hi10P) — задача не заведена, только
      указатель в общем доке.
