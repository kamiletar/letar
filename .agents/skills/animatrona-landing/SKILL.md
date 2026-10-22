---
name: animatrona-landing
description: Воркфлоу разработки лендинга десктоп-приложения Animatrona
disable-model-invocation: true
---

# Animatrona Landing - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/animatrona-landing/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/animatrona-landing/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next animatrona-landing`. Вызов с id (`/animatrona-landing AL-003`) — сразу
   `bun scripts/tasks.mjs show AL-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-landing-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona-landing", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start AL-NNN --owner animatrona-landing-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new animatrona-landing …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done AL-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona-landing
**Порт:** 3008
**Сервер:** s2 (185.28.85.195) — production; s1 сейчас staging/сборочный контур (с 2026-09-19, [deployment.md](/.claude/docs/deployment.md)), старый s1 выведен 2026-06-20
**Описание:** Лендинг десктоп-приложения Animatrona (IPFS аниме-стриминг)
