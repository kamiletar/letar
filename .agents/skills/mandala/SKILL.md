---
name: mandala
description: Воркфлоу разработки галереи мандал mandala — регистрация агента и выбор задачи из плана
disable-model-invocation: true
---

# Mandala - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/mandala/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/mandala/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next mandala`. Вызов с id (`/mandala MN-003`) — сразу
   `bun scripts/tasks.mjs show MN-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `mandala-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "mandala", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start MN-NNN --owner mandala-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new mandala …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done MN-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** mandala
**Порт:** 3004
**Описание:** Галерея мандал и магазин товаров ручной работы художницы Эльфафеи
