---
id: PV-001
title: "Кнопка: raw scale(0.9) в вариантах size xs и sm"
status: blocked
size: S
area: ui
priority: 3
blocked_by:
  - "kami: решение: третье исключение или править"
owner: ""
stage: ""
source: PLAN.md, открытый вопрос аудита v1.9.13
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

`buttonRecipe.variants.size.xs` и `sm` (`src/theme/recipes/button.ts`) используют сырое `scale(0.9)`, глубже самого мелкого шага `pressScale` (`2xs` = 0.94); не подпадает ни под одно из двух документированных исключений `press-scale.ts`. Решить: завести третье исключение в `press-scale.ts` (правило запрещает выдумывать новый тип без обсуждения) или это недосведённый hardcode, который нужно привести к шагу `pressScale`.

## Приёмка

- [ ] Решение записано
- [ ] Рецепт приведён в соответствие

## План

## Журнал

## Итог
