---
name: form-docs
description: Воркфлоу разработки form-docs — документация библиотеки @letar/forms на Fumadocs
disable-model-invocation: true
---

# Form Docs - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/form-docs/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/form-docs/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next form-docs`. Вызов с id (`/form-docs FD-003`) — сразу
   `bun scripts/tasks.mjs show FD-003`. `PLAN.md` и `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)
2. Прочитай `libs/forms/README.md` для контекста библиотеки

## Регистрация в Agent Mail

Фиксированное имя агента: `form-docs-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "form-docs", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Координация (Forms Coordinator)

**Проверяй inbox** на задачи от координатора (topic: `forms-task`):

```
fetch_inbox(project_key: "c-web-letar", agent_name: "form-docs-dev", registration_token: "<токен из agent_fixed_names_tokens.md>", topic: "forms-task", include_bodies: true)
```

После завершения — **отвечай через reply_message**.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start FD-NNN --owner form-docs-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new form-docs …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done FD-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** form-docs (Next.js, Fumadocs)
**Порт:** 3020
**Сервер:** s2 (185.28.85.195)
**Описание:** Документация библиотеки @letar/forms
