---
id: FM-007
title: "Form.ActiveFilterChips: вынос вёрстки чипов активных фильтров"
status: idea
size: ""
area: forms
priority: 4
blocked_by: []
owner: ""
stage: ""
source: libs/forms/PLAN.md «Form.ActiveFilterChips»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Вёрстка чипов (~40 строк на `Tag.Root` и `Button`) живёт в демо. Решение 2026-09-05: не выносить, пока нет второго реального потребителя, иначе API угадывается вслепую. Данные-контракт уже есть: `getActiveUrlSyncFields`. Брать, когда второй потребитель появится: согласовать с `useFormUrlSync` и `useActiveFiltersCount`.

## Приёмка

- [ ] Появился второй реальный потребитель
- [ ] Компонент согласован по именованию с соседними хуками

## План

## Журнал

## Итог
