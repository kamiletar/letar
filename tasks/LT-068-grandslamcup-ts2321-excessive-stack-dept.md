---
id: LT-068
title: "grandslamcup: TS2321 Excessive stack depth в typecheck:tsgo (players/[slug], teams/[slug])"
status: idea
size: ""
area: ""
priority: 3
blocked_by: []
owner: ""
stage: ""
source: ""
created: 2026-10-15
updated: 2026-10-15
---

## Что и зачем

## Приёмка

## План

## Журнал

- 2026-10-15: Найдено в прогоне /infra:deps-update 2026-10-15: nx run-many -t typecheck:tsgo даёт TS2321 в apps/grandslamcup/src/app/(public)/players/[slug]/page.tsx:80 и teams/[slug]/page.tsx:79 (reduce/map по p.totalScore!). Обновление не трогало zenstack/prisma/typescript, вероятно старое; до обновления не проверено.

## Итог
