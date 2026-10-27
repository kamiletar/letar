---
name: kami
description: Используй этот скилл, когда работаешь над личным сайтом Kami (apps/kami): его публичными страницами, админкой и очередью задач.
disable-model-invocation: true
---

# Kami - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/kami/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/kami/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next kami`. Вызов с id (`/kami KM-003`) — сразу
   `bun scripts/tasks.mjs show KM-003`. `PLAN.md`, `PLAN_COMPLETED.md` и `PLAN_TESTING.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `kami-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "kami", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start KM-NNN --owner kami-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new kami …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done KM-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Детали приложения

Репозиторий приватный (submodule). Проверенные решения публичного входа, приёмка и evals лежат внутри него:
`apps/kami/.claude-skill/references/public-entry.md`, `apps/kami/.claude-skill/evals/`, `apps/kami/docs/`.
Прочитай справку перед правкой главной, меню и анимации.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** kami
**Порт:** 3005
**Описание:** Личный сайт Kami с блогом, контактами и авторской админкой
