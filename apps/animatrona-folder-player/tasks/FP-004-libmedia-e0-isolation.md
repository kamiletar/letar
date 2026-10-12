---
id: FP-004
title: "libmedia, Э0: риск-гейт crossOriginIsolated под схемой app://"
status: ready
size: M
area: libmedia
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN.md §23.1, §23.9
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Первый этап перехода на движок libmedia (план §23, решение владельца принято по итогам §22: libmedia основной движок, mpv отдельным режимом). Э0 делается первым: включить COOP/COEP на `app://` и CORP на `media://`, убедиться, что в devtools `crossOriginIsolated === true`. Если нет, задокументировать откат на один поток и перемерить загрузку CPU (1080p 10 бит через WASM около полядра на Core Ultra 9 275HX с многопоточностью). Результат определяет, нужен ли вариант сборки `-atomic`, и сколько wasm класть в установщик.

## Приёмка

- [ ] `crossOriginIsolated === true` или документированный откат с замером CPU
- [ ] Итог Э0 записан, FP-005 и FP-006 пересмотрены

## План

## Журнал

## Итог
