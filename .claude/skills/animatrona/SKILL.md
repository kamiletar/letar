---
name: animatrona
description: Воркфлоу разработки Animatrona — десктоп-приложение (Electron + Next.js) для видео-контента
disable-model-invocation: true
---

# Animatrona - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/animatrona/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/animatrona/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next animatrona`. Вызов с id (`/animatrona AN-003`) — сразу
   `bun scripts/tasks.mjs show AN-003`. `PLAN.md`, `PLAN_COMPLETED*.md`, `PLAN_TESTING.md`
   **заморожены** и остаются справкой: целиком их не читать (`PLAN.md` 184 КБ, архивы больше),
   открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start AN-NNN --owner animatrona-dev`
- План с acceptance-критериями запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new animatrona …`, не абзацем в плане

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["animatrona-coordinator-dev"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona\ntype: <type-change|api-change|ipfs-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona-tracker`, `animatrona-mobile`, `animatrona-tv` — только уведомляй координатора.
(`animatrona-web` выведен из эксплуатации, папки не существует — см. навык `animatrona-coordinator`.)

## После завершения задачи

`bun scripts/tasks.mjs done AN-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona (Electron + Next.js)
**Порт:** 3009 (renderer dev server) — сменён с 3007 2026-09-04: коллидировал с pravda (тоже
web-сервис на 3007), у animatrona продакшена нет вовсе (Electron desktop), поэтому меняли его
**Описание:** Десктоп-приложение для работы с видео-контентом
