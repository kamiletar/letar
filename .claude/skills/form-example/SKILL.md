---
name: form-example
description: Воркфлоу разработки form-example — витрина @letar/forms для внешних пользователей
disable-model-invocation: true
---

# Form Example - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/form-example/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/form-example/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next form-example`. Вызов с id (`/form-example FX-003`) — сразу
   `bun scripts/tasks.mjs show FX-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)
2. Прочитай `libs/forms/README.md` для контекста библиотеки

## Регистрация в Agent Mail

Фиксированное имя агента: `form-example-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "form-example", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Координация (Forms Coordinator)

**Проверяй inbox** на задачи от координатора (topic: `forms-task`):

```
fetch_inbox(project_key: "c-web-letar", agent_name: "form-example-dev", registration_token: "<токен из agent_fixed_names_tokens.md>", topic: "forms-task", include_bodies: true)
```

После завершения — **отвечай через reply_message**.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start FX-NNN --owner form-example-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new form-example …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done FX-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** form-example (Next.js, PostgreSQL)
**Порт (dev):** 3027 (`.env`, добавлен 2026-09-04 — раньше .env не было вовсе, а документированный
3022 коллидировал с synth при одновременном `nx dev`)
**Порт (production, за Traefik):** 3022 — не связан с dev-портом, задаётся отдельно в
`docker-compose.production.yml`/`.env.docker`, менять не нужно
**Сервер:** s2 (185.28.85.195)
**БД:** PostgreSQL + ZenStack
**Описание:** Full-stack витрина @letar/forms — 16 интерактивных примеров
