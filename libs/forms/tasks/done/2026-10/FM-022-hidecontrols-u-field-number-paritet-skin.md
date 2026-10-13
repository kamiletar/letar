---
id: FM-022
title: "hideControls у Field.Number: паритет скинов"
status: done
size: S
area: ""
priority: 3
blocked_by: []
owner: forms-dev-hidecontrols-parity
stage: ""
source: end-session forms-dev 2026-10-13
created: 2026-10-13
updated: 2026-10-13
closed: 2026-10-13
---

## Что и зачем

FM-019 добавил `hideControls` только в Chakra-скин `Field.Number`. Выяснить, есть ли степперы в остальных скинах.

## Приёмка

- Для каждого скина записано, есть ли степперы; где есть — проп через контракт `forms-core/uikit`, тест.

## План

## Журнал

Обзор скинов:

- forms-shadcn (React): `Field.Number` — текстовый спинбаттон без степперов, скрывать нечего. Степперы только у отдельного `Field.NumberInput` (другое поле).
- forms-vue-shadcn: примитив `NumberInput` — `type="number"`, нативные степперы есть → `hideControls` сделан в примитиве.
- forms-vue, forms-angular: голый `<input type="number">` без UIKit и без пропсов поля (нет даже min/max/step) — степперы нативные, `hideControls` туда не добавлен: сначала нужен механизм пропсов поля, это отдельное решение.
- Пропс `field-props.ts` в form-mcp не менялся.
- Не закрыто: `Field.Number` в vue-shadcn не принимает `hideControls` (createField знает только name/label/placeholder).
- bun.lock не обновлён (правило очереди): версии forms-core 0.30.0 и forms-vue-shadcn 0.25.0 расходятся с lock — нужно `bun install --lockfile-only` по слову владельца.
- eslint в окружении не запускается (нет в PATH, падает и на нетронутом forms-shadcn); oxlint и typecheck:tsgo зелёные.

## Итог

hideControls в контракте forms-core/uikit (0.30.0); реализован в vue-shadcn NumberInput (0.25.0, нативные степперы). shadcn-React Field.Number без степперов; forms-vue и angular — голый type=number без пропсов поля, не сделано. bun.lock не обновлён.
