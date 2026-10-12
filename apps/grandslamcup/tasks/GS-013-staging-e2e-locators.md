---
id: GS-013
title: "Четыре e2e-теста staging-пайплайна: сузить локаторы"
status: ready
size: S
area: testing
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN.md Фаза 5, пункт 37b
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Два теста в `01-public.spec.ts` («переход на Расписание», «Ближайшие матчи»: возможно, нет будущих матчей в анонимизированном снимке) и два в `03-admin.spec.ts` («список городов», «список сезонов»: `strict mode violation` между `<p>` и `<td>`). Сузить локаторы через `page.locator(...)` или `data-testid`. Владелец тестов — проект `grandslamcup-e2e`, не блокирует остальное.

## Приёмка

- [ ] Четыре теста проходят на staging

## План

## Журнал

## Итог
