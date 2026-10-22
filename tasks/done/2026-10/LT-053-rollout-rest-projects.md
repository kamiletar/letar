---
id: LT-053
title: Перевести остальные проекты на задачи по файлам
status: done
size: L
area: rollout
priority: 4
blocked_by:
  - LT-031
owner: ""
stage: ""
source: tasks-per-file
created: 2026-10-12
updated: 2026-10-22
closed: 2026-10-22
---

## Что и зачем

Перевести очередь проекта на формат «одна задача — один файл» по рецепту [tasks-per-file § «Как перевести проект»](/.claude/docs/tasks-per-file.md). Одна общая задача: по каждому проекту из списка выполнить чек-лист ниже, при необходимости выделить отдельную задачу.

Проекты: animatrona-tracker, aira-web, time, form-develop-app, pravda, animatrona-tv, mandala, label-printer-desktop, kami-key-the-landing, form-develop-app-shadcn, dashboard, form-example, libs/form-mcp, notebook, letar-landing, animatrona-landing, umami.

## Приёмка

- [ ] Есть `tasks/tasks.json` и компас `tasks/README.md`
- [ ] Живое перенесено в задачи, остальное осталось справкой
- [ ] В старые планы добавлен баннер «заморожен»
- [ ] Скилл проекта стартует через `tasks next`
- [ ] `tasks check` чист

## План

## Журнал

- 2026-10-12: flora переведена (FL-001…FL-019: можно брать 4, ждут 12, идеи 3; замороженны PLAN*, TASKS, BACKLOG, SESSION-*); коммит в submodule apps/flora, не запушен
- 2026-10-22: Переведены 16 проектов: time TM, animatrona-tracker TR, aira-web AW, label-printer-desktop LP, animatrona-landing AL, notebook NB, mandala MN, pravda PV, dashboard DB, kami-key-the-landing KL, form-develop-app-shadcn FS, animatrona-tv TV, umami UM, form-example FX, form-develop-app FV, letar-landing LL, libs/form-mcp FMC (последние пять с пустой очередью). Все в публичном корне, ничего не запушено.

## Итог

Переведены все проекты группы: 17 (с учётом flora). Задачи заведены в time, tracker, aira-web, label-printer, landing-ах, notebook, mandala, pravda, dashboard, kami-key-the-landing, shadcn-песочнице, animatrona-tv, umami; form-example, form-develop-app, letar-landing, form-mcp — с пустой очередью. Баннеры в планах, скиллы ссылаются на tasks next.
