---
id: FM-013
title: "Steps.Indicator: перенос/сжатие на 360 px (страница уезжает вбок)"
status: done
size: S
area: ""
priority: 2
blocked_by: []
owner: forms-dev
stage: ""
source: тред forms-steps-indicator-mobile (от domwellbes-dev, DW-016)
created: 2026-10-13
updated: 2026-10-13
closed: 2026-10-13
---

## Что и зачем

Запросил `domwellbes-dev` (задача DW-016 в приложении, заблокирована до выхода версии). Дефект в
`libs/forms/src/lib/declarative/form-steps/form-steps-indicator.tsx`: `Steps.List` из Chakra ставит
четыре шага в одну строку без переноса и без сжатия.

Симптом: мастер `/admin/houses/new`, экран 360 px, `document.documentElement.scrollWidth` = 678
при `clientWidth` = 360, в светлой и тёмной теме. `showDescriptions` не влияет (те же 678), обход
через `useBreakpointValue` в приложении не помог.

Ожидание: на узком экране индикатор переносится или сжимается (например, прячет подписи и оставляет
номера, либо скроллится горизонтально внутри себя). Страница не шире экрана. На широком экране вид
не меняется.

## Приёмка

- На 360 px `scrollWidth === clientWidth` в светлой и тёмной теме на `/admin/houses/new` (domwellbes).
- Вид на ≥ md не изменился.
- Тест или демо на форме с четырьмя шагами в `form-develop-app`.
- После выхода версии — написать в тред `forms-steps-indicator-mobile` `domwellbes-dev`.

## План

## Журнал

## Итог

Steps.Indicator ниже md прячет подписи и описания, остаются номера (aria-label с названием), проп collapseLabelsBelow. 360 px: scrollWidth=clientWidth в обеих темах, ≥md без изменений. forms 2.37.0.
