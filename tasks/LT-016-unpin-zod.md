---
id: LT-016
title: Снять точный пин `zod` (4.4.3)
status: blocked
size: S
area: deps
priority: 4
blocked_by:
  - "upstream: SDK поднимет встроенный zod или проверка снятия пина зелёная"
owner: ""
stage: ""
source: PLAN-INFRA-6.md §134
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Корневой `zod` запинен ради дедупа с `@modelcontextprotocol/sdk`. Семь mcp-библиотек выровнены 2026-09-07, но снятие требует нового прогона `nx typecheck:tsgo synth` и полного grep по `bun.lock`.

## Приёмка

- [ ] Полный grep по `bun.lock` пуст
- [ ] `nx typecheck:tsgo synth` зелёный без пина
- [ ] Запись в `scripts/intentional-pins.json` снята

## План

## Журнал

## Итог
