---
id: FS-001
title: Проверка next build в обычном окружении (не в worktree)
status: ready
size: S
area: build
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, «Бэклог»
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Попутный фикс `tsconfig.json` (`@letar/tailwind-utils`, `@letar/forms-core/mask`) нужно подтвердить прод-сборкой `nx build` в обычном чекауте, а не только `typecheck:tsgo`. Правила проверки сборки с `libs/*` — `.claude/rules/deploy-coordination.md` (пункт 4).

## Приёмка

- [ ] `nx build form-develop-app-shadcn` зелёный

## План

## Журнал

## Итог
