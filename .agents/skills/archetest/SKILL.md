---
name: archetest
description: Воркфлоу разработки Archetest — квиз-платформа архетипов с авторизацией и лидербордом
disable-model-invocation: true
---

# Archetest - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/archetest/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/archetest/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next archetest`. Вызов с id (`/archetest AT-003`) — сразу
   `bun scripts/tasks.mjs show AT-003`. `PLAN.md` и `PLAN_COMPLETED*.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `archetest-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "archetest", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start AT-NNN --owner archetest-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new archetest …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done AT-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** archetest
**Порт:** 3012
**Описание:** Тест архетипов — квиз-платформа с авторизацией, прогрессом и лидербордом
