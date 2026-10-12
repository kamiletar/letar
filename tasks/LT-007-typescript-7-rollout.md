---
id: LT-007
title: "TypeScript 7: тираж на остальные проекты"
status: ready
size: L
area: tooling
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN-INFRA-1.md §19
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Пилот на `time` выполнен, результат совпал с tsc 6.0.3. Осталось перевести корневой `package.json`, прогнать `typecheck:tsgo` по всем проектам и решить судьбу `@typescript/native-preview`.

## Приёмка

- [ ] Корневой `package.json` на схеме `typescript6`/`native`
- [ ] `typecheck:tsgo` зелёный по всем проектам
- [ ] Решение по `typecheck:tsgo` и `@typescript/native-preview`
- [ ] `typecheck` вынесен в `targetDefaults`
- [ ] Доки обновлены под новую версию

## План

## Журнал

## Итог
