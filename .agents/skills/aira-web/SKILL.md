---
name: aira-web
description: Воркфлоу разработки Aira Web — сайт с релизами пост-квантового мессенджера Aira
disable-model-invocation: true
---

# Aira Web - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/aira-web/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/aira-web/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next aira-web`. Вызов с id (`/aira-web AW-003`) — сразу
   `bun scripts/tasks.mjs show AW-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `aira-web-dev`. Общий шаблон вызова `macro_start_session` — см.
`.claude/rules/app-workflow.md`. Модель — `claude-opus-5` (не дефолтная `claude-sonnet-5`).

## Учёт времени

Сразу стартуй таймер `time_start({ app: "aira-web", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start AW-NNN --owner aira-web-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new aira-web …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done AW-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** aira-web
**Порт:** 3017
**Домен prod:** aira.letar.best
**Описание:** Сайт с релизами Aira — пост-квантового P2P мессенджера. Источники данных: GitHub
Releases API (`aira-messenger/aira`) и MDX-файлы для кастомных страниц контента.
