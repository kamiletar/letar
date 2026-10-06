# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/), версии — [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-10-05

### Added

- Схема БД: заметки, неизменяемые версии, рубрики, таблицы Better Auth; миграция `init`
- Вход через Ключницу только для владельца (`OWNER_EMAIL`), страница `/login`, защита страниц `requireOwner()`
- Стартовые рубрики: Веб-архитектор, Поэт, Аудиофил, Синефил, Отаку

## [0.1.0] - 2026-10-05

### Added

- Сгенерирован каркас приложения (`nx g @letar/generators:new-app notebook`)
