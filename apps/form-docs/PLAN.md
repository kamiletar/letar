# PLAN.md — form-docs

Документационный сайт @letar/forms на Fumadocs.

## Текущее состояние ✅

- 41 MDX-страниц руководств (EN)
- 41 MDX-страниц (RU) — **100% coverage**
- 3 API reference страницы (EN + RU)
- 33 interactive demo-страницы
- Fumadocs MDX + Next.js 16
- Поиск по документации (Fumadocs flexsearch)

## P0 — Критичное ✅

- [x] 3 новых guide: analytics, server-errors, undo-redo
- [x] server-errors.ru.mdx — русская версия

## P1 — Улучшения ✅

- [x] Русские версии: analytics.ru.mdx, undo-redo.ru.mdx
- [x] Восстановлены 5 demo-страниц (calculated, documents, security, signature, utility) — фикс: добавлен ChakraProvider
- [x] auto-fields.mdx + .ru.mdx — guide FromSchema / AutoFields
- [x] mcp.mdx + .ru.mdx — guide MCP Server для AI-ассистентов

## P2 — UX ✅

- [x] Поиск по документации (Fumadocs built-in flexsearch + кастомный SearchDialog)
- [x] Favicon (icon.svg уже был в src/app/)

## P3 — Полная русификация ✅ (v0.1.6)

- [x] 22 оставшихся перевода гайдов на русский (100% RU coverage)
- [x] 5 новых демо-страниц: table-editor, smart-autofill, credit-card, captcha, matrix-choice
- [x] Исправлены 4 сломанных демо: analytics, undo-redo, comparison, depends-on (standalone imports)
- [x] tsconfig path для @letar/forms/analytics

---

**Последнее обновление:** 2026-04-04 (v0.1.6)
