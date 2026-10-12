---
id: LT-033
title: Перевести aboi на задачи по файлам
status: done
size: M
area: rollout
priority: 2
blocked_by:
  - LT-031
owner: ""
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

## Итог

Очередь aboi переведена: tasks/ с 20 задачами AB (можно брать 7, ждут 9, идеи 4), компас 3,4 КБ, баннеры в PLAN.md, PLAN_COMPLETED.md, PLAN_TESTING.md, скилл стартует через next. Старт: компас 3,4 КБ + next 0,9 КБ вместо PLAN.md 500 КБ. Коммит в submodule apps/aboi, не запушен.
