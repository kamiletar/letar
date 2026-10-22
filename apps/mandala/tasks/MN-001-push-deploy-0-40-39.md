---
id: MN-001
title: Push и деплой 0.40.39, проверка админки в браузере
status: blocked
size: S
area: release
priority: 2
blocked_by:
  - "kami: слово на push"
owner: ""
stage: ""
source: PLAN.md, открытый вопрос 2026-10-08, первый
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Коммиты 0.40.39 (код и `bun.lock`) лежат в `main` не запушенными, деплой не запрошен. Нужно слово владельца на push, затем заявка `deploy-agent-dev`. Заодно проверить в браузере форму админки (`content-pages`, `mandalas`): в консоли нет `MISSING_MESSAGE`, тулбар RichText и диалог `DirtyGuard` на русском.

## Приёмка

- [ ] Слово на push, заявка на деплой подтверждена
- [ ] В админке нет `MISSING_MESSAGE`, тулбар и диалог по-русски

## План

## Журнал

## Итог
