---
id: LT-004
title: "`.env.staging.enc`: тираж на остальные приложения"
status: ready
size: M
area: infra
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN-INFRA-1.md §18.8
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Staging-секреты хранятся зашифрованными, пилот сделан. Тиражировать на остальные приложения со staging.

## Приёмка

- [ ] Список приложений со staging сверен
- [ ] У каждого есть `.env.staging.enc`
- [ ] `ALLOW_DEV_SESSION` только в staging-файлах

## План

## Журнал

## Итог
