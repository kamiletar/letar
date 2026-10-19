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
updated: 2026-10-19
---

## Что и зачем

Решение владельца от 2026-09-27: публикуем только после того, как он сам обкатает библиотеку на приложении-потребителе. До его слова без тегов `forms-v*`, `form-mcp-v*`, `forms-query-v*`, `zenstack-form-plugin-v*`, без `npm publish` и `nx release`. Чек-лист для `form-mcp`: [npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md). Координатор спрашивает владельца, когда обкатка закончится.

## Приёмка

- [x] Слово владельца получено (2026-10-19: «давай готовиться к публикации», решения D1–D5 приняты)
- [x] Паритет Vue и Angular закрыт (FM-004) или решено публиковать без него — D2: первая волна без Vue/Angular/shadcn
- [ ] Чек-лист публикации пройден, пакеты на npm

## План

Страница плана: https://claude.ai/artifact/EtYAj9WrF6brEH4AX46cVv. Решения: D1 слои forms-core/forms-react отдельными пакетами в dependencies; D2 волна 1 — forms-core, forms-react, forms, forms-query, zenstack-form-plugin, form-mcp; D3 текущие версии, dist-tag next; D4 trusted publishing (OIDC); D5 теги ставит только владелец.

- [ ] Этап 1 — починить build:npm шести пакетов (задание forms-npm-01-build.md в .claude/artifacts/tasks, исполнитель forms-dev-npm-build)
- [ ] Этап 2 — постоянная проверка npm-package-integrity в check-all
- [ ] Этап 3 — установка tarball в чистые Next.js и Vite проекты
- [ ] Этап 4 — CI: releaseTagPattern, OIDC, provenance, dry-run
- [ ] Этап 5 — публикация под next (новые имена — владелец вручную)
- [ ] Этап 6 — перевод в latest

## Журнал

## Итог
