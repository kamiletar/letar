# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.4.1] - 2026-09-11

### Fixed

- Условный `flexWrap` в hero-секции (`flexWrap={{ base: 'nowrap', sm: 'wrap' }}` вместо
  безусловного `"wrap"`) — на mobile-брейкпоинте (`direction="column"`) `wrap` идёт по
  cross-axis, т.е. горизонтали, риск переполнения документа. Разбор класса бага —
  [.claude/docs/chakra-flexwrap-column-direction-overflow.md](../../.claude/docs/chakra-flexwrap-column-direction-overflow.md).

## [0.2.2] - 2026-09-02

### Added

- `public/llms.txt` — карта публичных разделов для LLM-агентов (llmstxt.org), см.
  [.claude/docs/llms-txt-pattern.md](../../.claude/docs/llms-txt-pattern.md).

## [Unreleased]

## [0.2.1] - 2026-08-25

### Fixed

- `--webpack` в `dev`/`build` — превентивный фикс hydration-бага Turbopack+Emotion (Chakra
  `ChakraProvider` + `next-themes` `ThemeProvider`), см.
  `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md`

## [0.1.0] - 2026-04-04

### Added

- Базовая структура лендинга
