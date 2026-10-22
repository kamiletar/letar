---
id: LT-072
title: Привязать heartbeat и таймер Studio к сессии Codex
status: done
size: S
area: tooling
priority: 3
blocked_by: []
owner: letar-dev-codex-time
stage: ""
source: ""
created: 2026-10-22
updated: 2026-10-22
closed: 2026-10-22
---

## Что и зачем

Heartbeat Codex передавал идентификатор чата, а MCP без переменной Claude выбирал PID.
Связать вызовы таймера и heartbeat одним sessionRef, сохранить поддержку Claude Code.

## Приёмка

- Таймер поддерживает CODEX_THREAD_ID и явный sessionRef для общего MCP-процесса.
- Heartbeat использует payload сессии или окружение, без идентификатора запрос не отправляется.
- Проверены изоляция чатов, приоритет payload и совместимость с Claude Code.

## План

- Добавить регрессионные тесты, обновить MCP и общий heartbeat.
- Подключить локальный Codex-хук к общей реализации и обновить инструкции.
- Выполнить тесты, форматирование, lint и typecheck; зафиксировать изменения.

## Журнал

- 2026-10-22: до исправления тесты воспроизвели пять ошибок привязки и небезопасный запрос без sessionRef.

## Итог

Добавлена поддержка CODEX_THREAD_ID, явная привязка sessionRef для общего MCP и общий heartbeat для Claude/Codex. Локальный Codex-хук подключён к отслеживаемой реализации. Пройдены 68 тестов, lint, typecheck:tsgo, форматирование и проверки lock/docs.
