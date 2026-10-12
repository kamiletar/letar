---
id: GS-001
title: Push submodule, строка версии в bun.lock и деплой фиксов 3.42.1
status: blocked
size: S
area: release
priority: 2
blocked_by:
  - "kami: слово на push и деплой"
owner: ""
stage: ""
source: PLAN.md «Открытые вопросы»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Коммиты версии 3.42.1 (явный запасной `og:image` матча), фиксы типизации и обновление `bun.lock` не запушены. Без push и заявки на деплой фикс на прод не попадёт. Порядок: submodule, потом letar, заявка `deploy-agent-dev` только после слова владельца.

## Приёмка

- [ ] Push submodule по слову владельца
- [ ] `bun scripts/check-lock-workspace-versions.mjs --index` чисто
- [ ] SHA в letar, заявка на деплой

## План

## Журнал

## Итог
