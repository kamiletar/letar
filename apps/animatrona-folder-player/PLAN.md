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
- [x] `electron-builder.yml`: `appId com.letar.animatrona-folder-player` — сделано попутно
      переименованием 2026-09-08 (см. §0), раньше первоначально задуманного момента этой фазы
- [ ] `electron-builder.yml`: NSIS (`oneClick: false`),
      `publish: { provider: github, owner: kamiletar, repo: letar }`
- [ ] ⚠️ **Точная** версия electron в `devDependencies` (`"42.6.1"`, не `"^42.6.1"`) — иначе
      electron-builder не определит бинарник
- [ ] ⚠️ electron-builder ищет `node_modules` от `projectDir`, а не `appDir` — в Nx-монорепо это
      известная поломка ([electron-builder#9445](https://github.com/electron-userland/electron-builder/issues/9445)).
      Версию `electron-builder` фиксировать и не поднимать вслепую
- [ ] `.github/workflows/release-animatrona-folder-player.yml` по тегу `animatrona-folder-player-v*`:
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
- [ ] Фильтр релизов по префиксу тега: `animatrona-v*` против `animatrona-folder-player-v*`
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
- [ ] `nx g @letar/generators:e2e-suite animatrona-folder-player` — smoke + папочный сценарий
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
