---
id: LT-008
title: "SEO-фундамент: общий гейт индексации, `robots.ts`"
status: ready
size: M
area: seo
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN-INFRA-2.md §33
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Решение «прод или нет» не должно опираться на `NODE_ENV`; у части приложений нет `robots.ts`, `sitemap.ts`, `metadataBase`. Вынести `isProductionDomain()` в `libs/`, раскатить на публичные приложения.

## Приёмка

- [ ] Ни одно приложение не решает «прод или нет» через `NODE_ENV`
- [ ] У каждого приложения с публичными страницами есть `robots.ts`, `sitemap.ts`, `metadataBase`
- [ ] Staging-домены не индексируются (живая проверка `robots.txt`)
- [ ] `nx build` прогнан по переведённым приложениям

## План

## Журнал

## Итог
