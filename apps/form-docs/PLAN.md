# PLAN.md — form-docs

Документационный сайт @letar/forms на Fumadocs.

## Текущее состояние ✅

- 41 MDX-страниц руководств (EN)
- 41 MDX-страниц (RU) — **100% coverage**
- 3 API reference страницы (EN + RU)
- 35 interactive demo-страниц
- Fumadocs MDX + Next.js 16
- Поиск по документации (Fumadocs flexsearch)
- `sitemap.ts` — docs через Fumadocs source API + demo-страницы (PLAN-INFRA.md §33)

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

## P4 — SEO ✅ (v0.1.8)

- [x] `sitemap.ts` — источник данных `source.getLanguages()` (Fumadocs source API), а не
      статический список путей: docs-страницы с `alternates.languages` (EN/RU), главная на
      обоих языках, 35 демо-страниц `/demo/*` без локализации. Закрывает PLAN-INFRA.md §33.

---

**Последнее обновление:** 2026-08-11 (v0.1.8)
