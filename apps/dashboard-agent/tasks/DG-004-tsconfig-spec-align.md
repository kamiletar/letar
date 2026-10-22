---
id: DG-004
title: Выровнять tsconfig.spec.json во всех библиотеках
status: idea
size: M
area: tooling
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN_COMPLETED.md, пункт «Осталось (отдельная задача, вне скоупа)»
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

У `libs/email` в `tsconfig.spec.json` есть `composite`, `noEmit`, `emitDeclarationOnly`, `tsBuildInfoFile`, `exclude`; у `redis-client`, `ui`, `format-utils`, `validation-utils` их нет. Сейчас инертно (spec-проект не собирает ни один таргет), но почва для повторения истории с `TS6059` у другого потребителя. Чинить разом по всем библиотекам. Правки в `libs/*`: согласовать с владельцами библиотек.

## Приёмка

- [ ] Конфиги выровнены
- [ ] `typecheck:tsgo` зелёный у потребителей

## План

## Журнал

## Итог
