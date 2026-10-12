---
id: LT-013
title: Расширения Postgres для Postgres MCP Pro
status: ready
size: S
area: tooling
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN-INFRA-4.md §71
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

`pg_stat_statements` нужен `shared_preload_libraries` и рестарт, `hypopg` отсутствует в образе dev-базы. Половина функций MCP Pro недоступна; dev-БД второго приложения не тронута.

## Приёмка

- [ ] `pg_stat_statements` включён в dev-базах
- [ ] `hypopg` доступен или решено отказаться

## План

## Журнал

## Итог
