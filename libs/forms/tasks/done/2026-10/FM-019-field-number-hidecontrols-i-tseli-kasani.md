---
id: FM-019
title: "Field.Number: hideControls и цели касания ≥44px (степперы, clear)"
status: done
size: S
area: ""
priority: 2
blocked_by: []
owner: forms-dev
stage: ""
source: тред forms-number-touch-targets (domwellbes DW-017)
created: 2026-10-13
updated: 2026-10-13
closed: 2026-10-13
---

## Что и зачем

Заявка domwellbes-dev (DW-017, мобильный гейт «цели касания ≥44×44»). `Field.Number`
(`libs/forms/src/lib/declarative/form-fields/number/field-number.tsx`) всегда рисует
`NumberInput.Control` со степперами; на Android (392 CSS px) они 23×19 px, кнопка «Clear value» 16×16.
Поля domwellbes — метры участка, шаг +/- не нужен.

Триаж: фичи нет (`hideControls` отсутствует), нужна доработка библиотеки. Решение: проп `hideControls`
(скрывает степперы, остаётся `inputMode="decimal"`) и цели ≥44 px под `@media (pointer: coarse)` для
степперов и clear, когда они показаны. Потребитель: `apps/domwellbes/.../plot-check.tsx` (5 × Field.Number).

## Приёмка

- `hideControls` на `Field.Number`: степперов нет, ввод и `inputMode` работают.
- Без `hideControls` на touch (`pointer: coarse`) степперы и clear ≥44×44.
- Тест, демо в `form-develop-app`, `docs/fields.md`, form-mcp (`field-props.ts`), CHANGELOG, версия.
- Проверка в браузере на 392 px.

## План

## Журнал

## Итог

Field.Number: проп hideControls (степперов нет, inputMode=decimal) и на pointer: coarse степперы в ряд 44×44 (было 23×19). Проверено в браузере на 392 px: scrollWidth=clientWidth, 44×44. Версии forms 2.39.0, form-mcp 2.5.3. Кнопки «Clear value» в Field.Number нет в коде — у DW-017 она из другого места, не закрыта. NumberInput/Currency/Percentage не менялись.
