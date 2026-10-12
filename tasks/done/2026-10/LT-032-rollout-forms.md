---
id: LT-032
title: Перевести libs/forms на задачи по файлам
status: done
size: M
area: rollout
priority: 2
blocked_by:
  - LT-031
owner: repo-dev
stage: ""
source: tasks-per-file
created: 2026-10-12
updated: 2026-10-12
closed: 2026-10-12
---

## Что и зачем

Перевести очередь проекта на формат «одна задача — один файл» по рецепту [tasks-per-file § «Как перевести проект»](/.claude/docs/tasks-per-file.md).

## Приёмка

- [ ] Есть `tasks/tasks.json` и компас `tasks/README.md`
- [ ] Живое перенесено в задачи, остальное осталось справкой
- [ ] В старые планы добавлен баннер «заморожен»
- [ ] Скилл проекта стартует через `tasks next`
- [ ] `tasks check` чист

## План

## Журнал

- 2026-10-12: Очередь forms (FM-001…012) заведена, баннеры, скиллы forms-dev и forms-coordinator переписаны

## Итог

libs/forms переведён: tasks/ с префиксом FM, 12 задач (можно брать 4, ждут 2, идеи 6), компас, баннеры в PLAN.md (1 МБ) и PLAN_COMPLETED.md, скиллы forms-dev и forms-coordinator стартуют через tasks next. Не переносил записи со статусом закрыто и фазы со статусом сделано. Спецификации (REFACTORING, TESTING, NEW_COMPONENTS, MASK_ENGINE) не заморожены.
