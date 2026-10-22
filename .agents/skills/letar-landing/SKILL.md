---
name: letar-landing
description: Воркфлоу разработки лендинга letar-landing — регистрация агента и выбор задачи из плана
disable-model-invocation: true
---

# Letar Landing - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/letar-landing/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/letar-landing/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next letar-landing`. Вызов с id (`/letar-landing LL-003`) — сразу
   `bun scripts/tasks.mjs show LL-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `letar-landing-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "letar-landing", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start LL-NNN --owner letar-landing-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new letar-landing …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done LL-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** letar-landing
**Порт:** 3015
**Сервер:** s2 (185.28.85.195) — production; s1 сейчас staging/сборочный контур (с 2026-09-19, [deployment.md](/.claude/docs/deployment.md)), старый s1 выведен 2026-06-20
**Описание:** Лендинг платформы Letar
