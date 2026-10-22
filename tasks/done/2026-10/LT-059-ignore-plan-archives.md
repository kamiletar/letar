---
id: LT-059
title: Убрать архивы планов из поиска (`.ignore`) и проверить на Grep
status: done
size: S
area: tooling
priority: 3
blocked_by: []
owner: ""
stage: ""
source: tasks-per-file
created: 2026-10-12
updated: 2026-10-22
closed: 2026-10-22
---

## Что и зачем

Архивы и замороженные планы забивают результаты Grep и Glob. Проверить, помогает ли `.ignore`/`.rgignore`, не ломая нужный поиск по справке.

## Приёмка

- [ ] Решение и замер

## План

## Журнал

## Итог

Добавлен корневой .ignore: ripgrep пропускает /PLAN.md, /docs/plans/, PLAN_COMPLETED*.md, PLAN-JOURNAL*.md. Замер на слове deploy по *.md: 1801 -> 1167 совпадений, 327 -> 215 КБ. Проверено инструментом Grep: без path архив скрыт, с path docs/plans находится. Описано в tasks-per-file.md.
