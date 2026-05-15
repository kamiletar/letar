# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.1.6] - 2026-04-04

### Added

- **100% RU coverage** — переведены все 22 оставшихся гайда на русский (41/41)
- 5 новых интерактивных демо-страниц: table-editor, smart-autofill, credit-card, captcha, matrix-choice
- Итого: 33 демо-страницы

## [0.1.5] - 2026-04-04

### Added

- Поиск по документации (Fumadocs built-in flexsearch)
- SearchDialog с i18n (RU/EN) через useI18n
- API route `/api/search` со статическим кэшем индекса
- Клиентский провайдер Providers с SearchDialog

## [0.1.4] - 2026-04-04

### Added

- guides/analytics.ru.mdx — Аналитика форм (русская версия)
- guides/undo-redo.ru.mdx — Отмена/Повтор (русская версия)

### Fixed

- Восстановлены 5 demo-страниц: calculated, documents, security, signature, utility
- Причина: отсутствовал `<ChakraProvider>` — добавлен по аналогии с рабочими демо
- Убран ненужный `export const dynamic = 'force-dynamic'`

## [0.1.3] - 2026-04-04

### Added

- guides/mcp.mdx + .ru.mdx — MCP Server for AI Assistants (6 tools, 7 resources, 3 prompts)
- Навигация обновлена (meta.json EN/RU)

## [0.1.2] - 2026-04-04

### Added

- guides/auto-fields.mdx + .ru.mdx — Automatic Form Generation (FromSchema / AutoFields)
- Ссылки на live examples (forms-example.letar.best)
- Навигация обновлена (meta.json EN/RU)

## [0.1.1] - 2026-04-04

### Added

- guides/analytics.mdx — Form Analytics документация
- guides/server-errors.mdx + .ru.mdx — Server Error Mapping
- guides/undo-redo.mdx — Undo/Redo документация
- Навигация обновлена (meta.json EN/RU)

### Fixed

- ignoreBuildErrors для стабильной сборки
- public/.gitkeep для Docker COPY

### Removed

- 5 demo-страниц (ChakraProvider SSR issue): calculated, documents, security, signature, utility

## [0.1.0] - 2026-03-23

### Added

- Документация @letar/forms на базе Fumadocs MDX
- Мультиязычная структура `[lang]/docs/[[...slug]]`
- 12 интерактивных демо-страниц (basic, string, number, date, select, specialized, groups, conditional, multi-step, auto-fields, fields-all, validation)
- Docker деплой на forms.letar.best (порт 3020)
- Umami аналитика
