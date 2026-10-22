---
name: umami
description: Воркфлоу разработки self-hosted аналитики umami для всех проектов Letar
disable-model-invocation: true
---

# Umami - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/umami/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/umami/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next umami`. Вызов с id (`/umami UM-003`) — сразу
   `bun scripts/tasks.mjs show UM-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `umami-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "umami", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start UM-NNN --owner umami-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new umami …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done UM-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** umami
**Порт (внутри контейнера):** 3000 (Traefik форвардит `umami-app:3000`)
**Сервер:** s2 (185.28.85.195) — production; s1 сейчас staging/сборочный контур (с 2026-09-19, [deployment.md](/.claude/docs/deployment.md)), старый s1 выведен 2026-06-20
**Описание:** Self-hosted аналитика для всех проектов Letar
**Особенности:** Docker-based (вендорский образ, без своего dev-порта), stats.letar.best
