# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

- Детекция кодеков, которые Chromium не декодирует (Hi10P, AC3/E-AC3/DTS/TrueHD) — сообщение
  и кнопка «Открыть в системном плеере» (`shell.openPath`) вместо чёрного экрана.

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
