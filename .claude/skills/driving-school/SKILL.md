---
name: driving-school
description: Воркфлоу разработки driving-school — автошкола, эталон документации приложений
disable-model-invocation: true
---

# Driving School - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/driving-school.md` для специфичных правил
2. ⚠️ **Очередь задач — `apps/driving-school/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/driving-school/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next driving-school`. Вызов с id (`/driving-school DS-003`) — сразу
   `bun scripts/tasks.mjs show DS-003`. `PLAN.md` и `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `driving-school-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "driving-school", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start DS-NNN --owner driving-school-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new driving-school …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done DS-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** driving-school
**Порт:** 3003
**Описание:** Автошкола — управление учениками, уроками и финансами
**Правила:** `.claude/rules/driving-school.md`
**Эталон документации:** Используй как образец для других приложений
