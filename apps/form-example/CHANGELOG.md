# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.1.2] - 2026-08-20

### Fixed

- Все 42 examples-страницы получили настоящий `<h1>` — Chakra `Heading` рендерит `<h2>` по
  умолчанию, ни одна страница не имела `<h1>` в DOM. Root cause 5 упавших e2e-спеков (§18.7 M2:
  `basic`/`conditional`/`groups`/`multi-step`/`validation`, все проверяют
  `getByRole('heading', {level: 1})`). Добавлен общий `PageH1` (`asChild` + нативный `<h1>`).

## [0.1.1] - 2026-04-04

### Improved

- Обновлён PLAN.md — цели синхронизированы с библиотекой v0.84.2 (56 полей)
- 42 демо-страницы покрывают все основные паттерны

## [0.1.0] - 2026-03-23

### Added

- Showcase приложение @letar/forms
- 11 демо-страниц (basic, all-fields, validation, conditional, multi-step, groups, auto-fields, zenstack, theming, i18n, offline)
- ZenStack интеграция с `schema.zmodel` и `@form.*` директивами
- Docker деплой на forms-example.letar.best (порт 3022)
