---
id: LT-046
title: Перевести mugcup на задачи по файлам
status: done
size: M
area: rollout
priority: 3
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

## Итог

Очередь mugcup переведена: tasks/ с 12 задачами MC (можно брать 2, ждут 8, идеи 2), компас 49 строк, баннеры в PLAN, PLAN_COMPLETED и PLAN_TESTING, скилл стартует через next. Коммит в submodule apps/mugcup, не запушен. Старт: компас 2,3 КБ вместо PLAN.md 65 КБ.
