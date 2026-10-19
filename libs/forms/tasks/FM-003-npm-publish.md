---
id: FM-003
title: Публикация forms-* и form-mcp в npm и теги релизов
status: doing
size: L
area: release
priority: 3
blocked_by: []
owner: forms-dev-npm-build
stage: ""
source: libs/forms/PLAN.md Backlog 2026-09-27 «Публикация в npm и теги»
created: 2026-10-12
updated: 2026-10-20
---

## Что и зачем

Решение владельца от 2026-09-27: публикуем только после того, как он сам обкатает библиотеку на приложении-потребителе. До его слова без тегов `forms-v*`, `form-mcp-v*`, `forms-query-v*`, `zenstack-form-plugin-v*`, без `npm publish` и `nx release`. Чек-лист для `form-mcp`: [npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md). Координатор спрашивает владельца, когда обкатка закончится.

## Приёмка

- [x] Слово владельца получено (2026-10-19: «давай готовиться к публикации», решения D1–D5 приняты)
- [x] Паритет Vue и Angular закрыт (FM-004) или решено публиковать без него — D2: первая волна без Vue/Angular/shadcn
- [ ] Чек-лист публикации пройден, пакеты на npm

## План

Страница плана: https://claude.ai/artifact/EtYAj9WrF6brEH4AX46cVv. Решения: D1 слои forms-core/forms-react отдельными пакетами в dependencies; D2 волна 1 — forms-core, forms-react, forms, forms-query, zenstack-form-plugin, form-mcp; D3 текущие версии, dist-tag next; D4 trusted publishing (OIDC); D5 теги ставит только владелец.

- [x] Этап 1 — build:npm шести пакетов починен (2026-10-19, коммиты 94b3b8452…d84abd115, отчёт forms-npm-01-report.md в .claude/artifacts/tasks; принято сеньором: check exit 0, tarball forms 671 КБ)
- [x] Этап 2 — scripts/check-npm-package-integrity.mjs + реестр scripts/data/npm-published-packages.json, gate в check-all (2026-10-19)
- [x] Этап 3 — scripts/npm-smoke (Next, Vite, ZenStack, form-mcp) из tarball вне монорепо (2026-10-19)
- [x] Этап 4 — publish-npm.yml по тегу через OIDC + preflight, npm-packages.yml на PR; запушено 2026-10-20 (958eaf55d)
- [ ] Этап 4а — проверка «установка — подмножество bun.lock» в трёх workflow вместо --frozen-lockfile (задание forms-npm-03-lock-subset.md)
- [ ] Этап 4б — лёгкое ядро: тяжёлые поля в подпути rich-text, data-grid, table-editor, sortable, debug; 6 обязательных peer; forms 3.0.0 (задание forms-npm-04-pluggable-fields.md: фаза A совместимая → письма aboi/mandala → фаза C ломающая)
- [ ] Этап 5 — публикация под next (новые имена — владелец вручную)
- [ ] Этап 6 — перевод в latest

## Журнал

- 2026-10-20: решение по открытым вопросам принято владельцем (страница https://claude.ai/artifact/EhJP4DFuTUYunpwgbLd6hC). Peer: тяжёлые поля подключаются через extraFields из подпутей, первой публичной версией forms станет 3.0.0. Lockfile: скрипт check-lock-subset после bun install разрешает только удаление записей; токен для приватных submodule в CI отклонён. Задания этапов 4а и 4б — в .claude/artifacts/tasks.
- 2026-10-20: этапы 2–4 приняты и запушены. Первый прогон npm-packages.yml упал: скрипты звали голый nx, в CI его нет — исправлено (bunx nx при CI). Открыто: (1) 19 обязательных peer у @letar/forms (dnd-kit, tiptap, react-table и др. стали обязательными, т.к. бандлеры разрешают и ленивые импорты) — вынести тяжёлые поля в subpath-entry и вернуть их в optional; (2) bun install без --frozen-lockfile в publish-npm.yml (приватные submodule в CI не выкачаны); (3) ручные шаги владельца — первая публикация forms-core/forms-react/forms-query с --tag next, Trusted Publisher для шести пакетов, удаление NPM_TOKEN.

- 2026-10-19: этап 1 принят. Отклонения: treeshake: false в forms/forms-react (иначе rollup выбрасывает 'use client'), чистка имён приватных приложений и в комментариях forms-core/forms-react, тест скрипта на bun:test. DirtyGuard больше не импортирует next/navigation (forms 2.41.0).

## Итог
