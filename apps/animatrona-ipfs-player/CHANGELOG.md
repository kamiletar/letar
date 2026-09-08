# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

- Каркас приложения (`nx g @letar/generators:electron-app`).
- **Фаза 0 «Общий фрагмент схемы»** в `PLAN.md` — 7 шагов от выбора места фрагмента до таргетов
  `zenstack:generate`/`db:push` в `project.json` (сейчас их у приложения нет вовсе). Порядок:
  сначала перевод Animatrona на фрагмент, только потом схема плеера.
- Исследование разделения `schema.zmodel` с Animatrona: раздел «Разделение схемы БД с Animatrona»
  в `PLAN.md` — какие модели идут в общий фрагмент и каким способом, плюс ограничение «миксин —
  это пересечение, а не объединение». Механизм проверен эмпирически (zenstack 3.9.3), разбор
  границ —
  [zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).
  Найдена ловушка: `@letar/zenstack-form-plugin` молча теряет все поля `type`-миксина — баг
  передан владельцу `libs/forms`.

## [0.1.0] - 2026-09-08

### Added

- Первый релиз каркаса.
