---
id: LP-005
title: "NATIVE-режим печати: DMATRIX и BARCODE средствами принтера"
status: idea
size: M
area: printing
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, Фаза 4, раздел 4.1
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Вместо BITMAP печатать штрихкоды нативными командами TSPL (DMATRIX, BARCODE). Переключатель и поле `labelPrintMode` уже есть; BITMAP через RAW TSPL остаётся основным способом. Файлы: `schema.zmodel`, `shared/types.ts`, `main/services/settings.service.ts`, `renderer/app/settings/page.tsx`.

## Приёмка

- [ ] Нативная печать DataMatrix и штрихкода
- [ ] Сравнение с BITMAP на реальном принтере

## План

## Журнал

## Итог
