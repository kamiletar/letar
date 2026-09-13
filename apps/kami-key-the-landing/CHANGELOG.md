# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.4.2] - 2026-09-13

### Fixed

- Секция «Скачать»/hero показывала v1.7.2, хотя на GitHub уже был опубликован v1.7.4 —
  `download-info.ts` (`DOWNLOAD_VERSION`/`DOWNLOAD_SIZE`/`DOWNLOAD_URL`) обновляется вручную при
  каждом релизе kami-key-the, забыли обновить вместе с релизом. Заодно URL переведён с
  `KamiKeyThe.Setup.X.Y.Z.exe` (точки) на `KamiKeyThe-Setup-X.Y.Z.exe` (дефисы) — начиная с 1.7.4
  ассеты релиза называются с дефисами (нужно для совпадения с `latest.yml`, который читает
  автообновление приложения).
- Страница `/changelog` (динамическая, тянет список с GitHub Releases через
  `@letar/github-releases`, ISR revalidate 1ч) в dev-режиме отдавала протухший кеш `fetch` из
  `.next/cache/fetch-cache`, записанный до публикации 1.7.4 — не баг кода, а ожидаемое поведение
  ISR: после реального деплоя на прод то же самое (до часа устаревшая версия на сайте) возможно
  сразу после релиза, пока кеш не истечёт.

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
