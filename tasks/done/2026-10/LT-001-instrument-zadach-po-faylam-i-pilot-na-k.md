---
id: LT-001
title: Инструмент задач по файлам и пилот на корне
status: done
size: M
area: tooling
priority: 1
blocked_by: []
owner: repo-dev
stage: ""
source: ""
created: 2026-10-12
updated: 2026-10-12
closed: 2026-10-12
---

## Что и зачем

## Приёмка

## План

## Журнал

- 2026-10-12: Этап A: tasks.mjs, тесты, хук и гейт tasks-check закоммичены

## Итог

Сделано: scripts/tasks.mjs (команды projects/next/list/show/new/start/set/block/unblock/note/done/waiting/check), 17 тестов, хук pre-commit-tasks-check.sh и заморозка планов (рост больше 5 строк блокируется), гейт tasks-check в check-all, шаг в CI, док tasks-per-file. Очередь корня: 66 файлов задач, живое перенесено из PLAN.md и PLAN-INFRA-1…7, баннеры заморозки стоят. Скиллы repo, letar, end-session, infra-deps-update, workflow-archive-completed и правило app-workflow переведены на tasks/. Замер: старт корня с 1,96 МБ планов до около 4 КБ (компас 2,5 КБ и вывод next 1,5 КБ). Коммиты: feat(scripts) очередь задач, ci, docs(claude) tasks-per-file, docs(tasks), баннеры PLAN и PLAN-INFRA, AGENTS.md, скиллы и правила. Пропущено при переносе: PLAN-INFRA-6 §141 и §150 (остатка нет), PLAN-INFRA-7 §170–§206 и §208–§210 (записи о сделанном), PLAN.md §0 строки про переименование lena и перенос планов из корня (закрыты), переустановку хуков (сделана). Задачи по auth-плану PLAN.md Этапы 6–7 отдельно не заводились: открытые остатки только в Этапах 0.6, 0.8, 8, 8.5 и они перенесены. Отклонение: LT-002 (P1) стоит в списке выше задачи перевода domwellbes LT-031 (тоже P1), потому что сортировка по номеру.
