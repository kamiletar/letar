---
id: LT-058
title: Генератор `new-app` создаёт `tasks/` вместо `PLAN.md`
status: done
size: M
area: tooling
priority: 3
blocked_by: []
owner: ""
stage: ""
source: tasks-per-file
created: 2026-10-12
updated: 2026-10-22
closed: 2026-10-22
---

## Что и зачем

Новое приложение сразу получает `tasks/tasks.json`, компас и первую задачу вместо пустого `PLAN.md`.

## Приёмка

- [ ] Генератор создаёт `tasks/`
- [ ] Префикс выбран и проверен на уникальность

## План

## Журнал

- 2026-10-22: new-app создаёт tasks/ (tasks.json, компас, первая задача), префикс подбирается без коллизий; PLAN.md/PLAN_COMPLETED.md убраны; тесты generators 147/147

## Итог

Генератор new-app: tasks/tasks.json, tasks/README.md и первая задача <PREFIX>-001 вместо PLAN.md и PLAN_COMPLETED.md; префикс подбирается утилитой task-prefix (инициалы, затем буквы имени, без коллизий с apps/_, libs/_, корнем). Скилл create-new-app обновлён. Тесты generators 147/147, lint и typecheck зелёные.
