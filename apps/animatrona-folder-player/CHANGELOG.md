# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

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
