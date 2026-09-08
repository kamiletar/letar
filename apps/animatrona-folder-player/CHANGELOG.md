# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

- **Расширенная поддержка форматов (Фаза 6)** — файлы, которые Chromium не проигрывает
  (Hi10P-видео, AC3/E-AC3/DTS/TrueHD-звук, контейнеры AVI/WMV/FLV/TS), теперь играются в самом
  плеере, а не только «через системный плеер»:
  - докачка ffmpeg по требованию в `userData` (полная сборка BtbN-gpl, ~163 МБ) с прогрессом,
    отменой и удалением; уже установленный в системе ffmpeg распознаётся и используется как есть;
  - эскалация по стоимости — ремукс (`-c copy`) → перекодирование только звука → полное
    перекодирование видео; выбирается автоматически по данным пробы;
  - подготовленный файл кэшируется (`userData/transcoded/`, потолок 20 ГБ с вытеснением) —
    повторный просмотр серии стартует мгновенно;
  - если найденный ffmpeg собран без нужных декодеров (частый случай для `essentials`-сборок —
    в проверенной системной ffmpeg 8.0 не было DTS), панель предлагает докачать полную сборку.
- **Главы OP/ED** — кнопка «Пропустить опенинг/эндинг» и маркеры глав на прогресс-баре. Главы
  берутся через ffprobe (`main/services/ffmpeg/chapters.service.ts`) — `mediainfo.js`
  сознательно их не отдаёт (формат Menu-трека MediaInfoLib не проверен без фикстур), а
  `ffprobe -show_chapters` — документированный стабильный формат. Без установленного ffmpeg
  кнопка просто не появляется. Классификация OP/ED по названию/позиции — `detectChapterTypes`
  из `@letar/video-player-react` (реэкспортирована из публичного API библиотеки этой задачей,
  версия 0.2.1 → 0.2.2).
- **Превью-спрайт для перемотки** — наведение на полосу прогресса показывает миниатюру кадра в
  этом месте видео (отображающая часть уже была в `@letar/video-player-react`, не хватало только
  генерации): нарезка спрайт-листа через ffmpeg в фоне после старта воспроизведения, кэш в
  `userData/sprites/` (потолок 512 МБ), без установленного ffmpeg превью просто не появляется,
  без ошибок — `shared/sprite-layout.ts`, `main/services/ffmpeg/sprite.service.ts`, IPC `sprite:*`.
- **Локальный постер серии** — поиск `poster`/`cover`/`folder`.`jpg`/`.jpeg`/`.png`/`.webp` в
  корне открытой папки (`main/services/poster-finder.service.ts`, IPC `fs:findPoster`), отдаётся
  через уже существующий `media://`. Раньше `EpisodeSidebar.posterUrl` не передавался вовсе —
  сайдбар всегда показывал generic-иконку папки.
- `shared/` — рантайм-код, общий для main и renderer: `codec-support.ts` (переехал из
  `renderer/app/_lib/`), `transcode-plan.ts`, `sprite-layout.ts`, `chapter-mapping.ts`.
  Алиас `@shared/*`. 94 unit-теста (vitest), таргет `nx test animatrona-folder-player`.
- `scripts/verify-ffmpeg.cjs` — headless-проверка ffmpeg-части main-процесса без GUI; с путём к
  видеофайлу аргументом прогоняет настоящую подготовку.

- Unit-тесты (vitest): матчинг внешних субтитров к сериям, поиск/сопоставление шрифтов,
  in-memory кэш probe (`libs/folder-scan`, `libs/folder-player-react`).
- Портативная сборка Windows (`electron-builder.yml` `win.target: portable`) вторым артефактом
  рядом с NSIS-инсталлятором — запуск без установки, с флешки/на чужой машине.
- Таргеты сборки/релиза (`build`, `build:linux`, `release:win`) и CI-workflow
  `release-animatrona-folder-player.yml` для релизов из монорепо `kamiletar/letar` (без
  зеркалирования исходников, без публикации через `electron-updater` — только упаковка и
  загрузка в GitHub Release). Шаг проверки веса установщика (≤130 МБ) в каждой build-джобе.
- Дисковый кэш результатов пробы медиафайла (`probe-cache.json` в userData) — переживает
  перезапуск приложения, в отличие от in-memory LRU рендерера. Инвалидация по `mtime`+`size`
  файла, без TTL.
- Детекция кодеков, которые Chromium не декодирует (Hi10P, AC3/E-AC3/DTS/TrueHD) — сообщение
  и кнопка «Открыть в системном плеере» (`shell.openPath`) вместо чёрного экрана.
- UX-минимум плеера: ассоциация файлов (.mkv/.mp4/.avi/.webm/.mov/.wmv/.flv/.m4v/.ts/.m2ts),
  открытие файла двойным кликом и через single-instance (второй клик — в уже открытом окне),
  drag&drop файла/папки в окно, экран не гаснет во время воспроизведения (`powerSaveBlocker`).
- Страница `/player` на `animatrona-landing`: отличия от полной Animatrona, форматы «из
  коробки», скачивание релизов плеера напрямую из `kamiletar/letar` (без зеркалирования),
  честная позиция «ничего не скачивает и не ищет контент». `github.ts` лендинга параметризован
  под несколько продуктов монорепо (`ReleaseSource` с `tagPrefix`).

### Fixed

- Матчинг внешних субтитров: язык/группа из суффикса имени файла (`.jp_netflix` и т.п.) не
  извлекались ни для одной папки с несколькими сериями — терялись молча из-за неверного
  порядка шагов в `fuzzyMatchToVideo`.
- Стандартное меню Electron «File Edit View Window» под заголовком окна убрано
  (`Menu.setApplicationMenu(null)`) — плееру оно не нужно, фидбек с первого живого запуска.
- Отсутствующие иконки в `resources/` (`icon.ico`/`icon.png`/`icon-*.png`) — падал
  `build:win` (`electron-builder`) с `cannot find specified resource "resources/icon.ico"`.
  Скрипт генерации (`scripts/generate-icons.mjs`) был готов, но никогда не запускался для этого
  приложения.

### Changed

- Рендерер грузится через привилегированную схему `app://` (`main/protocols/app.protocol.ts`)
  вместо `file://` — снимает блокировку Worker/WASM (нужны SubtitlesOctopus) и хак
  `assetPrefix: './'`.

## [0.1.0] - 2026-09-08

### Added

- Каркас приложения (Electron + Next.js, Nextron) сгенерирован генератором
  `@letar/generators:electron-app`.
- Просмотр аниме из локальной папки: сканирование (`@letar/folder-scan`), выбор эпизода/дорожек,
  история и прогресс просмотра (`@letar/folder-player-react`).
- Плеер на Shaka Player через общие библиотеки `@letar/video-player-react`/`@letar/video-player-core`
  — тот же движок, что в `animatrona`/`animatrona-tracker`.
- Извлечение медиаданных без ffmpeg — `MediaInfoWasmProber` на `mediainfo.js` (WASM).
- Извлечение встроенных ASS/SRT-субтитров и шрифтов из MKV без ffmpeg — потоковый парсер
  `matroska-subtitles` с собственной сборкой валидного `.ass`/`.srt`-контента.

### Changed

- Приложение переименовано из `animatrona-player` в `animatrona-folder-player` (nx-проект,
  `package.json`, `appId`). Продуктовое имя «Animatrona Player» не изменилось.

---

**Последнее обновление:** 2026-09-08
