---
name: kami-key-the
description: Воркфлоу разработки утилиты kami-key-the — регистрация агента и выбор задачи из плана
disable-model-invocation: true
---

# KamiKeyThe - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/kami-key-the/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/kami-key-the/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next kami-key-the`. Вызов с id (`/kami-key-the KK-003`) — сразу
   `bun scripts/tasks.mjs show KK-003`. `PLAN.md`, `PLAN_COMPLETED.md` и `PLAN_TESTING.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `kami-key-the-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "kami-key-the", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start KK-NNN --owner kami-key-the-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new kami-key-the …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done KK-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** kami-key-the
**Описание:** Системная утилита для ввода типографских символов через AltGr (ремейк TypeItEasy)
**Особенности:** Desktop-утилита (Node.js, без Electron), keysender + systray2
