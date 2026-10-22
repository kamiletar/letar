---
id: FM-003
title: Публикация forms-* и form-mcp в npm и теги релизов
status: done
size: L
area: release
priority: 3
blocked_by: []
owner: forms-dev-npm-build
stage: ""
source: libs/forms/PLAN.md Backlog 2026-09-27 «Публикация в npm и теги»
created: 2026-10-12
updated: 2026-10-22
closed: 2026-10-22
---

## Что и зачем

Решение владельца от 2026-09-27: публикуем только после того, как он сам обкатает библиотеку на приложении-потребителе. До его слова без тегов `forms-v*`, `form-mcp-v*`, `forms-query-v*`, `zenstack-form-plugin-v*`, без `npm publish` и `nx release`. Чек-лист для `form-mcp`: [npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md). Координатор спрашивает владельца, когда обкатка закончится.

## Приёмка

- [x] Слово владельца получено (2026-10-19: «давай готовиться к публикации», решения D1–D5 приняты)
- [x] Паритет Vue и Angular закрыт (FM-004) или решено публиковать без него — D2: первая волна без Vue/Angular/shadcn
- [x] Чек-лист публикации пройден, пакеты на npm

## План

Страница плана: https://pages.letar.best/p/forms-npm-plan/. Решения: D1 слои forms-core/forms-react отдельными пакетами в dependencies; D2 волна 1 — forms-core, forms-react, forms, forms-query, zenstack-form-plugin, form-mcp; D3 текущие версии, dist-tag next; D4 trusted publishing (OIDC); D5 теги ставит только владелец.

- [x] Этап 1 — build:npm шести пакетов починен (2026-10-19, коммиты 94b3b8452…d84abd115, отчёт forms-npm-01-report.md в .claude/artifacts/tasks; принято сеньором: check exit 0, tarball forms 671 КБ)
- [x] Этап 2 — scripts/check-npm-package-integrity.mjs + реестр scripts/data/npm-published-packages.json, gate в check-all (2026-10-19)
- [x] Этап 3 — scripts/npm-smoke (Next, Vite, ZenStack, form-mcp) из tarball вне монорепо (2026-10-19)
- [x] Этап 4 — publish-npm.yml по тегу через OIDC + preflight, npm-packages.yml на PR; запушено 2026-10-20 (958eaf55d)
- [x] Этап 4а — проверка «установка — подмножество bun.lock» в трёх workflow вместо --frozen-lockfile (задание forms-npm-03-lock-subset.md)
- [x] Этап 4б — лёгкое ядро: тяжёлые поля в подпути rich-text, data-grid, table-editor, sortable, debug; 6 обязательных peer; forms 3.0.0 (задание forms-npm-04-pluggable-fields.md: фаза A совместимая → письма aboi/mandala → фаза C ломающая)
- [x] Этап 5 — публикация под next (новые имена — владелец вручную)
- [x] Этап 6 — перевод в latest; затем убрать `@next` из команд установки (README пакетов, form-docs installation/mcp/zenstack-plugin) и строки «`@next` — канал 3.x»

## Журнал

- 2026-10-22: этап 6 выполнен. Владелец перевёл latest: forms 3.0.0, zenstack-form-plugin 4.4.5, form-mcp 2.6.0 (у forms-core/react/query latest уже совпадал с next). `@next` снят из команд установки в README и form-docs. Семь приватных приложений получили пять строк paths подпутей forms 3.0 (задание forms-npm-05, bump a4aec6deb) — gate lib-subpath-paths по forms зелёный. Сессия `npm login` живёт около двух часов: перед dist-tag — повторный вход.
- 2026-10-20: этап 5 выполнен. Trusted Publisher настроен у шести пакетов (Allow npm publish, без dist-tag), NPM_TOKEN в репозитории не было. Dry_run forms сначала упал (smoke не собирал dist forms-core) — исправлено 59a716735. Теги forms-v3.0.0, zenstack-form-plugin-v4.4.5, form-mcp-v2.6.0 опубликованы из CI через OIDC с provenance; dist-tag next: forms 3.0.0, zenstack-form-plugin 4.4.5, form-mcp 2.6.0 (latest пока старые). Три тега, запушенные разом, вытеснили средний прогон из очереди concurrency — перезапущен вручную; теги ставить по одному. Остался этап 6 — перевод в latest.
- 2026-10-20: владелец включил 2FA (auth-and-writes) и вручную опубликовал forms-core 0.31.0, forms-react 0.26.2, forms-query 0.4.1 с --tag next. У новых имён npm сам ставит и latest на первую версию — это ожидаемо. Дальше: Trusted Publisher для шести пакетов, удалить NPM_TOKEN, dry_run publish-npm.yml, теги.
- 2026-10-20: этапы 4а и 4б приняты сеньором. 4а: scripts/check-lock-subset.mjs (a697793ae…ede939ecf) после bun install в ci.yml, npm-packages.yml, publish-npm.yml; bun 1.4.3 в ci.yml. 4б: фаза A — forms 2.42.0 (f80a67437…c1cee970d); aboi (c0e9e69, SHA ac4a5596b) и mandala (65b41effc, 127c60ef9) подключили поля через extraFields; фаза C — forms 3.0.0, form-mcp 2.6.0 (cd28ce150…6904bdf17): 6 обязательных peer вместо 18, 13 optional, правило «ядро не тянет optional peer», smoke без TipTap/dnd-kit. Typecheck 12 потребителей форм, включая приватные, зелёный. Открыто: семь приватных приложений без пяти строк paths новых подпутей (lib-subpath-paths красный, фрагмент в broadcast 2685).
- 2026-10-20: решение по открытым вопросам принято владельцем (страница https://pages.letar.best/p/forms-npm-peers-plan/). Peer: тяжёлые поля подключаются через extraFields из подпутей, первой публичной версией forms станет 3.0.0. Lockfile: скрипт check-lock-subset после bun install разрешает только удаление записей; токен для приватных submodule в CI отклонён. Задания этапов 4а и 4б — в .claude/artifacts/tasks.
- 2026-10-20: этапы 2–4 приняты и запушены. Первый прогон npm-packages.yml упал: скрипты звали голый nx, в CI его нет — исправлено (bunx nx при CI). Открыто: (1) 19 обязательных peer у @letar/forms (dnd-kit, tiptap, react-table и др. стали обязательными, т.к. бандлеры разрешают и ленивые импорты) — вынести тяжёлые поля в subpath-entry и вернуть их в optional; (2) bun install без --frozen-lockfile в publish-npm.yml (приватные submodule в CI не выкачаны); (3) ручные шаги владельца — первая публикация forms-core/forms-react/forms-query с --tag next, Trusted Publisher для шести пакетов, удаление NPM_TOKEN.

- 2026-10-19: этап 1 принят. Отклонения: treeshake: false в forms/forms-react (иначе rollup выбрасывает 'use client'), чистка имён приватных приложений и в комментариях forms-core/forms-react, тест скрипта на bun:test. DirtyGuard больше не импортирует next/navigation (forms 2.41.0).

## Итог

Шесть пакетов в npm (latest = next): forms 3.0.0, forms-core 0.31.0, forms-react 0.26.2, forms-query 0.4.1, zenstack-form-plugin 4.4.5, form-mcp 2.6.0; выпуск по тегу через OIDC с provenance
