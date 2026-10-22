---
name: notebook
description: Воркфлоу разработки notebook — личный блокнот Ками с версиями, офлайном и публикацией в рубрики сайта, регистрация в Agent Mail
disable-model-invocation: true
---

# Блокнот Ками - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/notebook/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/notebook/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next notebook`. Вызов с id (`/notebook NB-003`) — сразу
   `bun scripts/tasks.mjs show NB-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)
3. Схемы и решения — страница плана: https://pages.letar.best/p/notebook-plan/

## Регистрация в Agent Mail

Фиксированное имя агента: `notebook-dev` (токен — в приватной памяти `agent_fixed_names_tokens.md`).
Общий шаблон вызова `macro_start_session` — см. `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start NB-NNN --owner notebook-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new notebook …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done NB-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — отправь запрос `deploy-agent-dev` через Agent Mail
(`subject: "deploy-request: notebook"`), см. `.claude/rules/deploy-coordination.md`.

## Учёт времени

Проект личный, не для клиента студии: таймер не запускай, а если запустил — закрывай через
`time_discard` (см. `.claude/rules/time-tracking.md`).

## Проект

**Приложение:** notebook
**Порт:** 3127
**БД:** PostgreSQL + ZenStack (локально — контейнер `notebook-postgres-dev`, порт 5470)
**Вход:** Better Auth через Ключницу, только `OWNER_EMAIL`
**Описание:** Заметки с версиями, откатом, офлайн-режимом и публикацией в рубрики сайта
**Запуск:** глобальный `nx` в bash может не работать — используй `./node_modules/.bin/nx.exe`
