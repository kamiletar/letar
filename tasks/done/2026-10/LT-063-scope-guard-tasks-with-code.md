---
id: LT-063
title: "scope-guard: файл задачи корня в одном коммите с кодом"
status: done
size: S
area: tooling
priority: 4
blocked_by: []
owner: ""
stage: ""
source: tasks-per-file
created: 2026-10-12
updated: 2026-10-22
closed: 2026-10-22
---

## Что и зачем

Задача и код её решения часто идут одним коммитом, а scope-guard видит два scope. Решить, разрешать ли `tasks/**` вместе с кодом.

## Приёмка

- [ ] Решение и правка гарда

## План

## Журнал

## Итог

scope-guard (scripts/hooks/pre-commit-scope-guard.sh): файлы tasks/** не считаются отдельным scope при наличии других файлов, одни tasks/** = docs-root. Проверено на временном репозитории: задача+libs/a - ок, задача+libs/a+libs/b - блок, libs/a+libs/b - блок, одна задача - ок. Хук переустановлен, поведение описано в tasks-per-file.md. Нашлась ловушка: пустой ассоциативный массив под set -u падает, сравнение сделано с числом файлов.
