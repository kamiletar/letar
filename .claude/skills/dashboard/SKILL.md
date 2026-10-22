---
name: dashboard
description: Воркфлоу разработки dashboard — мониторинг сервера, регистрация в Agent Mail
disable-model-invocation: true
---

# Dashboard - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/dashboard/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/dashboard/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next dashboard`. Вызов с id (`/dashboard DB-003`) — сразу
   `bun scripts/tasks.mjs show DB-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `dashboard-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "dashboard", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start DB-NNN --owner dashboard-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new dashboard …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done DB-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** dashboard
**Порт:** 3002
**Описание:** Мониторинг сервера (CPU, RAM, Docker контейнеры)
**Особенности:** PostgreSQL + ZenStack (`schema.zmodel`), метрики сервера — в реальном времени
