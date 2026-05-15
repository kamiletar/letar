# PLAN — form-example

Example-приложение @letar/forms: демо + стартовый шаблон.

## P0 — Расхождения со статьями

- [x] ArticleLink компонент — ссылки на статьи с каждой example-страницы
- [x] All Fields — расширение до 56 полей (синхронизировано с @letar/forms v0.84.2)
- [ ] Groups — sortable drag&drop + вложенные массивы (Course → Modules → Lessons)

## P1 — Новые страницы

- [ ] Schedule page — форма инструктора с Schedule компонентом
- [ ] MCP Demo page — статичная демо MCP-генерации
- [ ] Recipes — добавить Profile Edit, Checkout, Feedback
- [ ] Offline — улучшить наглядность (OfflineIndicator, Simulate Offline, очередь)

## P2 — UX и навигация

- [ ] Категоризация сайдбара (APP / BASICS / PATTERNS / GENERATION / ADVANCED)
- [ ] README — полная документация с быстрым стартом

## P1.5 — DX фичи (из исследования болей разработчиков, апрель 2026)

- [ ] `/examples/analytics` — демо аналитики с live-панелью (drop-off, время на полях)
- [ ] `/examples/undo-redo` — Undo/Redo с keyboard shortcuts
- [ ] `/examples/server-errors` — маппинг серверных ошибок (Prisma, Zod, ZenStack)
- [ ] `/examples/readonly` — read-only режим формы
- [ ] `/examples/skeleton` — loading skeleton из схемы
- [ ] `/examples/comparison` — diff-view (было → стало)

## P2 — UX и навигация

- [ ] Категоризация сайдбара:
  ```
  BASICS: basic, validation, constraints, all-fields
  LAYOUT: groups, multi-step, conditional, watch
  FIELDS: documents, credit-card, signature, survey-fields, table-editor, data-grid
  GENERATION: auto-fields, templates, conversational
  PATTERNS: offline, persistence, autosave, i18n, security, captcha
  ADVANCED: analytics, undo-redo, server-errors, readonly, skeleton, theming
  ```
- [ ] README — полная документация с быстрым стартом

## P3 — Качество кода

- [ ] Единообразие кода — .meta({ui}), compound components, комментарии
- [ ] E2E тесты — Basic, Validation, Multi-Step, Products CRUD, Conditional
