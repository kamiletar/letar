# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

- Каркас приложения (`nx g @letar/generators:electron-app`).
- Исследование разделения `schema.zmodel` с Animatrona: раздел «Разделение схемы БД с Animatrona»
  в `PLAN.md` — какие модели идут в общий фрагмент и каким способом. Механизм проверен
  эмпирически (zenstack 3.9.3), разбор границ —
  [zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).
  Найдена ловушка: `@letar/zenstack-form-plugin` молча теряет все поля `type`-миксина — баг
  передан владельцу `libs/forms`.

## [0.1.0] - 2026-09-08

### Added

- Первый релиз каркаса.
