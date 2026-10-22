---
id: SY-005
title: Сверить PLAN_TESTING с написанными тестами и закрыть пробелы
status: ready
size: M
area: testing
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN_TESTING.md, непомеченные пункты
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

В `PLAN_TESTING.md` остаются непомеченными тесты схемы патча, DX7 SysEx round-trip, shareable-URL, разбор MIDI, движков (субтрактивный и FM) и e2e галереи, URL, воспроизведения; отдельно — API-роуты `/api/mentor/*` и MCP `server.ts` проверены только вручную. Сначала сверить, что из списка уже есть в репозитории, отметить, остальное написать.

## Приёмка

- [ ] Список сверён с кодом
- [ ] Недостающие тесты написаны, `nx test synth` зелёный

## План

## Журнал

## Итог
