# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.3.2] - 2026-08-25

### Fixed

- `--webpack` в `dev`/`build` — превентивный фикс hydration-бага Turbopack+Emotion (Chakra
  `ChakraProvider` + `next-themes` `ThemeProvider`), см.
  `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md`

## [0.3.1] - 2026-08-25

### Fixed

- Touch target для текстовой ссылки «Конфиденциальность» в футере (WCAG 2.5.5) — `TouchLink` из `@letar/ui`

## [0.1.0] - 2026-04-04

### Added

- Базовая структура лендинга
