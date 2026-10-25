---
id: LT-084
title: Сохранить опыт обслуживания Agent Mail в скилле letar
status: done
size: S
area: tooling
priority: 3
blocked_by: []
owner: ""
stage: ""
source: "Kami: согласовано предложение end-session"
created: 2026-10-26
updated: 2026-10-26
closed: 2026-10-26
---

## Что и зачем

## Приёмка

## План

## Журнал

- 2026-10-26: Повторный изолированный прогон: 3/3 PASS. Отчёт .claude/artifacts/letar-agent-mail-evals.json сохраняет также первичный отказ записи в sandbox. Рабочий сервер не менялся.

## Итог

Скилл letar получил описание с неявными триггерами и справочник references/agent-mail-maintenance.md: default и отдельно согласованная миграция, backup, restart/recreate, точные проверенные команды и реальные gotchas. Убрана устаревшая инструкция nx release в пользу AGENTS.md. В evals/evals.json три сценария с командами, покрытием и ограничениями. Первичный запуск блокировался Windows sandbox на временных файлах; повторный запуск вне sandbox использует только изолированные модели и SQLite. Структура скилла валидна, Claude-копия синхронизирована. Оценка самостоятельного поведения другого агента не проводилась.
