---
name: time
description: Воркфлоу разработки приложения time для управления временем — регистрация агента и выбор задачи
disable-model-invocation: true
---

# Time - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/time/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/time/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next time`. Вызов с id (`/time TM-003`) — сразу
   `bun scripts/tasks.mjs show TM-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `time-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "time", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start TM-NNN --owner time-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new time …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done TM-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** time
**Порт:** 3013
**Сервер:** s2 (185.28.85.195)
**БД:** PostgreSQL + ZenStack
**Описание:** Приложение для управления временем
