---
name: label-printer-desktop
description: Воркфлоу разработки Electron-приложения label-printer-desktop для печати этикеток «Честный знак»
disable-model-invocation: true
---

# Label Printer Desktop - Воркфлоу разработки

## Инициализация

1. ⚠️ **Очередь задач — `apps/label-printer-desktop/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/label-printer-desktop/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next label-printer-desktop`. Вызов с id (`/label-printer-desktop LP-003`) — сразу
   `bun scripts/tasks.mjs show LP-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)
2. Прочитай `libs/label-printer-core/README.md` для API shared библиотеки

## Регистрация в Agent Mail

Фиксированное имя агента: `label-printer-desktop-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "label-printer-desktop", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start LP-NNN --owner label-printer-desktop-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new label-printer-desktop …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done LP-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** label-printer-desktop
**Тип:** Electron + Next.js (Nextron)
**Описание:** Desktop приложение для печати этикеток "Честный знак"
**Shared библиотека:** @letar/label-printer-core
**База данных:** SQLite + Prisma + ZenStack
