# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

- Каркас приложения (`nx g @letar/generators:electron-app`).
- Заведён общий фрагмент схемы `libs/zenstack-fragments/src/animatrona.zmodel` с `TrackerFields`
  (шаги 0.1 и 0.3 Фазы 0). Проверено: реконструкция `Tracker` из Animatrona поверх миксина даёт
  схему, идентичную нынешней. `PinStatus` во фрагмент не вошёл — пересечение оказалось слишком
  тонким, решение отложено в 0.2.
- **Фаза 0 «Общий фрагмент схемы»** в `PLAN.md` — 7 шагов от выбора места фрагмента до таргетов
  `zenstack:generate`/`db:push` в `project.json` (сейчас их у приложения нет вовсе). Порядок:
  сначала перевод Animatrona на фрагмент, только потом схема плеера.
- Исследование разделения `schema.zmodel` с Animatrona: раздел «Разделение схемы БД с Animatrona»
  в `PLAN.md` — какие модели идут в общий фрагмент и каким способом, плюс ограничение «миксин —
  это пересечение, а не объединение». Механизм проверен эмпирически (zenstack 3.9.3), разбор
  границ (баг form-плагина из этого разбора исправлен в v4.0.1, шаг 0.7 закрыт) —
  [zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).
  Найдена ловушка: `@letar/zenstack-form-plugin` молча теряет все поля `type`-миксина — баг
  передан владельцу `libs/forms`.

## [0.1.0] - 2026-09-08

### Added

- Первый релиз каркаса.
