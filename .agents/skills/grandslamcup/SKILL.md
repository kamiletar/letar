---
name: grandslamcup
description: Воркфлоу разработки grandslamcup — турнир поэтов, регистрация в Agent Mail
disable-model-invocation: true
---

# Grand Slam Cup - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. **Очередь задач — `apps/grandslamcup/tasks/`.** `Read` её `README.md` (компас), затем
   `bun scripts/tasks.mjs next grandslamcup`. Вызвали с id (`GS-006`) — сразу
   `bun scripts/tasks.mjs show GS-006`. `PLAN.md` (265 КБ) и `PLAN_COMPLETED.md` заморожены и
   целиком не читаются: секцию из `source` задачи открывай через `grep -n` и `Read` с `offset`.

## Регистрация в Agent Mail

Фиксированное имя агента: `grandslamcup-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "grandslamcup", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Возьми задачу из `next`: `bun scripts/tasks.mjs start <ID> --owner grandslamcup-dev`, план
  работ запиши в файл задачи, находки по ходу — `tasks new`
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** grandslamcup
**Порт:** 3016
**Домен:** grandslamcup.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Ключница (OIDC, clientId: grandslamcup-prod)
**БД:** PostgreSQL (порт 5453) + ZenStack
**Описание:** Турнир поэтов — площадка для поэтических турниров и баттлов
