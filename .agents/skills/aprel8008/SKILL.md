---
name: aprel8008
description: Воркфлоу разработки приложения aprel8008
disable-model-invocation: true
---

# aprel8008 - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/aprel8008/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/aprel8008/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next aprel8008`. Вызов с id (`/aprel8008 AP-003`) — сразу
   `bun scripts/tasks.mjs show AP-003`. `PLAN.md` и `PLAN_COMPLETED.md` **заморожены** и остаются
   справкой: целиком их не читать, открывать только раздел из поля `source` выбранной задачи

## Регистрация в Agent Mail

Фиксированное имя агента: `aprel8008-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "aprel8008", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start AP-NNN --owner aprel8008-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new aprel8008 …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done AP-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** aprel8008
**Порт:** 3023
**Домен prod:** <домен aprel8008>
**Сервер:** s2 (185.28.85.195)
