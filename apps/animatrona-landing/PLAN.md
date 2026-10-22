# План разработки — Animatrona Landing

> ⚠️ **С 2026-10-12 файл заморожен.** Очередь задач — в [`tasks/`](/apps/animatrona-landing/tasks/README.md)
> (`bun scripts/tasks.mjs next animatrona-landing` из корня монорепо). Новые задачи, журнал и итоги сюда
> не пишутся: хук не пропустит рост файла. Здесь остаётся справка. Формат —
> [tasks-per-file](/.claude/docs/tasks-per-file.md).

## Текущие задачи

### В процессе

- [ ] Интеграция с реальными скриншотами приложения
- [ ] Добавление видео-демо в Hero секцию

### Запланировано

- [ ] Аудит `_active: scale()` в теме на `pressScale` (`@letar/ui`) — задача описана в
      [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md)
- [ ] Страница с документацией (подроуты)
- [ ] Блог с обновлениями
- [ ] Интеграция аналитики (Yandex Metrika / Plausible)
- [ ] SEO оптимизация (meta tags, Open Graph)
- [ ] Локализация (ru/en)

## Завершённые задачи

Выполненные задачи см. в [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).

## Техдолг: подключить theme:check

Гейт сырых цветов/теней/transition в UI-коде (`nx g @letar/generators:theme-check-integrate
animatrona-landing`, генератор `libs/generators`, обёртка над `@letar/theme-check`) пока не
подключён. Уже подключено: domwellbes, studio, aboi. Подключать по одному, не пакетно —
allowlist легитимных исключений собирается руками при первом прогоне. Разбор —
`.claude/docs/theme-hardcode-gate-coverage.md`.

---

**Последнее обновление:** 2026-01-10
